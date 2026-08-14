'use client'

import React from 'react'
import { Plus, Share2, FileText, Search } from 'lucide-react'

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
    <div className="bg-[#1e1a18] p-4 rounded-2xl border border-gray-800 space-y-3 mb-6 shadow-md">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Champ de recherche */}
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un article à commander..."
            className="w-full pl-9 pr-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono"
          />
        </div>

        {/* Boutons d'exportations & WhatsApp */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {onSendWhatsApp && (
            <button
              onClick={onSendWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/60 text-xs font-mono font-bold transition-all"
              title="Envoyer le Bon de Commande par WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          )}

          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2a2421] text-gray-300 border border-gray-800 hover:text-white transition-all text-xs font-mono font-bold"
              title="Télécharger Bon de Commande PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          )}

          {onConvertToStockPurchase && (
            <button
              onClick={onConvertToStockPurchase}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-mono font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enregistrer en Achat Stock</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
