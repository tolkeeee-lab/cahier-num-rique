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
    <div className="bg-[#1e1a18] p-5 rounded-2xl border border-fuchsia-950/60 space-y-3 mb-6 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-fuchsia-400" />
          <h4 className="text-sm font-extrabold text-white">Carnet Boutiquier (Crédits Foyer)</h4>
        </div>
        <span className="text-xs font-mono font-bold text-fuchsia-400">
          {formatPrice(totalCreditBoutiquier)}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
        <span>Achats pris à crédit : {debtsCount} opération(s)</span>
        {totalCreditBoutiquier > 0 && (
          <span className="text-amber-400 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> À régler à la paie
          </span>
        )}
      </div>
    </div>
  )
}
