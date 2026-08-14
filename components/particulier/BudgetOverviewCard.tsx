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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Entrées Cash / Revenus */}
      <div className="bg-[#1e1a18] p-4 rounded-2xl border border-gray-800 space-y-1 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-blue-400 font-mono">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Revenus / Entrées</span>
        </div>
        <p className="text-base font-extrabold text-white font-mono">
          {formatPrice(income)}
        </p>
      </div>

      {/* Dépenses Cash Foyer */}
      <div className="bg-[#1e1a18] p-4 rounded-2xl border border-gray-800 space-y-1 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-rose-400 font-mono">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Dépenses Foyer</span>
        </div>
        <p className="text-base font-extrabold text-white font-mono">
          {formatPrice(expenses)}
        </p>
      </div>

      {/* Stock Réserve */}
      <div className="bg-[#1e1a18] p-4 rounded-2xl border border-gray-800 space-y-1 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
          <PiggyBank className="w-3.5 h-3.5" />
          <span>Réserve Stock</span>
        </div>
        <p className="text-base font-extrabold text-white font-mono">
          {formatPrice(reserveStock)}
        </p>
      </div>

      {/* Solde Net Disponible */}
      <div className="bg-[#1e1a18] p-4 rounded-2xl border border-amber-900/40 space-y-1 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
          <Wallet className="w-3.5 h-3.5" />
          <span>Solde Net</span>
        </div>
        <p className="text-base font-extrabold text-amber-400 font-mono">
          {formatPrice(netBalance)}
        </p>
      </div>
    </div>
  )
}
