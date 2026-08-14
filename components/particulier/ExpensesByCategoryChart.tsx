'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { PieChart } from 'lucide-react'

interface CategoryExpense {
  category: string
  label: string
  emoji: string
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
  return (
    <div className="bg-white/90 p-4 rounded-2xl border border-amber-300/80 space-y-4 mb-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
        <PieChart className="w-5 h-5 text-amber-700" />
        <h4 className="text-sm font-extrabold text-gray-900">Répartition des Dépenses Foyer</h4>
      </div>

      <div className="space-y-3">
        {categories.map((cat, idx) => {
          const percentage = totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-gray-800">
                <span className="flex items-center gap-1.5 font-extrabold">
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </span>
                <span className="font-bold">{formatPrice(cat.amount)} ({percentage}%)</span>
              </div>
              <div className="w-full bg-amber-100/80 h-3 rounded-full overflow-hidden border border-amber-200 shadow-inner">
                <div
                  className="bg-amber-600 h-full rounded-full transition-all duration-300 shadow-xs"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
