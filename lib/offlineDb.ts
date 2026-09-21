/**
 * offlineDb.ts — Couche d'abstraction locale (localStorage + IndexedDB) côté CLIENT
 *
 * Ce module centralise toutes les opérations de persistance locale
 * pour le mode hors-ligne du Cahier Numérique.
 *
 * IMPORTANT : Ce fichier est uniquement destiné au navigateur (côté client).
 * Pour le fallback côté API Route (serveur), voir lib/localDb.ts.
 */

import {
  idbGetSales, idbSaveSale, idbReplaceSales,
  idbGetProducts, idbSaveProduct, idbReplaceProducts, idbDeleteProduct,
  idbGetShoppingItems, idbSaveShoppingItem, idbReplaceShoppingItems, idbDeleteShoppingItem,
  idbGetCashClosings, idbSaveCashClosing,
  migrateLocalStorageToIndexedDB,
  OfflineShoppingItem, OfflineCashClosing
} from './indexedDb'
import { normalizeProductName, sanitizeProductData } from './productUtils'

export type { OfflineShoppingItem, OfflineCashClosing }

export interface OfflineSale {
  id: string
  shop_id: string
  date: string
  time: string
  client: string
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt' | 'crossed_out'
  type: string
  pen_color: string
  notes: string
  category?: string
  articles: Array<{
    name: string
    quantity: number
    unit_price: number
    category?: string
    packaging_type?: 'quarter' | 'half' | 'carton' | 'lot' | 'unit'
    packaging_label?: string
    pieces_count?: number
    canonical_name?: string
  }>
  created_at: string
  updated_at?: string   // Horodatage de la dernière modification (pour résoudre les conflits)
  is_synced: boolean
  sync_error?: string
}

/**
 * Classifie de manière heuristique une dépense en français par mots-clés.
 */
export function classifyOfflineExpense(notes: string): string {
  const text = (notes || '').toLowerCase().trim()
  if (text.includes('loyer') || text.includes('boutique') || text.includes('emplacement') || text.includes('magasin')) {
    return 'Loyer'
  }
  if (
    text.includes('cie') || 
    text.includes('sodeci') || 
    text.includes('courant') || 
    text.includes('lumiere') || 
    text.includes('internet') || 
    text.includes('wifi') || 
    text.includes('electricite') || 
    text.includes('eau') || 
    text.includes('credit') || 
    text.includes('abonnement') || 
    text.includes('recharge')
  ) {
    return 'Factures'
  }
  if (
    text.includes('carburant') || 
    text.includes('essence') || 
    text.includes('taxi') || 
    text.includes('transport') || 
    text.includes('livraison') || 
    text.includes('voyage') || 
    text.includes('deplacement') || 
    text.includes('gbaka')
  ) {
    return 'Transport'
  }
  if (
    text.includes('salaire') || 
    text.includes('ration') || 
    text.includes('bonus') || 
    text.includes('paie') || 
    text.includes('employe') || 
    text.includes('travailleur') || 
    text.includes('manoeuvre')
  ) {
    return 'Salaires'
  }
  if (
    text.includes('emballage') || 
    text.includes('sac') || 
    text.includes('sachet') || 
    text.includes('plastique') || 
    text.includes('nettoyage') || 
    text.includes('balai') || 
    text.includes('fourniture') || 
    text.includes('cahier') || 
    text.includes('stylo')
  ) {
    return 'Fournitures'
  }
  if (
    text.includes('manger') || 
    text.includes('repas') || 
    text.includes('nourriture') || 
    text.includes('midi') || 
    text.includes('dejeuner') || 
    text.includes('cafe') || 
    text.includes('the') || 
    text.includes('pain')
  ) {
    return 'Repas'
  }
  return 'Divers'
}

/**
 * Classifie de manière heuristique une catégorie de produit en français par mots-clés.
 */
