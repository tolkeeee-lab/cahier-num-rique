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
  articles: Array<{
    name: string
    quantity: number
    unit_price: number
  }>
  created_at: string
  is_synced: boolean
  sync_error?: string
}

export interface OfflineDebt {
  client_name: string
  amount: number
  amount_owed?: number
}

// ─── Clés localStorage ────────────────────────────────────────────────────────

const salesKey = (shopId: string) => `cahier_offline_sales_${shopId}`
const clientsKey = (shopId: string) => `cahier_offline_clients_${shopId}`
const suppliersKey = (shopId: string) => `cahier_offline_suppliers_${shopId}`

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
