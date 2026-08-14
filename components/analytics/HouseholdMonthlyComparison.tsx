'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react'

interface HouseholdMonthlyComparisonProps {
  income: number
  expenses: number
  reserve: number
  netBalance: number
}

export const HouseholdMonthlyComparison: React.FC<HouseholdMonthlyComparisonProps> = ({
  income,
  expenses,
  reserve,
  netBalance,
}) => {
  return (
    <div className="bg-[#1e1a18] p-5 rounded-2xl border border-gray-800 space-y-4 shadow-md">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        <Calendar className="w-5 h-5 text-amber-400" />
        <h4 className="text-sm font-extrabold text-white">Bilan Mensuel Synthétique</h4>
      </div>

      <div className="grid grid-cols-2 gap-3 font-mono text-xs">
        <div className="bg-[#141210] p-3 rounded-xl border border-gray-800 space-y-1">
          <p className="text-blue-400 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Entrées
          </p>
          <p className="text-sm font-extrabold text-white">{formatPrice(income)}</p>
        </div>

        <div className="bg-[#141210] p-3 rounded-xl border border-gray-800 space-y-1">
          <p className="text-rose-400 font-bold flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Sorties
          </p>
          <p className="text-sm font-extrabold text-white">{formatPrice(expenses)}</p>
        </div>

        <div className="bg-[#141210] p-3 rounded-xl border border-gray-800 space-y-1">
          <p className="text-emerald-400 font-bold">Réserve Stock</p>
          <p className="text-sm font-extrabold text-white">{formatPrice(reserve)}</p>
        </div>

        <div className="bg-[#141210] p-3 rounded-xl border border-amber-900/40 space-y-1">
          <p className="text-amber-400 font-bold">Reste à Vivre</p>
          <p className="text-sm font-extrabold text-amber-400">{formatPrice(netBalance)}</p>
        </div>
      </div>
    </div>
  )
}
