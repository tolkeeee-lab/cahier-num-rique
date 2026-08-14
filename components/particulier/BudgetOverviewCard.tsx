'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { TrendingUp, TrendingDown, PiggyBank, Wallet } from 'lucide-react'

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
      {/* Entrées Cash / Revenus */}
      <div className="bg-blue-50/90 p-4 rounded-2xl border border-blue-200 space-y-1 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-blue-800 font-mono font-extrabold">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          <span>Revenus / Entrées</span>
        </div>
        <p className="text-base font-black text-blue-950 font-mono">
          {formatPrice(income)}
        </p>
      </div>

      {/* Dépenses Cash Foyer */}
      <div className="bg-rose-50/90 p-4 rounded-2xl border border-rose-200 space-y-1 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-rose-800 font-mono font-extrabold">
          <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
          <span>Dépenses Foyer</span>
        </div>
        <p className="text-base font-black text-rose-950 font-mono">
          {formatPrice(expenses)}
        </p>
      </div>

      {/* Stock Réserve */}
      <div className="bg-emerald-50/90 p-4 rounded-2xl border border-emerald-200 space-y-1 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-mono font-extrabold">
          <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
          <span>Réserve Stock</span>
        </div>
        <p className="text-base font-black text-emerald-950 font-mono">
          {formatPrice(reserveStock)}
        </p>
      </div>

      {/* Solde Net Disponible */}
      <div className="bg-amber-100/90 p-4 rounded-2xl border border-amber-300 space-y-1 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-amber-950 font-mono font-extrabold">
          <Wallet className="w-3.5 h-3.5 text-amber-700" />
          <span>Solde Net</span>
        </div>
        <p className="text-base font-black text-amber-950 font-mono">
          {formatPrice(netBalance)}
        </p>
      </div>
    </div>
  )
}
