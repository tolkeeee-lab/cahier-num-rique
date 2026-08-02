'use client'

import React, { useMemo } from 'react'
import { Layers, ShieldAlert } from 'lucide-react'
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

  return (
    <div className="bg-[#fffdf9] border-2 border-amber-900/15 rounded-3xl p-5 shadow-sm space-y-4 font-sans">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center font-bold shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-handwritten text-lg font-bold text-amber-950">
              Séparation des Caisses & du Capital
            </h3>
            <p className="text-xs text-amber-800 font-medium">
              Suivi séparé de la trésorerie et des stocks (Boissons vs Divers / Épicerie)
            </p>
          </div>
        </div>

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
      </div>

      {/* Grille des Caisses Séparées */}
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

          const badgeClass = isBoisson
            ? 'bg-blue-100 text-blue-900 border-blue-300'
            : isDivers
            ? 'bg-amber-100 text-amber-900 border-amber-300'
            : isResto
            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
            : 'bg-purple-100 text-purple-900 border-purple-300'

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
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-white border border-gray-200/80 rounded-xl space-y-1">
                  <span className="text-[9.5px] uppercase font-bold text-gray-500 block">
                    Ventes (Chiffre d'Affaires)
                  </span>
                  <span className="text-base font-bold font-mono text-gray-900 block">
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
                  <span className="text-base font-bold font-mono text-gray-900 block">
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
  )
}
