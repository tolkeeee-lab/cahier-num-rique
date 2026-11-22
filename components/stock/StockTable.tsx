'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Plus, Minus, Edit3, Trash2, Calculator, PackagePlus, PackageMinus, Package } from 'lucide-react'

interface Product {
  id: string
  name: string
  initial_stock: number
  current_stock?: number
  alert_threshold: number
  unit_cost: number
  unit_price: number
  category?: string
  unit?: string
  multiplier?: number
  packaging_name?: string
  lot_quantity?: number
  lot_price?: number
  trade_type?: 'retail' | 'semi_wholesale' | 'wholesale'
}

interface StockTableProps {
  products: Product[]
  onAdjustStock: (id: string, delta: number) => void
  onEditProduct: (product: Product) => void
  onDeleteProduct: (id: string) => void
  onOpenCalculator?: (product: Product) => void
  onOpenExpressAdjustment?: (product: Product, type: 'in' | 'out') => void
  isEmployee?: boolean
}

export const StockTable: React.FC<StockTableProps> = ({
  products,
  onAdjustStock,
  onEditProduct,
  onDeleteProduct,
  onOpenCalculator,
  onOpenExpressAdjustment,
  isEmployee = false,
}) => {
  if (products.length === 0) {
    return (
      <div className="p-10 text-center bg-[#faf5e8] rounded-xl border border-[#e2d6be] space-y-1.5">
        <Package className="w-6 h-6 text-stone-400 mx-auto" strokeWidth={1.5} />
        <p className="text-sm font-medium text-stone-800">Aucun produit trouvé dans votre inventaire</p>
        <p className="text-xs text-stone-500">Ajoutez votre premier article ci-dessus pour suivre votre stock.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      {products.map((prod) => {
        const currentStock = prod.current_stock ?? prod.initial_stock ?? 0
        const isLow = currentStock <= (prod.alert_threshold ?? 5) && currentStock > 0
        const isOutOfStock = currentStock <= 0
        const margin = prod.unit_cost > 0 && prod.unit_price > 0 ? prod.unit_price - prod.unit_cost : null
        const marginPct = margin !== null && prod.unit_cost > 0 ? Math.round((margin / prod.unit_cost) * 100) : null

        return (
          <div
            key={prod.id}
            className="bg-[#faf5e8] hover:bg-white/90 transition-colors rounded-xl border border-[#e2d6be] p-3.5 space-y-3"
          >
            {/* Ligne 1 : Nom + Catégorie | Stepper Stock */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-sm text-stone-900 leading-snug truncate">
                  {prod.name}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600 text-[11px] font-medium">
                    {prod.category || 'Divers'}
                  </span>
                  {prod.unit && (
                    <span className="text-[11px] text-stone-500">{prod.unit}</span>
                  )}
                </div>
              </div>

              {/* Contrôle stock compact */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isEmployee && (
                  <button
                    type="button"
                    onClick={() => onAdjustStock(prod.id, -1)}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-stone-50 active:scale-[0.96] text-stone-700 border border-stone-200 flex items-center justify-center transition-colors cursor-pointer"
                    title="Retirer 1 unité"
                  >
                    <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                )}

                <span
                  className={`min-w-[38px] text-center px-2 py-1 rounded-lg font-semibold text-xs font-mono tabular-nums border ${
                    isOutOfStock
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : isLow
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {currentStock}
                </span>

                {!isEmployee && (
                  <button
                    type="button"
                    onClick={() => onAdjustStock(prod.id, 1)}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-stone-50 active:scale-[0.96] text-stone-700 border border-stone-200 flex items-center justify-center transition-colors cursor-pointer"
                    title="Ajouter 1 unité"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            </div>

            {/* Ligne 2 : Prix d'achat & Prix de vente sur une ligne propre */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-stone-200/80 text-xs">
              {!isEmployee && (
                <div className="flex items-center gap-1.5 text-stone-500">
                  <span>Achat</span>
                  <span className="font-mono font-semibold text-stone-800 tabular-nums whitespace-nowrap">
                    {formatPrice(prod.unit_cost || 0)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-stone-500 ml-auto">
                <span>Vente</span>
                <span className="font-mono font-semibold text-emerald-800 tabular-nums whitespace-nowrap">
                  {formatPrice(prod.unit_price || 0)}
                </span>
                {marginPct !== null && (
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 tabular-nums">
                    +{marginPct}%
                  </span>
                )}
              </div>
            </div>

            {/* Ligne 3 : Actions rapides propres */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              <div className="flex items-center gap-1.5">
                {!isEmployee && onOpenExpressAdjustment && (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenExpressAdjustment(prod, 'in')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-stone-200 text-[11px] font-medium transition-colors active:scale-[0.97] cursor-pointer"
                      title="Entrée express / Achat carton"
                    >
                      <PackagePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Entrée</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenExpressAdjustment(prod, 'out')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-stone-700 border border-stone-200 text-[11px] font-medium transition-colors active:scale-[0.97] cursor-pointer"
                      title="Déclarer casse, perte ou conso"
                    >
                      <PackageMinus className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Perte</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                {onOpenCalculator && (
                  <button
                    type="button"
                    onClick={() => onOpenCalculator(prod)}
                    className="p-1.5 sm:px-2 sm:py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 transition-colors active:scale-[0.97] cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                    title="Valeur réelle & paliers"
                  >
                    <Calculator className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Paliers</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onEditProduct(prod)}
                  className="p-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 transition-colors active:scale-[0.97] cursor-pointer"
                  title="Modifier le produit"
                >
                  <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>

                {!isEmployee && (
                  <button
                    type="button"
                    onClick={() => onDeleteProduct(prod.id)}
                    className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-stone-500 hover:text-rose-700 border border-stone-200 transition-colors active:scale-[0.97] cursor-pointer"
                    title="Supprimer le produit"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
