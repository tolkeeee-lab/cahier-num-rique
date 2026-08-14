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
    <div className="bg-[#1e1a18] p-5 rounded-2xl border border-gray-800 space-y-4 shadow-md">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        <PieChart className="w-5 h-5 text-amber-400" />
        <h4 className="text-sm font-extrabold text-white">Postes de Dépenses Foyer</h4>
      </div>

      <div className="space-y-3">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-gray-300">
              <span className="font-bold">{cat.name}</span>
              <span>{formatPrice(cat.amount)} ({cat.percentage}%)</span>
            </div>
            <div className="w-full bg-[#141210] h-2.5 rounded-full overflow-hidden border border-gray-800">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${cat.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
