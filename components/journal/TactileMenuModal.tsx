'use client'

/**
 * TactileMenuModal.tsx
 *
 * Pop-up Modal des Raccourcis Tactiles 1-tap.
 * Ne s'affiche QUE lorsque l'utilisateur clique sur le bouton "⚡ Raccourcis".
 */

import React, { useState } from 'react'
import { X, Plus, Loader, Zap, Search } from 'lucide-react'
import type { MenuItem } from '@/hooks/useTactileMenu'

interface TactileMenuModalProps {
  isOpen: boolean
  onClose: () => void
  items: MenuItem[]
  isLoading: boolean
  shopActivity: string
  onTapItem: (item: MenuItem) => void
  onDeleteItem: (id: string, name: string) => void
  onAddItem: (name: string, price: number, category: string) => Promise<void>
}

const CATEGORY_OPTIONS: Record<string, { id: string; label: string }[]> = {
  boutique: [
    { id: 'Alimentation', label: 'Alimentation' },
    { id: 'Boissons', label: 'Boissons' },
    { id: 'Fournitures', label: 'Fournitures' },
    { id: 'Divers', label: 'Divers' },
  ],
  resto: [
    { id: 'Cuisine', label: 'Plats cuisinés' },
    { id: 'Cafétéria', label: 'Cafétéria' },
    { id: 'Boissons', label: 'Boissons' },
  ],
  prestations: [
    { id: 'Services', label: 'Services' },
    { id: 'Produits', label: 'Produits' },
    { id: 'Divers', label: 'Divers' },
  ],
  particulier: [
    { id: 'Foyer', label: 'Maison & Charges' },
    { id: 'Alimentation', label: 'Marché & Nourriture' },
    { id: 'Divers', label: 'Divers' },
  ],
}

export function TactileMenuModal({
  isOpen,
  onClose,
  items,
  isLoading,
  shopActivity,
  onTapItem,
  onDeleteItem,
  onAddItem,
}: TactileMenuModalProps) {
  const [filterQuery, setFilterQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [isSavingNew, setIsSavingNew] = useState(false)

  if (!isOpen) return null

  const categories = CATEGORY_OPTIONS[shopActivity] || CATEGORY_OPTIONS.boutique

  const filteredItems = items.filter((it) => {
    if (!filterQuery.trim()) return true
    const q = filterQuery.toLowerCase()
    return it.name.toLowerCase().includes(q) || String(it.price).includes(q)
  })

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setIsSavingNew(true)
    await onAddItem(newName.trim(), parseInt(newPrice) || 0, newCategory || categories[0].id)
    setNewName('')
    setNewPrice('')
    setNewCategory('')
    setShowAddForm(false)
    setIsSavingNew(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#fffdf2] border border-amber-300 rounded-[28px] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* En-tête Pop-up */}
        <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-bold shadow-xs">
              <Zap className="w-4 h-4 fill-amber-950" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-950 text-base">Menu Raccourcis 1-Tap</h3>
              <p className="text-xs text-amber-800/80 font-mono">
                Touchez un produit pour l'ajouter directement à la saisie.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre de Recherche + Bouton Ajouter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrer les raccourcis..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 shadow-inner"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau</span>
          </button>
        </div>

        {/* Formulaire d'ajout rapide */}
        {showAddForm && (
          <form
            onSubmit={handleSubmitNew}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 animate-in fade-in duration-150"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom du produit"
              className="flex-1 text-xs px-2 py-1 bg-white border border-emerald-300 rounded-lg outline-none"
              autoFocus
            />
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Prix F"
              className="w-20 text-xs text-right font-mono font-bold px-2 py-1 bg-white border border-emerald-300 rounded-lg outline-none"
            />
            <button
              type="submit"
              disabled={!newName.trim() || isSavingNew}
              className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 font-bold disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {isSavingNew ? <Loader className="w-3.5 h-3.5 animate-spin" /> : 'Ajouter'}
            </button>
          </form>
        )}

        {/* Grille des raccourcis tactiles */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-amber-700 text-xs gap-2 font-mono">
            <Loader className="w-4 h-4 animate-spin" />
            <span>Chargement des raccourcis...</span>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-none">
            {filteredItems.map((item) => (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    onTapItem(item)
                    onClose()
                  }}
                  className="w-full flex items-center justify-between gap-1.5 bg-white hover:bg-amber-100/80 active:scale-95 border border-amber-300/80 hover:border-amber-500 rounded-2xl p-2.5 text-xs font-bold text-gray-900 shadow-sm transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base">{item.emoji || '📦'}</span>
                    <span className="truncate text-xs font-bold text-gray-900">{item.name}</span>
                  </div>
                  {item.price > 0 && (
                    <span className="text-amber-800 font-mono font-extrabold text-[11px] bg-amber-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                      {item.price}F
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteItem(item.id, item.name)
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-700 transition-all shadow-sm z-10"
                  title={`Masquer "${item.name}"`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400 text-xs italic font-mono bg-amber-50/50 rounded-2xl border border-dashed border-amber-200">
            Aucun raccourci trouvé. Cliquez sur "+ Nouveau" pour en ajouter.
          </div>
        )}

        {/* Pied de modale */}
        <div className="pt-2 border-t border-amber-200/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-amber-200/80 hover:bg-amber-300 text-amber-950 text-xs font-bold rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
