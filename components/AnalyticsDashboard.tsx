'use client'

import React, { useState, useMemo } from 'react'
import { HouseholdBudgetWidget } from '@/components/analytics/HouseholdBudgetWidget'
import { RestaurantAnalyticsWidget } from '@/components/analytics/RestaurantAnalyticsWidget'
import { ServicesAnalyticsWidget } from '@/components/analytics/ServicesAnalyticsWidget'
import { RetailAnalyticsWidget } from '@/components/analytics/RetailAnalyticsWidget'
import { SyscohadaModal } from '@/components/SyscohadaModal'
import { Landmark } from 'lucide-react'

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
  shopId?: string
  onRefreshData?: () => void
}

export function AnalyticsDashboard({ sales, userShops = [], currentShopActivity, shopId, onRefreshData }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'all'>('all')
  const [showSyscohada, setShowSyscohada] = useState(false)

  const activeActivity = useMemo(() => {
    return currentShopActivity || (userShops.find(s => s.activity)?.activity) || 'boutique'
  }, [currentShopActivity, userShops])

  // Filtrer les ventes selon la période choisie
  const filteredSales = useMemo(() => {
    const validSales = sales.filter(s => s.status !== 'crossed_out')
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

  const currentShopObj = userShops.find(s => s.id === shopId) || userShops.find(s => s.activity === activeActivity)
  const shopName = currentShopObj?.name || userShops[0]?.name || 'Cahier'
  const activeShopId = shopId || currentShopObj?.id || 'default-shop'

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#fbf9f4] font-sans p-4 md:p-6 space-y-4">
      {/* Banner Comptabilité SYSCOHADA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f4ebd9] border border-amber-250 rounded-2xl px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-900 text-amber-100 flex items-center justify-center font-bold">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-950">Comptabilité Référentiel SYSCOHADA (OHADA)</h4>
            <p className="text-[10.5px] text-amber-800">Système Minimal de Trésorerie (SMT), Comptes 701, 601, 571, 411, 401 & Export CSV</p>
          </div>
        </div>

        <button
          onClick={() => setShowSyscohada(true)}
          className="px-3.5 py-1.5 bg-amber-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 self-end sm:self-auto"
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Bilan & Export SYSCOHADA</span>
        </button>
      </div>

      {activeActivity === 'particulier' && (
        <HouseholdBudgetWidget
          sales={filteredSales}
          period={period}
          onPeriodChange={setPeriod}
          shopName={shopName}
          shopId={activeShopId}
          onRefreshData={onRefreshData}
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

      <SyscohadaModal
        isOpen={showSyscohada}
        onClose={() => setShowSyscohada(false)}
        sales={sales}
        periodLabel={period}
        shopName={shopName}
      />
    </div>
  )
}

