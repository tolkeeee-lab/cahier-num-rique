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
    <div className="bg-[#1e1a18] p-5 rounded-2xl border border-gray-800 space-y-4 mb-6 shadow-md">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        <PieChart className="w-5 h-5 text-amber-400" />
        <h4 className="text-sm font-extrabold text-white">Répartition des Dépenses Foyer</h4>
      </div>

      <div className="space-y-3">
        {categories.map((cat, idx) => {
          const percentage = totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-gray-300">
                <span className="flex items-center gap-1.5">
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </span>
                <span className="font-bold">{formatPrice(cat.amount)} ({percentage}%)</span>
              </div>
              <div className="w-full bg-[#141210] h-2 rounded-full overflow-hidden border border-gray-800">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
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
