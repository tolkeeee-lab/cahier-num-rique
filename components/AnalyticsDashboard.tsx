'use client'

import React, { useState, useMemo } from 'react'
import { HouseholdBudgetWidget } from '@/components/analytics/HouseholdBudgetWidget'
import { RestaurantAnalyticsWidget } from '@/components/analytics/RestaurantAnalyticsWidget'
import { ServicesAnalyticsWidget } from '@/components/analytics/ServicesAnalyticsWidget'
import { RetailAnalyticsWidget } from '@/components/analytics/RetailAnalyticsWidget'

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

interface AnalyticsDashboardProps {
  sales: Sale[]
  userShops?: Array<{ id: string; name: string; activity: string }>
  currentShopActivity?: string
}

export function AnalyticsDashboard({ sales, userShops = [], currentShopActivity }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'all'>('all')

  const activeActivity = useMemo(() => {
    return currentShopActivity || (userShops.find(s => s.activity)?.activity) || 'boutique'
  }, [currentShopActivity, userShops])

  // Filtrer les ventes selon la période choisie
  const filteredSales = useMemo(() => {
    const validSales = sales.filter(s => s.status !== 'crossed_out' && (s.type === 'cash_in' || s.type === 'sale_credit'))
    if (period === 'all') return validSales

    const now = new Date()
    const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

    if (period === 'today') {
      return validSales.filter(s => s.date === todayStr)
    }

    if (period === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return validSales.filter(s => new Date(s.date) >= sevenDaysAgo)
    }

    if (period === 'month') {
      const currentMonth = todayStr.slice(0, 7)
      return validSales.filter(s => s.date && s.date.startsWith(currentMonth))
    }

    return validSales
  }, [sales, period])

  const shopName = userShops.find(s => s.activity === activeActivity)?.name || userShops[0]?.name || 'Cahier'

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#fbf9f4] font-sans p-4 md:p-6">
      {activeActivity === 'particulier' && (
        <HouseholdBudgetWidget
          sales={filteredSales}
          period={period}
          onPeriodChange={setPeriod}
          shopName={shopName}
        />
      )}

      {activeActivity === 'resto' && (
        <RestaurantAnalyticsWidget
          sales={filteredSales}
          period={period}
          onPeriodChange={setPeriod}
          shopName={shopName}
        />
      )}

      {activeActivity === 'prestations' && (
        <ServicesAnalyticsWidget
          sales={filteredSales}
          period={period}
          onPeriodChange={setPeriod}
          shopName={shopName}
        />
      )}

      {activeActivity === 'boutique' && (
        <RetailAnalyticsWidget
          sales={filteredSales}
          period={period}
          onPeriodChange={setPeriod}
          shopName={shopName}
        />
      )}
    </div>
  )
}
