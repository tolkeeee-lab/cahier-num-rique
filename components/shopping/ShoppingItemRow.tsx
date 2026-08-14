'use client'

import React from 'react'
import { CheckSquare, Square, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unitCost: number
  isWholesale?: boolean
  wholesaleQty?: number
  wholesalePrice?: number
  itemsPerWholesale?: number
  isAutoSuggested?: boolean
  isChecked: boolean
}

interface ShoppingItemRowProps {
  item: ShoppingItem
  onToggleCheck: (id: string) => void
  onRemove: (id: string) => void
}

export const ShoppingItemRow: React.FC<ShoppingItemRowProps> = ({
  item,
  onToggleCheck,
  onRemove,
}) => {
  const itemTotal = item.isWholesale && item.wholesaleQty && item.wholesalePrice
    ? item.wholesaleQty * item.wholesalePrice
    : item.quantity * item.unitCost

  return (
    <div
      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
        item.isChecked
          ? 'bg-gray-200/50 border-gray-300 opacity-50 line-through'
          : 'bg-white hover:bg-amber-50/50 border-amber-300/80 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Bouton Coche */}
        <button
          type="button"
          onClick={() => onToggleCheck(item.id)}
          className="text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
        >
          {item.isChecked ? (
            <CheckSquare className="w-5 h-5 text-emerald-600" />
          ) : (
            <Square className="w-5 h-5 text-amber-700" />
          )}
        </button>

        {/* Détails Article */}
        <div>
          <p className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            {item.name}
            {item.isAutoSuggested && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold">
                Alerte Stock
              </span>
            )}
          </p>
          <p className="text-xs text-gray-600 font-mono font-bold">
            {item.isWholesale ? (
              <>
                {item.wholesaleQty} carton(s) × {formatPrice(item.wholesalePrice || 0)} ({item.itemsPerWholesale} un./carton)
              </>
            ) : (
              <>
                {item.quantity} un. × {formatPrice(item.unitCost)}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Montant Total Estimé & Bouton Supprimer */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-black text-amber-950 font-mono">
          {formatPrice(itemTotal)}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 transition-colors border border-rose-300 cursor-pointer"
          title="Supprimer de la liste"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
