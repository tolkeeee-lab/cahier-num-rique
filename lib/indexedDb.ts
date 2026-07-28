/**
 * indexedDb.ts — Couche de stockage asynchrone IndexedDB côté CLIENT
 * 
 * Offre un stockage haute performance et illimité (plusieurs Go)
 * pour les ventes, le stock, les dettes et les requêtes de synchronisation.
 */

import { OfflineSale, OfflineProduct } from './offlineDb'

const DB_NAME = 'cahier_num_rique_db'
const DB_VERSION = 1

export interface SyncQueueItem {
  id: string
  shopId: string
  action: 'create_sale' | 'update_sale' | 'adjust_stock' | 'merge_product'
  payload: any
  timestamp: string
  retries: number
  lastError?: string
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

        // Store de la File d'attente de Synchronisation Réseau
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
          syncStore.createIndex('shopId', 'shopId', { unique: false })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
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

async function putBulkInStore<T>(storeName: string, items: T[]): Promise<void> {
  try {
    const db = await getIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      items.forEach(item => store.put(item))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error(`[IDB] Erreur d'écriture en masse sur ${storeName}:`, err)
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

// ─── API Ventes (IDB) ─────────────────────────────────────────────────────────

export async function idbGetSales(shopId: string): Promise<OfflineSale[]> {
  return getAllFromStore<OfflineSale>('sales', shopId)
}

export async function idbSaveSale(sale: OfflineSale): Promise<void> {
  return putInStore<OfflineSale>('sales', sale)
}

export async function idbReplaceSales(shopId: string, sales: OfflineSale[]): Promise<void> {
  const db = await getIDB()
  const tx = db.transaction('sales', 'readwrite')
  const store = tx.objectStore('sales')
  
  const index = store.index('shop_id')
  const keysReq = index.getAllKeys(shopId)
  
  return new Promise((resolve, reject) => {
    keysReq.onsuccess = () => {
      const keys = keysReq.result
      keys.forEach(key => store.delete(key))
      sales.forEach(s => store.put(s))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
    keysReq.onerror = () => reject(keysReq.error)
  })
}

// ─── API Produits (Stock IDB) ──────────────────────────────────────────────────

export async function idbGetProducts(shopId: string): Promise<OfflineProduct[]> {
  return getAllFromStore<OfflineProduct>('products', shopId)
}

export async function idbSaveProduct(product: OfflineProduct): Promise<void> {
  return putInStore<OfflineProduct>('products', product)
}

export async function idbReplaceProducts(shopId: string, products: OfflineProduct[]): Promise<void> {
  const db = await getIDB()
  const tx = db.transaction('products', 'readwrite')
  const store = tx.objectStore('products')
  
  const index = store.index('shop_id')
  const keysReq = index.getAllKeys(shopId)
  
  return new Promise((resolve, reject) => {
    keysReq.onsuccess = () => {
      const keys = keysReq.result
      keys.forEach(key => store.delete(key))
      products.forEach(p => store.put(p))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
    keysReq.onerror = () => reject(keysReq.error)
  })
}

export async function idbDeleteProduct(productId: string): Promise<void> {
  return deleteFromStore('products', productId)
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

// ─── Migration Automatique localStorage -> IndexedDB ─────────────────────────

export async function migrateLocalStorageToIndexedDB(shopId: string): Promise<void> {
  if (typeof window === 'undefined') return

  const migrationKey = `cahier_migrated_idb_${shopId}`
  if (localStorage.getItem(migrationKey) === 'true') return

  try {
    const rawSales = localStorage.getItem(`cahier_offline_sales_${shopId}`)
    if (rawSales) {
      const sales: OfflineSale[] = JSON.parse(rawSales)
      if (Array.isArray(sales) && sales.length > 0) {
        await putBulkInStore<OfflineSale>('sales', sales)
      }
    }

    const rawProducts = localStorage.getItem(`cahier_offline_products_${shopId}`)
    if (rawProducts) {
      const products: OfflineProduct[] = JSON.parse(rawProducts)
      if (Array.isArray(products) && products.length > 0) {
        await putBulkInStore<OfflineProduct>('products', products)
      }
    }

    localStorage.setItem(migrationKey, 'true')
    console.log(`[IDB] Migration localStorage -> IndexedDB réussie pour la boutique ${shopId}`)
  } catch (err) {
    console.error('[IDB] Erreur lors de la migration:', err)
  }
}
