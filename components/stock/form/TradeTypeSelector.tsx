'use client'

import React from 'react'
import { Store, Layers, Truck } from 'lucide-react'
import { TradeType } from '../types'

interface TradeTypeSelectorProps {
  tradeType: TradeType
  onSelect: (type: TradeType) => void
}

export const TradeTypeSelector: React.FC<TradeTypeSelectorProps> = ({
  tradeType,
  onSelect,
}) => {
  return (
    <div>
      <label className="block text-amber-950 font-extrabold uppercase mb-1.5 text-[11px]">
        Modèle de vente de votre commerce :
      </label>
      <div className="grid grid-cols-3 gap-1.5 bg-amber-100/70 p-1 rounded-2xl border border-amber-300">
        <button
          type="button"
          onClick={() => onSelect('retail')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            tradeType === 'retail'
              ? 'bg-amber-900 text-white font-black shadow-xs scale-[1.02]'
              : 'text-amber-950 hover:bg-amber-200/60 font-bold'
          }`}
        >
          <Store className="w-4 h-4" />
          <span className="text-[10px] text-center leading-tight">Détaillant (À la pièce)</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect('semi_wholesale')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            tradeType === 'semi_wholesale'
              ? 'bg-amber-900 text-white font-black shadow-xs scale-[1.02]'
              : 'text-amber-950 hover:bg-amber-200/60 font-bold'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[10px] text-center leading-tight">Demi-Gros (Packs & Lots)</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect('wholesale')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            tradeType === 'wholesale'
              ? 'bg-amber-900 text-white font-black shadow-xs scale-[1.02]'
              : 'text-amber-950 hover:bg-amber-200/60 font-bold'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span className="text-[10px] text-center leading-tight">Grossiste (Cartons / Sacs)</span>
        </button>
      </div>
    </div>
  )
}
