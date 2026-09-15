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
    const altShopId = shopId.startsWith('SHOP-') ? shopId.replace('SHOP-', '') : `SHOP-${shopId}`

    // 1. Ventes & Écritures du Journal
    if (options.deleteSales) {
      localStorage.removeItem(`cahier_offline_sales_${shopId}`)
      localStorage.removeItem(`cahier_offline_sales_${altShopId}`)
      try { await idbReplaceSales(shopId, []) } catch {}
      try { await idbReplaceSales(altShopId, []) } catch {}
      if (isOnline) {
        try { await supabaseClient.from('sold_articles').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`) } catch {}
        try { await supabaseClient.from('sales').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`) } catch {}
        try { await supabaseClient.from('cash_closings').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`) } catch {}
      }
    }

    // 2. Dettes & Crédits
    if (options.deleteDebts) {
      localStorage.removeItem(`cahier_offline_clients_${shopId}`)
      localStorage.removeItem(`cahier_offline_clients_${altShopId}`)
      localStorage.removeItem(`cahier_offline_suppliers_${shopId}`)
      localStorage.removeItem(`cahier_offline_suppliers_${altShopId}`)
      if (isOnline) {
        try { await supabaseClient.from('debts').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`) } catch {}
        try { await supabaseClient.from('supplier_debts').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`) } catch {}
      }
    }

    // 3. Catalogue de Produits & Stock
    if (options.deleteProducts) {
      localStorage.removeItem(`cahier_offline_products_${shopId}`)
      localStorage.removeItem(`cahier_offline_products_${altShopId}`)
      try { await idbReplaceProducts(shopId, []) } catch {}
      try { await idbReplaceProducts(altShopId, []) } catch {}
      if (isOnline) {
        try { await supabaseClient.from('products').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`) } catch {}
      }
    }

    // 4. Liste de Courses & Ravitaillement
    if (options.deleteShopping) {
      localStorage.removeItem(`cahier_shopping_list_${shopId}`)
      localStorage.removeItem(`cahier_shopping_list_${altShopId}`)
    }

    // 5. Demandes Clients
    if (options.deleteRequests) {
      localStorage.removeItem(`cahier_requested_products_${shopId}`)
      localStorage.removeItem(`cahier_requested_products_${altShopId}`)
    }

    // 6. Raccourcis Tactiles 1-Tap
    if (options.deleteTactileMenu) {
      localStorage.removeItem(`cahier_tactile_menu_${shopId}`)
      localStorage.removeItem(`cahier_tactile_menu_${altShopId}`)
      localStorage.removeItem(`cahier_tactile_excluded_${shopId}`)
      localStorage.removeItem(`cahier_tactile_excluded_${altShopId}`)
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
