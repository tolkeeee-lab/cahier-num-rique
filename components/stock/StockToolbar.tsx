'use client'

import React from 'react'
import { Search, Plus, FileSpreadsheet } from 'lucide-react'

interface StockToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  categoryFilter: string
  onCategoryFilterChange: (cat: string) => void
  categories: string[]
  onAddProduct: () => void
  onExportCSV?: () => void
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
  isEmployee = false,
}) => {
  return (
    <div className="bg-[#1e1a18] p-4 rounded-2xl border border-gray-800 space-y-3 mb-6 shadow-md">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Champ de recherche */}
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un produit en stock..."
            className="w-full pl-9 pr-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono"
          />
        </div>

        {/* Filtres & Boutons d'action */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          
          {/* Sélecteur de catégorie */}
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="px-3 py-1.5 bg-[#141210] border border-gray-800 rounded-xl text-xs text-gray-300 font-mono focus:outline-none"
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
              className="p-2 rounded-xl bg-[#2a2421] text-gray-300 border border-gray-800 hover:text-white transition-all"
              title="Exporter l'inventaire Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          )}

          {/* Bouton Ajouter Produit */}
          {!isEmployee && (
            <button
              onClick={onAddProduct}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#141210] text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all whitespace-nowrap shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Produit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
