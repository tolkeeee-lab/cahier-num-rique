'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Store, AlertTriangle } from 'lucide-react'

interface CarnetBoutiquierWidgetProps {
  totalCreditBoutiquier: number
  debtsCount: number
}

export const CarnetBoutiquierWidget: React.FC<CarnetBoutiquierWidgetProps> = ({
  totalCreditBoutiquier,
  debtsCount,
}) => {
  return (
    <div className="bg-[#faf5e8] p-4 rounded-2xl border border-[#e2d6be] space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-stone-700" strokeWidth={1.5} />
          <h4 className="text-sm font-semibold text-stone-900">Carnet boutiquier (crédits foyer)</h4>
        </div>
        <span className="text-sm font-mono tabular-nums font-semibold text-stone-900">
          {formatPrice(totalCreditBoutiquier)}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-600">
        <span>
          Achats à crédit : <strong className="font-mono tabular-nums text-stone-900">{debtsCount}</strong> opération{debtsCount > 1 ? 's' : ''}
        </span>
        {totalCreditBoutiquier > 0 && (
          <span className="text-amber-800 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} /> À régler à la paie
          </span>
        )}
      </div>
    </div>
  )
}
