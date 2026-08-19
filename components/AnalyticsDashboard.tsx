'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { ShopAccountingReport } from '@/components/analytics/ShopAccountingReport'
import { HouseholdBudgetWidget } from '@/components/analytics/HouseholdBudgetWidget'
import { RestaurantAnalyticsWidget } from '@/components/analytics/RestaurantAnalyticsWidget'
import { ServicesAnalyticsWidget } from '@/components/analytics/ServicesAnalyticsWidget'
import { RetailAnalyticsWidget } from '@/components/analytics/RetailAnalyticsWidget'
import { SyscohadaModal } from '@/components/SyscohadaModal'
import { DashboardCustomizerModal } from '@/components/analytics/DashboardCustomizerModal'
import { Landmark, BarChart3, Receipt } from 'lucide-react'
import { canViewExecutiveDashboard, getDefaultDashboardWidgets } from '@/lib/roleUtils'

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

  const [viewMode, setViewMode] = useState<'accounting' | 'products'>('accounting')

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#fbf9f4] font-sans p-3 sm:p-5 md:p-6 space-y-4">
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
              ? 'Comptabilité certifiée, chiffre d\'affaires à vie et bilan financier'
              : 'Espace de caisse opérationnel de l\'équipe'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Switcher Bilan vs Produits */}
          <div className="flex items-center gap-1 bg-amber-100/70 p-1 rounded-xl border border-amber-300 font-mono text-xs">
            <button
              type="button"
              onClick={() => setViewMode('accounting')}
              className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'accounting' ? 'bg-amber-900 text-white shadow-xs' : 'text-amber-950 hover:bg-amber-200/70'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Bilan & Comptabilité</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('products')}
              className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'products' ? 'bg-amber-900 text-white shadow-xs' : 'text-amber-950 hover:bg-amber-200/70'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Top Ventes & Rayons</span>
            </button>
          </div>

          {isExecutive && (
            <button
              onClick={() => setShowSyscohada(true)}
              className="px-3 py-2 bg-amber-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              title="Bilan conforme référentiel SYSCOHADA"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SYSCOHADA</span>
            </button>
          )}
        </div>
      </div>

      {/* Vue Épurée pour Employé / Caissier */}
      {!isExecutive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              💰
            </div>
            <div>
              <span className="text-[11px] text-stone-500 font-bold uppercase tracking-wider font-mono">Caisse Encaissée Aujourd'hui</span>
              <div className="text-xl font-black text-emerald-700 font-mono">
                {todayStats.totalCash.toLocaleString('fr-FR')} <span className="text-xs font-normal">FCFA</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              📦
            </div>
            <div>
              <span className="text-[11px] text-stone-500 font-bold uppercase tracking-wider font-mono">Ventes du jour</span>
              <div className="text-xl font-black text-blue-900 font-mono">
                {todayStats.count} <span className="text-xs font-normal">opérations</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. Vue Comptabilité Complète (Par défaut) ── */}
      {viewMode === 'accounting' && (
        <ShopAccountingReport
          sales={sales}
          shopId={activeShopId}
          shopName={shopName}
          shopActivity={activeActivity}
        />
      )}

      {/* ── 2. Vue Analyse Produits & Rayons ── */}
      {viewMode === 'products' && (
        <div className="space-y-4">
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
        </div>
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