export function classifyOfflineProductCategory(productName: string): string {
  const text = (productName || '').toLowerCase().trim()
  if (
    text.includes('riz') || 
    text.includes('spaghetti') || 
    text.includes('sucre') || 
    text.includes('farine') || 
    text.includes('pain') || 
    text.includes('biscuit') || 
    text.includes('huile') || 
    text.includes('tomate') || 
    text.includes('sel') || 
    text.includes('oignon') || 
    text.includes('nourriture') ||
    text.includes('bonbon')
  ) {
    return 'Alimentation'
  }
  if (
    text.includes('biere') || 
    text.includes('beer') || 
    text.includes('eau') || 
    text.includes('jus') || 
    text.includes('coca') || 
    text.includes('fanta') || 
    text.includes('castel') || 
    text.includes('soda') || 
    text.includes('boisson') || 
    text.includes('bouteille') ||
    text.includes('sprite') ||
    text.includes('flag') ||
    text.includes('heineken')
  ) {
    return 'Boissons'
  }
  if (
    text.includes('savon') || 
    text.includes('omo') || 
    text.includes('shampoing') || 
    text.includes('parfum') || 
    text.includes('dentifrice') || 
    text.includes('pommade') || 
    text.includes('lotion') || 
    text.includes('lingette') || 
    text.includes('couche')
  ) {
    return 'Hygiène & Cosmétique'
  }
  if (
    text.includes('tel') || 
    text.includes('telephone') || 
    text.includes('chargeur') || 
    text.includes('pile') || 
    text.includes('ampoule') || 
    text.includes('cable') || 
    text.includes('carte') || 
    text.includes('credit') || 
    text.includes('mobile') || 
    text.includes('recharge')
  ) {
    return 'Électronique'
  }
  if (
    text.includes('vetement') || 
    text.includes('pagne') || 
    text.includes('pantalon') || 
    text.includes('chemise') || 
    text.includes('chaussure') || 
    text.includes('habit') || 
    text.includes('t-shirt')
  ) {
    return 'Habillement'
  }
  return 'Divers'
}

export interface OfflineDebt {
  client_name: string
  amount: number
  amount_owed?: number
}

export interface OfflineProduct {
  id: string
  shop_id: string
  name: string
  category: string
  unit: string
  alert_threshold: number
  initial_stock: number
  current_stock?: number
  unit_cost: number
  unit_price: number
  created_at: string
  multiplier?: number
  packaging_name?: string
  stock_tracked?: boolean
  is_service?: boolean
  is_unlimited?: boolean
  lot_quantity?: number
  lot_price?: number
  packages_count?: number
  package_cost?: number
  wholesale_price?: number
  half_package_price?: number
  quarter_package_price?: number
  trade_type?: 'retail' | 'semi_wholesale' | 'wholesale'
  is_synced?: boolean
  sync_error?: string
}

// ─── Clés localStorage ────────────────────────────────────────────────────────

const salesKey = (shopId: string) => `cahier_offline_sales_${shopId}`
const clientsKey = (shopId: string) => `cahier_offline_clients_${shopId}`
const suppliersKey = (shopId: string) => `cahier_offline_suppliers_${shopId}`
const productsKey = (shopId: string) => `cahier_offline_products_${shopId}`

/**
 * Migre les ventes et produits d'une ancienne clé d'identifiant boutique (ex: BTQ-58C54) vers l'UUID réel
 */
