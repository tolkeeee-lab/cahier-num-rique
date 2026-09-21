'use client'

import React, { useState, useEffect } from 'react'
import { ShoppingItemRow } from '@/components/shopping/ShoppingItemRow'
import { SupplierComparisonModal } from '@/components/shopping/SupplierComparisonModal'
import { ShoppingListToolbar } from '@/components/shopping/ShoppingListToolbar'
import { formatPrice } from '@/lib/penUtils'
import { ShoppingBag, Plus } from 'lucide-react'

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unitCost: number
  isWholesale?: boolean
  wholesaleQty?: number
  wholesalePrice?: number
  itemsPerWholesale?: number
  isAutoSuggested?: boolean
  isChecked: boolean
}

interface ShoppingListManagerProps {
  shopId?: string
  onConvertToStockPurchase?: (text: string) => Promise<void>
  onError?: (err: string) => void
}

import { 
  getOfflineShoppingList, 
  deleteOfflineShoppingItem, 
  replaceOfflineShoppingList,
  OfflineShoppingItem 
} from '@/lib/offlineDb'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'

export function ShoppingListManager({ 
  shopId = 'default-shop', 
  onConvertToStockPurchase,
}: ShoppingListManagerProps) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('TOUT')
  
  // Saisie manuelle
  const [nameInput, setNameInput] = useState('')
  const [qtyInput, setQtyInput] = useState('1')
  const [costInput, setCostInput] = useState('')

  // Modale comparatif grossiste
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [selectedItemForSupplier] = useState<string>('')

  // Chargement initial unifié (Offline-first + Sync Supabase)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Charger immédiatement depuis la couche locale (offlineDb / IndexedDB)
    const local = getOfflineShoppingList(shopId)
    if (local && local.length > 0) {
      setItems(local.map(l => ({
        id: l.id,
        name: l.name,
        quantity: l.quantity,
        unitCost: l.unit_cost,
        isWholesale: l.is_wholesale,
        wholesaleQty: l.wholesale_qty,
        wholesalePrice: l.wholesale_price,
        itemsPerWholesale: l.items_per_wholesale,
        isChecked: l.is_checked,
      })))
    }

    // 2. Si connecté à Supabase, synchroniser avec la table `shopping_list`
    if (isSupabaseClientConfigured()) {
      supabaseClient
        .from('shopping_list')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const remoteMapped: ShoppingItem[] = data.map((d: any) => ({
              id: d.id,
              name: d.name,
              quantity: Number(d.quantity) || 1,
              unitCost: Number(d.unit_cost) || 0,
              isWholesale: d.is_wholesale,
              wholesaleQty: d.wholesale_qty,
              wholesalePrice: d.wholesale_price,
              itemsPerWholesale: d.items_per_wholesale,
              isChecked: Boolean(d.is_checked),
            }))
            setItems(remoteMapped)
            // Mettre à jour le cache local
            const offlineMapped: OfflineShoppingItem[] = data.map((d: any) => ({
              id: d.id,
              shop_id: shopId,
              name: d.name,
              quantity: Number(d.quantity) || 1,
              unit_cost: Number(d.unit_cost) || 0,
              is_wholesale: d.is_wholesale,
              wholesale_qty: d.wholesale_qty,
              wholesale_price: d.wholesale_price,
              items_per_wholesale: d.items_per_wholesale,
              is_checked: Boolean(d.is_checked),
              is_synced: true,
            }))
            replaceOfflineShoppingList(shopId, offlineMapped)
          }
        })
    }

    const handleExternalUpdate = () => {
      if (isSupabaseClientConfigured()) {
        supabaseClient
          .from('shopping_list')
          .select('*')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (!error && data) {
              setItems(data.map((d: any) => ({
                id: d.id,
                name: d.name,
                quantity: Number(d.quantity) || 1,
                unitCost: Number(d.unit_cost) || 0,
                isWholesale: d.is_wholesale,
                wholesaleQty: d.wholesale_qty,
                wholesalePrice: d.wholesale_price,
                itemsPerWholesale: d.items_per_wholesale,
                isChecked: Boolean(d.is_checked),
              })))
            }
          })
      }
    }

    window.addEventListener('cahier_shopping_updated', handleExternalUpdate)
    return () => window.removeEventListener('cahier_shopping_updated', handleExternalUpdate)
  }, [shopId])

  const saveItems = (newItems: ShoppingItem[]) => {
    setItems(newItems)
    const offlineItems: OfflineShoppingItem[] = newItems.map(i => ({
      id: i.id,
      shop_id: shopId,
      name: i.name,
      quantity: i.quantity,
      unit_cost: i.unitCost,
      is_wholesale: i.isWholesale,
      wholesale_qty: i.wholesaleQty,
      wholesale_price: i.wholesalePrice,
      items_per_wholesale: i.itemsPerWholesale,
      is_checked: i.isChecked,
      is_synced: false,
    }))
    replaceOfflineShoppingList(shopId, offlineItems)

    // Synchronisation en arrière-plan vers Supabase si en ligne
    if (isSupabaseClientConfigured()) {
      Promise.resolve(
        supabaseClient
          .from('shopping_list')
          .upsert(
            offlineItems.map(item => ({
              id: item.id,
              shop_id: shopId,
              name: item.name,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              is_wholesale: item.is_wholesale || false,
              wholesale_qty: item.wholesale_qty || 0,
              wholesale_price: item.wholesale_price || 0,
              items_per_wholesale: item.items_per_wholesale || 1,
              is_checked: item.is_checked,
              updated_at: new Date().toISOString(),
            })),
            { onConflict: 'id' }
          )
      ).catch((err: any) => console.warn('[ShoppingList] Sync error:', err))
    }
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return

    const newItemId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `shop_item_${Date.now()}`
    const newItem: ShoppingItem = {
      id: newItemId,
      name: nameInput.trim(),
      quantity: parseInt(qtyInput, 10) || 1,
      unitCost: parseFloat(costInput) || 0,
      isChecked: false,
    }

    const updated = [newItem, ...items]
    saveItems(updated)
    setNameInput('')
    setQtyInput('1')
    setCostInput('')
  }

  const handleToggleCheck = (id: string) => {
    const updated = items.map(it => it.id === id ? { ...it, isChecked: !it.isChecked } : it)
    saveItems(updated)
  }

  const handleRemoveItem = (id: string) => {
    const updated = items.filter(it => it.id !== id)
    setItems(updated)
    deleteOfflineShoppingItem(shopId, id)
    if (isSupabaseClientConfigured()) {
      Promise.resolve(
        supabaseClient.from('shopping_list').delete().eq('id', id)
      ).catch(() => {})
    }
  }

  const filteredItems = items.filter(it => {
    if (!searchQuery.trim()) return true
    return (it?.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  })

  const totalEstimated = items.reduce((sum, it) => {
    const cost = it.isWholesale && it.wholesaleQty && it.wholesalePrice
      ? Number(it.wholesaleQty) * Number(it.wholesalePrice)
      : Number(it.quantity || 1) * Number(it.unitCost || 0)
    return sum + (Number(cost) || 0)
  }, 0)

  const handleSendWhatsApp = () => {
    if (items.length === 0) return
    const textLines = items.map(it => `• ${it.quantity}x ${it.name} (${formatPrice(it.unitCost)})`)
    const message = `📋 *BON DE COMMANDE / RESSORTIE STOCK*\n\n${textLines.join('\n')}\n\n💰 *Total estimé :* ${formatPrice(totalEstimated)}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <ShoppingListToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        onSendWhatsApp={handleSendWhatsApp}
        onConvertToStockPurchase={onConvertToStockPurchase ? () => onConvertToStockPurchase(items.map(it => it.unitCost > 0 ? `${it.quantity} ${it.name} à ${it.unitCost}` : `${it.quantity} ${it.name}`).join(', ')) : undefined}
      />

      {/* Formulaire rapide d'ajout */}
      <form onSubmit={handleAddItem} className="bg-white/90 p-4 rounded-2xl border border-amber-300/80 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
          <h4 className="text-sm font-extrabold text-gray-900">Ajouter un produit au Bon de Commande</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Nom du produit (ex: Sac de riz 50kg, Carton Beaufort...)"
            className="sm:col-span-6 px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 font-bold"
          />
          <input
            type="number"
            value={qtyInput}
            onChange={(e) => setQtyInput(e.target.value)}
            placeholder="Qté"
            className="sm:col-span-2 px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-extrabold focus:outline-none font-mono tabular-nums text-center"
          />
          <input
            type="number"
            value={costInput}
            onChange={(e) => setCostInput(e.target.value)}
            placeholder="Coût unitaire (F)"
            className="sm:col-span-2 px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-extrabold focus:outline-none font-mono tabular-nums text-right"
          />
          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="sm:col-span-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white text-xs font-extrabold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Ajouter</span>
          </button>
        </div>
      </form>

      {/* Liste des articles du Bon de Commande */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white/80 rounded-2xl border border-amber-300/80 font-mono text-xs shadow-sm">
          Votre bon de commande est actuellement vide.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              onToggleCheck={handleToggleCheck}
              onRemove={handleRemoveItem}
            />
          ))}
        </div>
      )}

      {/* Bilan du bon de commande */}
      {items.length > 0 && (
        <div className="bg-amber-100/90 p-4 rounded-2xl border border-amber-300 flex justify-between items-center font-mono shadow-sm">
          <span className="text-xs text-amber-950 font-bold">Total estimé de la commande :</span>
          <span className="text-lg font-black text-amber-950 tabular-nums tracking-tight">
            {formatPrice(totalEstimated)}
          </span>
        </div>
      )}

      {/* Modale Comparatif Grossistes */}
      <SupplierComparisonModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        productName={selectedItemForSupplier}
        suppliers={[]}
      />
    </div>
  )
}
