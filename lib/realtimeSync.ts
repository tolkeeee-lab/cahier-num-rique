/**
 * realtimeSync.ts
 *
 * Moteur de synchronisation temps réel instantanée multi-appareils (PC <-> Téléphone PWA).
 * 
 * Architecture Hybride Résiliente Haute Performance :
 * 1. Supabase Realtime WebSocket (< 50ms) :
 *    - Communication bidirectionnelle immédiate entre appareils distants (PC <-> Mobile).
 *    - Écoute les événements broadcast 'cahier_instant_sync' émis par les stylos et actions.
 *    - Écoute les mutations Postgres directes (postgres_changes) sur sales, products, shopping_list, cash_closings.
 * 
 * 2. W3C BroadcastChannel local (0ms) :
 *    - Synchronisation instantanée entre onglets/fenêtres sur le même appareil sans latence réseau.
 * 
 * 3. Résilience Sommeil Mobile (iOS Safari / WebKit / Android) :
 *    - Auto-reconnexion douce sans crash sur événement 'visibilitychange' ou retour réseau 'online'.
 *    - File d'attente d'expédition 'pendingBroadcasts' pendant la négociation du socket.
 */

import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'
import { normalizeShopCode, getDualShopIds } from '@/lib/shopCodeUtils'

export type SyncEntity = 'sales' | 'stock' | 'shopping' | 'debts' | 'closings' | 'all'

export interface RealtimeSyncPayload {
  entity: SyncEntity
  shopId: string
  senderDeviceId: string
  timestamp: number
  data?: any
}

export interface RealtimeSyncCallbacks {
  onSalesUpdated?: (data?: any) => void
  onStockUpdated?: (data?: any) => void
  onShoppingUpdated?: (data?: any) => void
  onClosingsUpdated?: (data?: any) => void
  onAllUpdated?: () => void
}

let localDeviceId: string | null = null

export function getLocalDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  if (!localDeviceId) {
    try {
      localDeviceId = sessionStorage.getItem('cahier_device_id')
      if (!localDeviceId) {
        localDeviceId = `dev_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`
        sessionStorage.setItem('cahier_device_id', localDeviceId)
      }
    } catch {
      localDeviceId = `dev_${Date.now()}`
    }
  }
  return localDeviceId
}

/**
 * Retourne le nom canonique du topic pour la boutique.
 * Exemple: 'realtime_shop_58C54' pour 'BTQ-58C54', 'SHOP-58C54' ou UUID '58c54123-...'.
 */
export function getRealtimeChannelName(shopId: string): string {
  if (!shopId) return 'realtime_shop_default'
  const clean = normalizeShopCode(shopId) || (typeof shopId === 'string' ? shopId.trim() : String(shopId))
  return `realtime_shop_${clean}`
}

// ── État interne du canal singleton ───────────────────────────────────────────
let activeRealtimeChannel: any = null
let activeChannelName: string | null = null
let isChannelSubscribed = false
let currentTrackedShopId: string | null = null
let reconnectTimer: any = null

const registeredCallbacks = new Set<RealtimeSyncCallbacks>()
const pendingBroadcasts: RealtimeSyncPayload[] = []
let w3cBroadcastChannel: BroadcastChannel | null = null
let currentW3cTopic: string | null = null

/**
 * Indique si la synchronisation temps réel est active.
 */
export function isRealtimeActive(): boolean {
  return isChannelSubscribed && activeRealtimeChannel !== null
}

/**
 * Déclenche les callbacks enregistrés et dispatche les événements DOM locaux.
 */