export function migrateOfflineShopSales(oldShopId: string, newShopId: string): void {
  if (!oldShopId || !newShopId || oldShopId === newShopId) return

  try {
    // 1. Migration des Ventes
    const oldSalesKey = salesKey(oldShopId)
    const oldSales = readJson<OfflineSale[]>(oldSalesKey, [])
    if (oldSales.length > 0) {
      const newSalesKey = salesKey(newShopId)
      const currentNewSales = readJson<OfflineSale[]>(newSalesKey, [])
      const combined = [...currentNewSales]

      for (const s of oldSales) {
        const updatedSale = { ...s, shop_id: newShopId, is_synced: false }
        if (!combined.some(c => c.id === s.id)) {
          combined.push(updatedSale)
        }
      }

      writeJson(newSalesKey, combined)
      localStorage.removeItem(oldSalesKey)
    }

    // 2. Migration des Produits
    const oldProdKey = productsKey(oldShopId)
    const oldProds = readJson<OfflineProduct[]>(oldProdKey, [])
    if (oldProds.length > 0) {
      const newProdKey = productsKey(newShopId)
      const currentNewProds = readJson<OfflineProduct[]>(newProdKey, [])
      const combinedProds = [...currentNewProds]

      for (const p of oldProds) {
        const updatedProd = { ...p, shop_id: newShopId }
        if (!combinedProds.some(c => c.id === p.id || c.name.toLowerCase().trim() === p.name.toLowerCase().trim())) {
          combinedProds.push(updatedProd)
        }
      }

      writeJson(newProdKey, combinedProds)
      localStorage.removeItem(oldProdKey)
    }

    // 3. Migration des Dettes Clients
    const oldClientKey = clientsKey(oldShopId)
    const oldClients = readJson<OfflineDebt[]>(oldClientKey, [])
    if (oldClients.length > 0) {
      const newClientKey = clientsKey(newShopId)
      const currentNewClients = readJson<OfflineDebt[]>(newClientKey, [])
      const combinedClients = [...currentNewClients]

      for (const c of oldClients) {
        if (!combinedClients.some(cur => cur.client_name?.toLowerCase().trim() === c.client_name?.toLowerCase().trim())) {
          combinedClients.push(c)
        }
      }

      writeJson(newClientKey, combinedClients)
      localStorage.removeItem(oldClientKey)
    }

    // 4. Migration des Dettes Fournisseurs
    const oldSupplierKey = suppliersKey(oldShopId)
    const oldSuppliers = readJson<OfflineDebt[]>(oldSupplierKey, [])
    if (oldSuppliers.length > 0) {
      const newSupplierKey = suppliersKey(newShopId)
      const currentNewSuppliers = readJson<OfflineDebt[]>(newSupplierKey, [])
      const combinedSuppliers = [...currentNewSuppliers]

      for (const sup of oldSuppliers) {
        if (!combinedSuppliers.some(cur => cur.client_name?.toLowerCase().trim() === sup.client_name?.toLowerCase().trim())) {
          combinedSuppliers.push(sup)
        }
      }

      writeJson(newSupplierKey, combinedSuppliers)
      localStorage.removeItem(oldSupplierKey)
    }

    // 5. Migration des Clés Unitaires & Listes de la Boutique
    const singleKeysToMigrate = [
      'cahier_currency',
      'cahier_shopping_list',
      'cahier_requested_products',
      'cahier_tactile_menu',
      'cahier_tactile_excluded',
      'cahier_analytics_widgets',
      'cahier_shop_name',
      'cahier_shop_phone',
      'cahier_shop_address',
      'cahier_shop_country',
      'cahier_shop_city',
    ]

    for (const prefix of singleKeysToMigrate) {
      const oldKey = `${prefix}_${oldShopId}`
      const newKey = `${prefix}_${newShopId}`
      const val = localStorage.getItem(oldKey)
      if (val !== null && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, val)
      }
      localStorage.removeItem(oldKey)
    }
  } catch (e) {
    console.warn('[offlineDb] Erreur migration collections boutique:', e)
  }
}


// ─── Utilitaires ─────────────────────────────────────────────────────────────

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`[offlineDb] Impossible d'écrire la clé "${key}":`, e)
  }
}

/**
 * Génère un UUID v4 compatible navigateur.
 */
export function generateOfflineId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ─── Opérations sur les Ventes ────────────────────────────────────────────────

export function getOfflineSales(shopId: string): OfflineSale[] {
  if (typeof window !== 'undefined') {
    migrateLocalStorageToIndexedDB(shopId).catch(() => {})
  }
  if (!shopId) return []
  const alt = shopId.startsWith('SHOP-') ? shopId.replace(/^SHOP-/i, '') : `SHOP-${shopId}`
  const primary = readJson<OfflineSale[]>(salesKey(shopId), [])
  const altList = readJson<OfflineSale[]>(salesKey(alt), [])
  if (altList.length === 0) return primary
  if (primary.length === 0) return altList
  const map = new Map<string, OfflineSale>()
  for (const s of altList) if (s.id) map.set(s.id, s)
  for (const s of primary) if (s.id) map.set(s.id, s)
  return Array.from(map.values())
}

