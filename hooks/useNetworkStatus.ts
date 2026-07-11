/**
 * useNetworkStatus — Hook React pour la détection de l'état réseau
 *
 * Fournit :
 * - `isOnline` : true si une vraie connexion réseau est disponible (pas seulement navigator.onLine)
 * - `pendingCount` : nombre de transactions hors-ligne en attente de sync
 * - `syncStatus` : état de la synchronisation en cours
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getOfflineStats } from '@/lib/offlineDb'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface NetworkStatus {
  isOnline: boolean
  pendingCount: number
  syncErrors: number
  syncStatus: SyncStatus
  setSyncStatus: (status: SyncStatus) => void
  refreshPendingCount: (shopId: string) => void
}

/**
 * Vérifie la vraie connectivité en tentant un fetch HEAD sur Supabase.
 * `navigator.onLine` seul est trompeur sur les réseaux captifs ou mobiles dégradés.
 */
async function checkRealConnectivity(): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const target = supabaseUrl && !supabaseUrl.includes('placeholder')
      ? `${supabaseUrl}/rest/v1/`
      : 'https://www.google.com/generate_204'

    const response = await fetch(target, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    })
    // Accepte 200, 204, 400, 404 — tout sauf erreur réseau pure
    return response.ok || response.status < 500
  } catch {
    return false
  }
}

export function useNetworkStatus(shopId: string | undefined): NetworkStatus {
  // Guard SSR : typeof window pour éviter les erreurs Next.js
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? window.navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)
  const [syncErrors, setSyncErrors] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshPendingCount = useCallback((sid: string) => {
    if (!sid) return
    const stats = getOfflineStats(sid)
    setPendingCount(stats.pendingSync)
    setSyncErrors(stats.syncErrors)
  }, [])

  useEffect(() => {
    if (!shopId) return
    refreshPendingCount(shopId)
  }, [shopId, refreshPendingCount])

  const updateOnlineStatus = useCallback(async (hint?: boolean) => {
    // Si navigator dit offline, pas besoin de ping
    if (hint === false || (typeof window !== 'undefined' && !window.navigator.onLine)) {
      setIsOnline(false)
      setSyncStatus('idle')
      return
    }
    const real = await checkRealConnectivity()
    setIsOnline(real)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline  = () => updateOnlineStatus(true)
    const handleOffline = () => updateOnlineStatus(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Vérification initiale au montage
    updateOnlineStatus()

    // Ping périodique toutes les 30s pour détecter les connexions fantômes
    pingIntervalRef.current = setInterval(() => updateOnlineStatus(), 30_000)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
    }
  }, [updateOnlineStatus])

  // Quand on revient en ligne, déclencher une sync
  useEffect(() => {
    if (isOnline && syncStatus === 'idle' && shopId) {
      refreshPendingCount(shopId)
    }
  }, [isOnline, syncStatus, shopId, refreshPendingCount])

  return {
    isOnline,
    pendingCount,
    syncErrors,
    syncStatus,
    setSyncStatus,
    refreshPendingCount,
  }
}
