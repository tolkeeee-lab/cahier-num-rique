'use client'

import React from 'react'
import { Pen } from '@/lib/penUtils'
import { Sparkles } from 'lucide-react'

interface NotebookToolbarProps {
  pens: Pen[]
  selectedPen: string
  onSelectPen: (penId: string) => void
}

export const NotebookToolbar: React.FC<NotebookToolbarProps> = ({
  pens,
  selectedPen,
  onSelectPen,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 mb-1 select-none">
      {/* Sélecteur de Stylos Bic 4-Couleurs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none w-full">
        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-900 uppercase tracking-wider flex-shrink-0 mr-1">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>Stylo Bic :</span>
        </div>

        {pens.map((pen) => {
          const isSelected = selectedPen === pen.id
          return (
            <button
              key={pen.id}
              type="button"
              onClick={() => onSelectPen(pen.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-extrabold transition-all duration-200 flex-shrink-0 border cursor-pointer ${
                isSelected
                  ? `${pen.bg} text-white shadow-xs scale-102 border-white/50 ring-2 ring-amber-400/60`
                  : 'bg-white/80 text-gray-700 border-gray-300 hover:border-gray-400 hover:text-black'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${pen.dotBg} shadow-inner border border-white/30`} />
              <span>{pen.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