export async function getOfflineSalesAsync(shopId: string): Promise<OfflineSale[]> {
  const sales = await idbGetSales(shopId)
  if (sales && sales.length > 0) return sales
  return getOfflineSales(shopId)
}

export function saveOfflineSale(shopId: string, sale: OfflineSale): void {
  const sales = getOfflineSales(shopId)
  if (sale.type === 'cash_out' && !sale.category) {
    sale.category = classifyOfflineExpense(sale.notes)
  }
  if (sale.articles && sale.articles.length > 0) {
    sale.articles.forEach(art => {
      if (!art.category) {
        art.category = classifyOfflineProductCategory(art.name)
      }
    })
  }
  // Horodatage de création et modification
  sale.updated_at = new Date().toISOString()
  sales.push(sale)
  writeJson(salesKey(shopId), sales)
  idbSaveSale(sale).catch(() => {})

  // Répercussion immédiate sur le stock local pour tout mouvement de marchandise
  if (sale.status !== 'crossed_out' && sale.articles && sale.articles.length > 0) {
    const isOut = ['cash_in', 'sale', 'sale_cash', 'sale_credit', 'stock_damage', 'personal_use'].includes(sale.type)
    const isIn = ['purchase_cash', 'purchase_credit', 'stock_cash', 'stock_in'].includes(sale.type)
    if (isOut || isIn) {
      try {
        const products = getOfflineProducts(shopId)
        let changed = false
        for (const art of sale.articles) {
          if (!art.name && !art.canonical_name) continue
          const searchName = (art.canonical_name || art.name)
          const normName = normalizeProductName(searchName).toLowerCase().trim()
          
          let prod = products.find(p => normalizeProductName(p.name).toLowerCase().trim() === normName)
          if (!prod) {
            const stripped = normName.replace(/^(?:1\/2|demi|1\/4|quart|3\/4)?\s*(?:de\s+)?(?:cartons?|packs?|sacs?|fardeaux?|casiers?|caisses?|boites?|boîtes?|paquets?|lots?\s*(?:de\s+\d+)?)\s*(?:de\s+)?/i, '').trim()
            prod = products.find(p => normalizeProductName(p.name).toLowerCase().trim() === stripped)
          }

          if (prod) {
            const isUnlimited = prod.is_service || prod.is_unlimited || prod.category === 'Cuisine' || prod.category === 'Service'
            if (!isUnlimited) {
              const curr = typeof prod.current_stock === 'number' ? prod.current_stock : (prod.initial_stock || 0)
              
              let piecesDeducted = Number(art.quantity || 1)
              if (typeof art.pieces_count === 'number' && art.pieces_count > 0) {
                piecesDeducted = art.pieces_count
              } else if (prod.multiplier && prod.multiplier > 1) {
                const lowerArtName = (art.name || '').toLowerCase()
                const lowerNotes = (sale.notes || '').toLowerCase()
                const combined = `${lowerArtName} ${lowerNotes}`
                
                if (art.packaging_type === 'quarter' || /^(?:1\/4|quart)\b/i.test(combined)) {
                  piecesDeducted = Math.max(1, Math.round(prod.multiplier * 0.25)) * Number(art.quantity || 1)
                } else if (art.packaging_type === 'half' || /^(?:1\/2|demi)\b/i.test(combined)) {
                  piecesDeducted = Math.max(1, Math.round(prod.multiplier * 0.5)) * Number(art.quantity || 1)
                } else if (art.packaging_type === 'carton' || /\b(?:carton|pack|sac|casier|fardeau|caisse)\b/i.test(combined)) {
                  piecesDeducted = prod.multiplier * Number(art.quantity || 1)
                } else if (art.packaging_type === 'lot') {
                  piecesDeducted = (prod.lot_quantity || 3) * Number(art.quantity || 1)
                }
              }

              const next = isOut ? Math.max(0, Math.round((curr - piecesDeducted) * 100) / 100) : Math.round((curr + piecesDeducted) * 100) / 100
              prod.current_stock = next
              prod.stock_tracked = true
              changed = true
            }
          }
        }
        if (changed) {
          replaceOfflineProducts(shopId, products)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cahier_stock_updated'))
          }
        }
      } catch {}
    }
  }
}

