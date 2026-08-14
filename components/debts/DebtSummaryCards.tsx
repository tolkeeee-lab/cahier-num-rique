'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { AlertTriangle, Store } from 'lucide-react'

interface DebtSummaryCardsProps {
  totalClientDebts: number
  totalSupplierDebts: number
}

export const DebtSummaryCards: React.FC<DebtSummaryCardsProps> = ({
  totalClientDebts,
  totalSupplierDebts,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      {/* Argent Dehors Clients */}
      <div className="bg-gradient-to-br from-rose-50 to-rose-100/70 p-4 rounded-2xl border border-rose-300 space-y-1 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-rose-800 font-mono font-extrabold uppercase">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Argent Dehors (Dettes Clients)</span>
        </div>
        <p className="text-xl font-black text-rose-950 font-mono">
          {formatPrice(totalClientDebts)}
        </p>
      </div>

      {/* Dettes Fournisseurs / Grossistes */}
      <div className="bg-gradient-to-br from-fuchsia-50 to-purple-100/70 p-4 rounded-2xl border border-fuchsia-300 space-y-1 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-fuchsia-800 font-mono font-extrabold uppercase">
          <Store className="w-4 h-4 text-fuchsia-600" />
          <span>Dettes Grossistes (Fournisseurs)</span>
        </div>
        <p className="text-xl font-black text-fuchsia-950 font-mono">
          {formatPrice(totalSupplierDebts)}
        </p>
      </div>
    </div>
  )
}
