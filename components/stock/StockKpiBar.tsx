'use client'

import React from 'react'
import { StockItem } from './types'
import { formatPrice } from './stockUtils'

interface StockKpiBarProps {
  items: StockItem[]
  alertCount: number
  stockValue: number
  stockValueSale: number
  totalIn: number
  totalOut: number
}

export function StockKpiBar({
  items,
  alertCount,
  stockValue,
  stockValueSale,
  totalIn,
  totalOut,
}: StockKpiBarProps) {
  // Calcul de la marge uniquement sur les produits ayant un prix d'achat renseigné (> 0)
  const itemsWithCost = items.filter(i => i.unit_cost && i.unit_cost > 0)
  const hasCostInfo = itemsWithCost.length > 0

  let estimatedMarginDisplay = '-- F'
  if (hasCostInfo) {
    const saleVal = itemsWithCost.reduce((sum, i) => sum + (i.current_stock * (i.unit_price || 0)), 0)
    const costVal = itemsWithCost.reduce((sum, i) => sum + (i.current_stock * (i.unit_cost || 0)), 0)
    const margin = Math.max(0, saleVal - costVal)
    estimatedMarginDisplay = formatPrice(margin)
  }

  const kpis = [
    { label: 'Produits', value: items.length, color: 'border-gray-200 text-gray-800' },
    { label: 'Alertes', value: alertCount, color: 'border-red-200 text-red-700' },
    { label: 'Valeur Achat', value: formatPrice(stockValue), color: 'border-emerald-200 text-emerald-800' },
    { label: 'Valeur Vente', value: formatPrice(stockValueSale), color: 'border-indigo-200 text-indigo-800' },
    { label: 'Marge Estimée', value: estimatedMarginDisplay, color: 'border-amber-300 text-amber-900 bg-amber-50', title: hasCostInfo ? undefined : "Prix d'achat non renseignés" },
    { label: 'Total entrées', value: totalIn, color: 'border-blue-200 text-blue-800' },
    { label: 'Total sorties', value: totalOut, color: 'border-rose-200 text-rose-800' },
  ]

  return (
    <div className="flex gap-2 px-4 py-2 border-b border-gray-100 overflow-x-auto scrollbar-hide flex-shrink-0 bg-white bg-opacity-50">
      {kpis.map(kpi => (
        <div key={kpi.label} title={kpi.title} className={`flex-shrink-0 text-center px-3 py-1 bg-[#fffdf9] border rounded-xl ${kpi.color}`}>
          <div className="text-[8px] font-bold uppercase opacity-70">{kpi.label}</div>
          <div className={`font-mono text-sm font-bold ${kpi.color}`}>{kpi.value}</div>
        </div>
      ))}
    </div>
  )
}