function notifyCallbacks(entity: SyncEntity, data?: any): void {
  registeredCallbacks.forEach(cb => {
    try {
      if (entity === 'sales' || entity === 'debts') cb.onSalesUpdated?.(data)
      else if (entity === 'stock') cb.onStockUpdated?.(data)
      else if (entity === 'shopping') cb.onShoppingUpdated?.(data)
      else if (entity === 'closings') cb.onClosingsUpdated?.(data)
      else if (entity === 'all') {
        cb.onSalesUpdated?.(data)
        cb.onStockUpdated?.(data)
        cb.onShoppingUpdated?.(data)
        cb.onClosingsUpdated?.(data)
        cb.onAllUpdated?.()
      }
    } catch (err) {
      console.warn('[RealtimeSync] Erreur callback:', err)
    }
  })

  if (typeof window !== 'undefined') {
    if (entity === 'sales' || entity === 'debts' || entity === 'all') {
      window.dispatchEvent(new CustomEvent('cahier_sales_updated', { detail: { fromBroadcast: true, data } }))
    }
    if (entity === 'stock' || entity === 'all') {
      window.dispatchEvent(new CustomEvent('cahier_stock_updated', { detail: { fromBroadcast: true, data } }))
    }
    if (entity === 'shopping' || entity === 'all') {
      window.dispatchEvent(new CustomEvent('cahier_shopping_updated', { detail: { fromBroadcast: true, data } }))
    }
  }
}

/**
 * Initialise le BroadcastChannel standard W3C pour communication locale instantanée (0ms).
 */
function getOrCreateBroadcastChannel(shopId: string): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null
  }

  const topic = getRealtimeChannelName(shopId)
  if (w3cBroadcastChannel && currentW3cTopic === topic) {
    return w3cBroadcastChannel
  }

  if (w3cBroadcastChannel) {
    try {
      w3cBroadcastChannel.close()
    } catch {}
    w3cBroadcastChannel = null
  }

  try {
    const channel = new BroadcastChannel(topic)
    const myDeviceId = getLocalDeviceId()
    const matchingShopIds = new Set(getDualShopIds(shopId))

    channel.onmessage = (event) => {
      const payload: RealtimeSyncPayload = event.data
      if (!payload) return
      if (payload.senderDeviceId && payload.senderDeviceId === myDeviceId) return

      const normalizedMsgCode = normalizeShopCode(payload.shopId)
      const normalizedOurCode = normalizeShopCode(shopId)
      const isMatching =
        normalizedMsgCode === normalizedOurCode ||
        matchingShopIds.has(payload.shopId) ||
        !payload.shopId

      if (!isMatching) return
      notifyCallbacks(payload.entity, payload.data)
    }

    w3cBroadcastChannel = channel
    currentW3cTopic = topic
    return channel
  } catch {
    return null
  }
}

/**
 * Récupère ou instancie le canal Supabase Realtime WebSocket (PC <-> Mobile).
 */
export function getOrCreateRealtimeChannel(shopId: string) {
  if (!isSupabaseClientConfigured() || !shopId || typeof window === 'undefined') return null

  currentTrackedShopId = shopId
  const channelName = getRealtimeChannelName(shopId)

  if (activeRealtimeChannel && activeChannelName === channelName && isChannelSubscribed) {
    return activeRealtimeChannel
  }

  // Nettoyage de l'ancien canal s'il a changé de boutique
  if (activeRealtimeChannel && activeChannelName !== channelName) {
    try {
      supabaseClient.removeChannel(activeRealtimeChannel)
    } catch {}
    activeRealtimeChannel = null
    activeChannelName = null
    isChannelSubscribed = false
  }

  try {
    const channel = supabaseClient.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
      },
    })

    const myDeviceId = getLocalDeviceId()

    // 1. Écoute des messages de diffusion instantanée (Broadcast peer-to-peer < 50ms)
    channel.on('broadcast', { event: 'cahier_instant_sync' }, (data: any) => {
      const payload: RealtimeSyncPayload = data?.payload || data
      if (!payload) return
      // Ignorer uniquement les échos envoyés par notre propre onglet
      if (payload.senderDeviceId && payload.senderDeviceId === myDeviceId) return

      notifyCallbacks(payload.entity || 'all', payload.data)
    })

    // 2. Écoute des mutations directes Postgres Changes (sauvegarde Cloud)
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
      notifyCallbacks('sales')
    })

    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
      notifyCallbacks('stock')
    })

    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, () => {
      notifyCallbacks('shopping')
    })

    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'cash_closings' }, () => {
      notifyCallbacks('closings')
    })

    // 3. Souscription au canal
    channel.subscribe((status: string, _err?: any) => {
      if (status === 'SUBSCRIBED') {
        isChannelSubscribed = true
        activeRealtimeChannel = channel
        activeChannelName = channelName

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cahier_realtime_status', { detail: { connected: true } }))
        }

        // Expédier les diffusions en attente pendant la connexion
        while (pendingBroadcasts.length > 0) {
          const item = pendingBroadcasts.shift()
          if (item) {
            channel.send({
              type: 'broadcast',
              event: 'cahier_instant_sync',
              payload: item,
            }).catch(() => {})
          }
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        isChannelSubscribed = false

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cahier_realtime_status', { detail: { connected: false } }))
        }

        // Tentative d'auto-rétablissement si le navigateur est en ligne (1.5s)
        if (typeof window !== 'undefined' && navigator.onLine) {
          if (reconnectTimer) clearTimeout(reconnectTimer)
          reconnectTimer = setTimeout(() => {
            if (currentTrackedShopId) {
              reconnectRealtimeSync(currentTrackedShopId)
            }
          }, 1500)
        }
      }
    })

    activeRealtimeChannel = channel
    activeChannelName = channelName
    return channel
  } catch (err) {
    console.warn('[RealtimeSync] Erreur création canal:', err)
    return null
  }
}

