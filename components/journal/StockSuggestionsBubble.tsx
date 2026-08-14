'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Sparkles } from 'lucide-react'

export interface StockSuggestionItem {
  id: string
  name: string
  price: number
  category?: string
  emoji?: string
  stock?: number
}

interface StockSuggestionsBubbleProps {
  suggestions: StockSuggestionItem[]
  activeQty: number
  onSelectSuggestion: (item: StockSuggestionItem) => void
}

export const StockSuggestionsBubble: React.FC<StockSuggestionsBubbleProps> = ({
  suggestions,
  activeQty,
  onSelectSuggestion,
}) => {
  if (suggestions.length === 0) return null

  return (
    <div className="absolute bottom-full left-4 sm:left-12 mb-2 z-40 bg-[#fffdfa] border-2 border-amber-400 shadow-2xl rounded-2xl p-2.5 max-w-xl w-[90vw] md:w-auto animate-in fade-in slide-in-from-bottom-2 duration-200 select-none">
      <div className="flex items-center justify-between gap-2 px-2 pb-1.5 border-b border-amber-200/80 mb-2">
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-900 uppercase tracking-wider font-sans">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Stock Prédictif ({suggestions.length})</span>
        </div>
        <span className="text-[9px] font-mono text-amber-700">Cliquez pour insérer l'article</span>
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto scrollbar-none">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSuggestion(item)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 hover:border-amber-400 text-amber-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{item.emoji || '📦'}</span>
            <span className="font-handwritten text-sm text-[#1d4ed8]">{item.name}</span>
            {item.price > 0 && (
              <span className="font-mono text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-900 font-extrabold">
                {activeQty > 1
                  ? `${activeQty} × ${item.price} = ${formatPrice(activeQty * item.price)}`
                  : formatPrice(item.price)}
              </span>
            )}
            {item.stock !== undefined && (
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  item.stock <= 5 ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Stock: {item.stock}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
