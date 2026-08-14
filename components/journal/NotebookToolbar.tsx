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
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none w-full select-none">
      <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono font-bold text-amber-900 uppercase tracking-wider flex-shrink-0 mr-0.5">
        <Sparkles className="w-3 h-3 text-amber-600" />
        <span>Stylo :</span>
      </div>

      {pens.map((pen) => {
        const isSelected = selectedPen === pen.id
        return (
          <button
            key={pen.id}
            type="button"
            onClick={() => onSelectPen(pen.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-extrabold transition-all duration-150 flex-shrink-0 border cursor-pointer ${
              isSelected
                ? 'text-white shadow-xs scale-102 ring-2 ring-amber-400/80 border-white/60'
                : 'bg-white/90 text-gray-800 border-amber-300/80 hover:bg-amber-50 shadow-2xs'
            }`}
            style={
              isSelected
                ? { backgroundColor: pen.color, borderColor: pen.color, color: '#ffffff' }
                : {}
            }
          >
            {/* Pastille de couleur du stylo toujours éclatante et visible avec sa vraie couleur */}
            <span
              className={`w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs border ${
                isSelected ? 'border-white/80 ring-1 ring-white/60 bg-white' : 'border-black/20'
              }`}
              style={{ backgroundColor: isSelected ? '#ffffff' : pen.color }}
            >
              {isSelected && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: pen.color }}
                />
              )}
            </span>
            <span className="text-[11px] sm:text-xs font-extrabold tracking-wide">{pen.name}</span>
          </button>
        )
      })}
    </div>
  )
}
