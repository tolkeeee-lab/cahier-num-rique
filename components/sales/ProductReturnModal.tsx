'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  RotateCcw, 
  X, 
  Check, 
  AlertCircle, 
  Coins, 
  Receipt, 
  PackageCheck 
} from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

export interface ReturnedItem {
  name: string
  quantity: number
  unit_price: number
  original_quantity: number
}

export interface ProductReturnPayload {
  saleId: string
  items: ReturnedItem[]
  refundMode: 'cash' | 'credit_note'
  totalRefundAmount: number
  reason: string
  restock: boolean
}

interface ProductReturnModalProps {
  isOpen: boolean
  onClose: () => void
  sale: any
  onConfirmReturn: (payload: ProductReturnPayload) => Promise<void>
  shopName?: string
}

export function ProductReturnModal({
  isOpen,
  onClose,
  sale,
  onConfirmReturn,
  shopName = 'Cahier Numérique',
}: ProductReturnModalProps) {
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({})
  const [refundMode, setRefundMode] = useState<'cash' | 'credit_note'>('cash')
  const [reason, setReason] = useState<string>('Erreur de commande / Souhait client')
  const [restock, setRestock] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Articles éligibles au retour
  const articles = useMemo(() => {
    if (!sale?.articles || !Array.isArray(sale.articles) || sale.articles.length === 0) {
      if (sale?.notes && sale?.total) {
        return [{ name: sale.notes || 'Article unique', quantity: 1, unit_price: sale.total }]
      }
      return []
    }
    return sale.articles
  }, [sale])

  // Initialisation des compteurs
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, number> = {}
      articles.forEach((a: any, idx: number) => {
        initial[`${idx}_${a.name}`] = 0
      })
      setReturnQuantities(initial)
      setError(null)
      setSubmitting(false)
    }
  }, [isOpen, articles])

  // Calcul du montant total à rembourser
  const { totalRefundAmount, returnedItemsList } = useMemo(() => {
    let total = 0
    const items: ReturnedItem[] = []

    articles.forEach((art: any, idx: number) => {
      const key = `${idx}_${art.name}`
      const qtyToReturn = returnQuantities[key] || 0
      if (qtyToReturn > 0) {
        total += qtyToReturn * (art.unit_price || 0)
        items.push({
          name: art.name,
          quantity: qtyToReturn,
          unit_price: art.unit_price || 0,
          original_quantity: art.quantity || 1,
        })
      }
    })

    return { totalRefundAmount: total, returnedItemsList: items }
  }, [articles, returnQuantities])

  if (!isOpen || !sale) return null

  const handleQuantityChange = (key: string, maxQty: number, delta: number) => {
    setReturnQuantities((prev) => {
      const current = prev[key] || 0
      const next = Math.max(0, Math.min(maxQty, current + delta))
      return { ...prev, [key]: next }
    })
  }

  const handleSubmit = async () => {
    if (returnedItemsList.length === 0) {
      setError('Veuillez sélectionner au moins 1 article à retourner.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onConfirmReturn({
        saleId: sale.id,
        items: returnedItemsList,
        refundMode,
        totalRefundAmount,
        reason,
        restock,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du traitement du retour.')
      setSubmitting(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <RotateCcw className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Retour & Remboursement
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Vente de {sale.client || 'Client'} du {sale.date} • {shopName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Liste des articles de la vente */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            Articles de la vente à retourner
          </label>
          
          {articles.map((art: any, idx: number) => {
            const key = `${idx}_${art.name}`
            const maxQty = art.quantity || 1
            const currentQty = returnQuantities[key] || 0

            return (
              <div
                key={key}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  currentQty > 0
                    ? 'bg-rose-50/50 border-rose-200 shadow-xs'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {art.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums">
                    {formatPrice(art.unit_price)} l'unité • Acheté : {maxQty}
                  </div>
                </div>

                {/* Sélecteur de quantité tactile */}
                <div className="flex items-center gap-2 shrink-0 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(key, maxQty, -1)}
                    disabled={currentQty === 0 || submitting}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:pointer-events-none active:scale-[0.95] text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-sm font-bold font-mono tabular-nums text-slate-900">
                    {currentQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(key, maxQty, 1)}
                    disabled={currentQty >= maxQty || submitting}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:pointer-events-none active:scale-[0.95] text-sm font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Options de compensation & stock */}
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRefundMode('cash')}
              className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                refundMode === 'cash'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Coins className="w-3.5 h-3.5" />
                <span>Espèces (Caisse)</span>
              </div>
              <p className={`text-[11px] mt-0.5 ${refundMode === 'cash' ? 'text-slate-300' : 'text-slate-500'}`}>
                Sortie de caisse immédiate
              </p>
            </button>

            <button
              type="button"
              onClick={() => setRefundMode('credit_note')}
              className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                refundMode === 'credit_note'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Receipt className="w-3.5 h-3.5" />
                <span>Avoir Client</span>
              </div>
              <p className={`text-[11px] mt-0.5 ${refundMode === 'credit_note' ? 'text-slate-300' : 'text-slate-500'}`}>
                Crédit pour prochain achat
              </p>
            </button>
          </div>

          {/* Option Réintégration Stock */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 cursor-pointer">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-950">
              <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Remettre automatiquement les articles en rayon (Stock +)</span>
            </div>
          </label>

          {/* Motif du retour */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
              Motif du retour
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Produit défectueux, erreur sur la commande..."
              className="w-full mt-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Bilan & Validation */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
              Montant à compenser
            </span>
            <div className="text-xl font-black font-mono tabular-nums text-white">
              {formatPrice(totalRefundAmount)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || totalRefundAmount === 0}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Validation...' : 'Confirmer le Retour'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
