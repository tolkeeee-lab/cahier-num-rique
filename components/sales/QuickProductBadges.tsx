'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'

interface QuickProduct {
  name: string
  price: number
}

interface QuickProductBadgesProps {
  products: QuickProduct[]
  onSelectProduct: (prod: QuickProduct) => void
}

export const QuickProductBadges: React.FC<QuickProductBadgesProps> = ({
  products,
  onSelectProduct,
}) => {
  if (products.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
      {products.map((prod, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelectProduct(prod)}
          className="px-3 py-1.5 rounded-xl bg-[#141210] border border-gray-800 hover:border-amber-500/40 text-xs font-mono text-gray-300 hover:text-white transition-all whitespace-nowrap flex items-center gap-1.5 shadow-sm"
        >
          <span>{prod.name}</span>
          <span className="text-amber-400 font-bold">({formatPrice(prod.price)})</span>
        </button>
      ))}
    </div>
  )
}
