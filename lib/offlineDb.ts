/**
 * offlineDb.ts — Couche d'abstraction localStorage côté CLIENT
 *
 * Ce module centralise toutes les opérations de persistance locale
 * pour le mode hors-ligne du Cahier Numérique.
 *
 * IMPORTANT : Ce fichier est uniquement destiné au navigateur (côté client).
 * Pour le fallback côté API Route (serveur), voir lib/localDb.ts.
 */

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
  unit_cost: number
  unit_price: number
  created_at: string
  multiplier?: number
  packaging_name?: string
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
 * Utilise `crypto.randomUUID()` si disponible, sinon fallback manuel.
 */
export function generateOfflineId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback pour navigateurs très anciens
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ─── Opérations sur les Ventes ────────────────────────────────────────────────

/** Retourne toutes les ventes stockées localement pour une boutique. */
export function getOfflineSales(shopId: string): OfflineSale[] {
  return readJson<OfflineSale[]>(salesKey(shopId), [])
}

/** Sauvegarde une nouvelle vente dans le cache local. */
export function saveOfflineSale(shopId: string, sale: OfflineSale): void {
  const sales = getOfflineSales(shopId)
  if (sale.type === 'cash_out' && !sale.category) {
    sale.category = classifyOfflineExpense(sale.notes)
  }
  sales.push(sale)
  writeJson(salesKey(shopId), sales)
}

/** Met à jour une vente existante dans le cache local (ex: statut crossed_out). */
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
  }
}

/** Remplace entièrement le cache des ventes (utilisé après une sync réseau réussie). */
export function replaceOfflineSales(shopId: string, sales: OfflineSale[]): void {
  writeJson(salesKey(shopId), sales)
}

/** Retourne uniquement les ventes qui n'ont pas encore été synchronisées avec Supabase. */
export function getPendingSync(shopId: string): OfflineSale[] {
  return getOfflineSales(shopId).filter((s) => s.is_synced === false)
}

/** Marque une vente comme synchronisée avec succès. */
export function markAsSynced(shopId: string, saleId: string): void {
  updateOfflineSale(shopId, saleId, { is_synced: true, sync_error: undefined })
}

/** Marque une vente avec une erreur de synchronisation. */
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

/** Retourne un résumé de l'état du cache hors-ligne. */
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
  return readJson<OfflineProduct[]>(productsKey(shopId), [])
}

export function replaceOfflineProducts(shopId: string, products: OfflineProduct[]): void {
  writeJson(productsKey(shopId), products)
}

export function saveOfflineProduct(shopId: string, product: OfflineProduct): void {
  const products = getOfflineProducts(shopId)
  const idx = products.findIndex((p) => p.id === product.id)
  if (idx !== -1) {
    products[idx] = product
  } else {
    products.push(product)
  }
  writeJson(productsKey(shopId), products)
}

export function deleteOfflineProduct(shopId: string, productId: string): void {
  const products = getOfflineProducts(shopId).filter((p) => p.id !== productId)
  writeJson(productsKey(shopId), products)
}

/**
 * Calcule les niveaux de stock depuis les ventes hors-ligne.
 * Entrées = purchase_cash / purchase_credit
 * Sorties = cash_in / sale_credit
 */
export function computeOfflineStock(
  shopId: string
): Record<string, { total_in: number; total_out: number; movements: Array<{ date: string; created_at: string; type: 'in' | 'out'; quantity: number; unit_price: number; notes: string }> }> {
  const sales = getOfflineSales(shopId)
  const stockMap: Record<string, { total_in: number; total_out: number; movements: any[] }> = {}

  for (const sale of sales) {
    if (sale.status === 'crossed_out') continue
    const isIn = sale.type === 'purchase_cash' || sale.type === 'purchase_credit'
    const isOut = sale.type === 'cash_in' || sale.type === 'sale_credit'
    if (!isIn && !isOut) continue

    for (const article of sale.articles) {
      const key = article.name.toLowerCase().trim()
      if (!stockMap[key]) stockMap[key] = { total_in: 0, total_out: 0, movements: [] }
      if (isIn) {
        stockMap[key].total_in += article.quantity
        stockMap[key].movements.push({ 
          date: sale.date, 
          created_at: sale.created_at,
          type: 'in', 
          quantity: article.quantity, 
          unit_price: article.unit_price, 
          notes: `${article.quantity} ${article.name} à ${article.unit_price} F` 
        })
      } else {
        stockMap[key].total_out += article.quantity
        stockMap[key].movements.push({ 
          date: sale.date, 
          created_at: sale.created_at,
          type: 'out', 
          quantity: article.quantity, 
          unit_price: article.unit_price, 
          notes: `${article.quantity} ${article.name} à ${article.unit_price} F` 
        })
      }
    }
  }

  return stockMap
}

