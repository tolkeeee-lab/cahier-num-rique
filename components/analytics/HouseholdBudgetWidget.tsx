'use client'

import React, { useState, useMemo } from 'react'
import { HouseholdCategoryChart } from './HouseholdCategoryChart'
import { HouseholdMonthlyComparison } from './HouseholdMonthlyComparison'
import { formatPrice } from '@/lib/penUtils'
import { Target } from 'lucide-react'

interface Sale {
  id: string
  date: string
  time: string
  client: string
  total: number
  paid: number
  debt: number
  status: string
  type: string
  pen_color: string
  notes: string
  category?: string
  articles?: Array<{ name: string; quantity: number; unit_price: number; category?: string }>
}

interface HouseholdBudgetWidgetProps {
  sales: Sale[]
  period?: 'today' | '7days' | 'month' | 'all'
  onPeriodChange?: (p: 'today' | '7days' | 'month' | 'all') => void
  shopName?: string
  shopId?: string
  onRefreshData?: () => void
}

export function HouseholdBudgetWidget({
  sales,
  shopId = 'default-shop',
}: HouseholdBudgetWidgetProps) {
  const [monthlyCap] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`cahier_budget_cap_${shopId}`)
      return saved ? parseInt(saved, 10) : 250000
    }
    return 250000
  })

  const budgetStats = useMemo(() => {
    let totalEntrees = 0
    let totalSorties = 0
    let totalReserve = 0

    const categoryMap: Record<string, number> = {
      'Alimentation & Marché': 0,
      'Loyer, Gaz & Maison': 0,
      'Scolarité & Enfants': 0,
      'Santé & Hygiène': 0,
      'Transport & Comms': 0,
      'Divers & Autres': 0,
    }

    sales.forEach((s) => {
      if (s.status === 'crossed_out') return

      const isIncome = s.pen_color === 'blue' || s.type === 'cash_in'
      const isReserve = s.pen_color === 'green'

      const entryAmount = s.paid ?? (s as any).paid_amount ?? s.total ?? (s as any).total_amount ?? 0
      if (isIncome) {
        totalEntrees += entryAmount
      } else if (isReserve) {
        totalReserve += entryAmount
      } else {
        const paidVal = entryAmount
        totalSorties += paidVal

        const notesLower = (s.notes || '').toLowerCase()
        if (/riz|huile|pain|viande|poisson|marché|lait|nourriture/i.test(notesLower)) {
          categoryMap['Alimentation & Marché'] += paidVal
        } else if (/loyer|gaz|courant|eau|cie|sodeci|maison/i.test(notesLower)) {
          categoryMap['Loyer, Gaz & Maison'] += paidVal
        } else if (/école|ecole|scolarité|cahier|tenue|livre/i.test(notesLower)) {
          categoryMap['Scolarité & Enfants'] += paidVal
        } else if (/pharmacie|médicament|savon|couche|soin/i.test(notesLower)) {
          categoryMap['Santé & Hygiène'] += paidVal
        } else if (/essence|carburant|taxi|transport|deplacement/i.test(notesLower)) {
          categoryMap['Transport & Comms'] += paidVal
        } else {
          categoryMap['Divers & Autres'] += paidVal
        }
      }
    })

    const resteAVivre = totalEntrees - totalSorties - totalReserve
    const sortedCategories = Object.entries(categoryMap).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalSorties > 0 ? Math.round((amount / totalSorties) * 100) : 0,
    }))

    return {
      totalEntrees,
      totalSorties,
      totalReserve,
      resteAVivre,
      sortedCategories,
    }
  }, [sales])

  return (
    <div className="space-y-4">
      {/* Plafond de Budget & Suivi */}
      {(() => {
        const safeCap = Number.isFinite(monthlyCap) && monthlyCap > 0 ? monthlyCap : 250000
        const percentageUsed = Math.min(100, Math.round((budgetStats.totalSorties / safeCap) * 100))

        return (
          <div className="bg-white/90 p-4 rounded-2xl border border-amber-300/80 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
                <h4 className="text-sm font-extrabold text-gray-900">Objectif Plafond Mensuel</h4>
              </div>
              <span className="text-xs font-mono font-black text-amber-950 tabular-nums tracking-tight">
                {formatPrice(budgetStats.totalSorties)} / {formatPrice(safeCap)}
              </span>
            </div>

            <div className="w-full bg-amber-100/80 h-3.5 rounded-full overflow-hidden border border-amber-200 shadow-inner">
              <div
                className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${percentageUsed}%` }}
              />
            </div>
          </div>
        )
      })()}

      {/* Bilan Synthétique */}
      <HouseholdMonthlyComparison
        income={budgetStats.totalEntrees}
        expenses={budgetStats.totalSorties}
        reserve={budgetStats.totalReserve}
        netBalance={budgetStats.resteAVivre}
      />

      {/* Ventilation par Catégories */}
      <HouseholdCategoryChart
        categories={budgetStats.sortedCategories}
        totalExpenses={budgetStats.totalSorties}
      />
    </div>
  )
}
