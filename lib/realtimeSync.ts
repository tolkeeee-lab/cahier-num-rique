/**
 * realtimeSync.ts
 *
 * Moteur de synchronisation temps réel instantanée multi-appareils (PC <-> Téléphone PWA).
 * 
 * Architecture Double Couche (Sub-Second Synchronisation) :
 * 1. Broadcast WebSocket peer-to-peer (< 50ms) :
 *    - Dès qu'un appareil (PC ou téléphone) saisit ou modifie des données (ventes, stock, dettes, courses, clôture),
 *      un message broadcast léger est diffusé sur le canal partagé déterministe de la boutique.
 *    - Tous les autres appareils connectés au même canal reçoivent la notification instantanément
 *      et rechargent leurs vues sans attendre le cycle de polling de secours.
 * 
 * 2. Supabase Realtime Postgres Changes :
 *    - Écoute directe des mutations de la base de données PostgreSQL sur les tables sales, products, shopping_list, cash_closings.
 *    - Filtrage robuste supportant les alias multi-tenants (getDualShopIds).
 * 
 * 3. Filtrage d'écho par deviceId :
 *    - Chaque appareil dispose d'un identifiant de session unique pour ignorer ses propres diffusions.
 * 
 * 4. Cycle de vie unifié (Single Source of Truth) :
 *    - Un seul point de création de canal (getOrCreateRealtimeChannel).
 *    - Tous les écouteurs sont attachés avant l'appel à channel.subscribe().
 *    - Registre dynamique de callbacks permettant d'ajouter ou retirer des écouteurs sans jamais recréer le canal.
 */

import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'
import { normalizeShopCode, getDualShopIds } from '@/lib/shopCodeUtils'
import { captureAppError } from '@/lib/errorDiagnostics'

export type SyncEntity = 'sales' | 'stock' | 'shopping' | 'debts' | 'closings' | 'all'

export interface RealtimeSyncPayload {
  entity: SyncEntity
  shopId: string
  senderDeviceId: string
  timestamp: number
}

