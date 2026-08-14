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
      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
        item.isChecked
          ? 'bg-[#141210]/60 border-gray-800/60 opacity-50 line-through'
          : 'bg-[#1e1a18] border-gray-800 hover:border-gray-700 shadow-md'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Bouton Coche */}
        <button
          onClick={() => onToggleCheck(item.id)}
          className="text-amber-400 hover:text-amber-300 transition-colors"
        >
          {item.isChecked ? (
            <CheckSquare className="w-5 h-5" />
          ) : (
            <Square className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {/* Détails Article */}
        <div>
          <p className="text-sm font-bold text-white flex items-center gap-2">
            {item.name}
            {item.isAutoSuggested && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                Alerte Stock
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400 font-mono">
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
        <span className="text-sm font-extrabold text-amber-400 font-mono">
          {formatPrice(itemTotal)}
        </span>
        <button
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 transition-colors border border-red-800/40"
          title="Supprimer de la liste"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
