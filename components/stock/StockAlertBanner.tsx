'use client'

import React from 'react'
import { AlertTriangle, ShoppingCart, Check, Filter } from 'lucide-react'

interface StockAlertBannerProps {
  lowStockCount: number
  outOfStockCount: number
  isFiltered?: boolean
  onFilterLowStock?: () => void
  onAddOutOfStockToShoppingList?: () => void
  isAddingToShoppingList?: boolean
  addedCount?: number | null
}

export const StockAlertBanner: React.FC<StockAlertBannerProps> = ({
  lowStockCount,
  outOfStockCount,
  isFiltered = false,
  onFilterLowStock,
  onAddOutOfStockToShoppingList,
  isAddingToShoppingList = false,
  addedCount = null,
}) => {
  if (lowStockCount === 0 && outOfStockCount === 0) return null

  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/95 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_2px_8px_-2px_rgba(120,53,15,0.06)] mb-4 animate-in fade-in duration-150">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-200/90 text-amber-900 flex items-center justify-center flex-shrink-0 font-bold shadow-2xs border border-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-800" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-xs font-black text-amber-950 tracking-tight">Ruptures & alertes de stock</p>
          <p className="text-[11px] text-amber-900 font-mono">
            {outOfStockCount > 0 && (
              <span className="text-rose-700 font-extrabold">
                <span className="tabular-nums">{outOfStockCount}</span> épuisé(s).{' '}
              </span>
            )}
            {lowStockCount > 0 && (
              <span>
                <span className="tabular-nums">{lowStockCount}</span> sous le seuil d&apos;alerte.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
        {onFilterLowStock && (
          <button
            type="button"
            onClick={onFilterLowStock}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97] ${
              isFiltered
                ? 'bg-amber-900 text-white border-amber-950 font-black shadow-2xs'
                : 'bg-white/90 border-amber-300 text-amber-950 hover:bg-amber-100 shadow-2xs'
            }`}
          >
            <Filter className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>{isFiltered ? 'Tout voir' : 'Filtrer alertes'}</span>
          </button>
        )}

        {onAddOutOfStockToShoppingList && (
          <button
            type="button"
            onClick={onAddOutOfStockToShoppingList}
            disabled={isAddingToShoppingList}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white text-xs font-mono font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.97] disabled:opacity-50"
            title="Ajouter automatiquement les produits en alerte à la liste de courses"
          >
            {addedCount ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                <span>{addedCount} ajouté(s) aux courses !</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
                <span>Commander (1-Clic)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
