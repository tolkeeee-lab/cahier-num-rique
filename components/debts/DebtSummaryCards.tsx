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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      {/* Argent Dehors Clients */}
      <div className="bg-[#1e1a18] p-4 rounded-2xl border border-amber-900/40 space-y-1 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Argent Dehors (Dettes Clients)</span>
        </div>
        <p className="text-xl font-extrabold text-amber-400 font-mono">
          {formatPrice(totalClientDebts)}
        </p>
      </div>

      {/* Dettes Fournisseurs / Grossistes */}
      <div className="bg-[#1e1a18] p-4 rounded-2xl border border-fuchsia-950/60 space-y-1 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-fuchsia-400 font-mono">
          <Store className="w-3.5 h-3.5" />
          <span>Dettes Grossistes (Fournisseurs)</span>
        </div>
        <p className="text-xl font-extrabold text-fuchsia-400 font-mono">
          {formatPrice(totalSupplierDebts)}
        </p>
      </div>
    </div>
  )
}
