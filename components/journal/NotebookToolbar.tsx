'use client'

import React from 'react'
import { Pen } from '@/lib/penUtils'
import { Search, Sparkles } from 'lucide-react'

interface NotebookToolbarProps {
  pens: Pen[]
  selectedPen: string
  onSelectPen: (penId: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export const NotebookToolbar: React.FC<NotebookToolbarProps> = ({
  pens,
  selectedPen,
  onSelectPen,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3 select-none">
      {/* Sélecteur de Stylos Bic 4-Couleurs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-900 uppercase tracking-wider flex-shrink-0 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Stylo Bic :</span>
        </div>

        {pens.map((pen) => {
          const isSelected = selectedPen === pen.id
          return (
            <button
              key={pen.id}
              type="button"
              onClick={() => onSelectPen(pen.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-extrabold transition-all duration-200 flex-shrink-0 border ${
                isSelected
                  ? `${pen.bg} text-white shadow-md scale-105 border-white/50 ring-2 ring-amber-400/60`
                  : 'bg-white/80 text-gray-700 border-gray-300 hover:border-gray-400 hover:text-black'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${pen.dotBg} shadow-inner border border-white/30`} />
              <span>{pen.name}</span>
            </button>
          )
        })}
      </div>

      {/* Champ de recherche */}
      <div className="relative min-w-[200px]">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher une écriture..."
          className="w-full pl-8 pr-3 py-1.5 bg-white/90 border border-gray-300 rounded-full text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 font-mono transition-colors shadow-sm"
        />
      </div>
    </div>
  )
}
