'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'

interface BudgetOverviewCardProps {
  income: number
  expenses: number
  reserveStock: number
  netBalance: number
}

export const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = ({
  income,
  expenses,
  reserveStock,
  netBalance,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="bg-[#faf5e8] p-4 rounded-xl border border-[#e2d6be] space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>Revenus / Entrées</span>
        </div>
        <p className="text-lg font-semibold text-stone-900 font-mono tabular-nums">
          {formatPrice(income)}
        </p>
      </div>

      <div className="bg-[#faf5e8] p-4 rounded-xl border border-[#e2d6be] space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-rose-600" />
          <span>Dépenses foyer</span>
        </div>
        <p className="text-lg font-semibold text-rose-700 font-mono tabular-nums">
          {formatPrice(expenses)}
        </p>
      </div>

      <div className="bg-[#faf5e8] p-4 rounded-xl border border-[#e2d6be] space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-600" />
          <span>Réserve stock</span>
        </div>
        <p className="text-lg font-semibold text-stone-900 font-mono tabular-nums">
          {formatPrice(reserveStock)}
        </p>
      </div>

      <div className="bg-[#faf5e8] p-4 rounded-xl border border-[#e2d6be] space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-stone-800" />
          <span>Solde net</span>
        </div>
        <p className="text-lg font-semibold text-emerald-800 font-mono tabular-nums">
          {formatPrice(netBalance)}
        </p>
      </div>
    </div>
  )
}