/**
 * Force la reconnexion propre du canal Realtime (ex: après réveil du téléphone ou retour réseau).
 */
export function reconnectRealtimeSync(shopId: string): void {
  if (!shopId || typeof window === 'undefined') return

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (activeRealtimeChannel) {
    try {
      supabaseClient.removeChannel(activeRealtimeChannel)
    } catch {}
    activeRealtimeChannel = null
    activeChannelName = null
    isChannelSubscribed = false
  }

  getOrCreateBroadcastChannel(shopId)
  getOrCreateRealtimeChannel(shopId)
}

/**
 * Diffuse instantanément un événement de synchronisation vers :
 * 1. Tous les composants / onglets locaux (W3C BroadcastChannel + DOM Events, 0ms).
 * 2. Tous les autres appareils distants (Supabase WebSocket, < 50ms).
 */
export async function broadcastInstantSync(shopId: string, entity: SyncEntity = 'all', data?: any): Promise<void> {
  if (!shopId) return

  const payload: RealtimeSyncPayload = {
    entity,
    shopId,
    senderDeviceId: getLocalDeviceId(),
    timestamp: Date.now(),
    data,
  }

  // 1. Diffusion locale instantanée (0ms)
  notifyCallbacks(entity, data)

  try {
    const localChan = getOrCreateBroadcastChannel(shopId)
    if (localChan) {
      localChan.postMessage(payload)
    }
  } catch {}

  // 2. Diffusion distante WebSocket vers les autres appareils (< 50ms)
  if (isSupabaseClientConfigured()) {
    try {
      const channel = getOrCreateRealtimeChannel(shopId)
      if (channel) {
        if (!isChannelSubscribed) {
          pendingBroadcasts.push(payload)
          // Si le socket est en cours de négociation, tenter l'envoi REST immédiat pour garantir la livraison
          if (typeof (channel as any).httpSend === 'function') {
            (channel as any).httpSend('cahier_instant_sync', payload).catch(() => {})
          }
        } else {
          await channel.send({
            type: 'broadcast',
            event: 'cahier_instant_sync',
            payload,
          })
        }
      }
    } catch (err) {
      console.warn('[Realtime Broadcast] Erreur diffusion WebSocket:', err)
    }
  }
}

/**
 * Enregistre des callbacks de synchronisation pour le composant appelant.
 * Retourne une fonction de désinscription propre.
 */
export function setupRealtimeSync(
  shopId: string,
  callbacks: RealtimeSyncCallbacks = {}
): () => void {
  if (!shopId) {
    return () => {}
  }

  try {
    registeredCallbacks.add(callbacks)
    getOrCreateBroadcastChannel(shopId)
    getOrCreateRealtimeChannel(shopId)

    return () => {
      registeredCallbacks.delete(callbacks)
    }
  } catch (syncErr) {
    console.warn('[RealtimeSync] Erreur setupRealtimeSync:', syncErr)
    return () => {}
  }
}