export function updateOfflineSale(
  shopId: string,
  saleId: string,
  patch: Partial<OfflineSale>
): void {
  const sales = getOfflineSales(shopId)
  const idx = sales.findIndex((s) => s.id === saleId)
  if (idx !== -1) {
    // Mettre à jour l'horodatage de modification pour résolution de conflits
    sales[idx] = { ...sales[idx], ...patch, updated_at: new Date().toISOString() }
    writeJson(salesKey(shopId), sales)
    idbSaveSale(sales[idx]).catch(() => {})
  }
}

export function replaceOfflineSaleId(shopId: string, oldId: string, newSale: OfflineSale): void {
  const sales = getOfflineSales(shopId)
  const idx = sales.findIndex((s) => s.id === oldId)
  if (idx !== -1) {
    sales[idx] = newSale
  } else {
    const existingIdx = sales.findIndex((s) => s.id === newSale.id)
    if (existingIdx !== -1) {
      sales[existingIdx] = newSale
    } else {
      sales.push(newSale)
    }
  }
  writeJson(salesKey(shopId), sales)
  idbReplaceSales(shopId, sales).catch(() => {})
}

export function replaceOfflineSales(shopId: string, sales: OfflineSale[]): void {
  writeJson(salesKey(shopId), sales)
  idbReplaceSales(shopId, sales).catch(() => {})
}

export function getPendingSync(shopId: string): OfflineSale[] {
  // Ventes non synchronisées ET sans erreur précédente (première tentative)
  return getOfflineSales(shopId).filter((s) => s.is_synced === false && !s.sync_error)
}

/**
 * Retourne les ventes dont la synchronisation a échoué (pour retry automatique).
 */
export function getSyncErrors(shopId: string): OfflineSale[] {
  return getOfflineSales(shopId).filter((s) => s.is_synced === false && !!s.sync_error)
}

export function markAsSynced(shopId: string, saleId: string): void {
  updateOfflineSale(shopId, saleId, { is_synced: true, sync_error: undefined })
}

export function markSyncError(shopId: string, saleId: string, error: string): void {
  updateOfflineSale(shopId, saleId, { sync_error: error })
}

// ─── Opérations sur les Dettes Clients ───────────────────────────────────────

export function getOfflineClients(shopId: string): OfflineDebt[] {
  if (!shopId) return []
  const alt = shopId.startsWith('SHOP-') ? shopId.replace(/^SHOP-/i, '') : `SHOP-${shopId}`
  const primary = readJson<OfflineDebt[]>(clientsKey(shopId), [])
  const altList = readJson<OfflineDebt[]>(clientsKey(alt), [])
  if (altList.length === 0) return primary
  if (primary.length === 0) return altList
  const map = new Map<string, OfflineDebt>()
  for (const c of altList) {
    const key = (c.client_name || '').toLowerCase().trim()
    if (key) map.set(key, c)
  }
  for (const c of primary) {
    const key = (c.client_name || '').toLowerCase().trim()
    if (key) map.set(key, c)
  }
  return Array.from(map.values())
}

export function replaceOfflineClients(shopId: string, clients: OfflineDebt[]): void {
  writeJson(clientsKey(shopId), clients)
}

export function addOrUpdateOfflineClientDebt(
  shopId: string,
  clientName: string,
  amount: number
): void {
  const clients = getOfflineClients(shopId)
  const existing = clients.find(
    (c) => c.client_name?.toLowerCase() === clientName.toLowerCase()
  )
  if (existing) {
    existing.amount = (existing.amount || 0) + amount
  } else {
    clients.push({ client_name: clientName, amount })
  }
  writeJson(clientsKey(shopId), clients)
}

// ─── Opérations sur les Dettes Fournisseurs ──────────────────────────────────

