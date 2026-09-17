'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Sparkles, Check, CornerDownLeft, X, AlertCircle, ArrowUpRight } from 'lucide-react'
import { parseSmartProductText, ParsedProductResult } from '@/lib/stock/smartProductParser'
import { formatPrice } from '@/lib/penUtils'
import { StockFormState } from './types'

interface ProductCandidate {
  id: string
  name: string
  current_stock?: number
  initial_stock: number
  unit_price: number
  unit_cost?: number
  category?: string
}

interface SmartProductQuickAddProps {
  existingProducts: ProductCandidate[]
  onAddProduct: (productData: StockFormState, existingIdToRestock?: string) => Promise<void>
  onOpenAdvancedModalWithData?: (data: StockFormState) => void
  disabled?: boolean
}

export const SmartProductQuickAdd: React.FC<SmartProductQuickAddProps> = ({
  existingProducts,
  onAddProduct,
  onOpenAdvancedModalWithData,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [justAddedName, setJustAddedName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Analyse en temps réel dès que l'utilisateur tape
  const parsed: ParsedProductResult = useMemo(() => {
    return parseSmartProductText(inputText)
  }, [inputText])

  const hasContent = inputText.trim().length >= 2

  // Vérifier si le produit correspond à un produit déjà existant dans la boutique
  const matchingExistingProduct = useMemo(() => {
    if (!hasContent || !parsed.name || parsed.name.length < 2) return null
    const lower = parsed.name.toLowerCase().trim()
    return existingProducts.find(p => p.name.toLowerCase().trim() === lower) || null
  }, [hasContent, parsed.name, existingProducts])

  // Calcul de marge estimée
  const estimatedMargin = useMemo(() => {
    if (parsed.unit_price > 0 && parsed.unit_cost > 0 && parsed.unit_price > parsed.unit_cost) {
      const margin = parsed.unit_price - parsed.unit_cost
      const percent = Math.round((margin / parsed.unit_cost) * 100)
      return { margin, percent }
    }
    return null
  }, [parsed.unit_price, parsed.unit_cost])

  // Nettoyer la notification temporaire de succès
  useEffect(() => {
    if (justAddedName) {
      const timer = setTimeout(() => setJustAddedName(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [justAddedName])

  const handleConfirm = async () => {
    if (!parsed.name.trim() || isSubmitting || disabled) return
    setIsSubmitting(true)

    try {
      const formState: StockFormState = {
        name: parsed.name,
        initial_stock: parsed.initial_stock,
        unit_cost: parsed.unit_cost,
        unit_price: parsed.unit_price,
        alert_threshold: parsed.alert_threshold,
        category: parsed.category,
        unit: parsed.unit,
        multiplier: parsed.multiplier,
        packaging_name: parsed.packaging_name,
        packages_count: parsed.packages_count,
        package_cost: parsed.package_cost,
        wholesale_price: parsed.wholesale_price,
        half_package_price: parsed.half_package_price,
        quarter_package_price: parsed.quarter_package_price,
        lot_quantity: parsed.lot_quantity,
        lot_price: parsed.lot_price,
        trade_type: parsed.trade_type,
        barcode: '',
      }

      const existingId = matchingExistingProduct ? matchingExistingProduct.id : undefined
      await onAddProduct(formState, existingId)

      setJustAddedName(parsed.name)
      setInputText('')
      if (inputRef.current) inputRef.current.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (parsed.name.trim()) {
        handleConfirm()
      }
    } else if (e.key === 'Escape') {
      setInputText('')
    }
  }

  const handleOpenDetailed = () => {
    if (onOpenAdvancedModalWithData) {
      const formState: StockFormState = {
        name: parsed.name,
        initial_stock: parsed.initial_stock,
        unit_cost: parsed.unit_cost,
        unit_price: parsed.unit_price,
        alert_threshold: parsed.alert_threshold,
        category: parsed.category,
        unit: parsed.unit,
        multiplier: parsed.multiplier,
        packaging_name: parsed.packaging_name,
        packages_count: parsed.packages_count,
        package_cost: parsed.package_cost,
        wholesale_price: parsed.wholesale_price,
        half_package_price: parsed.half_package_price,
        quarter_package_price: parsed.quarter_package_price,
        lot_quantity: parsed.lot_quantity,
        lot_price: parsed.lot_price,
        trade_type: parsed.trade_type,
        barcode: '',
      }
      onOpenAdvancedModalWithData(formState)
    }
  }

  return (
    <div className="bg-gradient-to-br from-amber-100/90 via-[#fefdfa] to-yellow-50/90 border-2 border-amber-300/90 rounded-2xl p-3 sm:p-4 shadow-sm space-y-2.5 mb-4">
      {/* Entête avec badge magique */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-200/90 text-amber-950 border border-amber-300 shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-800" strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-handwritten font-black text-sm sm:text-base text-amber-950 leading-tight">
              Saisie Magique de Produit (1 seule phrase)
            </h4>
            <p className="text-[11px] text-amber-900/80 font-mono hidden sm:block">
              Tapez tout d'un coup : nom, quantité, conditionnement, prix d'achat et de vente
            </p>
          </div>
        </div>

        {justAddedName && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-mono font-bold animate-in fade-in slide-in-from-right-3 duration-200">
            <Check className="w-3.5 h-3.5 text-emerald-700" strokeWidth={2.5} />
            <span>✓ « {justAddedName} » ajouté avec succès !</span>
          </div>
        )}
      </div>

      {/* Barre de saisie principale */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSubmitting}
          placeholder="Ex: Savon BF 50 cartons achat 8000 vente 10000 (ou Sucre 30 paquets à 900)..."
          className="w-full pl-3.5 pr-24 sm:pr-32 py-2.5 bg-white border-2 border-amber-300/90 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 font-mono font-bold focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-400/40 shadow-inner transition-all"
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputText && (
            <button
              type="button"
              onClick={() => setInputText('')}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg active:scale-95 transition-all"
              title="Effacer (Échap)"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!parsed.name.trim() || isSubmitting || disabled}
            className="px-2.5 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-950 text-white font-mono text-xs font-black flex items-center gap-1 shadow-xs active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Valider l'ajout du produit (Entrée)"
          >
            {isSubmitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Ajouter</span>
                <CornerDownLeft className="w-3 h-3 text-amber-200 hidden sm:inline" strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Panneau de prévisualisation en direct de ce que le logiciel a compris */}
      {hasContent && (
        <div className="p-2.5 sm:p-3 bg-white/95 rounded-xl border border-amber-300 shadow-2xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between text-[11px] font-mono border-b border-amber-100 pb-1.5 text-gray-600">
            <span className="font-bold flex items-center gap-1 text-amber-950">
              <Sparkles className="w-3 h-3 text-amber-700" />
              <span>Ce que le logiciel a détecté en direct :</span>
            </span>

            {onOpenAdvancedModalWithData && (
              <button
                type="button"
                onClick={handleOpenDetailed}
                className="text-amber-900 hover:text-amber-950 underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Ajuster en mode complet</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Badges des informations extraites */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            {/* Nom */}
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 font-black flex items-center gap-1">
              <span className="text-[10px] text-amber-700 uppercase font-extrabold">Nom :</span>
              <span>{parsed.name || '...'}</span>
            </span>

            {/* Quantité & Contenance */}
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 font-black tabular-nums flex items-center gap-1">
              <span className="text-[10px] text-blue-700 uppercase font-extrabold">Stock :</span>
              <span>
                {parsed.packages_count && parsed.packages_count > 0 && parsed.multiplier > 1 ? (
                  <>
                    {parsed.packages_count} {parsed.packaging_name || 'cartons'} × {parsed.multiplier} = <span className="text-blue-700 font-extrabold">{parsed.initial_stock} pièces</span>
                  </>
                ) : (
                  <>
                    {parsed.initial_stock} {parsed.unit}
                    {parsed.multiplier > 1 ? ` (x${parsed.multiplier})` : ''}
                  </>
                )}
              </span>
            </span>

            {/* Prix d'achat */}
            {(parsed.package_cost ? parsed.package_cost > 0 : parsed.unit_cost > 0) && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-950 font-black tabular-nums flex items-center gap-1">
                <span className="text-[10px] text-rose-700 uppercase font-extrabold">Achat :</span>
                {parsed.package_cost && parsed.package_cost > 0 && parsed.multiplier > 1 ? (
                  <span>{formatPrice(parsed.package_cost)} / {parsed.packaging_name || 'carton'} <span className="text-rose-700 font-bold">({formatPrice(Math.round(parsed.unit_cost))} / pc)</span></span>
                ) : (
                  <span>{formatPrice(parsed.unit_cost)}</span>
                )}
              </span>
            )}

            {/* Prix de vente Détail (Pièce) */}
            {parsed.unit_price > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 font-black tabular-nums flex items-center gap-1">
                <span className="text-[10px] text-emerald-700 uppercase font-extrabold">Détail (1 pc) :</span>
                <span>{formatPrice(parsed.unit_price)}</span>
              </span>
            )}

            {/* Prix Quart de carton (1/4) */}
            {parsed.quarter_package_price && parsed.quarter_package_price > 0 && (
              <span className="px-2 py-1 rounded-lg bg-teal-50 border border-teal-300 text-teal-950 font-black tabular-nums flex items-center gap-1 text-[11px]">
                <span className="text-[10px] text-teal-700 uppercase font-extrabold">1/4 ctn :</span>
                <span>{formatPrice(parsed.quarter_package_price)}</span>
              </span>
            )}

            {/* Prix Demi-carton (1/2) */}
            {parsed.half_package_price && parsed.half_package_price > 0 && (
              <span className="px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-300 text-indigo-950 font-black tabular-nums flex items-center gap-1 text-[11px]">
                <span className="text-[10px] text-indigo-700 uppercase font-extrabold">1/2 ctn :</span>
                <span>{formatPrice(parsed.half_package_price)}</span>
              </span>
            )}

            {/* Seuil Dégressif / Lot */}
            {parsed.lot_quantity > 0 && parsed.lot_price > 0 && (
              <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 font-black tabular-nums flex items-center gap-1 text-[11px]">
                <span className="text-[10px] text-emerald-700 uppercase font-extrabold">Lot de {parsed.lot_quantity} :</span>
                <span>{formatPrice(parsed.lot_price)}</span>
              </span>
            )}

            {/* Prix Carton Complet */}
            {parsed.wholesale_price && parsed.wholesale_price > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-300 text-purple-950 font-black tabular-nums flex items-center gap-1">
                <span className="text-[10px] text-purple-700 uppercase font-extrabold">Carton Entier :</span>
                <span>{formatPrice(parsed.wholesale_price)}</span>
              </span>
            )}

            {/* Marge estimée */}
            {estimatedMargin && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-950 font-extrabold tabular-nums flex items-center gap-1 text-[11px]">
                <span className="text-[10px] text-amber-800 uppercase">Marge Détail :</span>
                <span className="text-emerald-800">+{formatPrice(estimatedMargin.margin)} (+{estimatedMargin.percent}%)</span>
              </span>
            )}

            {/* Catégorie */}
            <span className="px-2 py-1 rounded-lg bg-amber-100/60 border border-amber-200 text-amber-900 font-bold text-[11px]">
              📁 {parsed.category}
            </span>

            {/* Seuil d'alerte */}
            <span className="px-2 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-800 font-bold text-[11px] tabular-nums">
              ⚠️ Alerte : {parsed.alert_threshold}
            </span>
          </div>

          {/* Alerte si le produit existe déjà en stock : Option de réapprovisionnement automatique */}
          {matchingExistingProduct && (
            <div className="p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div className="space-y-0.5">
                <p className="font-extrabold">
                  Produit déjà présent en stock ({matchingExistingProduct.name}) !
                </p>
                <p className="text-[11px] text-amber-900 font-sans">
                  Stock actuel : <span className="font-mono font-bold">{matchingExistingProduct.current_stock ?? matchingExistingProduct.initial_stock} {parsed.unit}</span>.
                  En validant, le stock passera à <span className="font-mono font-extrabold text-emerald-900">{(matchingExistingProduct.current_stock ?? matchingExistingProduct.initial_stock) + parsed.initial_stock} {parsed.unit}</span> et les prix seront actualisés.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
