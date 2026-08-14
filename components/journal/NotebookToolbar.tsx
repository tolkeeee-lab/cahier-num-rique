'use client'

import React from 'react'
import { Pen } from '@/lib/penUtils'
import { Search } from 'lucide-react'

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
    <div className="space-y-4 mb-6">
      {/* Sélection des stylos 4-couleurs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider flex-shrink-0 mr-1">
          🖊️ Stylo :
        </span>
        {pens.map((pen) => {
          const isSelected = selectedPen === pen.id
          return (
            <button
              key={pen.id}
              onClick={() => onSelectPen(pen.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 border ${
                isSelected
                  ? `${pen.bg} text-white shadow-lg scale-105 ${pen.border}`
                  : 'bg-[#1e1a18] text-gray-300 border-gray-800 hover:border-gray-700'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${pen.dotBg}`} />
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
                onClick={() => onSelectFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0 ${
                  isSelected
                    ? 'bg-[#064e3b] text-[#f59e0b] font-bold border border-[#047857]'
                    : 'bg-[#1e1a18]/60 text-gray-400 hover:text-gray-200 border border-transparent'
                }`}
              >
                <span>{f.emoji}</span>
                <span>{f.label}</span>
              </button>
            )
          })}
        </div>

        {/* Champ de recherche */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une écriture..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#141210] border border-gray-800 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