export function getOfflineSuppliers(shopId: string): OfflineDebt[] {
  if (!shopId) return []
  const alt = shopId.startsWith('SHOP-') ? shopId.replace(/^SHOP-/i, '') : `SHOP-${shopId}`
  const primary = readJson<OfflineDebt[]>(suppliersKey(shopId), [])
  const altList = readJson<OfflineDebt[]>(suppliersKey(alt), [])
  if (altList.length === 0) return primary
  if (primary.length === 0) return altList
  const map = new Map<string, OfflineDebt>()
  for (const s of altList) {
    const key = (s.client_name || '').toLowerCase().trim()
    if (key) map.set(key, s)
  }
  for (const s of primary) {
    const key = (s.client_name || '').toLowerCase().trim()
    if (key) map.set(key, s)
  }
  return Array.from(map.values())
}

export function replaceOfflineSuppliers(shopId: string, suppliers: OfflineDebt[]): void {
  writeJson(suppliersKey(shopId), suppliers)
}

export function addOrUpdateOfflineSupplierDebt(
  shopId: string,
  supplierName: string,
  amount: number
): void {
  const suppliers = getOfflineSuppliers(shopId)
  const existing = suppliers.find(
    (s) => s.client_name?.toLowerCase() === supplierName.toLowerCase()
  )
  if (existing) {
    existing.amount = (existing.amount || 0) + amount
  } else {
    suppliers.push({ client_name: supplierName, amount })
  }
  writeJson(suppliersKey(shopId), suppliers)
}

// ─── Statistiques ─────────────────────────────────────────────────────────────

export function getOfflineStats(shopId: string): {
  totalSales: number
  pendingSync: number
  syncErrors: number
} {
  const sales = getOfflineSales(shopId)
  return {
    totalSales: sales.length,
    pendingSync: sales.filter((s) => s.is_synced === false).length,
    syncErrors: sales.filter((s) => !!s.sync_error).length,
  }
}

// ─── Opérations sur les Produits (Catalogue Stock) ───────────────────────────

export function getOfflineProducts(shopId: string): OfflineProduct[] {
  if (typeof window !== 'undefined') {
    migrateLocalStorageToIndexedDB(shopId).catch(() => {})
  }
  if (!shopId) return []
  const alt = shopId.startsWith('SHOP-') ? shopId.replace(/^SHOP-/i, '') : `SHOP-${shopId}`
  const primaryRaw = readJson<OfflineProduct[]>(productsKey(shopId), [])
  const altRaw = readJson<OfflineProduct[]>(productsKey(alt), [])
  let raw: OfflineProduct[] = primaryRaw
  if (altRaw.length > 0 && primaryRaw.length === 0) {
    raw = altRaw
  } else if (altRaw.length > 0 && primaryRaw.length > 0) {
    const map = new Map<string, OfflineProduct>()
    for (const p of altRaw) if (p.id) map.set(p.id, p)
    for (const p of primaryRaw) if (p.id) map.set(p.id, p)
    raw = Array.from(map.values())
  }
  return raw.map(p => sanitizeProductData(p as any))
}

export async function getOfflineProductsAsync(shopId: string): Promise<OfflineProduct[]> {
  const products = await idbGetProducts(shopId)
  if (products && products.length > 0) return products.map(p => sanitizeProductData(p as any))
  return getOfflineProducts(shopId)
}

export function replaceOfflineProducts(shopId: string, products: OfflineProduct[]): void {
  const clean = products.map(p => sanitizeProductData(p as any))
  writeJson(productsKey(shopId), clean)
  idbReplaceProducts(shopId, clean).catch(() => {})
}

export function clearOfflineProducts(shopId: string): void {
  writeJson(productsKey(shopId), [])
  idbReplaceProducts(shopId, []).catch(() => {})
}

export function saveOfflineProduct(shopId: string, product: OfflineProduct): void {
  const cleanProduct = sanitizeProductData(product as any)
  if (cleanProduct.is_synced === undefined) {
    cleanProduct.is_synced = !cleanProduct.id.startsWith('stk_')
  }
  const products = getOfflineProducts(shopId)
  const idx = products.findIndex((p) => p.id === cleanProduct.id)
  if (idx !== -1) {
    products[idx] = cleanProduct
  } else {
    products.push(cleanProduct)
  }
  writeJson(productsKey(shopId), products)
  idbSaveProduct(cleanProduct).catch(() => {})
}

