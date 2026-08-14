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

  const storageKey = `cahier_shopping_list_${shopId}`

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          setItems(JSON.parse(saved))
        } catch (e) {
          console.error('Erreur lecture liste courses:', e)
        }
      }
    }
  }, [storageKey])

  const saveItems = (newItems: ShoppingItem[]) => {
    setItems(newItems)
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(newItems))
    }
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return

    const newItem: ShoppingItem = {
      id: `shop_item_${Date.now()}`,
      name: nameInput.trim(),
      quantity: parseInt(qtyInput) || 1,
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
    saveItems(updated)
  }

  const filteredItems = items.filter(it => {
    if (!searchQuery.trim()) return true
    return it.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const totalEstimated = items.reduce((sum, it) => {
    const cost = it.isWholesale && it.wholesaleQty && it.wholesalePrice
      ? it.wholesaleQty * it.wholesalePrice
      : it.quantity * it.unitCost
    return sum + cost
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
        onConvertToStockPurchase={onConvertToStockPurchase ? () => onConvertToStockPurchase(items.map(it => `${it.quantity} ${it.name} à ${it.unitCost}`).join(', ')) : undefined}
      />

      {/* Formulaire rapide d'ajout */}
      <form onSubmit={handleAddItem} className="bg-white/90 p-4 rounded-2xl border border-amber-300/80 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-amber-700" />
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
            className="sm:col-span-2 px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-extrabold focus:outline-none font-mono text-center"
          />
          <input
            type="number"
            value={costInput}
            onChange={(e) => setCostInput(e.target.value)}
            placeholder="Coût unitaire (F)"
            className="sm:col-span-2 px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-extrabold focus:outline-none font-mono text-right"
          />
          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="sm:col-span-2 px-4 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
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
          <span className="text-lg font-black text-amber-950">
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
