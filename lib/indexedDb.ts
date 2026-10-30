/**
 * indexedDb.ts — Couche de stockage asynchrone IndexedDB côté CLIENT
 * 
 * Offre un stockage haute performance et illimité (plusieurs Go)
 * pour les ventes, le stock, les dettes et les requêtes de synchronisation.
 */

import { OfflineSale, OfflineProduct } from './offlineDb'

const DB_NAME = 'cahier_num_rique_db'
const DB_VERSION = 3

export interface SyncQueueItem {
  id: string
  shopId: string
  action: 'create_sale' | 'update_sale' | 'adjust_stock' | 'merge_product' | 'audit_log'
  payload: any
  timestamp: string
  retries: number
  lastError?: string
}

export interface OfflineCashClosing {
  id: string
  shop_id: string
  date: string
  closing_time?: string
  opening_cash: number
  theoretical_cash: number
  actual_cash: number
  difference: number
  cash_receipts: number
  expenses: number
  credit_sales?: number
  notes?: string
  created_at?: string
  is_synced?: boolean
}

export interface OfflineShoppingItem {
  id: string
  shop_id: string
  name: string
  quantity: number
  unit_cost: number
  is_wholesale?: boolean
  wholesale_qty?: number
  wholesale_price?: number
  items_per_wholesale?: number
  is_checked: boolean
  category?: string
  created_at?: string
  updated_at?: string
  is_synced?: boolean
}

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Ouvre ou crée la base de données IndexedDB.
 */
export function getIDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB n\'est pas disponible côté serveur.'))
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result

        // Store des Ventes
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' })
          salesStore.createIndex('shop_id', 'shop_id', { unique: false })
          salesStore.createIndex('is_synced', 'is_synced', { unique: false })
          salesStore.createIndex('date', 'date', { unique: false })
        }

        // Store des Produits (Stock)
        if (!db.objectStoreNames.contains('products')) {
          const prodStore = db.createObjectStore('products', { keyPath: 'id' })
          prodStore.createIndex('shop_id', 'shop_id', { unique: false })
          prodStore.createIndex('name', 'name', { unique: false })
          prodStore.createIndex('category', 'category', { unique: false })
        }

        // Store des Dettes Clients
        if (!db.objectStoreNames.contains('clients')) {
          const clientStore = db.createObjectStore('clients', { keyPath: 'id' })
          clientStore.createIndex('shop_id', 'shop_id', { unique: false })
          clientStore.createIndex('client_name', 'client_name', { unique: false })
        }

        // Store des Dettes Fournisseurs
        if (!db.objectStoreNames.contains('suppliers')) {
          const suppStore = db.createObjectStore('suppliers', { keyPath: 'id' })
          suppStore.createIndex('shop_id', 'shop_id', { unique: false })
          suppStore.createIndex('client_name', 'client_name', { unique: false })
        }

        // Store de la Liste de Courses
        if (!db.objectStoreNames.contains('shopping_list')) {
          const shoppingStore = db.createObjectStore('shopping_list', { keyPath: 'id' })
          shoppingStore.createIndex('shop_id', 'shop_id', { unique: false })
          shoppingStore.createIndex('is_checked', 'is_checked', { unique: false })
        }

        // Store de la File d'attente de Synchronisation Réseau
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
          syncStore.createIndex('shopId', 'shopId', { unique: false })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store des Clôtures de Caisse (Z)
        if (!db.objectStoreNames.contains('cash_closings')) {
          const closingStore = db.createObjectStore('cash_closings', { keyPath: 'id' })
          closingStore.createIndex('shop_id', 'shop_id', { unique: false })
          closingStore.createIndex('date', 'date', { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  return dbPromise
}

// ─── Helpers d'opérations génériques ───────────────────────────────────────────

async function getAllFromStore<T>(storeName: string, shopId?: string): Promise<T[]> {
  try {
    const db = await getIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)

      if (shopId && store.indexNames.contains('shop_id')) {
        const index = store.index('shop_id')
        const req = index.getAll(shopId)
        req.onsuccess = () => resolve(req.result as T[])
        req.onerror = () => reject(req.error)
      } else {
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result as T[])
        req.onerror = () => reject(req.error)
      }
    })
  } catch (err) {
    console.warn(`[IDB] Erreur de lecture sur ${storeName}:`, err)
    return []
  }
}

