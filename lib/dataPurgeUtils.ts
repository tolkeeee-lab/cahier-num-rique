/**
 * dataPurgeUtils.ts — Suppression et réinitialisation sélective des données du compte
 */

import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'
import { idbReplaceSales, idbReplaceProducts } from '@/lib/indexedDb'

export interface PurgeOptions {
  deleteSales: boolean
  deleteDebts: boolean
  deleteProducts: boolean
  deleteShopping: boolean
  deleteRequests: boolean
  deleteTactileMenu: boolean
}

export async function purgeShopData(shopId: string, options: PurgeOptions): Promise<{ success: boolean; message: string }> {
  if (typeof window === 'undefined') return { success: false, message: 'Environnement non disponible' }

  try {
    const isOnline = isSupabaseClientConfigured()

    // 1. Ventes & Écritures du Journal
    if (options.deleteSales) {
      localStorage.removeItem(`cahier_offline_sales_${shopId}`)
      try { await idbReplaceSales(shopId, []) } catch {}
      if (isOnline) {
        try { await supabaseClient.from('sold_articles').delete().eq('shop_id', shopId) } catch {}
        try { await supabaseClient.from('sales').delete().eq('shop_id', shopId) } catch {}
      }
    }

    // 2. Dettes & Crédits
    if (options.deleteDebts) {
      localStorage.removeItem(`cahier_offline_clients_${shopId}`)
      localStorage.removeItem(`cahier_offline_suppliers_${shopId}`)
      if (isOnline) {
        try { await supabaseClient.from('debts').delete().eq('shop_id', shopId) } catch {}
      }
    }

    // 3. Catalogue de Produits & Stock
    if (options.deleteProducts) {
      localStorage.removeItem(`cahier_offline_products_${shopId}`)
      try { await idbReplaceProducts(shopId, []) } catch {}
      if (isOnline) {
        try { await supabaseClient.from('products').delete().eq('shop_id', shopId) } catch {}
      }
    }

    // 4. Liste de Courses & Ravitaillement
    if (options.deleteShopping) {
      localStorage.removeItem(`cahier_shopping_list_${shopId}`)
    }

    // 5. Demandes Clients
    if (options.deleteRequests) {
      localStorage.removeItem(`cahier_requested_products_${shopId}`)
    }

    // 6. Raccourcis Tactiles 1-Tap
    if (options.deleteTactileMenu) {
      localStorage.removeItem(`cahier_tactile_menu_${shopId}`)
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
