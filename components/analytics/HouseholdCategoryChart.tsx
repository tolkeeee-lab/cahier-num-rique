'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { PieChart } from 'lucide-react'

interface CategoryExpense {
  name: string
  amount: number
  percentage: number
}

interface HouseholdCategoryChartProps {
  categories: CategoryExpense[]
  totalExpenses?: number
}

export const HouseholdCategoryChart: React.FC<HouseholdCategoryChartProps> = ({
  categories,
}) => {
  return (
    <div className="bg-white/90 p-4 rounded-2xl border border-amber-300/80 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
        <PieChart className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
        <h4 className="text-sm font-extrabold text-gray-900">Postes de Dépenses Foyer</h4>
      </div>

      {categories.length === 0 || categories.every(c => c.amount === 0) ? (
        <div className="py-6 text-center text-xs font-mono italic text-gray-500 bg-amber-50/50 rounded-xl border border-dashed border-amber-200">
          Aucune dépense enregistrée sur cette période.
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-gray-800">
                <span className="font-extrabold">{cat.name}</span>
                <span className="font-bold tabular-nums tracking-tight">
                  {formatPrice(cat.amount)} ({cat.percentage}%)
                </span>
              </div>
              <div className="w-full bg-amber-100/80 h-3 rounded-full overflow-hidden border border-amber-200 shadow-inner">
                <div
                  className="bg-amber-600 h-full rounded-full transition-all duration-300 shadow-xs"
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
