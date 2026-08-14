'use client'

/**
 * useOfflineSync.ts
 *
 * Responsabilité unique : synchroniser automatiquement les ventes
 * hors-ligne dès que la connexion revient.
 *
 * - Écoute le retour en ligne via `isOnline`
 * - Envoie les ventes en attente (`getPendingSync`) à l'API
 * - Marque chaque vente comme `synced` ou `error`
 * - Met à jour le badge de sync dans l'UI via callbacks
 */

import { useEffect, useRef, useCallback } from 'react'
import {
  getPendingSync,
  markAsSynced,
  markSyncError,
} from '@/lib/offlineDb'
import type { SyncStatus } from '@/hooks/useNetworkStatus'

interface UseOfflineSyncOptions {
  shopId: string
  shopActivity: string
  isOnline: boolean
  setSyncStatus: (s: SyncStatus) => void
  refreshPendingCount: (shopId: string) => void
  onSyncComplete?: () => void // Appelé après sync réussie — pour recharger les données
}

export function useOfflineSync({
  shopId,
  shopActivity,
  isOnline,
  setSyncStatus,
  refreshPendingCount,
  onSyncComplete,
}: UseOfflineSyncOptions) {
  // Évite les double-syncs simultanés
  const isSyncing = useRef(false)

  const syncOfflineData = useCallback(async () => {
    if (!shopId || !isOnline || isSyncing.current) return

    const pending = getPendingSync(shopId)
    if (pending.length === 0) return

    isSyncing.current = true
    setSyncStatus('syncing')

    let successCount = 0
    let errorCount = 0

    for (const sale of pending) {
      try {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': shopId,
            'x-shop-activity': shopActivity,
          },
          body: JSON.stringify({
            text: sale.notes || '',
            raw_text: sale.notes || '',
            penColor: sale.pen_color || 'blue',
            pen_color: sale.pen_color || 'blue',
            overrideData: {
              articles: (sale.articles || []).map((a: any) => ({
                name: a.name || a.nom,
                quantity: a.quantity || a.quantite,
                unit_price: a.unit_price || a.prix_unitaire,
              })),
              total_amount: sale.total,
              paid_amount: sale.paid,
              debt_amount: sale.debt,
              client_name: sale.client || 'Client anonyme',
            },
          }),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err?.error || `HTTP ${response.status}`)
        }

        markAsSynced(shopId, sale.id)
        successCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        markSyncError(shopId, sale.id, msg)
        errorCount++
      }
    }

    refreshPendingCount(shopId)
    isSyncing.current = false

    if (errorCount === 0) {
      setSyncStatus('success')
      onSyncComplete?.()
      // Réinitialiser le badge après 3s
      setTimeout(() => setSyncStatus('idle'), 3000)
    } else {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 5000)
    }
  }, [shopId, shopActivity, isOnline, setSyncStatus, refreshPendingCount, onSyncComplete])

  // Déclencher automatiquement quand on revient en ligne
  useEffect(() => {
    if (isOnline && shopId) {
      // Petit délai pour s'assurer que la connexion est vraiment stable
      const timer = setTimeout(() => syncOfflineData(), 1500)
      return () => clearTimeout(timer)
    }
  }, [isOnline, shopId, syncOfflineData])

  return { syncNow: syncOfflineData }
}
