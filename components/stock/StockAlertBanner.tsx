'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface StockAlertBannerProps {
  lowStockCount: number
  outOfStockCount: number
  onFilterLowStock?: () => void
}

export const StockAlertBanner: React.FC<StockAlertBannerProps> = ({
  lowStockCount,
  outOfStockCount,
  onFilterLowStock,
}) => {
  if (lowStockCount === 0 && outOfStockCount === 0) return null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFilterLowStock}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onFilterLowStock?.()
        }
      }}
      className="p-3.5 rounded-2xl bg-amber-100/90 border border-amber-300 flex items-center justify-between cursor-pointer hover:bg-amber-200/80 active:scale-[0.98] transition-all duration-100 ease-out shadow-sm mb-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center flex-shrink-0 font-bold shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-800 animate-pulse" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-xs font-extrabold text-amber-950">Attention aux stocks bas !</p>
          <p className="text-[11px] text-amber-900 font-mono">
            {outOfStockCount > 0 && <span className="text-rose-700 font-extrabold"><span className="tabular-nums">{outOfStockCount}</span> produit(s) épuisé(s). </span>}
            {lowStockCount > 0 && <span><span className="tabular-nums">{lowStockCount}</span> produit(s) sous le seuil d'alerte.</span>}
          </p>
        </div>
      </div>

      <span className="text-xs font-mono font-extrabold text-amber-900 underline hover:text-black">
        Filtrer
      </span>
    </div>
  )
}