export function getPendingOfflineProducts(shopId: string): OfflineProduct[] {
  return getOfflineProducts(shopId).filter((p) => p.is_synced === false || p.id.startsWith('stk_'))
}

export function markProductAsSynced(shopId: string, oldId: string, serverProduct: any): void {
  const products = getOfflineProducts(shopId)
  const updatedProduct = sanitizeProductData({ ...serverProduct, is_synced: true, sync_error: undefined })
  const idx = products.findIndex((p) => p.id === oldId || p.name.toLowerCase().trim() === updatedProduct.name.toLowerCase().trim())
  if (idx !== -1) {
    products[idx] = updatedProduct
  } else {
    products.push(updatedProduct)
  }
  writeJson(productsKey(shopId), products)
  idbSaveProduct(updatedProduct).catch(() => {})
  if (oldId !== updatedProduct.id) {
    idbDeleteProduct(oldId).catch(() => {})
  }
}

export function deleteOfflineProduct(shopId: string, productId: string, productName?: string): void {
  const normName = productName ? productName.toLowerCase().trim() : null
  const products = getOfflineProducts(shopId).filter(
    (p) => p.id !== productId && (!normName || p.name.toLowerCase().trim() !== normName)
  )
  writeJson(productsKey(shopId), products)
  idbDeleteProduct(productId).catch(() => {})

  const targetName = productName || (productId.startsWith('orphan_') ? productId.replace(/^orphan_/, '') : null)
  if (targetName) {
    const targetKey = targetName.toLowerCase().trim()
    const sales = getOfflineSales(shopId)
    let modified = false
    sales.forEach(s => {
      if (s.articles && s.articles.length > 0) {
        const origLen = s.articles.length
        s.articles = s.articles.filter(a => normalizeProductName(a.name).toLowerCase().trim() !== targetKey)
        if (s.articles.length !== origLen) modified = true
      }
    })
    if (modified) {
      writeJson(salesKey(shopId), sales)
      idbReplaceSales(shopId, sales).catch(() => {})
    }
  }
}

// ─── Calcul du stock offline ──────────────────────────────────────────────────

export function computeOfflineStock(
  shopId: string,
  productsList?: OfflineProduct[]
): Record<string, { total_in: number; total_out: number; movements: Array<{ date: string; created_at: string; type: 'in' | 'out'; quantity: number; unit_price: number; notes: string }> }> {
  const sales = getOfflineSales(shopId)
  const stockMap: Record<string, { total_in: number; total_out: number; movements: any[] }> = {}

  const prods = productsList || getOfflineProducts(shopId)
  const trackingStartMap: Record<string, number> = {}
  for (const p of prods) {
    const k = normalizeProductName(p.name).toLowerCase().trim()
    if ((p as any).tracking_started_at) {
      trackingStartMap[k] = new Date((p as any).tracking_started_at).getTime()
    } else if (p.initial_stock && p.created_at) {
      trackingStartMap[k] = new Date(p.created_at).getTime()
    }
  }

  for (const sale of sales) {
    if (sale.status === 'crossed_out') continue
    const isIn = sale.type === 'purchase_cash' || sale.type === 'purchase_credit' || sale.type === 'stock_cash' || sale.type === 'stock_in' || sale.type === 'sale_return'
    const isOut = sale.type === 'cash_in' || sale.type === 'sale_credit' || sale.type === 'sale' || sale.type === 'sale_cash' || sale.type === 'stock_damage' || sale.type === 'personal_use' || sale.type === 'purchase_return'
    if (!isIn && !isOut) continue

    const saleTime = sale.created_at ? new Date(sale.created_at).getTime() : new Date(sale.date).getTime()

    for (const article of sale.articles) {
      if (!article.name) continue
      const cleanName = normalizeProductName(article.name)
      const key = cleanName.toLowerCase().trim()

      const trackingStart = trackingStartMap[key] || 0
      if (trackingStart > 0 && saleTime <= trackingStart) {
        // Mouvement antérieur à la consolidation manuelle : ignoré (conforme serveur /api/stock)
        continue
      }

      if (!stockMap[key]) stockMap[key] = { total_in: 0, total_out: 0, movements: [] }
      const qty = Number(article.quantity || 1)
      const price = Number(article.unit_price || 0)

      if (isIn) {
        stockMap[key].total_in += qty
        stockMap[key].movements.push({ 
          date: sale.date, 
          created_at: sale.created_at,
          type: 'in', 
          quantity: qty, 
          unit_price: price, 
          notes: `${qty} ${cleanName} à ${price} F` 
        })
      } else {
        stockMap[key].total_out += qty
        stockMap[key].movements.push({ 
          date: sale.date, 
          created_at: sale.created_at,
          type: 'out', 
          quantity: qty, 
          unit_price: price, 
          notes: `${qty} ${cleanName} à ${price} F` 
        })
      }
    }
  }

  return stockMap
}

