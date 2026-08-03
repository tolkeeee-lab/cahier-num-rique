'use client'

import React, { useState, useMemo } from 'react'
import { Layers, ShieldAlert, Landmark, ChevronDown, ChevronUp } from 'lucide-react'
import { calculateCategoryCashboxBreakdown, CategoryCashboxGroup } from '@/lib/boutiqueAnalyticsEngine'

interface CategoryCashboxWidgetProps {
  sales: any[]
  products?: any[]
  activeCashboxFilter?: string
  onSelectCashboxFilter?: (filter: string) => void
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount) + ' F'
}

export function CategoryCashboxWidget({
  sales,
  products = [],
  activeCashboxFilter = 'ALL',
  onSelectCashboxFilter,
}: CategoryCashboxWidgetProps) {
  // Mode Caisse : 'unified' (Caisse Unique Commune) vs 'separated' (Multi-Caisses par Rayon)
  const [cashboxMode, setCashboxMode] = useState<'unified' | 'separated'>('unified')
  const [showDetailInUnified, setShowDetailInUnified] = useState(false)

  const breakdown = useMemo(
    () => calculateCategoryCashboxBreakdown(sales, products),
    [sales, products]
  )

  const activeGroups = useMemo(() => {
    const list: CategoryCashboxGroup[] = [breakdown.boissons, breakdown.divers]
    if (breakdown.resto.revenue > 0 || breakdown.resto.itemCount > 0) {
      list.push(breakdown.resto)
    }
    if (breakdown.services.revenue > 0 || breakdown.services.itemCount > 0) {
      list.push(breakdown.services)
    }
    return list
  }, [breakdown])

  // Totaux Généraux Caisse Unique
  const unifiedTotals = useMemo(() => {
    let totalStockSale = 0
    let totalStockCost = 0
    let totalDebt = 0
    let totalExpenses = 0
    let totalItems = 0
    let totalOutOfStock = 0

    activeGroups.forEach(g => {
      totalStockSale += g.stockValueSale
      totalStockCost += g.stockValueCost
      totalDebt += g.debt
      totalExpenses += g.expenses
      totalItems += g.itemCount
      totalOutOfStock += g.outOfStockCount
    })

    return {
      revenue: breakdown.totalCa,
      paidCash: breakdown.totalCash,
      debt: totalDebt,
      expenses: totalExpenses,
      stockValueSale: totalStockSale,
      stockValueCost: totalStockCost,
      itemCount: totalItems,
      outOfStockCount: totalOutOfStock,
    }
  }, [breakdown, activeGroups])

  return (
    <div className="bg-[#fffdf9] border-2 border-amber-900/15 rounded-3xl p-5 shadow-sm space-y-4 font-sans">
      {/* En-tête avec Sélecteur de Mode (Caisse Unique vs Multi-Caisses) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center font-bold shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-handwritten text-lg font-bold text-amber-950">
              Gestion de Caisse & Trésorerie
            </h3>
            <p className="text-xs text-amber-800 font-medium">
              {cashboxMode === 'unified' 
                ? '🏛️ Mode Caisse Unique (Toutes les écritures regroupées)' 
                : '🥤📦 Mode Multi-Caisses (Fonds de roulement séparés par rayon)'}
            </p>
          </div>
        </div>

        {/* Boutons d'interrupteur Caisse Unique ↔ Multi-Caisses */}
        <div className="flex items-center gap-1 bg-amber-100/70 p-1 rounded-2xl border border-amber-300 self-start md:self-auto text-xs font-bold font-mono">
          <button
            onClick={() => setCashboxMode('unified')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              cashboxMode === 'unified'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-amber-950 hover:bg-amber-200/60'
            }`}
          >
            <span>🏛️</span> Caisse Unique (Commune)
          </button>
          <button
            onClick={() => setCashboxMode('separated')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              cashboxMode === 'separated'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-amber-950 hover:bg-amber-200/60'
            }`}
          >
            <span>🥤📦</span> Multi-Caisses (Par Rayon)
          </button>
        </div>
      </div>

      {/* MODE 1 : CAISSE UNIQUE (COMMUNE) */}
      {cashboxMode === 'unified' ? (
        <div className="space-y-3">
          <div className="bg-amber-900 text-amber-50 rounded-2xl p-4 space-y-3.5 shadow-sm border border-amber-950">
            <div className="flex items-center justify-between border-b border-amber-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-300" />
                <div>
                  <h4 className="font-bold text-base text-amber-100">Caisse Commune Centrale</h4>
                  <span className="text-[10px] text-amber-300 font-mono">
                    Ensemble des recettes, dépenses et stocks de la boutique ({unifiedTotals.itemCount} références)
                  </span>
                </div>
              </div>

              {unifiedTotals.outOfStockCount > 0 && (
                <span className="px-2.5 py-1 bg-red-900/80 text-red-100 border border-red-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  {unifiedTotals.outOfStockCount} en rupture
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
              <div className="p-3 bg-amber-950/70 border border-amber-800/70 rounded-xl space-y-1">
                <span className="text-[9.5px] uppercase font-bold text-amber-300 block">Chiffre d'Affaires</span>
                <span className="text-base font-bold text-amber-100 block">{formatPrice(unifiedTotals.revenue)}</span>
                <span className="text-[9px] text-emerald-400">Cash encaissé : {formatPrice(unifiedTotals.paidCash)}</span>
              </div>

              <div className="p-3 bg-amber-950/70 border border-amber-800/70 rounded-xl space-y-1">
                <span className="text-[9.5px] uppercase font-bold text-amber-300 block">Capital Stock Total</span>
                <span className="text-base font-bold text-amber-100 block">{formatPrice(unifiedTotals.stockValueSale)}</span>
                <span className="text-[9px] text-amber-300/80">Coût d'achat : {formatPrice(unifiedTotals.stockValueCost)}</span>
              </div>

              <div className="p-3 bg-amber-950/70 border border-amber-800/70 rounded-xl space-y-1">
                <span className="text-[9.5px] uppercase font-bold text-amber-300 block">Crédits Clients</span>
                <span className="text-base font-bold text-amber-200 block">{formatPrice(unifiedTotals.debt)}</span>
                <span className="text-[9px] text-amber-300/80">Reste à recouvrer</span>
              </div>

              <div className="p-3 bg-amber-950/70 border border-amber-800/70 rounded-xl space-y-1">
                <span className="text-[9.5px] uppercase font-bold text-amber-300 block">Dépenses Cash</span>
                <span className="text-base font-bold text-rose-300 block">-{formatPrice(unifiedTotals.expenses)}</span>
                <span className="text-[9px] text-rose-300/80">Sorties de caisse</span>
              </div>
            </div>

            {/* Accordéon de détail optionnel */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => setShowDetailInUnified(!showDetailInUnified)}
                className="text-xs font-bold text-amber-200 hover:text-white flex items-center gap-1 font-mono transition-all"
              >
                <span>{showDetailInUnified ? 'Masquer la répartition par rayon' : 'Afficher la répartition par rayon (Boissons / Divers)'}</span>
                {showDetailInUnified ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Ventilation optionnelle dans la Caisse Unique */}
          {showDetailInUnified && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {activeGroups.map(group => (
                <div key={group.key} className="bg-white border border-amber-200 rounded-xl p-3 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-950 border-b border-amber-100 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>{group.icon}</span> {group.name}
                    </span>
                    <span>{formatPrice(group.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-600">
                    <span>Cash : +{formatPrice(group.paidCash)}</span>
                    <span>Stock : {formatPrice(group.stockValueSale)} ({group.itemCount} art.)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* MODE 2 : MULTI-CAISSES (PAR RAYON SEPARÉS) */
        <div className="space-y-4">
          {onSelectCashboxFilter && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs font-bold font-mono">
              <button
                onClick={() => onSelectCashboxFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeCashboxFilter === 'ALL'
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'bg-amber-100/60 text-amber-900 hover:bg-amber-200/50'
                }`}
              >
                Toutes les caisses
              </button>
              <button
                onClick={() => onSelectCashboxFilter('boissons')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                  activeCashboxFilter === 'boissons'
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'bg-amber-100/60 text-amber-900 hover:bg-amber-200/50'
                }`}
              >
                <span>🥤</span> Boissons
              </button>
              <button
                onClick={() => onSelectCashboxFilter('divers')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                  activeCashboxFilter === 'divers'
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'bg-amber-100/60 text-amber-900 hover:bg-amber-200/50'
                }`}
              >
                <span>📦</span> Divers
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGroups.map(group => {
              const isBoisson = group.key === 'boissons'
              const isDivers = group.key === 'divers'
              const isResto = group.key === 'resto'

              const themeClass = isBoisson
                ? 'bg-blue-50/50 border-blue-200 text-blue-950'
                : isDivers
                ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                : isResto
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                : 'bg-purple-50/50 border-purple-200 text-purple-950'

              return (
                <div key={group.key} className={`border rounded-2xl p-4 space-y-3.5 shadow-xs ${themeClass}`}>
                  {/* Entête Caisse */}
                  <div className="flex items-center justify-between border-b border-black/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{group.icon}</span>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{group.name}</h4>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {group.itemCount} référence(s) en stock
                        </span>
                      </div>
                    </div>

                    {group.outOfStockCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        {group.outOfStockCount} épuisé(s)
                      </span>
                    )}
                  </div>

                  {/* Chiffres Clés de la Caisse */}
                  <div className="grid grid-cols-2 gap-2.5 font-mono">
                    <div className="p-3 bg-white border border-gray-200/80 rounded-xl space-y-1">
                      <span className="text-[9.5px] uppercase font-bold text-gray-500 block">
                        Ventes (Chiffre d'Affaires)
                      </span>
                      <span className="text-base font-bold text-gray-900 block">
                        {formatPrice(group.revenue)}
                      </span>
                      <span className="text-[9px] text-emerald-700 font-medium">
                        Cash : +{formatPrice(group.paidCash)}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-gray-200/80 rounded-xl space-y-1">
                      <span className="text-[9.5px] uppercase font-bold text-gray-500 block">
                        Capital Stock (Immobilisé)
                      </span>
                      <span className="text-base font-bold text-gray-900 block">
                        {formatPrice(group.stockValueSale)}
                      </span>
                      <span className="text-[9px] text-gray-500">
                        Prix de revient : {formatPrice(group.stockValueCost)}
                      </span>
                    </div>
                  </div>

                  {/* Détails Crédits & Dépenses du rayon */}
                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    <div className="flex items-center gap-1.5 text-amber-900">
                      <span>🟡 Crédits en cours :</span>
                      <strong className="font-bold">{formatPrice(group.debt)}</strong>
                    </div>

                    {group.expenses > 0 && (
                      <div className="text-red-700">
                        🔴 Dépenses rayon : <strong>-{formatPrice(group.expenses)}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
