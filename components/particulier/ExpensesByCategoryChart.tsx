'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { PieChart } from 'lucide-react'

interface CategoryExpense {
  category: string
  label: string
  emoji?: string
  icon?: React.ReactNode
  amount: number
}

interface ExpensesByCategoryChartProps {
  categories: CategoryExpense[]
  totalExpenses: number
}

export const ExpensesByCategoryChart: React.FC<ExpensesByCategoryChartProps> = ({
  categories,
  totalExpenses,
}) => {
  const hasExpenses = totalExpenses > 0 && categories.some((c) => c.amount > 0)

  return (
    <div className="bg-white/90 p-4 rounded-2xl border border-amber-300/80 space-y-4 mb-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
        <PieChart className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
        <h4 className="text-sm font-extrabold text-gray-900">Répartition des Dépenses Foyer</h4>
      </div>

      {!hasExpenses ? (
        <div className="py-6 text-center text-xs text-stone-500 font-medium italic">
          Aucune dépense enregistrée sur cette période
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, idx) => {
            const percentage = totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-gray-800">
                  <span className="flex items-center gap-1.5 font-extrabold">
                    {cat.icon ? cat.icon : <span>{cat.emoji}</span>}
                    <span>{cat.label}</span>
                  </span>
                  <span className="font-bold tabular-nums tracking-tight">{formatPrice(cat.amount)} ({percentage}%)</span>
                </div>
                <div className="w-full bg-amber-100/80 h-2.5 rounded-full overflow-hidden border border-amber-200 shadow-inner">
                  <div
                    className="bg-amber-600 h-full rounded-full transition-[width] duration-300 ease-out shadow-xs"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
