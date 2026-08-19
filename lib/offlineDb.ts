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
  migrateLocalStorageToIndexedDB
} from './indexedDb'
import { normalizeProductName, sanitizeProductData } from './productUtils'

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
  }>
  created_at: string
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
}

// ─── Clés localStorage ────────────────────────────────────────────────────────

const salesKey = (shopId: string) => `cahier_offline_sales_${shopId}`
const clientsKey = (shopId: string) => `cahier_offline_clients_${shopId}`
const suppliersKey = (shopId: string) => `cahier_offline_suppliers_${shopId}`
const productsKey = (shopId: string) => `cahier_offline_products_${shopId}`

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
  return readJson<OfflineSale[]>(salesKey(shopId), [])
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
  sales.push(sale)
  writeJson(salesKey(shopId), sales)
  idbSaveSale(sale).catch(() => {})
}

export function updateOfflineSale(
  shopId: string,
  saleId: string,
  patch: Partial<OfflineSale>
): void {
  const sales = getOfflineSales(shopId)
  const idx = sales.findIndex((s) => s.id === saleId)
  if (idx !== -1) {
    sales[idx] = { ...sales[idx], ...patch }
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
  return getOfflineSales(shopId).filter((s) => s.is_synced === false)
}

export function markAsSynced(shopId: string, saleId: string): void {
  updateOfflineSale(shopId, saleId, { is_synced: true, sync_error: undefined })
}

export function markSyncError(shopId: string, saleId: string, error: string): void {
  updateOfflineSale(shopId, saleId, { sync_error: error })
}

// ─── Opérations sur les Dettes Clients ───────────────────────────────────────

export function getOfflineClients(shopId: string): OfflineDebt[] {
  return readJson<OfflineDebt[]>(clientsKey(shopId), [])
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
  return readJson<OfflineDebt[]>(suppliersKey(shopId), [])
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
  const raw = readJson<OfflineProduct[]>(productsKey(shopId), [])
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

export function deleteOfflineProduct(shopId: string, productId: string, productName?: string): void {
  const products = getOfflineProducts(shopId).filter((p) => p.id !== productId)
  writeJson(productsKey(shopId), products)
  idbDeleteProduct(productId).catch(() => {})

  const targetName = productName || (productId.startsWith('orphan_') || productId.startsWith('stk_') ? productId.replace(/^(orphan_|stk_)/, '') : null)
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
  shopId: string
): Record<string, { total_in: number; total_out: number; movements: Array<{ date: string; created_at: string; type: 'in' | 'out'; quantity: number; unit_price: number; notes: string }> }> {
  const sales = getOfflineSales(shopId)
  const stockMap: Record<string, { total_in: number; total_out: number; movements: any[] }> = {}

  for (const sale of sales) {
    if (sale.status === 'crossed_out') continue
    const isIn = sale.type === 'purchase_cash' || sale.type === 'purchase_credit' || sale.type === 'stock_cash'
    const isOut = sale.type === 'cash_in' || sale.type === 'sale_credit'
    if (!isIn && !isOut) continue

    for (const article of sale.articles) {
      if (!article.name) continue
      const cleanName = normalizeProductName(article.name)
      const key = cleanName.toLowerCase().trim()
      if (!stockMap[key]) stockMap[key] = { total_in: 0, total_out: 0, movements: [] }
      if (isIn) {
        stockMap[key].total_in += article.quantity
        stockMap[key].movements.push({ 
          date: sale.date, 
          created_at: sale.created_at,
          type: 'in', 
          quantity: article.quantity, 
          unit_price: article.unit_price, 
          notes: `${article.quantity} ${cleanName} à ${article.unit_price} F` 
        })
      } else {
        stockMap[key].total_out += article.quantity
        stockMap[key].movements.push({ 
          date: sale.date, 
          created_at: sale.created_at,
          type: 'out', 
          quantity: article.quantity, 
          unit_price: article.unit_price, 
          notes: `${article.quantity} ${cleanName} à ${article.unit_price} F` 
        })
      }
    }
  }

  return stockMap
}
