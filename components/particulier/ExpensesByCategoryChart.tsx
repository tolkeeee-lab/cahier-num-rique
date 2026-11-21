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
    <div className="bg-[#faf5e8] p-4 rounded-2xl border border-[#e2d6be] space-y-4 mb-4">
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        <PieChart className="w-4 h-4 text-emerald-700" strokeWidth={1.5} />
        <h4 className="text-sm font-semibold text-stone-900">Répartition des dépenses foyer</h4>
      </div>

      {!hasExpenses ? (
        <div className="py-6 text-center text-xs text-stone-500">
          Aucune dépense enregistrée sur cette période
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, idx) => {
            const percentage = totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs text-stone-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    {cat.icon ? cat.icon : null}
                    <span>{cat.label}</span>
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-stone-900">
                    {formatPrice(cat.amount)} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-700 h-full rounded-full transition-[width] duration-300 ease-out"
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
