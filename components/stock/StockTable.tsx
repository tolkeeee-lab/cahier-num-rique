'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Plus, Minus, Edit3, Trash2, Sparkles, PackagePlus, PackageMinus } from 'lucide-react'

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
      <div className="p-12 text-center text-gray-500 bg-white/80 rounded-2xl border border-amber-300/80 font-mono text-xs shadow-sm">
        Aucun produit trouvé dans votre inventaire.
      </div>
    )
  }

  return (
    <div className="bg-white/90 rounded-2xl border border-amber-300/80 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-amber-100/80 border-b border-amber-200 text-[11px] font-mono font-bold text-amber-950 uppercase tracking-wider">
              <th className="p-3.5">Produit</th>
              <th className="p-3.5">Catégorie</th>
              <th className="p-3.5 text-center">Stock</th>
              {!isEmployee && <th className="p-3.5 text-right">Prix d'Achat</th>}
              <th className="p-3.5 text-right">Prix de Vente</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-200/60 text-xs font-mono">
            {products.map((prod) => {
              const currentStock = prod.current_stock ?? prod.initial_stock ?? 0
              const isLow = currentStock <= (prod.alert_threshold ?? 5) && currentStock > 0
              const isOutOfStock = currentStock <= 0

              return (
                <tr key={prod.id} className="hover:bg-amber-50/80 transition-colors">
                  {/* Nom du produit */}
                  <td className="p-3.5">
                    <p className="font-extrabold text-gray-900 text-sm">{prod.name}</p>
                    {prod.unit && <p className="text-[11px] text-gray-500 font-sans font-medium">{prod.unit}</p>}
                  </td>

                  {/* Catégorie */}
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-950 font-bold text-[11px]">
                      {prod.category || 'Divers'}
                    </span>
                  </td>

                  {/* Quantité en Stock + Contrôles d'ajustement */}
                  <td className="p-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      {!isEmployee && (
                        <div className="flex items-center gap-1">
                          {onOpenExpressAdjustment && (
                            <button
                              type="button"
                              onClick={() => onOpenExpressAdjustment(prod, 'out')}
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-[0.97] text-rose-800 border border-rose-200 transition-all duration-100 ease-out cursor-pointer"
                              title="Déclarer Casse, Perte ou Conso Personnelle"
                            >
                              <PackageMinus className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onAdjustStock(prod.id, -1)}
                            className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 active:scale-[0.97] text-amber-950 border border-amber-300 transition-all duration-100 ease-out cursor-pointer"
                            title="Retirer 1 unité"
                          >
                            <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                        </div>
                      )}

                      <span className={`px-3 py-1 rounded-xl font-black text-sm font-mono tabular-nums tracking-tight border shadow-xs ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : isLow
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}>
                        {currentStock}
                      </span>

                      {!isEmployee && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onAdjustStock(prod.id, 1)}
                            className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 active:scale-[0.97] text-amber-950 border border-amber-300 transition-all duration-100 ease-out cursor-pointer"
                            title="Ajouter 1 unité"
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                          {onOpenExpressAdjustment && (
                            <button
                              type="button"
                              onClick={() => onOpenExpressAdjustment(prod, 'in')}
                              className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:scale-[0.97] text-emerald-800 border border-emerald-200 transition-all duration-100 ease-out cursor-pointer"
                              title="Entrée Express / Achat Carton"
                            >
                              <PackagePlus className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Prix d'Achat (Masqué aux employés) */}
                  {!isEmployee && (
                    <td className="p-3.5 text-right text-gray-700 font-bold tabular-nums tracking-tight">
                      {formatPrice(prod.unit_cost || 0)}
                    </td>
                  )}

                  {/* Prix de Vente */}
                  <td className="p-3.5 text-right font-extrabold text-amber-900 tabular-nums tracking-tight">
                    {formatPrice(prod.unit_price || 0)}
                  </td>

                  {/* Actions (Édition & Suppression) */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onOpenCalculator && (
                        <button
                          type="button"
                          onClick={() => onOpenCalculator(prod)}
                          className="px-2 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-[0.97] text-amber-950 transition-all duration-100 ease-out border border-amber-500 shadow-2xs cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                          title="Calculateur de Valeur Réelle & Tarification Paliers"
                        >
                          <Sparkles className="w-3 h-3 text-amber-950" strokeWidth={2} />
                          <span className="hidden sm:inline">Valeur & Paliers</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onEditProduct(prod)}
                        className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 active:scale-[0.97] text-amber-900 transition-all duration-100 ease-out border border-amber-300 cursor-pointer"
                        title="Modifier le produit"
                      >
                        <Edit3 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>

                      {!isEmployee && (
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(prod.id)}
                          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 active:scale-[0.97] text-rose-800 transition-all duration-100 ease-out border border-rose-300 cursor-pointer"
                          title="Supprimer le produit"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
