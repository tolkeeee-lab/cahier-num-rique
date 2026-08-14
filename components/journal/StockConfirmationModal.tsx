'use client'

/**
 * StockConfirmationModal.tsx
 *
 * Modale de confirmation rapide pour un réapprovisionnement de produit connu.
 * Affiche les tarifs mémorisés (coût d'achat + prix de vente) et demande confirmation.
 *
 * Déclenché quand : "stock 2 Flag" → Flag est déjà dans le catalogue avec un unit_cost > 0
 */

import React from 'react'
import { X, Check, Package, RefreshCw } from 'lucide-react'

interface Product {
  name: string
  unit: string
  unit_cost: number
  unit_price: number
  multiplier?: number
  packaging_name?: string
}

interface StockConfirmationModalProps {
  isOpen: boolean
  product: Product
  quantity: number
  packaging: string
  multiplier: number
  unit: string
  onConfirm: () => Promise<void>
  onModify: () => void    // Ouvre le wizard pour modifier les infos
  onCancel: () => void
}

function formatPrice(n: number) {
  return n.toLocaleString('fr-FR') + ' F'
}

export function StockConfirmationModal({
  isOpen,
  product,
  quantity,
  packaging,
  multiplier,
  unit,
  onConfirm,
  onModify,
  onCancel,
}: StockConfirmationModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  if (!isOpen) return null

  const isUnit = packaging === 'unité' || !packaging
  const lotPrice = product.unit_cost * multiplier
  const totalLotPrice = lotPrice * quantity
  const totalUnits = quantity * multiplier

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#fffdf2] border border-emerald-300 rounded-[24px] p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900">Réapprovisionnement</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Produit connu */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
          <p className="font-bold text-emerald-900 text-base">{product.name}</p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-500 uppercase font-bold tracking-wide text-[9px]">Quantité</p>
              <p className="font-mono font-bold text-gray-900">
                {quantity} {isUnit ? `${unit}(s)` : `${packaging}(s)`}
              </p>
            </div>
            {!isUnit && (
              <div>
                <p className="text-gray-500 uppercase font-bold tracking-wide text-[9px]">Contenu</p>
                <p className="font-mono font-bold text-gray-900">{multiplier} {unit}(s) / {packaging}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500 uppercase font-bold tracking-wide text-[9px]">
                Coût {isUnit ? 'unitaire' : `/ ${packaging}`}
              </p>
              <p className="font-mono font-bold text-emerald-700">{formatPrice(lotPrice)}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase font-bold tracking-wide text-[9px]">Prix de vente</p>
              <p className="font-mono font-bold text-amber-700">{formatPrice(product.unit_price)}</p>
            </div>
          </div>
        </div>

        {/* Total calculé */}
        <div className="border-t border-dashed border-emerald-200 pt-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">Total achat</p>
              {!isUnit && (
                <p className="text-[10px] text-gray-400 font-mono">{totalUnits} {unit}(s) au total</p>
              )}
            </div>
            <p className="font-mono font-bold text-lg text-emerald-900">{formatPrice(totalLotPrice)}</p>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onModify}
            className="flex-1 flex items-center justify-center gap-1.5 border border-amber-400 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs font-semibold py-2.5 rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Modifier les infos
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}
