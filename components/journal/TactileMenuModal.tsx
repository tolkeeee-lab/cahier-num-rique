'use client'

import React, { useState } from 'react'
import { X, Plus, Loader, Zap, Search, Check } from 'lucide-react'
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
  const [recentlyTappedId, setRecentlyTappedId] = useState<string | null>(null)

  if (!isOpen) return null

  const categories = CATEGORY_OPTIONS[shopActivity] || CATEGORY_OPTIONS.boutique

  const filteredItems = items.filter((it) => {
    if (!filterQuery.trim()) return true
    const q = filterQuery.toLowerCase()
    return it.name.toLowerCase().includes(q) || String(it.price).includes(q)
  })

  const handleTap = (item: MenuItem) => {
    onTapItem(item)
    // Feedback visuel rapide (flash vert) sans fermer le tiroir
    setRecentlyTappedId(item.id)
    setTimeout(() => {
      setRecentlyTappedId(null)
    }, 400)
  }

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setIsSavingNew(true)
    await onAddItem(newName.trim(), parseInt(newPrice, 10) || 0, newCategory || categories[0].id)
    setNewName('')
    setNewPrice('')
    setNewCategory('')
    setShowAddForm(false)
    setIsSavingNew(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end pb-16 sm:pb-20 bg-black/25 backdrop-blur-2xs animate-in fade-in duration-150 pointer-events-none">
      {/* Arrière-plan cliquable pour fermer */}
      <div className="flex-1 pointer-events-auto" onClick={onClose} />

      {/* Ruban horizontal compact et défilable positionné juste au-dessus de la barre WhatsApp */}
      <div className="w-full max-w-4xl mx-auto bg-[#fffdf2] border-2 border-amber-400 rounded-3xl p-3 shadow-2xl space-y-2 animate-in slide-in-from-bottom duration-200 pointer-events-auto">
        
        {/* En-tête ultra fin du ruban */}
        <div className="flex items-center justify-between gap-2 border-b border-amber-200 pb-1.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-amber-950" />
            </div>
            <span className="font-extrabold text-amber-950 text-xs font-mono">
              Raccourcis 1-Tap (Défilement Horizontal)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Champ de recherche compact */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filtrer..."
                className="w-28 sm:w-36 pl-6 pr-2 py-0.5 bg-white border border-amber-300 rounded-full text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 font-mono shadow-inner"
              />
            </div>

            {/* Bouton Nouveau */}
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold transition-all shadow-xs flex-shrink-0 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Nouveau</span>
            </button>

            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-full transition-colors cursor-pointer"
              title="Fermer les raccourcis"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Formulaire d'ajout rapide inline */}
        {showAddForm && (
          <form
            onSubmit={handleSubmitNew}
            className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded-2xl p-2 flex-shrink-0 animate-in fade-in duration-150"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de l'article"
              className="flex-1 text-xs px-2.5 py-1 bg-white border border-emerald-300 rounded-xl outline-none"
              autoFocus
            />
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Prix FCFA"
              className="w-24 text-xs text-right font-mono font-bold px-2.5 py-1 bg-white border border-emerald-300 rounded-xl outline-none"
            />
            <button
              type="submit"
              disabled={!newName.trim() || isSavingNew}
              className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-xl hover:bg-emerald-700 font-bold disabled:opacity-50 transition-colors flex-shrink-0 cursor-pointer"
            >
              {isSavingNew ? <Loader className="w-3 h-3 animate-spin" /> : 'Enregistrer'}
            </button>
          </form>
        )}

        {/* ── Ruban Défilable Horizontalement (Single / Double Line Scroll) ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-3 text-amber-700 text-xs gap-1.5 font-mono">
            <Loader className="w-3.5 h-3.5 animate-spin" />
            <span>Chargement des raccourcis...</span>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-none w-full">
            {filteredItems.map((item) => {
              const isTapped = recentlyTappedId === item.id

              return (
                <div key={item.id} className="relative group flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTap(item)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-extrabold transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap select-none ${
                      isTapped
                        ? 'bg-emerald-600 text-white border-emerald-700 scale-105 ring-2 ring-emerald-400'
                        : 'bg-white hover:bg-amber-100 border-amber-300 hover:border-amber-500 text-gray-900 shadow-2xs'
                    }`}
                  >
                    <span className="text-base">{item.emoji || '📦'}</span>
                    <span className="font-bold text-xs">{item.name}</span>

                    {isTapped ? (
                      <Check className="w-3.5 h-3.5 text-white flex-shrink-0 animate-in zoom-in-50" />
                    ) : (
                      item.price > 0 && (
                        <span className="text-amber-900 font-mono font-black text-[11px] bg-amber-100/90 border border-amber-300/80 px-1.5 py-0.2 rounded-lg flex-shrink-0">
                          {item.price} F
                        </span>
                      )
                    )}
                  </button>

                  {/* Bouton de suppression rapide */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteItem(item.id, item.name)
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-700 transition-all shadow-xs z-10"
                    title={`Supprimer "${item.name}"`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-2.5 text-center text-gray-400 text-xs italic font-mono bg-amber-50/50 rounded-xl border border-dashed border-amber-200">
            Aucun raccourci. Cliquez sur "+ Nouveau" pour créer vos boutons 1-tap.
          </div>
        )}
      </div>
    </div>
  )
}