// ─── Gestion Hors-Ligne de la Liste de Courses (Shopping List) ─────────────────

function shoppingListKey(shopId: string): string {
  return `cahier_shopping_list_${shopId}`
}

export function getOfflineShoppingList(shopId: string): OfflineShoppingItem[] {
  if (typeof window === 'undefined') return []
  const items = readJson<OfflineShoppingItem[]>(shoppingListKey(shopId), [])
  
  // Hydratation asynchrone non-bloquante depuis IndexedDB
  idbGetShoppingItems(shopId).then(idbItems => {
    if (idbItems && idbItems.length > 0 && items.length === 0) {
      writeJson(shoppingListKey(shopId), idbItems)
    }
  }).catch(() => {})

  return items
}

export function saveOfflineShoppingItem(shopId: string, item: OfflineShoppingItem): void {
  const items = getOfflineShoppingList(shopId)
  const idx = items.findIndex(i => i.id === item.id)
  if (idx !== -1) {
    items[idx] = item
  } else {
    items.unshift(item)
  }
  writeJson(shoppingListKey(shopId), items)
  idbSaveShoppingItem(item).catch(() => {})
}

export function deleteOfflineShoppingItem(shopId: string, itemId: string): void {
  const items = getOfflineShoppingList(shopId).filter(i => i.id !== itemId)
  writeJson(shoppingListKey(shopId), items)
  idbDeleteShoppingItem(itemId).catch(() => {})
}

export function replaceOfflineShoppingList(shopId: string, items: OfflineShoppingItem[]): void {
  writeJson(shoppingListKey(shopId), items)
  idbReplaceShoppingItems(shopId, items).catch(() => {})
}

// ─── Gestion Hors-Ligne des Clôtures de Caisse (Z) ───────────────────────────

function cashClosingsKey(shopId: string): string {
  return `cahier_cash_closings_${shopId}`
}

export function getOfflineCashClosings(shopId: string): OfflineCashClosing[] {
  if (typeof window === 'undefined') return []
  const closings = readJson<OfflineCashClosing[]>(cashClosingsKey(shopId), [])

  // Hydratation asynchrone non-bloquante depuis IndexedDB
  idbGetCashClosings(shopId).then(idbClosings => {
    if (idbClosings && idbClosings.length > 0 && closings.length === 0) {
      writeJson(cashClosingsKey(shopId), idbClosings)
    }
  }).catch(() => {})

  return closings
}

export function saveOfflineCashClosing(shopId: string, closing: OfflineCashClosing): void {
  const closings = getOfflineCashClosings(shopId)
  const idx = closings.findIndex(c => c.id === closing.id || (c.date === closing.date && c.shop_id === closing.shop_id))
  if (idx !== -1) {
    closings[idx] = closing
  } else {
    closings.unshift(closing)
  }
  writeJson(cashClosingsKey(shopId), closings)
  idbSaveCashClosing(closing).catch(() => {})
}

export function replaceOfflineCashClosings(shopId: string, closings: OfflineCashClosing[]): void {
  writeJson(cashClosingsKey(shopId), closings)
  Promise.all(closings.map(c => idbSaveCashClosing(c))).catch(() => {})
}

