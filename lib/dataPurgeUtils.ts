/**
 * dataPurgeUtils.ts — Suppression et réinitialisation sélective des données du compte
 */

import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'
import {
  idbReplaceSales,
  idbReplaceProducts,
  idbClearStoreByShopId,
  idbClearSyncQueue,
} from '@/lib/indexedDb'
import {
  getDualShopIds,
  isRealUuid,
  findShopIdByCode,
  formatShortShopCode,
  normalizeShopCode,
} from '@/lib/shopCodeUtils'

export interface PurgeOptions {
  deleteSales: boolean
  deleteDebts: boolean
  deleteProducts: boolean
  deleteShopping: boolean
  deleteRequests: boolean
  deleteTactileMenu: boolean
}

/**
 * Résout de façon exhaustive tous les alias connus pour un shopId :
 * Vrai UUID, code court (BTQ-XXXXX), préfixes SHOP-, code brut, etc.
 */
export async function getAllShopAliases(shopId: string): Promise<string[]> {
  const ids = new Set<string>()
  if (!shopId) return []
  ids.add(shopId)

  for (const d of getDualShopIds(shopId)) {
    ids.add(d)
  }

  if (isRealUuid(shopId)) {
    const short = formatShortShopCode(shopId)
    ids.add(short)
    const clean = normalizeShopCode(short)
    if (clean) {
      ids.add(clean)
      ids.add(`SHOP-${clean}`)
      ids.add(`BTQ-${clean}`)
    }
  } else {
    try {
      const realId = await findShopIdByCode(shopId)
      if (realId && isRealUuid(realId)) {
        ids.add(realId)
        for (const d of getDualShopIds(realId)) ids.add(d)
        const short = formatShortShopCode(realId)
        ids.add(short)
        const clean = normalizeShopCode(short)
        if (clean) {
          ids.add(clean)
          ids.add(`SHOP-${clean}`)
          ids.add(`BTQ-${clean}`)
        }
      }
    } catch {}
  }

  return Array.from(ids)
}

export async function purgeShopData(shopId: string, options: PurgeOptions): Promise<{ success: boolean; message: string }> {
  if (typeof window === 'undefined') return { success: false, message: 'Environnement non disponible' }

  try {
    const isOnline = isSupabaseClientConfigured()
    const allIds = await getAllShopAliases(shopId)

    // 1. Ventes & Écritures du Journal
    if (options.deleteSales) {
      for (const id of allIds) {
        localStorage.removeItem(`cahier_offline_sales_${id}`)
        localStorage.removeItem(`cahier_cash_closings_${id}`)
        localStorage.removeItem(`cahier_sync_errors_${id}`)
        localStorage.removeItem(`cahier_offline_sync_queue_${id}`)
        try { await idbReplaceSales(id, []) } catch {}
        try { await idbClearStoreByShopId('cash_closings', id) } catch {}
        try { await idbClearSyncQueue(id) } catch {}
      }

      if (isOnline) {
        try {
          const { data: salesToDelete } = await supabaseClient
            .from('sales')
            .select('id')
            .in('shop_id', allIds)

          if (salesToDelete && salesToDelete.length > 0) {
            const saleIds = salesToDelete.map(s => s.id)
            await supabaseClient.from('sold_articles').delete().in('sale_id', saleIds)
          }
          await supabaseClient.from('sold_articles').delete().in('shop_id', allIds)
          await supabaseClient.from('sales').delete().in('shop_id', allIds)
          await supabaseClient.from('cash_closings').delete().in('shop_id', allIds)
        } catch (e) {
          console.warn('[dataPurge] Erreur suppression ventes en ligne:', e)
        }
      }
    }

    // 2. Dettes & Crédits
    if (options.deleteDebts) {
      for (const id of allIds) {
        localStorage.removeItem(`cahier_offline_clients_${id}`)
        localStorage.removeItem(`cahier_offline_suppliers_${id}`)
        try { await idbClearStoreByShopId('clients', id) } catch {}
        try { await idbClearStoreByShopId('suppliers', id) } catch {}
      }
      if (isOnline) {
        try {
          await supabaseClient.from('debts').delete().in('shop_id', allIds)
          await supabaseClient.from('supplier_debts').delete().in('shop_id', allIds)
        } catch (e) {
          console.warn('[dataPurge] Erreur suppression dettes en ligne:', e)
        }
      }
    }

    // 3. Catalogue de Produits & Stock
    if (options.deleteProducts) {
      for (const id of allIds) {
        localStorage.removeItem(`cahier_offline_products_${id}`)
        try { await idbReplaceProducts(id, []) } catch {}
        try { await idbClearStoreByShopId('products', id) } catch {}
      }
      if (isOnline) {
        try {
          await supabaseClient.from('products').delete().in('shop_id', allIds)
        } catch (e) {
          console.warn('[dataPurge] Erreur suppression produits en ligne:', e)
        }
      }
    }

    // 4. Liste de Courses & Ravitaillement
    if (options.deleteShopping) {
      for (const id of allIds) {
        localStorage.removeItem(`cahier_shopping_list_${id}`)
        localStorage.removeItem(`cahier_shopping_${id}`)
        try { await idbClearStoreByShopId('shopping_list', id) } catch {}
      }
      if (isOnline) {
        try {
          await supabaseClient.from('shopping_list').delete().in('shop_id', allIds)
        } catch (e) {
          console.warn('[dataPurge] Erreur suppression shopping_list en ligne:', e)
        }
      }
    }

    // 5. Demandes Clients
    if (options.deleteRequests) {
      for (const id of allIds) {
        localStorage.removeItem(`cahier_requested_products_${id}`)
      }
      if (isOnline) {
        try {
          await supabaseClient.from('requested_products').delete().in('shop_id', allIds)
        } catch {}
      }
    }

    // 6. Raccourcis Tactiles 1-Tap
    if (options.deleteTactileMenu) {
      for (const id of allIds) {
        localStorage.removeItem(`cahier_tactile_menu_${id}`)
        localStorage.removeItem(`cahier_tactile_excluded_${id}`)
      }
    }

    // Réinitialiser les marqueurs de migration IDB pour forcer la synchronisation fraîche
    for (const id of allIds) {
      localStorage.removeItem(`cahier_migrated_idb_${id}`)
    }

    return {
      success: true,
      message: 'Les données sélectionnées ont été supprimées avec succès.',
    }
  } catch (error: any) {
    console.error('Erreur lors de la purge sélective:', error)
    return {
      success: false,
      message: error?.message || 'Erreur lors de la suppression des données.',
    }
  }
}
