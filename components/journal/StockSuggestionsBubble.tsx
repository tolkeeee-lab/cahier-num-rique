'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Sparkles, Package, Tag } from 'lucide-react'

export interface StockSuggestionItem {
  id: string
  name: string
  price: number // Prix unitaire détail
  category?: string
  stock?: number
  multiplier?: number
  packaging_name?: string
  unit?: string
  wholesale_price?: number
  half_package_price?: number
  quarter_package_price?: number
  lot_quantity?: number
  lot_price?: number
}

export interface SelectedTierPayload {
  label: string
  inputText: string
  price: number
  piecesCount: number
}

interface StockSuggestionsBubbleProps {
  suggestions: StockSuggestionItem[]
  activeQty: number
  onSelectSuggestion: (item: StockSuggestionItem, tier?: SelectedTierPayload) => void
}

export const StockSuggestionsBubble: React.FC<StockSuggestionsBubbleProps> = ({
  suggestions,
  activeQty,
  onSelectSuggestion,
}) => {
  if (suggestions.length === 0) return null

  const qty = Math.max(1, activeQty)

  return (
    <div className="absolute bottom-full left-2 sm:left-6 mb-2.5 z-40 bg-[#fffdfa] border border-amber-300 shadow-[0_12px_32px_-4px_rgba(120,53,15,0.18)] rounded-2xl p-2.5 sm:p-3 max-w-2xl w-[92vw] md:w-auto animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
      <div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-amber-200/80 mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-950 uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>Articles du Stock ({suggestions.length})</span>
        </div>
        <span className="text-[10px] font-mono text-amber-800/80 hidden sm:inline">
          Sélectionnez un conditionnement en 1 clic
        </span>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-none pr-0.5">
        {suggestions.map((item) => {
          const mult = item.multiplier && item.multiplier > 1 ? item.multiplier : 1
          const pkgName = item.packaging_name || 'carton'
          const hasPackaging = mult > 1 || Boolean(item.wholesale_price || item.half_package_price || item.quarter_package_price)
          const hasLot = Boolean(item.lot_quantity && item.lot_quantity > 1 && item.lot_price && item.lot_price > 0)

          // Calcul des prix par palier
          const cartonPrice = item.wholesale_price && item.wholesale_price > 0
            ? item.wholesale_price
            : item.price * mult

          const halfPrice = item.half_package_price && item.half_package_price > 0
            ? item.half_package_price
            : (item.wholesale_price ? Math.round(item.wholesale_price / 2) : Math.round(cartonPrice * 0.52))

          const quarterPrice = item.quarter_package_price && item.quarter_package_price > 0
            ? item.quarter_package_price
            : (item.wholesale_price ? Math.round(item.wholesale_price / 4) : Math.round(cartonPrice * 0.27))

          // Stock formaté avec équivalent cartons
          let stockLabel = ''
          if (item.stock !== undefined) {
            if (mult > 1 && item.stock >= mult) {
              const fullPacks = Math.floor(item.stock / mult)
              const remainder = item.stock % mult
              stockLabel = remainder === 0 
                ? `${item.stock} pcs (${fullPacks} ${pkgName}s)` 
                : `${item.stock} pcs (${fullPacks} ${pkgName}s + ${remainder} pcs)`
            } else {
              stockLabel = `${item.stock} ${item.unit || 'pcs'}`
            }
          }

          return (
            <div
              key={item.id}
              className="p-2 bg-gradient-to-b from-amber-50/70 to-amber-100/40 border border-amber-200/90 rounded-xl space-y-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]"
            >
              {/* En-tête du produit */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Package className="w-3.5 h-3.5 text-amber-800 flex-shrink-0" />
                  <span className="font-handwritten text-sm sm:text-base font-bold text-[#1d4ed8] truncate">
                    {item.name}
                  </span>
                  {item.category && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-white/80 text-amber-900 border border-amber-200/60 rounded">
                      {item.category}
                    </span>
                  )}
                </div>

                {item.stock !== undefined && (
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                      item.stock <= 0
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : item.stock <= 5
                        ? 'bg-amber-200/80 text-amber-900 border border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    Stock : {stockLabel}
                  </span>
                )}
              </div>

              {/* Puces de conditionnement 1-Clic */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* 1. Palier Détail (À l'unité) */}
                <button
                  type="button"
                  onClick={() => {
                    const total = item.price * qty
                    onSelectSuggestion(item, {
                      label: 'Détail',
                      inputText: `${qty} ${item.name} à ${item.price}`,
                      price: total,
                      piecesCount: qty,
                    })
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100/80 border border-amber-300/80 hover:border-amber-400 text-amber-950 rounded-lg text-xs font-bold transition-transform duration-100 ease-out active:scale-[0.97] cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span className="text-[10px] text-gray-600 font-sans">{qty > 1 ? `${qty} Détail` : '1 Pièce'}</span>
                  <span className="font-mono text-[11px] font-black text-amber-900 tabular-nums">
                    {formatPrice(item.price * qty)}
                  </span>
                </button>

                {/* 2. Palier Quart de Carton */}
                {hasPackaging && mult >= 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      const total = quarterPrice * qty
                      const pieces = Math.max(1, Math.round(mult * 0.25)) * qty
                      onSelectSuggestion(item, {
                        label: '1/4 carton',
                        inputText: `${qty > 1 ? `${qty} ` : ''}1/4 ${pkgName} de ${item.name} à ${total}`,
                        price: total,
                        piecesCount: pieces,
                      })
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100/80 border border-amber-300/80 hover:border-amber-400 text-amber-950 rounded-lg text-xs font-bold transition-transform duration-100 ease-out active:scale-[0.97] cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span className="text-[10px] text-amber-800 font-sans">
                      1/4 {pkgName} <span className="font-mono text-[9px] opacity-70">({Math.round(mult * 0.25 * qty)} pcs)</span>
                    </span>
                    <span className="font-mono text-[11px] font-black text-amber-900 tabular-nums">
                      {formatPrice(quarterPrice * qty)}
                    </span>
                  </button>
                )}

                {/* 3. Palier Demi-Carton */}
                {hasPackaging && mult >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const total = halfPrice * qty
                      const pieces = Math.max(1, Math.round(mult * 0.5)) * qty
                      onSelectSuggestion(item, {
                        label: '1/2 carton',
                        inputText: `${qty > 1 ? `${qty} ` : ''}1/2 ${pkgName} de ${item.name} à ${total}`,
                        price: total,
                        piecesCount: pieces,
                      })
                    }}
                    className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300/80 border border-amber-400/90 text-amber-950 rounded-lg text-xs font-bold transition-transform duration-100 ease-out active:scale-[0.97] cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <span className="text-[10px] text-amber-900 font-extrabold font-sans">
                      1/2 {pkgName} <span className="font-mono text-[9px] opacity-80">({Math.round(mult * 0.5 * qty)} pcs)</span>
                    </span>
                    <span className="font-mono text-[11px] font-black text-amber-950 tabular-nums">
                      {formatPrice(halfPrice * qty)}
                    </span>
                  </button>
                )}

                {/* 4. Palier Carton Entier */}
                {hasPackaging && (
                  <button
                    type="button"
                    onClick={() => {
                      const total = cartonPrice * qty
                      const pieces = mult * qty
                      onSelectSuggestion(item, {
                        label: 'Carton',
                        inputText: `${qty} ${pkgName} de ${item.name} à ${total}`,
                        price: total,
                        piecesCount: pieces,
                      })
                    }}
                    className="px-2.5 py-1 bg-amber-900 hover:bg-amber-950 border border-amber-950 text-amber-100 rounded-lg text-xs font-bold transition-transform duration-100 ease-out active:scale-[0.97] cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <span className="text-[10px] text-amber-200 font-sans">
                      {qty > 1 ? `${qty} ${pkgName}s` : `1 ${pkgName}`} <span className="font-mono text-[9px] opacity-70">({mult * qty} pcs)</span>
                    </span>
                    <span className="font-mono text-[11px] font-black text-white tabular-nums">
                      {formatPrice(cartonPrice * qty)}
                    </span>
                  </button>
                )}

                {/* 5. Palier Lot Dégressif */}
                {hasLot && item.lot_quantity && item.lot_price && (
                  <button
                    type="button"
                    onClick={() => {
                      const total = item.lot_price! * qty
                      const pieces = item.lot_quantity! * qty
                      onSelectSuggestion(item, {
                        label: `Lot de ${item.lot_quantity}`,
                        inputText: `${qty > 1 ? `${qty} ` : ''}lot de ${item.lot_quantity} de ${item.name} à ${total}`,
                        price: total,
                        piecesCount: pieces,
                      })
                    }}
                    className="px-2.5 py-1 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-transform duration-100 ease-out active:scale-[0.97] cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Tag className="w-3 h-3 text-amber-700 flex-shrink-0" />
                    <span className="text-[10px] font-sans">Lot de {item.lot_quantity * qty}</span>
                    <span className="font-mono text-[11px] font-black text-amber-950 tabular-nums">
                      {formatPrice(item.lot_price * qty)}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
