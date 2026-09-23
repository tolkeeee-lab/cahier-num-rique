/**
 * dataPurgeUtils.ts — Suppression et réinitialisation sélective des données du compte
 */

import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'
import { idbReplaceSales, idbReplaceProducts } from '@/lib/indexedDb'
import { getDualShopIds } from '@/lib/shopCodeUtils'

export interface PurgeOptions {
  deleteSales: boolean
  deleteDebts: boolean
  deleteProducts: boolean
  deleteShopping: boolean
  deleteRequests: boolean
  deleteTactileMenu: boolean
}

/**
 * Construit un filtre Supabase OR couvrant tous les alias possibles d'un shopId
 * (UUID, code court, SHOP-XXX, BTQ-XXX)
 */
function buildShopFilter(shopId: string): string {
  const allIds = getDualShopIds(shopId)
  return allIds.map(id => `shop_id.eq.${id}`).join(',')
}

export async function purgeShopData(shopId: string, options: PurgeOptions): Promise<{ success: boolean; message: string }> {
  if (typeof window === 'undefined') return { success: false, message: 'Environnement non disponible' }

  try {
    const isOnline = isSupabaseClientConfigured()
    const allIds = getDualShopIds(shopId)
    const shopFilter = buildShopFilter(shopId)

    // 1. Ventes & Écritures du Journal
    if (options.deleteSales) {
      // Suppression locale pour tous les alias connus
      for (const id of allIds) {
        localStorage.removeItem(`cahier_offline_sales_${id}`)
        try { await idbReplaceSales(id, []) } catch {}
      }
      if (isOnline) {
        try { await supabaseClient.from('sold_articles').delete().or(shopFilter) } catch {}
        try { await supabaseClient.from('sales').delete().or(shopFilter) } catch {}
        try { await supabaseClient.from('cash_closings').delete().or(shopFilter) } catch {}
      }
    }

    // 2. Dettes & Crédits
    if (options.deleteDebts) {
      for (const id of allIds) {
        localStorage.removeItem(`cahier_offline_clients_${id}`)
        localStorage.removeItem(`cahier_offline_suppliers_${id}`)
      }
      if (isOnline) {
        try { await supabaseClient.from('debts').delete().or(shopFilter) } catch {}
        try { await supabaseClient.from('supplier_debts').delete().or(shopFilter) } catch {}
      }
    }

    // 3. Catalogue de Produits & Stock
    if (options.deleteProducts) {
      for (const id of allIds) {
        localStorage.removeItem(`cahier_offline_products_${id}`)
        try { await idbReplaceProducts(id, []) } catch {}
      }
      if (isOnline) {
        try { await supabaseClient.from('products').delete().or(shopFilter) } catch {}
      }
    }

    // 4. Liste de Courses & Ravitaillement
    if (options.deleteShopping) {
      for (const id of allIds) {
        localStorage.removeItem(`cahier_shopping_list_${id}`)
        localStorage.removeItem(`cahier_shopping_${id}`)
      }
    }

    // 5. Demandes Clients
    if (options.deleteRequests) {
      for (const id of allIds) {
        localStorage.removeItem(`cahier_requested_products_${id}`)
      }
    }

    // 6. Raccourcis Tactiles 1-Tap
    if (options.deleteTactileMenu) {
      for (const id of allIds) {
        localStorage.removeItem(`cahier_tactile_menu_${id}`)
        localStorage.removeItem(`cahier_tactile_excluded_${id}`)
      }
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
