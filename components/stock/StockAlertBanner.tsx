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
      onClick={onFilterLowStock}
      className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/60 flex items-center justify-between cursor-pointer hover:bg-amber-950/50 transition-colors shadow-md mb-6"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
        <div>
          <p className="text-xs font-bold text-amber-300">Attention aux stocks bas !</p>
          <p className="text-[11px] text-amber-200/70 font-mono">
            {outOfStockCount > 0 && <span className="text-red-400 font-bold">{outOfStockCount} produit(s) épuisé(s). </span>}
            {lowStockCount > 0 && <span>{lowStockCount} produit(s) sous le seuil d'alerte.</span>}
          </p>
        </div>
      </div>

      <span className="text-xs font-mono font-bold text-amber-400 underline">
        Filtrer
      </span>
    </div>
  )
}