async function putInStore<T>(storeName: string, item: T): Promise<void> {
  try {
    const db = await getIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const req = store.put(item)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.error(`[IDB] Erreur d'écriture sur ${storeName}:`, err)
  }
}

async function deleteFromStore(storeName: string, id: string): Promise<void> {
  try {
    const db = await getIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.error(`[IDB] Erreur de suppression sur ${storeName}:`, err)
  }
}

function getAltShopId(shopId?: string): string | undefined {
  if (!shopId) return undefined
  return shopId.startsWith('SHOP-') ? shopId.replace(/^SHOP-/i, '') : `SHOP-${shopId}`
}

// ─── API Ventes (IDB) ─────────────────────────────────────────────────────────

export async function idbGetSales(shopId: string): Promise<OfflineSale[]> {
  if (!shopId) return getAllFromStore<OfflineSale>('sales')
  const alt = getAltShopId(shopId)
  const [primaryList, altList] = await Promise.all([
    getAllFromStore<OfflineSale>('sales', shopId),
    alt ? getAllFromStore<OfflineSale>('sales', alt) : Promise.resolve([])
  ])
  if (altList.length === 0) return primaryList
  if (primaryList.length === 0) return altList

  const map = new Map<string, OfflineSale>()
  for (const s of altList) {
    if (s.id) map.set(s.id, s)
  }
  for (const s of primaryList) {
    if (s.id) map.set(s.id, s)
  }
  return Array.from(map.values())
}

export async function idbSaveSale(sale: OfflineSale): Promise<void> {
  return putInStore<OfflineSale>('sales', sale)
}

