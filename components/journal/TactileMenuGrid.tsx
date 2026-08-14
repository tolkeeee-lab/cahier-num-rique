'use client'

/**
 * TactileMenuGrid.tsx
 *
 * Grille tactile 1-tap des produits du stock.
 * Affiche les articles du menu avec emoji, nom et prix.
 * Chaque badge possède un bouton X rouge pour le masquer définitivement.
 * Un bouton + permet d'ajouter rapidement un nouveau produit.
 *
 * Tout la logique métier vit dans useTactileMenu — ce composant est 100% UI.
 */

import React, { useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp, Loader } from 'lucide-react'
import type { MenuItem } from '@/hooks/useTactileMenu'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TactileMenuGridProps {
  items: MenuItem[]
  isLoading: boolean
  shopActivity: string
  onTapItem: (item: MenuItem) => void
  onDeleteItem: (id: string, name: string) => void
  onAddItem: (name: string, price: number, category: string) => Promise<void>
}

// ─── Catégories par activité ──────────────────────────────────────────────────

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

// ─── Composant ────────────────────────────────────────────────────────────────

export function TactileMenuGrid({
  items,
  isLoading,
  shopActivity,
  onTapItem,
  onDeleteItem,
  onAddItem,
}: TactileMenuGridProps) {
  const [showGrid, setShowGrid] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [isSavingNew, setIsSavingNew] = useState(false)

  const categories = CATEGORY_OPTIONS[shopActivity] || CATEGORY_OPTIONS.boutique

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2 text-amber-600 text-xs gap-1">
        <Loader className="w-3 h-3 animate-spin" />
        <span>Chargement du menu...</span>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 space-y-1">
      {/* En-tête du menu tactile */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setShowGrid(v => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
        >
          🍽️ Menu Tactile
          {showGrid ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {items.length > 0 && (
            <span className="ml-1 bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
              {items.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
          title="Ajouter un produit au menu"
        >
          <Plus className="w-3 h-3" />
          Ajouter
        </button>
      </div>

      {/* Formulaire d'ajout rapide */}
      {showAddForm && (
        <form
          onSubmit={handleSubmitNew}
          className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2"
        >
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nom du produit"
            className="flex-1 text-xs bg-transparent border-b border-emerald-300 focus:outline-none focus:border-emerald-500 placeholder-gray-400 py-0.5"
            autoFocus
          />
          <input
            type="number"
            value={newPrice}
            onChange={e => setNewPrice(e.target.value)}
            placeholder="Prix F"
            className="w-20 text-xs bg-transparent border-b border-emerald-300 focus:outline-none focus:border-emerald-500 placeholder-gray-400 py-0.5"
          />
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="text-xs bg-transparent border-b border-emerald-300 focus:outline-none py-0.5 text-gray-600"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!newName.trim() || isSavingNew}
            className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {isSavingNew ? <Loader className="w-3 h-3 animate-spin" /> : 'OK'}
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            <X className="w-3 h-3" />
          </button>
        </form>
      )}

      {/* Grille des badges tactiles */}
      {showGrid && items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pb-1 scrollbar-none">
          {items.map(item => (
            <div key={item.id} className="relative group flex-shrink-0">
              <button
                onClick={() => onTapItem(item)}
                className="flex items-center gap-1 bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 active:scale-95 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-800 shadow-sm transition-all"
              >
                <span>{item.emoji}</span>
                <span className="max-w-[100px] truncate">{item.name}</span>
                {item.price > 0 && (
                  <span className="text-amber-600 font-bold ml-0.5">{item.price}F</span>
                )}
              </button>

              {/* Bouton X rouge pour masquer — visible au hover */}
              <button
                onClick={e => { e.stopPropagation(); onDeleteItem(item.id, item.name) }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] items-center justify-center hidden group-hover:flex hover:bg-red-700 transition-colors shadow-sm z-10"
                title={`Masquer "${item.name}"`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showGrid && items.length === 0 && !isLoading && (
        <p className="text-xs text-gray-400 italic px-1 py-1">
          Aucun produit dans le catalogue. Cliquez sur "+ Ajouter" pour créer votre premier article.
        </p>
      )}
    </div>
  )
}
