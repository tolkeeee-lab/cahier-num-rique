'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { HouseholdBudgetWidget } from '@/components/analytics/HouseholdBudgetWidget'
import { RestaurantAnalyticsWidget } from '@/components/analytics/RestaurantAnalyticsWidget'
import { ServicesAnalyticsWidget } from '@/components/analytics/ServicesAnalyticsWidget'
import { RetailAnalyticsWidget } from '@/components/analytics/RetailAnalyticsWidget'
import { SyscohadaModal } from '@/components/SyscohadaModal'
import { DashboardCustomizerModal } from '@/components/analytics/DashboardCustomizerModal'
import { Landmark, Sliders, Wallet, ShoppingBag } from 'lucide-react'
import { canViewExecutiveDashboard, DASHBOARD_WIDGET_IDS, getDefaultDashboardWidgets } from '@/lib/roleUtils'

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
  userRole?: string
  onRefreshData?: () => void
}

export function AnalyticsDashboard({
  sales,
  userShops = [],
  currentShopActivity,
  shopId,
  userRole = 'owner',
  onRefreshData
}: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'all'>('all')
  const [showSyscohada, setShowSyscohada] = useState(false)
  const [showCustomizer, setShowCustomizer] = useState(false)

  const activeActivity = useMemo(() => {
    return currentShopActivity || (userShops.find(s => s.activity)?.activity) || 'boutique'
  }, [currentShopActivity, userShops])

  const currentShopObj = userShops.find(s => s.id === shopId) || userShops.find(s => s.activity === activeActivity)
  const shopName = currentShopObj?.name || userShops[0]?.name || 'Cahier'
  const activeShopId = shopId || currentShopObj?.id || 'default-shop'

  // Widgets actifs personnalisables par boutique + rôle
  const widgetsStorageKey = `cahier_dashboard_widgets_${activeShopId}_${userRole}`
  const [activeWidgets, setActiveWidgets] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(widgetsStorageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      } catch (e) {
        console.warn('Erreur lecture widgets personnalisés:', e)
      }
    }
    return getDefaultDashboardWidgets(userRole, activeActivity)
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(widgetsStorageKey, JSON.stringify(activeWidgets))
    }
  }, [activeWidgets, widgetsStorageKey])

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

  const isExecutive = canViewExecutiveDashboard(userRole)

  // Statistiques caisse du jour pour l'employé
  const todayStats = useMemo(() => {
    const now = new Date()
    const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const todays = sales.filter(s => s.date === todayStr && s.status !== 'crossed_out')
    const totalCash = todays.filter(s => s.type === 'cash_in').reduce((sum, s) => sum + (s.total || 0), 0)
    const count = todays.filter(s => s.type === 'cash_in' || s.type === 'sale_credit').length
    return { totalCash, count }
  }, [sales])

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#fbf9f4] font-sans p-4 md:p-6 space-y-4">
      {/* Barre supérieure d'actions et de personnalisation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900">{shopName}</h2>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              isExecutive ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
            }`}>
              {isExecutive ? 'Vue Patron' : 'Vue Caissier'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {isExecutive
              ? 'Tableau de bord de pilotage exécutif et comptable'
              : 'Espace de caisse opérationnel de l\'équipe'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isExecutive && (
            <button
              onClick={() => setShowCustomizer(true)}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border border-stone-300"
            >
              <Sliders className="w-3.5 h-3.5 text-stone-600" />
              <span>Personnaliser</span>
            </button>
          )}

          {isExecutive && (
            <button
              onClick={() => setShowSyscohada(true)}
              className="px-3.5 py-2 bg-amber-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Bilan SYSCOHADA</span>
            </button>
          )}
        </div>
      </div>

      {/* Vue Épurée pour Employé / Caissier */}
      {!isExecutive && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Caisse Encaissée Aujourd'hui</span>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">
                  {todayStats.totalCash.toLocaleString()} <span className="text-sm font-normal">FCFA</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Ventes du jour</span>
                <div className="text-2xl font-black text-blue-900 mt-0.5">
                  {todayStats.count} <span className="text-sm font-normal">opérations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner Comptabilité SYSCOHADA (si actif et autorisé) */}
      {isExecutive && activeWidgets.includes(DASHBOARD_WIDGET_IDS.SYSCOHADA_SUMMARY) && (
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
            <span>Ouvrir Bilan SMT</span>
          </button>
        </div>
      )}

      {/* Widgets Métier Spécifiques */}
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
          shopId={shopId}
          onRefreshData={onRefreshData}
        />
      )}

      {/* Modal SYSCOHADA */}
      <SyscohadaModal
        isOpen={showSyscohada}
        onClose={() => setShowSyscohada(false)}
        sales={sales}
        periodLabel={period}
        shopName={shopName}
      />

      {/* Modal de Personnalisation du Dashboard */}
      <DashboardCustomizerModal
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        shopId={activeShopId}
        userRole={userRole}
        shopActivity={activeActivity}
        activeWidgets={activeWidgets}
        onSaveWidgets={setActiveWidgets}
      />
    </div>
  )
}
