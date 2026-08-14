'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Plus, Minus, Edit3, Trash2 } from 'lucide-react'

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
}

interface StockTableProps {
  products: Product[]
  onAdjustStock: (id: string, delta: number) => void
  onEditProduct: (product: Product) => void
  onDeleteProduct: (id: string) => void
  isEmployee?: boolean
}

export const StockTable: React.FC<StockTableProps> = ({
  products,
  onAdjustStock,
  onEditProduct,
  onDeleteProduct,
  isEmployee = false,
}) => {
  if (products.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500 bg-[#1e1a18] rounded-2xl border border-gray-800 font-mono text-xs">
        Aucun produit trouvé dans votre inventaire.
      </div>
    )
  }

  return (
    <div className="bg-[#1e1a18] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#141210] border-b border-gray-800 text-[11px] font-mono text-gray-400 uppercase">
              <th className="p-4">Produit</th>
              <th className="p-4">Catégorie</th>
              <th className="p-4 text-center">Stock</th>
              <th className="p-4 text-right">Prix d'Achat</th>
              <th className="p-4 text-right">Prix de Vente</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-xs font-mono">
            {products.map((prod) => {
              const currentStock = prod.current_stock ?? prod.initial_stock ?? 0
              const isLow = currentStock <= (prod.alert_threshold ?? 5)
              const isOutOfStock = currentStock <= 0

              return (
                <tr key={prod.id} className="hover:bg-[#25201d] transition-colors">
                  {/* Nom du produit */}
                  <td className="p-4">
                    <p className="font-bold text-white text-sm">{prod.name}</p>
                    {prod.unit && <p className="text-[11px] text-gray-500">{prod.unit}</p>}
                  </td>

                  {/* Catégorie */}
                  <td className="p-4 text-gray-400">
                    <span className="px-2 py-0.5 rounded-lg bg-[#141210] border border-gray-800 text-[11px]">
                      {prod.category || 'Divers'}
                    </span>
                  </td>

                  {/* Quantité en Stock + Contrôles d'ajustement */}
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {!isEmployee && (
                        <button
                          onClick={() => onAdjustStock(prod.id, -1)}
                          className="p-1 rounded-lg bg-[#141210] text-gray-400 hover:text-white border border-gray-800 transition-colors"
                          title="Retirer 1 unité"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <span className={`px-3 py-1 rounded-xl font-extrabold text-sm border ${
                        isOutOfStock
                          ? 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                          : isLow
                          ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                          : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                      }`}>
                        {currentStock}
                      </span>

                      {!isEmployee && (
                        <button
                          onClick={() => onAdjustStock(prod.id, 1)}
                          className="p-1 rounded-lg bg-[#141210] text-gray-400 hover:text-white border border-gray-800 transition-colors"
                          title="Ajouter 1 unité"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Prix d'Achat */}
                  <td className="p-4 text-right text-gray-400">
                    {formatPrice(prod.unit_cost || 0)}
                  </td>

                  {/* Prix de Vente */}
                  <td className="p-4 text-right font-bold text-amber-400">
                    {formatPrice(prod.unit_price || 0)}
                  </td>

                  {/* Actions (Édition & Suppression) */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEditProduct(prod)}
                        className="p-1.5 rounded-lg bg-[#2a2421] text-gray-400 hover:text-white transition-colors"
                        title="Modifier le produit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {!isEmployee && (
                        <button
                          onClick={() => onDeleteProduct(prod.id)}
                          className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 transition-colors border border-red-800/40"
                          title="Supprimer le produit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
