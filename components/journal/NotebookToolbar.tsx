'use client'

import React from 'react'
import { Pen } from '@/lib/penUtils'
import { Search, Sparkles } from 'lucide-react'

interface NotebookToolbarProps {
  pens: Pen[]
  selectedPen: string
  onSelectPen: (penId: string) => void
  filters: Array<{ id: string; label: string; emoji: string }>
  activeFilter: string
  onSelectFilter: (filterId: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export const NotebookToolbar: React.FC<NotebookToolbarProps> = ({
  pens,
  selectedPen,
  onSelectPen,
  filters,
  activeFilter,
  onSelectFilter,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="space-y-4 mb-2">
      {/* Sélecteur de Stylos Bic 4-Couleurs avec Effet Lisse et Rétro-éclairé */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex-shrink-0 mr-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Stylo :</span>
        </div>

        {pens.map((pen) => {
          const isSelected = selectedPen === pen.id
          return (
            <button
              key={pen.id}
              type="button"
              onClick={() => onSelectPen(pen.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-extrabold transition-all duration-200 flex-shrink-0 border ${
                isSelected
                  ? `${pen.bg} text-white shadow-xl scale-105 border-white/40 ring-2 ring-amber-400/50`
                  : 'bg-[#141210] text-gray-400 border-gray-800 hover:border-gray-700 hover:text-white'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${pen.dotBg} shadow-inner border border-white/20`} />
              <span>{pen.name}</span>
            </button>
          )
        })}
      </div>

      {/* Barre de filtres par catégorie & Recherche */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filtres Emojis */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filters.map((f) => {
            const isSelected = activeFilter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 flex-shrink-0 border ${
                  isSelected
                    ? 'bg-[#2a2421] text-amber-400 border-amber-500/50 shadow-md'
                    : 'bg-[#141210] text-gray-400 hover:text-gray-200 border-gray-800/80'
                }`}
              >
                <span>{f.emoji}</span>
                <span>{f.label}</span>
              </button>
            )
          })}
        </div>

        {/* Champ de recherche */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une écriture..."
            className="w-full pl-8 pr-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
