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
      className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
        item.isChecked
          ? 'bg-stone-100 border-stone-200 opacity-55 line-through'
          : 'bg-[#faf5e8] hover:bg-white border-[#e2d6be]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => onToggleCheck(item.id)}
          className="text-stone-500 hover:text-stone-900 transition-colors cursor-pointer active:scale-[0.97] shrink-0"
        >
          {item.isChecked ? (
            <CheckSquare className="w-5 h-5 text-emerald-700" strokeWidth={1.5} />
          ) : (
            <Square className="w-5 h-5 text-stone-400" strokeWidth={1.5} />
          )}
        </button>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900 flex items-center gap-2 truncate">
            <span>{item.name}</span>
            {item.isAutoSuggested && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                Alerte stock
              </span>
            )}
          </p>
          <p className="text-xs text-stone-500 font-mono">
            {item.isWholesale ? (
              <>
                <span className="tabular-nums">{item.wholesaleQty}</span> carton(s) × <span className="tabular-nums">{formatPrice(item.wholesalePrice || 0)}</span> (<span className="tabular-nums">{item.itemsPerWholesale}</span> un./carton)
              </>
            ) : (
              <>
                <span className="tabular-nums">{item.quantity}</span> un. × <span className="tabular-nums">{formatPrice(item.unitCost)}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-semibold text-stone-900 font-mono tabular-nums">
          {formatPrice(itemTotal)}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-stone-500 hover:text-rose-700 transition-colors border border-stone-200 cursor-pointer active:scale-[0.97]"
          title="Supprimer de la liste"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
