'use client'

import React from 'react'
import { Plus, Share2, FileText, Search, X } from 'lucide-react'

interface ShoppingListToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  categoryFilter?: string
  onCategoryFilterChange?: (cat: string) => void
  onExportPDF?: () => void
  onSendWhatsApp?: () => void
  onConvertToStockPurchase?: () => void
}

export const ShoppingListToolbar: React.FC<ShoppingListToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onExportPDF,
  onSendWhatsApp,
  onConvertToStockPurchase,
}) => {
  return (
    <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-300/80 space-y-3 mb-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Champ de recherche */}
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.75} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onSearchChange('')
              }
            }}
            placeholder="Rechercher un article à commander..."
            className="w-full pl-9 pr-9 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 font-mono shadow-inner font-bold"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 transition-colors active:scale-[0.97] cursor-pointer"
              title="Effacer la recherche (Échap)"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Boutons d'exportations & WhatsApp */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {onSendWhatsApp && (
            <button
              type="button"
              onClick={onSendWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-xs font-mono font-extrabold transition-all shadow-xs cursor-pointer active:scale-[0.97]"
              title="Envoyer le Bon de Commande par WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
              <span>WhatsApp</span>
            </button>
          )}

          {onExportPDF && (
            <button
              type="button"
              onClick={onExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-mono font-extrabold transition-all shadow-xs cursor-pointer active:scale-[0.97]"
              title="Télécharger Bon de Commande PDF"
            >
              <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>PDF</span>
            </button>
          )}

          {onConvertToStockPurchase && (
            <button
              type="button"
              onClick={onConvertToStockPurchase}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 text-xs font-mono font-extrabold transition-all shadow-xs cursor-pointer active:scale-[0.97]"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Enregistrer en Achat Stock</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