async function replaceStoreItemsByShopId<T>(
  storeName: string,
  shopId: string,
  items: T[]
): Promise<void> {
  const db = await getIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const index = store.index('shop_id')
    const alt = getAltShopId(shopId)

    let primaryKeys: IDBValidKey[] = []
    let altKeys: IDBValidKey[] = []
    let pendingReads = alt ? 2 : 1

    const executeReplacement = () => {
      const allKeys = Array.from(new Set([...primaryKeys, ...altKeys]))
      for (const key of allKeys) {
        store.delete(key)
      }
      for (const item of items) {
        store.put(item)
      }
    }

    const primaryReq = index.getAllKeys(shopId)
    primaryReq.onsuccess = () => {
      primaryKeys = [...primaryReq.result]
      pendingReads--
      if (pendingReads === 0) executeReplacement()
    }
    primaryReq.onerror = () => reject(primaryReq.error)

    if (alt) {
      const altReq = index.getAllKeys(alt)
      altReq.onsuccess = () => {
        altKeys = [...altReq.result]
        pendingReads--
        if (pendingReads === 0) executeReplacement()
      }
      altReq.onerror = () => {
        pendingReads--
        if (pendingReads === 0) executeReplacement()
      }
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function idbReplaceSales(shopId: string, sales: OfflineSale[]): Promise<void> {
  return replaceStoreItemsByShopId<OfflineSale>('sales', shopId, sales)
}

// ─── API Produits (Stock IDB) ──────────────────────────────────────────────────

export async function idbGetProducts(shopId: string): Promise<OfflineProduct[]> {
  if (!shopId) return getAllFromStore<OfflineProduct>('products')
  const alt = getAltShopId(shopId)
  const [primaryList, altList] = await Promise.all([
    getAllFromStore<OfflineProduct>('products', shopId),
    alt ? getAllFromStore<OfflineProduct>('products', alt) : Promise.resolve([])
  ])
  if (altList.length === 0) return primaryList
  if (primaryList.length === 0) return altList

  const map = new Map<string, OfflineProduct>()
  for (const p of altList) {
    if (p.id) map.set(p.id, p)
  }
  for (const p of primaryList) {
    if (p.id) map.set(p.id, p)
  }
  return Array.from(map.values())
}

export async function idbSaveProduct(product: OfflineProduct): Promise<void> {
  return putInStore<OfflineProduct>('products', product)
}

export async function idbReplaceProducts(shopId: string, products: OfflineProduct[]): Promise<void> {
  return replaceStoreItemsByShopId<OfflineProduct>('products', shopId, products)
}

export async function idbDeleteProduct(productId: string): Promise<void> {
  return deleteFromStore('products', productId)
}

// ─── API Dettes Clients & Fournisseurs (IDB) ──────────────────────────────────

export interface StoredOfflineDebt {
  id: string
  shop_id: string
  client_name: string
  amount: number
  amount_owed?: number
  updated_at?: string
}

export async function idbGetClients(shopId: string): Promise<StoredOfflineDebt[]> {
  if (!shopId) return getAllFromStore<StoredOfflineDebt>('clients')
  const alt = getAltShopId(shopId)
  const [primaryList, altList] = await Promise.all([
    getAllFromStore<StoredOfflineDebt>('clients', shopId),
    alt ? getAllFromStore<StoredOfflineDebt>('clients', alt) : Promise.resolve([])
  ])
  if (altList.length === 0) return primaryList
  if (primaryList.length === 0) return altList

  const map = new Map<string, StoredOfflineDebt>()
  for (const c of altList) {
    const key = (c.client_name || '').toLowerCase().trim()
    if (key) map.set(key, c)
  }
  for (const c of primaryList) {
    const key = (c.client_name || '').toLowerCase().trim()
    if (key) map.set(key, c)
  }
  return Array.from(map.values())
}

export async function idbReplaceClients(shopId: string, clients: StoredOfflineDebt[]): Promise<void> {
  return replaceStoreItemsByShopId<StoredOfflineDebt>('clients', shopId, clients)
}

export async function idbSaveClient(client: StoredOfflineDebt): Promise<void> {
  return putInStore<StoredOfflineDebt>('clients', client)
}

export async function idbGetSuppliers(shopId: string): Promise<StoredOfflineDebt[]> {
  if (!shopId) return getAllFromStore<StoredOfflineDebt>('suppliers')
  const alt = getAltShopId(shopId)
  const [primaryList, altList] = await Promise.all([
    getAllFromStore<StoredOfflineDebt>('suppliers', shopId),
    alt ? getAllFromStore<StoredOfflineDebt>('suppliers', alt) : Promise.resolve([])
  ])
  if (altList.length === 0) return primaryList
  if (primaryList.length === 0) return altList

  const map = new Map<string, StoredOfflineDebt>()
  for (const s of altList) {
    const key = (s.client_name || '').toLowerCase().trim()
    if (key) map.set(key, s)
  }
  for (const s of primaryList) {
    const key = (s.client_name || '').toLowerCase().trim()
    if (key) map.set(key, s)
  }
  return Array.from(map.values())
}

export async function idbReplaceSuppliers(shopId: string, suppliers: StoredOfflineDebt[]): Promise<void> {
  return replaceStoreItemsByShopId<StoredOfflineDebt>('suppliers', shopId, suppliers)
}

export async function idbSaveSupplier(supplier: StoredOfflineDebt): Promise<void> {
  return putInStore<StoredOfflineDebt>('suppliers', supplier)
}

// ─── API Shopping List (IDB) ──────────────────────────────────────────────────

export async function idbGetShoppingItems(shopId?: string): Promise<OfflineShoppingItem[]> {
  return getAllFromStore<OfflineShoppingItem>('shopping_list', shopId)
}

export async function idbSaveShoppingItem(item: OfflineShoppingItem): Promise<void> {
  return putInStore<OfflineShoppingItem>('shopping_list', item)
}

export async function idbReplaceShoppingItems(shopId: string, items: OfflineShoppingItem[]): Promise<void> {
  return replaceStoreItemsByShopId<OfflineShoppingItem>('shopping_list', shopId, items)
}

export async function idbDeleteShoppingItem(itemId: string): Promise<void> {
  return deleteFromStore('shopping_list', itemId)
}

// ─── API Clôtures de Caisse Z (IDB) ──────────────────────────────────────────

export async function idbGetCashClosings(shopId: string): Promise<OfflineCashClosing[]> {
  const primary = await getAllFromStore<OfflineCashClosing>('cash_closings', shopId)
  const alt = getAltShopId(shopId)
  if (!alt) {
    return primary.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }
  const secondary = await getAllFromStore<OfflineCashClosing>('cash_closings', alt)
  const map = new Map<string, OfflineCashClosing>()
  for (const c of secondary) map.set(c.id, c)
  for (const c of primary) map.set(c.id, c)
  return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

export async function idbSaveCashClosing(closing: OfflineCashClosing): Promise<void> {
  return putInStore<OfflineCashClosing>('cash_closings', closing)
}

// ─── API Sync Queue (IDB) ─────────────────────────────────────────────────────

export async function idbGetSyncQueue(shopId?: string): Promise<SyncQueueItem[]> {
  return getAllFromStore<SyncQueueItem>('sync_queue', shopId)
}

export async function idbAddSyncItem(item: SyncQueueItem): Promise<void> {
  return putInStore<SyncQueueItem>('sync_queue', item)
}

export async function idbRemoveSyncItem(id: string): Promise<void> {
  return deleteFromStore('sync_queue', id)
}

export async function idbClearSyncQueue(shopId?: string): Promise<void> {
  try {
    const db = await getIDB()
    const tx = db.transaction('sync_queue', 'readwrite')
    const store = tx.objectStore('sync_queue')
    return new Promise((resolve, reject) => {
      if (!shopId) {
        const req = store.clear()
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      } else {
        const index = store.index('shopId')
        const req = index.getAllKeys(shopId)
        req.onsuccess = () => {
          req.result.forEach(k => store.delete(k))
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
    })
  } catch (err) {
    console.warn('[IDB] Erreur vidage sync_queue:', err)
  }
}

export async function idbClearStoreByShopId(storeName: string, shopId: string): Promise<void> {
  try {
    const db = await getIDB()
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const indexName = store.indexNames.contains('shop_id') ? 'shop_id' : (store.indexNames.contains('shopId') ? 'shopId' : null)
    const alt = getAltShopId(shopId)

    return new Promise((resolve, reject) => {
      if (!indexName) {
        const req = store.openCursor()
        req.onsuccess = () => {
          const cursor = req.result
          if (cursor) {
            const val = cursor.value
            if (val?.shop_id === shopId || val?.shopId === shopId || (alt && (val?.shop_id === alt || val?.shopId === alt))) {
              cursor.delete()
            }
            cursor.continue()
          }
        }
      } else {
        const index = store.index(indexName)
        const primaryReq = index.getAllKeys(shopId)
        primaryReq.onsuccess = () => {
          const keys = [...primaryReq.result]
          if (alt) {
            const altReq = index.getAllKeys(alt)
            altReq.onsuccess = () => {
              const allKeys = Array.from(new Set([...keys, ...altReq.result]))
              allKeys.forEach(k => store.delete(k))
            }
            altReq.onerror = () => keys.forEach(k => store.delete(k))
          } else {
            keys.forEach(k => store.delete(k))
          }
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn(`[IDB] Erreur suppression shopId ${shopId} sur ${storeName}:`, err)
  }
}

// ─── Migration Automatique localStorage -> IndexedDB ─────────────────────────