export interface RealtimeSyncCallbacks {
  onSalesUpdated?: () => void
  onStockUpdated?: () => void
  onShoppingUpdated?: () => void
  onClosingsUpdated?: () => void
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
 * Retourne le nom de canal Supabase Realtime déterministe et partagé pour la boutique.
 * Exemple: 'realtime_shop_58C54' pour 'BTQ-58C54', 'SHOP-58C54' ou '58C54'.
 */
export function getRealtimeChannelName(shopId: string): string {
  if (!shopId) return 'realtime_shop_default'
  const clean = normalizeShopCode(shopId) || (typeof shopId === 'string' ? shopId.trim() : String(shopId))
  return `realtime_shop_${clean}`
}

// Référence vers le canal actif singleton et registre partagé de callbacks
let activeChannel: any = null
let activeChannelName: string | null = null
const registeredCallbacks = new Set<RealtimeSyncCallbacks>()

/**
 * Récupère ou instancie le canal Realtime Supabase pour la boutique.
 * Attache tous les écouteurs (Broadcast + Postgres Changes) AVANT de souscrire.
 */
export function getOrCreateRealtimeChannel(shopId: string) {
  if (!isSupabaseClientConfigured() || !shopId) return null

  const channelName = getRealtimeChannelName(shopId)

  if (activeChannel && activeChannelName === channelName) {
    return activeChannel
  }

  // Si on change de boutique, nettoyer l'ancien canal
  if (activeChannel) {
    try {
      supabaseClient.removeChannel(activeChannel)
    } catch {}
    activeChannel = null
    activeChannelName = null
  }

  try {
    const channel = supabaseClient.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
      },
    })

    const myDeviceId = getLocalDeviceId()
    const matchingShopIds = new Set(getDualShopIds(shopId))

    const handleEntityUpdate = (entity: SyncEntity) => {
      registeredCallbacks.forEach(cb => {
        try {
          if (entity === 'sales' || entity === 'debts') cb.onSalesUpdated?.()
          else if (entity === 'stock') cb.onStockUpdated?.()
          else if (entity === 'shopping') cb.onShoppingUpdated?.()
          else if (entity === 'closings') cb.onClosingsUpdated?.()
          else if (entity === 'all') {
            cb.onSalesUpdated?.()
            cb.onStockUpdated?.()
            cb.onShoppingUpdated?.()
            cb.onClosingsUpdated?.()
            cb.onAllUpdated?.()
          }
        } catch (err) {
          console.warn('[RealtimeSync] Erreur callback:', err)
        }
      })

      if (typeof window !== 'undefined') {
        if (entity === 'sales' || entity === 'debts' || entity === 'all') {
          window.dispatchEvent(new CustomEvent('cahier_sales_updated', { detail: { fromBroadcast: true } }))
        }
        if (entity === 'stock' || entity === 'all') {
          window.dispatchEvent(new CustomEvent('cahier_stock_updated', { detail: { fromBroadcast: true } }))
        }
        if (entity === 'shopping' || entity === 'all') {
          window.dispatchEvent(new CustomEvent('cahier_shopping_updated', { detail: { fromBroadcast: true } }))
        }
      }
    }

    // 1. Écoute Broadcast Instantané (Peer-to-Peer WebSocket < 50ms)
    channel.on('broadcast', { event: 'cahier_instant_sync' }, (res: any) => {
      const payload: RealtimeSyncPayload = res.payload
      if (!payload) return

      // Ignorer ses propres messages pour éviter les échos
      if (payload.senderDeviceId === myDeviceId) return

      // Vérifier que le message concerne bien notre boutique (support multi-alias)
      if (payload.shopId && !matchingShopIds.has(payload.shopId)) {
        const normalizedMsgCode = normalizeShopCode(payload.shopId)
        const normalizedOurCode = normalizeShopCode(shopId)
        if (normalizedMsgCode !== normalizedOurCode) return
      }

      handleEntityUpdate(payload.entity)
    })

    // 2. Écoute Postgres Changes (attachement UNIQUE avant subscribe)
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload: any) => {
        const targetShop = payload.new?.shop_id || payload.old?.shop_id
        if (!targetShop || matchingShopIds.has(targetShop) || normalizeShopCode(targetShop) === normalizeShopCode(shopId)) {
          handleEntityUpdate('sales')
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload: any) => {
        const targetShop = payload.new?.shop_id || payload.old?.shop_id
        if (!targetShop || matchingShopIds.has(targetShop) || normalizeShopCode(targetShop) === normalizeShopCode(shopId)) {
          handleEntityUpdate('stock')
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, (payload: any) => {
        const targetShop = payload.new?.shop_id || payload.old?.shop_id
        if (!targetShop || matchingShopIds.has(targetShop) || normalizeShopCode(targetShop) === normalizeShopCode(shopId)) {
          handleEntityUpdate('shopping')
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_closings' }, (payload: any) => {
        const targetShop = payload.new?.shop_id || payload.old?.shop_id
        if (!targetShop || matchingShopIds.has(targetShop) || normalizeShopCode(targetShop) === normalizeShopCode(shopId)) {
          handleEntityUpdate('closings')
        }
      })

    // 3. Souscrire une seule fois au canal
    channel.subscribe((status: string, err?: any) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Synchronisation PC <-> Téléphone active pour boutique ${shopId}`)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[Realtime] Statut canal ${status}:`, err)
        captureAppError(err || `Canal Realtime en statut ${status}`, {
          shopId,
          source: 'realtimeChannel.subscribe',
          status,
        })
      }
    })

    activeChannel = channel
    activeChannelName = channelName
    return channel
  } catch (err) {
    console.warn('[RealtimeSync] Erreur création canal:', err)
    captureAppError(err, { shopId, source: 'getOrCreateRealtimeChannel' })
    return null
  }
}

/**
 * Diffuse instantanément un événement de synchronisation vers tous les autres appareils.
 * Latence moyenne WebSocket : 30ms - 80ms.
 */
export async function broadcastInstantSync(shopId: string, entity: SyncEntity = 'all'): Promise<void> {
  if (!isSupabaseClientConfigured() || !shopId) return

  try {
    const channel = getOrCreateRealtimeChannel(shopId)
    if (!channel) return

    const payload: RealtimeSyncPayload = {
      entity,
      shopId,
      senderDeviceId: getLocalDeviceId(),
      timestamp: Date.now(),
    }

    await channel.send({
      type: 'broadcast',
      event: 'cahier_instant_sync',
      payload,
    })
  } catch (err) {
    console.warn('[Realtime Broadcast] Erreur diffusion:', err)
  }
}

/**
 * Enregistre des callbacks de synchronisation pour le composant appelant.
 * Retourne une fonction de désinscription.
 */
export function setupRealtimeSync(
  shopId: string,
  callbacks: RealtimeSyncCallbacks = {}
): () => void {
  if (!isSupabaseClientConfigured() || !shopId) {
    return () => {}
  }

  try {
    registeredCallbacks.add(callbacks)
    getOrCreateRealtimeChannel(shopId)

    return () => {
      registeredCallbacks.delete(callbacks)
    }
  } catch (syncErr) {
    console.warn('[RealtimeSync] Erreur setupRealtimeSync:', syncErr)
    return () => {}
  }
}
