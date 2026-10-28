'use client'

/**
 * useOfflineSync.ts
 *
 * Responsabilité unique : synchroniser automatiquement les données
 * hors-ligne (ventes, produits, clôtures de caisse, liste de courses) dès que la connexion revient
 * ou que la PWA sort de veille.
 */

import { useEffect, useRef, useCallback } from 'react'
import {
  getPendingSync,
  getSyncErrors,
  markAsSynced,
  markSyncError,
  getPendingOfflineProducts,
  markProductAsSynced,
  getOfflineCashClosings,
  saveOfflineCashClosing,
  getOfflineShoppingList,
  replaceOfflineShoppingList,
} from '@/lib/offlineDb'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'
import type { SyncStatus } from '@/hooks/useNetworkStatus'

interface UseOfflineSyncOptions {
  shopId: string
  shopActivity: string
  isOnline: boolean
  setSyncStatus: (s: SyncStatus) => void
  refreshPendingCount: (shopId: string) => void
  onSyncComplete?: () => void
}

export function useOfflineSync({
  shopId,
  shopActivity,
  isOnline,
  setSyncStatus,
  refreshPendingCount,
  onSyncComplete,
}: UseOfflineSyncOptions) {
  const isSyncing = useRef(false)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  const syncOfflineData = useCallback(async (includeErrors = false) => {
    if (!shopId || !isOnline || isSyncing.current) return

    const pending = getPendingSync(shopId)
    const errored = includeErrors ? getSyncErrors(shopId) : []

    const pendingIds = new Set(pending.map(s => s.id))
    const toSync = [...pending, ...errored.filter(s => !pendingIds.has(s.id))]
    const pendingProducts = getPendingOfflineProducts(shopId)
    const pendingClosings = getOfflineCashClosings(shopId).filter(c => c.is_synced === false)
    const pendingShopping = getOfflineShoppingList(shopId).filter(i => i.is_synced === false)

    if (toSync.length === 0 && pendingProducts.length === 0 && pendingClosings.length === 0 && pendingShopping.length === 0) return

    isSyncing.current = true
    setSyncStatus('syncing')

    let successCount = 0
    let errorCount = 0

    try {
      // 1. Synchronisation des Produits créés ou modifiés hors-ligne
      for (const prod of pendingProducts) {
        try {
          const response = await fetch('/api/stock', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-shop-id': shopId,
            },
            body: JSON.stringify(prod),
          })
          if (response.ok) {
            const resData = await response.json()
            if (resData?.product) {
              markProductAsSynced(shopId, prod.id, resData.product)
              successCount++
            }
          } else {
            console.warn('[OfflineSync] Échec sync produit:', prod.name, response.status)
            errorCount++
          }
        } catch (err) {
          console.warn('[OfflineSync] Erreur réseau sync produit:', prod.name, err)
          errorCount++
        }
      }

      // 2. Synchronisation des Clôtures de Caisse hors-ligne (Z)
      for (const closing of pendingClosings) {
        try {
          const response = await fetch('/api/cash-closings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-shop-id': shopId,
            },
            body: JSON.stringify(closing),
          })
          if (response.ok) {
            saveOfflineCashClosing(shopId, { ...closing, is_synced: true })
            successCount++
          } else {
            errorCount++
          }
        } catch (err) {
          console.warn('[OfflineSync] Erreur sync clôture caisse:', closing.date, err)
          errorCount++
        }
      }

      // 3. Synchronisation de la Liste de Courses hors-ligne
      if (pendingShopping.length > 0 && isSupabaseClientConfigured()) {
        try {
          const { error } = await supabaseClient
            .from('shopping_list')
            .upsert(
              pendingShopping.map(item => ({
                id: item.id,
                shop_id: shopId,
                name: item.name,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                is_wholesale: item.is_wholesale || false,
                wholesale_qty: item.wholesale_qty || 0,
                wholesale_price: item.wholesale_price || 0,
                items_per_wholesale: item.items_per_wholesale || 1,
                is_checked: item.is_checked,
                updated_at: new Date().toISOString(),
              })),
              { onConflict: 'id' }
            )
          if (!error) {
            const currentShopping = getOfflineShoppingList(shopId)
            const updatedShopping = currentShopping.map(item => {
              const wasPending = pendingShopping.some(p => p.id === item.id)
              return wasPending ? { ...item, is_synced: true } : item
            })
            replaceOfflineShoppingList(shopId, updatedShopping)
            successCount++
          } else {
            console.warn('[OfflineSync] Erreur Supabase shopping_list:', error.message)
            errorCount++
          }
        } catch (err) {
          console.warn('[OfflineSync] Erreur catch shopping list:', err)
          errorCount++
        }
      }

      // 4. Synchronisation des Ventes hors-ligne
      for (const sale of toSync) {
        try {
          const response = await fetch('/api/sales', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-shop-id': shopId,
              'x-shop-activity': shopActivity,
            },
            body: JSON.stringify({
              id: sale.id,
              created_at: sale.created_at,
              date: sale.date,
              time: sale.time,
              type: sale.type,
              status: sale.status,
              category: sale.category,
              text: sale.notes || '',
              raw_text: sale.notes || '',
              penColor: sale.pen_color || 'blue',
              pen_color: sale.pen_color || 'blue',
              overrideData: {
                type: sale.type,
                status: sale.status,
                category: sale.category,
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
    } finally {
      refreshPendingCount(shopId)
      isSyncing.current = false

      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)

      if (errorCount === 0) {
        setSyncStatus('success')
        onSyncComplete?.()
        statusTimerRef.current = setTimeout(() => setSyncStatus('idle'), 3000)
      } else if (successCount > 0) {
        setSyncStatus('success')
        onSyncComplete?.()
        statusTimerRef.current = setTimeout(() => setSyncStatus('idle'), 3000)
      } else {
        setSyncStatus('error')
        statusTimerRef.current = setTimeout(() => setSyncStatus('idle'), 5000)
      }
    }
  }, [shopId, shopActivity, isOnline, setSyncStatus, refreshPendingCount, onSyncComplete])

  // Déclencher automatiquement quand la connexion revient
  useEffect(() => {
    if (isOnline && shopId) {
      const timer = setTimeout(() => syncOfflineData(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [isOnline, shopId, syncOfflineData])

  // Écouteur PWA Mobile / Veille : réactivation au changement de visibilité (visibilitychange)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isOnline && shopId) {
        syncOfflineData(true)
      }
    }

    const handleOnline = () => {
      if (shopId) {
        syncOfflineData(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [isOnline, shopId, syncOfflineData])

  // Retry automatique toutes les 30s pour les éléments en attente ou en erreur
  useEffect(() => {
    if (!isOnline || !shopId) return

    const retryInterval = setInterval(() => {
      const errored = getSyncErrors(shopId)
      const pending = getPendingSync(shopId)
      if (errored.length > 0 || pending.length > 0) {
        syncOfflineData(true)
      }
    }, 30_000)

    return () => clearInterval(retryInterval)
  }, [isOnline, shopId, syncOfflineData])

  return { syncNow: () => syncOfflineData(true) }
}
