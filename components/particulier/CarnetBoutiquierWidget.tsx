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
    <div className="bg-fuchsia-50/90 p-4 rounded-2xl border border-fuchsia-200 space-y-3 mb-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-fuchsia-700" />
          <h4 className="text-sm font-extrabold text-fuchsia-950">Carnet Boutiquier (Crédits Foyer)</h4>
        </div>
        <span className="text-sm font-mono font-black text-fuchsia-950">
          {formatPrice(totalCreditBoutiquier)}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-fuchsia-900 font-mono font-bold">
        <span>Achats pris à crédit : {debtsCount} opération(s)</span>
        {totalCreditBoutiquier > 0 && (
          <span className="text-amber-900 font-extrabold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> À régler à la paie
          </span>
        )}
      </div>
    </div>
  )
}
