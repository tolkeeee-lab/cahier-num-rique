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
    <div className="bg-white/90 p-4 rounded-2xl border border-amber-300/80 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
        <Calendar className="w-5 h-5 text-amber-700" />
        <h4 className="text-sm font-extrabold text-gray-900">Bilan Mensuel Synthétique</h4>
      </div>

      <div className="grid grid-cols-2 gap-3 font-mono text-xs">
        <div className="bg-blue-50/90 p-3 rounded-xl border border-blue-200 space-y-1 shadow-xs">
          <p className="text-blue-800 font-extrabold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Entrées
          </p>
          <p className="text-sm font-black text-blue-950">{formatPrice(income)}</p>
        </div>

        <div className="bg-rose-50/90 p-3 rounded-xl border border-rose-200 space-y-1 shadow-xs">
          <p className="text-rose-800 font-extrabold flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Sorties
          </p>
          <p className="text-sm font-black text-rose-950">{formatPrice(expenses)}</p>
        </div>

        <div className="bg-emerald-50/90 p-3 rounded-xl border border-emerald-200 space-y-1 shadow-xs">
          <p className="text-emerald-800 font-extrabold">Réserve Stock</p>
          <p className="text-sm font-black text-emerald-950">{formatPrice(reserve)}</p>
        </div>

        <div className="bg-amber-100/90 p-3 rounded-xl border border-amber-300 space-y-1 shadow-xs">
          <p className="text-amber-900 font-extrabold">Reste à Vivre</p>
          <p className="text-sm font-black text-amber-950">{formatPrice(netBalance)}</p>
        </div>
      </div>
    </div>
  )
}
