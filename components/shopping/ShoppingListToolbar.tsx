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
    <div className="bg-[#faf5e8] p-3.5 rounded-2xl border border-[#e2d6be] mb-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
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
            placeholder="Rechercher un article à commander"
            className="w-full pl-9 pr-9 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              title="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {onSendWhatsApp && (
            <button
              type="button"
              onClick={onSendWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium transition-colors cursor-pointer active:scale-[0.97]"
              title="Envoyer le bon de commande par WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.5} />
              <span>WhatsApp</span>
            </button>
          )}

          {onExportPDF && (
            <button
              type="button"
              onClick={onExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-medium transition-colors cursor-pointer active:scale-[0.97]"
              title="Télécharger bon de commande PDF"
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.5} />
              <span>PDF</span>
            </button>
          )}

          {onConvertToStockPurchase && (
            <button
              type="button"
              onClick={onConvertToStockPurchase}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition-colors cursor-pointer active:scale-[0.97]"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Enregistrer en achat stock</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
