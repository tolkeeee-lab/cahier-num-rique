'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { getPendingSync, markAsSynced, markSyncError, getOfflineStats } from '@/lib/offlineDb'

interface SyncManagerProps {
  shopId?: string
  onSyncComplete?: () => void
}

export function SyncManager({ shopId = 'default-shop', onSyncComplete }: SyncManagerProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [syncing, setSyncing] = useState<boolean>(false)
  const [showToast, setShowToast] = useState<boolean>(false)

  // Mettre à jour le compteur d'attente
  const refreshStats = useCallback(() => {
    if (typeof window === 'undefined') return
    const stats = getOfflineStats(shopId)
    setPendingCount(stats.pendingSync)
  }, [shopId])

  // Déclencheur de synchronisation vers l'API Supabase
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || syncing) return

    const pendingSales = getPendingSync(shopId)
    if (pendingSales.length === 0) {
      refreshStats()
      return
    }

    setSyncing(true)
    let syncedSuccess = 0

    for (const sale of pendingSales) {
      try {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': shopId,
          },
          body: JSON.stringify({
            ...sale,
            is_offline_sync: true,
          }),
        })

        if (response.ok) {
          markAsSynced(shopId, sale.id)
          syncedSuccess++
        } else {
          const data = await response.json().catch(() => ({}))
          markSyncError(shopId, sale.id, data.error || `Code HTTP ${response.status}`)
        }
      } catch (err: any) {
        markSyncError(shopId, sale.id, err?.message || 'Erreur réseau lors de la synchro')
      }
    }

    setSyncing(false)
    refreshStats()

    if (syncedSuccess > 0) {
      setShowToast(true)
      setTimeout(() => setShowToast(false), 4000)
      onSyncComplete?.()
    }
  }, [shopId, syncing, refreshStats, onSyncComplete])

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)
    refreshStats()

    const handleOnline = () => {
      setIsOnline(true)
      triggerSync()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    const interval = setInterval(() => {
      if (navigator.onLine) {
        triggerSync()
      } else {
        refreshStats()
      }
    }, 45000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [triggerSync, refreshStats])

  return (
    <>
      {/* Toast de succès de synchro */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-emerald-700 flex items-center gap-2 text-xs font-mono animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Synchronisation réussie des ventes hors-ligne !</span>
        </div>
      )}

      {/* Barre de statut si hors-ligne ou attente de sync */}
      {(!isOnline || pendingCount > 0) && (
        <div className={`px-4 py-1.5 text-xs font-mono flex items-center justify-between transition-colors flex-shrink-0 ${
          !isOnline ? 'bg-amber-500 text-amber-950' : 'bg-indigo-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
                <span className="font-bold">Mode Hors-ligne : vos ventes sont sauvegardées localement</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 flex-shrink-0 text-indigo-200" />
                <span>En ligne ({pendingCount} vente(s) en attente de synchro)</span>
              </>
            )}
          </div>

          {isOnline && pendingCount > 0 && (
            <button
              onClick={() => triggerSync()}
              disabled={syncing}
              className="px-2.5 py-0.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Synchro...' : 'Synchroniser'}</span>
            </button>
          )}
        </div>
      )}
    </>
  )
}
