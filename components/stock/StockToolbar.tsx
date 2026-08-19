'use client'

import React from 'react'
import { Search, Plus, FileSpreadsheet, Trash2 } from 'lucide-react'

interface StockToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  categoryFilter: string
  onCategoryFilterChange: (cat: string) => void
  categories: string[]
  onAddProduct: () => void
  onExportCSV?: () => void
  onClearAllStock?: () => void
  hasProducts?: boolean
  isEmployee?: boolean
}

export const StockToolbar: React.FC<StockToolbarProps> = ({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  onAddProduct,
  onExportCSV,
  onClearAllStock,
  hasProducts = false,
  isEmployee = false,
}) => {
  return (
    <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-300/80 space-y-3 mb-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Champ de recherche */}
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un produit en stock..."
            className="w-full pl-9 pr-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 font-mono shadow-inner font-bold"
          />
        </div>

        {/* Filtres & Boutons d'action */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          
          {/* Sélecteur de catégorie */}
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-mono font-bold focus:outline-none cursor-pointer"
          >
            <option value="TOUT">Toutes les catégories</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Export CSV */}
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all shadow-xs cursor-pointer"
              title="Exporter l'inventaire Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          )}

          {/* Bouton Vider tout le stock */}
          {!isEmployee && hasProducts && onClearAllStock && (
            <button
              onClick={onClearAllStock}
              className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 transition-all shadow-xs cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
              title="Vider et réinitialiser tout le stock à zéro"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">Vider le stock</span>
            </button>
          )}

          {/* Bouton Ajouter Produit */}
          {!isEmployee && (
            <button
              onClick={onAddProduct}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all whitespace-nowrap shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nouveau Produit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
