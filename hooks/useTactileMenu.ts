'use client'

/**
 * useTactileMenu.ts
 *
 * Responsabilité unique : gérer le menu tactile 1-tap du journal.
 *
 * - Chargement des produits depuis /api/stock (avec fallback offline)
 * - Déduplication & filtrage strict par activité de boutique
 * - Attribution automatique d'emoji par nom de produit
 * - Tap 1-clic → incrément de quantité dans le champ de saisie
 * - Suppression d'un article (masquage permanent local + suppression API)
 * - Ajout rapide d'un nouveau plat/produit
 */

import { useState, useEffect, useCallback } from 'react'
import { getOfflineProducts, saveOfflineProduct, generateOfflineId } from '@/lib/offlineDb'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  emoji: string
}

export interface UseTactileMenuOptions {
  shopId: string
  shopActivity: string
  /** L'état actuel du champ de saisie — pour implémenter l'incrément de quantité */
  input: string
  setInput: (value: string) => void
}

export interface UseTactileMenuReturn {
  menuItems: MenuItem[]
  isLoadingMenu: boolean
  handleTapItem: (item: MenuItem) => void
  handleDeleteItem: (id: string, name: string) => void
  handleAddItem: (name: string, price: number, category: string) => Promise<void>
  refreshMenu: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Attribue un emoji pertinent selon le nom du produit */
function getProductEmoji(name: string): string {
  const n = name.toLowerCase()
  if (/biere|beaufort|flag|pils|castel|guinness|heineken|bock/i.test(n)) return '🍻'
  if (/eau|possotome|fifa/i.test(n)) return '💧'
  if (/coca|fanta|sprite|jus|bissap|soda/i.test(n)) return '🥤'
  if (/riz|atassi|plat|repas|poulet|poisson|viande/i.test(n)) return '🍚'
  if (/pain|baguette|croissant/i.test(n)) return '🥖'
  if (/sardine|thon|crabe/i.test(n)) return '🐟'
  if (/lait|yaourt|creme/i.test(n)) return '🥛'
  if (/sucre|bonbon|chocolat|miel/i.test(n)) return '🍬'
  if (/huile|beurre/i.test(n)) return '🫙'
  if (/savon|omo|lessive|shampoing/i.test(n)) return '🧴'
  if (/colgate|dentifrice|brosse/i.test(n)) return '🪥'
  if (/sac|sachet/i.test(n)) return '🛍️'
  if (/coiffure|coupe|barbe|tresse/i.test(n)) return '✂️'
  if (/cahier|registre|carnet/i.test(n)) return '📓'
  if (/stylo|crayon|bic/i.test(n)) return '✏️'
  return '📦'
}

const EXCLUDED_ITEMS_KEY = (shopId: string) => `cahier_deleted_menu_items_${shopId}`

function getExcludedNames(shopId: string): string[] {
  try {
    const stored = localStorage.getItem(EXCLUDED_ITEMS_KEY(shopId))
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function addToExcluded(shopId: string, name: string) {
  const list = getExcludedNames(shopId)
  if (!list.some(n => n.toLowerCase() === name.toLowerCase())) {
    list.push(name)
    localStorage.setItem(EXCLUDED_ITEMS_KEY(shopId), JSON.stringify(list))
  }
}

function removeFromExcluded(shopId: string, name: string) {
  const list = getExcludedNames(shopId).filter(n => n.toLowerCase() !== name.toLowerCase())
  localStorage.setItem(EXCLUDED_ITEMS_KEY(shopId), JSON.stringify(list))
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTactileMenu({
  shopId,
  shopActivity,
  input,
  setInput,
}: UseTactileMenuOptions): UseTactileMenuReturn {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refreshMenu = useCallback(() => setRefreshTrigger(t => t + 1), [])

  // ── Charger et construire le menu ──────────────────────────────────────────
  useEffect(() => {
    if (!shopId) return
    setIsLoadingMenu(true)

    const buildMenu = (rawProducts: any[]): MenuItem[] => {
      const excluded = getExcludedNames(shopId)
      const uniqueMap = new Map<string, MenuItem>()

      rawProducts.forEach((p, idx) => {
        const rawName = p.name || ''
        if (!rawName.trim()) return

        const cleanName = rawName.trim()
        const cleanLower = cleanName.toLowerCase().trim()

        if (excluded.some(ex => ex.toLowerCase().trim() === cleanLower)) return

        const price = p.unit_price || p.price || 0
        const dedupeKey = `${cleanLower}_${price}`
        if (uniqueMap.has(dedupeKey)) return

        uniqueMap.set(dedupeKey, {
          id: p.id || `stk_${idx}`,
          name: cleanName,
          price,
          category: p.category || 'Général',
          emoji: getProductEmoji(cleanName),
        })
      })

      return Array.from(uniqueMap.values())
    }

    const load = async () => {
      try {
        const res = await fetch('/api/stock', {
          headers: {
            'x-shop-id': shopId,
            'x-shop-activity': shopActivity,
          },
        })

        if (res.ok) {
          const data = await res.json()
          if (data.products && data.products.length > 0) {
            setMenuItems(buildMenu(data.products))
            return
          }
        }
      } catch {
        // Fallback silencieux sur les données offline
      }

      // Fallback : localStorage
      const localProducts = getOfflineProducts(shopId)
      setMenuItems(buildMenu(localProducts))
    }

    load().finally(() => setIsLoadingMenu(false))

    // Écouter les mises à jour en temps réel du stock
    const handleStockUpdate = () => {
      load()
    }

    window.addEventListener('cahier_stock_updated', handleStockUpdate)
    return () => {
      window.removeEventListener('cahier_stock_updated', handleStockUpdate)
    }
  }, [shopId, shopActivity, refreshTrigger])

  // ── Tap 1-clic sur un article — incrémente la quantité si déjà présent ─────
  const handleTapItem = useCallback((item: MenuItem) => {
    const escapedName = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(\\d+)\\s+${escapedName}\\s+à\\s+${item.price}`, 'i')

    if (!input.trim()) {
      setInput(`1 ${item.name} à ${item.price}`)
      return
    }

    const match = input.match(regex)
    if (match) {
      const newQty = (parseInt(match[1], 10) || 1) + 1
      setInput(input.replace(regex, `${newQty} ${item.name} à ${item.price}`))
    } else {
      setInput(`${input.trim()}, 1 ${item.name} à ${item.price}`)
    }
  }, [input, setInput])

  // ── Supprimer définitivement un article du menu ────────────────────────────
  const handleDeleteItem = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Masquer "${name}" définitivement du menu tactile ?`)) return

    addToExcluded(shopId, name)
    setMenuItems(prev => prev.filter(item => item.id !== id))

    // Supprimer de la DB uniquement si c'est un vrai ID (pas généré localement)
    if (id && !id.startsWith('stk_') && !id.startsWith('orphan_') && !id.startsWith('menu_custom_')) {
      try {
        await fetch(`/api/stock?id=${id}`, {
          method: 'DELETE',
          headers: { 'x-shop-id': shopId, 'x-shop-activity': shopActivity },
        })
      } catch {
        // Non bloquant
      }
    }
  }, [shopId, shopActivity])

  // ── Ajouter rapidement un nouveau produit au menu depuis le journal ────────
  const handleAddItem = useCallback(async (name: string, price: number, category: string) => {
    const cleanName = name.trim()
    if (!cleanName) return

    // Retirer des exclusions si le produit y était
    removeFromExcluded(shopId, cleanName)

    const newItem: MenuItem = {
      id: `menu_custom_${Date.now()}`,
      name: cleanName,
      price,
      category,
      emoji: getProductEmoji(cleanName),
    }

    setMenuItems(prev => [newItem, ...prev])

    // Sauvegarder en DB et en offline
    try {
      const offlineId = generateOfflineId()
      saveOfflineProduct(shopId, {
        id: offlineId,
        shop_id: shopId,
        name: cleanName,
        category,
        unit: 'pièce',
        alert_threshold: 5,
        initial_stock: 0,
        unit_cost: 0,
        unit_price: price,
        created_at: new Date().toISOString(),
      })

      await fetch('/api/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shopId,
          'x-shop-activity': shopActivity,
        },
        body: JSON.stringify({
          name: cleanName,
          unit_price: price,
          unit_cost: 0,
          initial_stock: 0,
          alert_threshold: 5,
          category,
        }),
      })
    } catch {
      // Non bloquant — sauvegardé offline
    }
  }, [shopId, shopActivity])

  return {
    menuItems,
    isLoadingMenu,
    handleTapItem,
    handleDeleteItem,
    handleAddItem,
    refreshMenu,
  }
}
