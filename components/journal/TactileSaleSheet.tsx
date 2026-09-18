'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Package,
  Minus,
  Plus,
  Percent,
  Check,
  Tag,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'
import { audioFeedback } from '@/lib/audioFeedback'
import { StockSuggestionItem } from './StockSuggestionsBubble'
import { VisualCartonDecomposer } from '@/components/stock/VisualCartonDecomposer'

export interface TactileSaleSheetProps {
  isOpen: boolean
  product: StockSuggestionItem | null
  initialQty?: number
  onClose: () => void
  onConfirmSale: (saleInputText: string) => Promise<boolean | void> | boolean | void
}

type TierType = 'detail' | 'quarter' | 'half' | 'carton' | 'lot'

export const TactileSaleSheet: React.FC<TactileSaleSheetProps> = ({
  isOpen,
  product,
  initialQty = 1,
  onClose,
  onConfirmSale,
}) => {
  const [selectedTier, setSelectedTier] = useState<TierType>('detail')
  const [quantity, setQuantity] = useState<number>(initialQty)
  const [clientName, setClientName] = useState<string>('')
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [customPrice, setCustomPrice] = useState<number | null>(null)
  const [showVisualCarton, setShowVisualCarton] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Reset des valeurs à l'ouverture pour un nouveau produit
  useEffect(() => {
    if (product) {
      setQuantity(Math.max(1, initialQty))
      setDiscountAmount(0)
      setCustomPrice(null)
      // Si le produit a un gros conditionnement (ex: carton), démarrer en détail ou carton selon la quantité initiale
      if (product.multiplier && product.multiplier > 1 && initialQty >= product.multiplier) {
        setSelectedTier('carton')
      } else {
        setSelectedTier('detail')
      }
    }
  }, [product, initialQty])

  if (!isOpen || !product) return null

  const mult = product.multiplier && product.multiplier > 1 ? product.multiplier : 1
  const pkgName = product.packaging_name || 'carton'
  const unit = product.unit || 'pcs'
  const hasPackaging = mult > 1

  // Calcul des prix de base par palier
  const cartonBasePrice = product.wholesale_price && product.wholesale_price > 0
    ? product.wholesale_price
    : product.price * mult

  const halfBasePrice = product.half_package_price && product.half_package_price > 0
    ? product.half_package_price
    : (product.wholesale_price ? Math.round(product.wholesale_price / 2) : Math.round(cartonBasePrice * 0.52))

  const quarterBasePrice = product.quarter_package_price && product.quarter_package_price > 0
    ? product.quarter_package_price
    : (product.wholesale_price ? Math.round(product.wholesale_price / 4) : Math.round(cartonBasePrice * 0.27))

  const lotQty = product.lot_quantity || 0
  const lotBasePrice = product.lot_price || 0
  const hasLot = lotQty > 1 && lotBasePrice > 0

  // Détermination du prix unitaire du palier et du total de pièces
  let unitTierPrice = product.price
  let piecesPerTier = 1
  let tierLabel = 'Détail'
  let nlpToken = ''

  if (selectedTier === 'carton') {
    unitTierPrice = cartonBasePrice
    piecesPerTier = mult
    tierLabel = `Carton (${mult} ${unit})`
    nlpToken = `${quantity > 1 ? `${quantity} ` : ''}${pkgName} de ${product.name}`
  } else if (selectedTier === 'half') {
    unitTierPrice = halfBasePrice
    piecesPerTier = Math.max(1, Math.round(mult * 0.5))
    tierLabel = `1/2 Carton (${piecesPerTier} ${unit})`
    nlpToken = `${quantity > 1 ? `${quantity} ` : ''}1/2 ${pkgName} de ${product.name}`
  } else if (selectedTier === 'quarter') {
    unitTierPrice = quarterBasePrice
    piecesPerTier = Math.max(1, Math.round(mult * 0.25))
    tierLabel = `1/4 Carton (${piecesPerTier} ${unit})`
    nlpToken = `${quantity > 1 ? `${quantity} ` : ''}1/4 ${pkgName} de ${product.name}`
  } else if (selectedTier === 'lot') {
    unitTierPrice = lotBasePrice
    piecesPerTier = lotQty
    tierLabel = `Lot de ${lotQty} ${unit}`
    nlpToken = `${quantity > 1 ? `${quantity} ` : ''}lot de ${lotQty} de ${product.name}`
  } else {
    // Détail
    unitTierPrice = product.price
    piecesPerTier = 1
    tierLabel = `Détail (1 ${unit})`
    nlpToken = `${quantity} ${product.name}`
  }

  const rawTotal = customPrice !== null ? customPrice : unitTierPrice * quantity
  const finalTotal = Math.max(0, rawTotal - discountAmount)
  const totalPieces = piecesPerTier * quantity

  const handleSelectTier = (tier: TierType) => {
    audioFeedback.playTick()
    setSelectedTier(tier)
    setCustomPrice(null)
  }

  const handleStepQty = (delta: number) => {
    const next = Math.max(1, quantity + delta)
    if (next !== quantity) {
      audioFeedback.playTick()
      setQuantity(next)
      setCustomPrice(null)
    }
  }

  const handleApplyDiscount = (amount: number) => {
    audioFeedback.playTick()
    setDiscountAmount((prev) => (prev === amount ? 0 : amount))
  }

  const handleConfirm = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    audioFeedback.playInkStamp()

    try {
      // Construction du texte NLP pour le cahier
      let text = nlpToken

      // Ajout du prix
      text += ` à ${finalTotal}`

      // Ajout du client si spécifié
      if (clientName.trim()) {
        text += ` ${clientName.trim()}`
      }

      await onConfirmSale(text)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      {/* Backdrop sombre flouté */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Feuille de Vente Tactile */}
      <div className="relative w-full max-w-lg bg-[#fffdfa] rounded-t-3xl sm:rounded-3xl border border-amber-300 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.9)] max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Poignée tactile mobile */}
        <div className="w-12 h-1.5 bg-amber-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0" />

        {/* En-tête de la feuille */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-amber-200/80 bg-gradient-to-r from-amber-50 to-amber-100/60 flex-shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="font-handwritten text-xl sm:text-2xl font-black text-[#1d4ed8] truncate">
                {product.name}
              </span>
              {product.category && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-200/80 text-amber-950 rounded-md flex-shrink-0">
                  {product.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-amber-900/80 mt-0.5">
              <span>
                Rayon : <strong className="font-mono tabular-nums">{product.stock ?? 0} {unit}</strong>
              </span>
              {hasPackaging && (
                <span className="font-mono text-[10px] text-amber-800">
                  (1 {pkgName} = {mult} {unit})
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-amber-900/70 hover:text-amber-950 hover:bg-amber-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-grow scrollbar-none">
          {/* 1. Sélection Tactile du Palier de Conditionnement */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-700" />
              <span>Format & Conditionnement</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Option Détail */}
              <button
                type="button"
                onClick={() => handleSelectTier('detail')}
                className={`p-2.5 rounded-2xl border text-left transition-all duration-100 ease-out active:scale-[0.97] cursor-pointer ${
                  selectedTier === 'detail'
                    ? 'bg-amber-950 text-white border-amber-950 shadow-md ring-2 ring-amber-400/50'
                    : 'bg-white hover:bg-amber-50 text-amber-950 border-amber-300 shadow-2xs'
                }`}
              >
                <div className="text-xs font-bold">Détail</div>
                <div className="font-mono text-xs font-black mt-1 tabular-nums">
                  {formatPrice(product.price)}
                </div>
                <div className="text-[10px] opacity-70 mt-0.5">1 {unit}</div>
              </button>

              {/* Option 1/4 Carton */}
              {hasPackaging && mult >= 4 && (
                <button
                  type="button"
                  onClick={() => handleSelectTier('quarter')}
                  className={`p-2.5 rounded-2xl border text-left transition-all duration-100 ease-out active:scale-[0.97] cursor-pointer ${
                    selectedTier === 'quarter'
                      ? 'bg-amber-950 text-white border-amber-950 shadow-md ring-2 ring-amber-400/50'
                      : 'bg-white hover:bg-amber-50 text-amber-950 border-amber-300 shadow-2xs'
                  }`}
                >
                  <div className="text-xs font-bold">1/4 {pkgName}</div>
                  <div className="font-mono text-xs font-black mt-1 tabular-nums">
                    {formatPrice(quarterBasePrice)}
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {Math.round(mult * 0.25)} {unit}
                  </div>
                </button>
              )}

              {/* Option 1/2 Carton */}
              {hasPackaging && mult >= 2 && (
                <button
                  type="button"
                  onClick={() => handleSelectTier('half')}
                  className={`p-2.5 rounded-2xl border text-left transition-all duration-100 ease-out active:scale-[0.97] cursor-pointer ${
                    selectedTier === 'half'
                      ? 'bg-amber-950 text-white border-amber-950 shadow-md ring-2 ring-amber-400/50'
                      : 'bg-white hover:bg-amber-50 text-amber-950 border-amber-300 shadow-2xs'
                  }`}
                >
                  <div className="text-xs font-bold">1/2 {pkgName}</div>
                  <div className="font-mono text-xs font-black mt-1 tabular-nums">
                    {formatPrice(halfBasePrice)}
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {Math.round(mult * 0.5)} {unit}
                  </div>
                </button>
              )}

              {/* Option Carton Plein */}
              {hasPackaging && (
                <button
                  type="button"
                  onClick={() => handleSelectTier('carton')}
                  className={`p-2.5 rounded-2xl border text-left transition-all duration-100 ease-out active:scale-[0.97] cursor-pointer ${
                    selectedTier === 'carton'
                      ? 'bg-amber-950 text-white border-amber-950 shadow-md ring-2 ring-amber-400/50'
                      : 'bg-white hover:bg-amber-50 text-amber-950 border-amber-300 shadow-2xs'
                  }`}
                >
                  <div className="text-xs font-bold">{pkgName} Entier</div>
                  <div className="font-mono text-xs font-black mt-1 tabular-nums">
                    {formatPrice(cartonBasePrice)}
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {mult} {unit}
                  </div>
                </button>
              )}

              {/* Option Lot Dégressif */}
              {hasLot && (
                <button
                  type="button"
                  onClick={() => handleSelectTier('lot')}
                  className={`p-2.5 rounded-2xl border text-left transition-all duration-100 ease-out active:scale-[0.97] cursor-pointer ${
                    selectedTier === 'lot'
                      ? 'bg-amber-950 text-white border-amber-950 shadow-md ring-2 ring-amber-400/50'
                      : 'bg-white hover:bg-amber-50 text-amber-950 border-amber-300 shadow-2xs'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-700" />
                    <span>Lot {lotQty}</span>
                  </div>
                  <div className="font-mono text-xs font-black mt-1 tabular-nums">
                    {formatPrice(lotBasePrice)}
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {lotQty} {unit}
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* 2. Stepper de Quantité Tactile */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)]">
            <div>
              <div className="text-xs font-black text-amber-950 uppercase tracking-tight">
                Quantité : {quantity} {selectedTier === 'detail' ? unit : pkgName}
                {quantity > 1 ? 's' : ''}
              </div>
              <div className="font-mono text-[11px] text-amber-800/80 tabular-nums">
                Total : <strong className="text-amber-950">{totalPieces}</strong> {unit}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStepQty(-1)}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-xl bg-white hover:bg-amber-100 disabled:opacity-40 border border-amber-300 text-amber-950 font-bold flex items-center justify-center transition-transform active:scale-[0.92] shadow-2xs cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="w-12 text-center font-mono text-lg font-black text-amber-950 tabular-nums">
                {quantity}
              </div>

              <button
                type="button"
                onClick={() => handleStepQty(1)}
                className="w-10 h-10 rounded-xl bg-amber-900 hover:bg-amber-950 border border-amber-950 text-white font-bold flex items-center justify-center transition-transform active:scale-[0.92] shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Raccourcis rapides de quantité */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-bold text-amber-900/70 uppercase flex-shrink-0">
              Raccourcis :
            </span>
            {[1, 2, 3, 5, 10, 20].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  audioFeedback.playTick()
                  setQuantity(n)
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  quantity === n
                    ? 'bg-amber-950 text-white shadow-2xs'
                    : 'bg-white hover:bg-amber-100 border border-amber-300/80 text-amber-950'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* 3. Accordéon : Vue Visuelle du Carton Ouvert */}
          {hasPackaging && (
            <div className="border border-amber-200/80 rounded-2xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setShowVisualCarton(!showVisualCarton)}
                className="w-full px-3 py-2.5 bg-amber-100/50 hover:bg-amber-100 flex items-center justify-between text-xs font-bold text-amber-950 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-700" />
                  <span>Inspecteur Visuel de Carton ({mult} {unit})</span>
                </span>
                {showVisualCarton ? (
                  <ChevronUp className="w-4 h-4 text-amber-800" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-amber-800" />
                )}
              </button>

              {showVisualCarton && (
                <div className="p-3 bg-[#fffdfa] border-t border-amber-200/60 animate-in fade-in duration-150">
                  <VisualCartonDecomposer
                    currentStock={product.stock ?? 0}
                    multiplier={mult}
                    packagingName={pkgName}
                    unit={unit}
                    selectedPieces={totalPieces}
                    onSelectPieces={(pcs) => {
                      if (selectedTier === 'carton') {
                        setQuantity(Math.max(1, Math.round(pcs / mult)))
                      } else {
                        setQuantity(pcs)
                        setSelectedTier('detail')
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* 4. Raccourcis "Prix d'ami" / Remise Rapide */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1">
                <Percent className="w-3 h-3 text-amber-700" />
                <span>Prix d'Ami / Remise Client</span>
              </span>
              {discountAmount > 0 && (
                <span className="font-mono font-bold text-rose-700 tabular-nums">
                  -{formatPrice(discountAmount)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: 'Normal (0 F)', amount: 0 },
                { label: '-50 F', amount: 50 },
                { label: '-100 F', amount: 100 },
                { label: '-200 F', amount: 200 },
                { label: '-500 F', amount: 500 },
                { label: '-1 000 F', amount: 1000 },
              ].map((d) => (
                <button
                  key={d.amount}
                  type="button"
                  onClick={() => handleApplyDiscount(d.amount)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-transform active:scale-[0.95] cursor-pointer ${
                    discountAmount === d.amount
                      ? 'bg-rose-600 text-white border border-rose-700 shadow-2xs'
                      : 'bg-white hover:bg-amber-100 border border-amber-300 text-amber-950'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Champ Client (Facultatif) */}
          <div className="flex items-center gap-2 p-2 bg-white border border-amber-200/90 rounded-xl">
            <User className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <input
              type="text"
              placeholder="Nom du client (ex: Maman Koffi, Comptant...)"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full text-xs text-amber-950 placeholder:text-amber-800/40 bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Pied de page : Total & Bouton de Validation Tactile */}
        <div className="p-4 sm:p-5 border-t border-amber-200/80 bg-gradient-to-b from-amber-50 to-amber-100/60 flex items-center justify-between gap-3 flex-shrink-0 shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.04)]">
          <div>
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
              Total à Encaisser
            </div>
            <div className="font-mono text-2xl font-black text-amber-950 tabular-nums">
              {formatPrice(finalTotal)}
            </div>
            <div className="text-[10px] font-sans text-amber-700">
              {totalPieces} {unit} ({tierLabel})
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="px-5 sm:px-6 py-3.5 bg-gradient-to-r from-amber-900 via-amber-950 to-amber-900 hover:from-black hover:to-black text-white font-extrabold rounded-2xl text-sm transition-all duration-100 ease-out active:scale-[0.97] shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Tamponner la Vente</span>
          </button>
        </div>
      </div>
    </div>
  )
}
