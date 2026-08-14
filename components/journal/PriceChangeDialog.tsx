'use client'

/**
 * PriceChangeDialog.tsx
 *
 * Dialogue d'alerte quand le prix saisi est différent du prix mémorisé dans le catalogue.
 *
 * Deux choix :
 * - "Mettre à jour" → enregistre avec le nouveau prix ET met à jour le catalogue
 * - "Garder l'ancien" → enregistre avec l'ancien prix sans changer le catalogue
 */

import React from 'react'
import { X, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

interface PriceChangeDialogProps {
  isOpen: boolean
  productName: string
  oldLotPrice: number
  newLotPrice: number
  packaging: string     // 'unité' ou 'carton', etc.
  onAcceptNewPrice: () => Promise<void>    // Enregistre avec nouveau prix + MAJ catalogue
  onKeepOldPrice: () => Promise<void>     // Enregistre avec l'ancien prix
  onCancel: () => void
}

function formatPrice(n: number) {
  return n.toLocaleString('fr-FR') + ' F'
}

export function PriceChangeDialog({
  isOpen,
  productName,
  oldLotPrice,
  newLotPrice,
  packaging,
  onAcceptNewPrice,
  onKeepOldPrice,
  onCancel,
}: PriceChangeDialogProps) {
  const [loadingAccept, setLoadingAccept] = React.useState(false)
  const [loadingKeep, setLoadingKeep] = React.useState(false)

  if (!isOpen) return null

  const diff = newLotPrice - oldLotPrice
  const isIncrease = diff > 0
  const pctChange = Math.abs(Math.round((diff / oldLotPrice) * 100))
  const isUnit = packaging === 'unité' || !packaging

  const handleAccept = async () => {
    setLoadingAccept(true)
    try { await onAcceptNewPrice() } finally { setLoadingAccept(false) }
  }

  const handleKeep = async () => {
    setLoadingKeep(true)
    try { await onKeepOldPrice() } finally { setLoadingKeep(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#fffdf2] border border-amber-400 rounded-[24px] p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-gray-900">Changement de Prix</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info produit */}
        <p className="text-sm text-gray-700">
          Le prix saisi pour <span className="font-bold text-gray-900">« {productName} »</span>{' '}
          {!isUnit && `(par ${packaging})`} est différent de votre catalogue.
        </p>

        {/* Comparaison */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 font-semibold">Prix mémorisé</span>
            <span className="font-mono font-bold text-gray-700">{formatPrice(oldLotPrice)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 font-semibold">Prix saisi</span>
            <span className={`font-mono font-bold ${isIncrease ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatPrice(newLotPrice)}
            </span>
          </div>
          <div className="border-t border-amber-200 pt-2 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600">Écart</span>
            <div className={`flex items-center gap-1 text-xs font-bold ${isIncrease ? 'text-red-600' : 'text-emerald-600'}`}>
              {isIncrease
                ? <TrendingUp className="w-3.5 h-3.5" />
                : <TrendingDown className="w-3.5 h-3.5" />
              }
              {isIncrease ? '+' : ''}{formatPrice(diff)} ({pctChange}%)
            </div>
          </div>
        </div>

        {/* Explication */}
        <p className="text-xs text-gray-500">
          {isIncrease
            ? '⚠️ Le prix a augmenté. Voulez-vous mettre à jour votre catalogue ?'
            : '✅ Le prix a baissé. Voulez-vous mettre à jour votre catalogue ?'
          }
        </p>

        {/* Boutons */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={loadingAccept || loadingKeep}
            className="flex items-center justify-center gap-1.5 bg-amber-500 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loadingAccept
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '✅'
            }
            Enregistrer avec le nouveau prix ({formatPrice(newLotPrice)}) + MAJ catalogue
          </button>
          <button
            type="button"
            onClick={handleKeep}
            disabled={loadingAccept || loadingKeep}
            className="flex items-center justify-center gap-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-xs font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors"
          >
            {loadingKeep
              ? <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              : '↩️'
            }
            Garder l'ancien prix ({formatPrice(oldLotPrice)}) sans modifier le catalogue
          </button>
        </div>
      </div>
    </div>
  )
}
