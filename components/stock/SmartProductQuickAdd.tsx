'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Sparkles,
  Check,
  CornerDownLeft,
  X,
  AlertCircle,
  ArrowUpRight,
  Package,
  TrendingUp,
  Tag,
  Coins,
  Plus,
  Minus,
} from 'lucide-react'
import { parseSmartProductText, ParsedProductResult } from '@/lib/stock/smartProductParser'
import { formatPrice } from '@/lib/penUtils'
import { audioFeedback } from '@/lib/audioFeedback'
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
  const [overrides, setOverrides] = useState<Partial<ParsedProductResult>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  // Analyse en temps réel dès que l'utilisateur tape
  const parsed: ParsedProductResult = useMemo(() => {
    return parseSmartProductText(inputText)
  }, [inputText])

  // Données actives combinant l'analyse NLP et les modifications tactiles directes du commerçant
  const activeData = useMemo(() => {
    const mult = overrides.multiplier ?? parsed.multiplier ?? 1
    const pkgName = overrides.packaging_name ?? parsed.packaging_name ?? (mult > 1 ? 'carton' : '')
    let pkgCount = overrides.packages_count ?? parsed.packages_count ?? 0
    let totalPieces = overrides.initial_stock ?? parsed.initial_stock ?? 0

    if (mult > 1) {
      if (overrides.packages_count !== undefined) {
        totalPieces = (overrides.packages_count || 0) * mult
      } else if (pkgCount > 0 && totalPieces === 0) {
        totalPieces = pkgCount * mult
      } else if (pkgCount === 0 && totalPieces > 0) {
        pkgCount = Math.floor(totalPieces / mult)
      }
    }

    let pkgCost = overrides.package_cost ?? parsed.package_cost ?? 0
    let uCost = overrides.unit_cost ?? parsed.unit_cost ?? 0

    if (mult > 1) {
      if (overrides.package_cost !== undefined) {
        uCost = mult > 0 ? Math.round(pkgCost / mult) : pkgCost
      } else if (overrides.unit_cost !== undefined) {
        pkgCost = uCost * mult
      } else if (pkgCost > 0 && uCost === 0) {
        uCost = Math.round(pkgCost / mult)
      } else if (uCost > 0 && pkgCost === 0) {
        pkgCost = uCost * mult
      }
    }

    const uPrice = overrides.unit_price ?? parsed.unit_price ?? 0
    let wPrice = overrides.wholesale_price ?? parsed.wholesale_price ?? 0
    let hPrice = overrides.half_package_price ?? parsed.half_package_price ?? 0
    let qPrice = overrides.quarter_package_price ?? parsed.quarter_package_price ?? 0

    // Auto-déduction des paliers de gros s'ils sont à 0 mais qu'on a le prix détail
    if (mult > 1 && uPrice > 0) {
      if (!wPrice) wPrice = Math.round((uPrice * mult * 0.88) / 100) * 100
      if (!hPrice) hPrice = Math.round((uPrice * (mult / 2) * 0.92) / 50) * 50
      if (!qPrice && mult >= 8) qPrice = Math.round((uPrice * (mult / 4) * 0.95) / 25) * 25
    }

    return {
      name: overrides.name ?? parsed.name ?? '',
      packages_count: pkgCount,
      multiplier: mult,
      initial_stock: totalPieces,
      packaging_name: pkgName,
      unit: overrides.unit ?? parsed.unit ?? (mult > 1 ? 'carton' : 'unité'),
      package_cost: pkgCost,
      unit_cost: uCost,
      unit_price: uPrice,
      wholesale_price: wPrice,
      half_package_price: hPrice,
      quarter_package_price: qPrice,
      lot_quantity: overrides.lot_quantity ?? parsed.lot_quantity ?? 0,
      lot_price: overrides.lot_price ?? parsed.lot_price ?? 0,
      alert_threshold: overrides.alert_threshold ?? parsed.alert_threshold ?? 5,
      category: overrides.category ?? parsed.category ?? 'Épicerie & Vivres',
      trade_type: overrides.trade_type ?? parsed.trade_type ?? (mult > 1 ? 'wholesale' : 'retail'),
    }
  }, [parsed, overrides])

  const hasContent = inputText.trim().length >= 2

  // Vérifier si le produit correspond à un produit déjà existant dans la boutique
  const matchingExistingProduct = useMemo(() => {
    if (!hasContent || !activeData.name || activeData.name.length < 2) return null
    const lower = activeData.name.toLowerCase().trim()
    return existingProducts.find((p) => p.name.toLowerCase().trim() === lower) || null
  }, [hasContent, activeData.name, existingProducts])

  // Calcul de marge unitaire nette en direct
  const liveMargin = useMemo(() => {
    if (activeData.unit_price > 0 && activeData.unit_cost > 0) {
      const margin = activeData.unit_price - activeData.unit_cost
      const percent = Math.round((margin / activeData.unit_cost) * 100)
      return { margin, percent }
    }
    return null
  }, [activeData.unit_price, activeData.unit_cost])

  // Nettoyer la notification temporaire de succès
  useEffect(() => {
    if (justAddedName) {
      const timer = setTimeout(() => setJustAddedName(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [justAddedName])

  // Réinitialiser les surcharges quand le texte est effacé
  useEffect(() => {
    if (!inputText.trim()) {
      setOverrides({})
    }
  }, [inputText])

  const handleConfirm = async () => {
    if (!activeData.name.trim() || isSubmitting || disabled) return
    setIsSubmitting(true)

    try {
      audioFeedback.playInkStamp()

      const formState: StockFormState = {
        name: activeData.name,
        initial_stock: activeData.initial_stock,
        unit_cost: activeData.unit_cost,
        unit_price: activeData.unit_price,
        alert_threshold: activeData.alert_threshold,
        category: activeData.category,
        unit: activeData.unit,
        multiplier: activeData.multiplier,
        packaging_name: activeData.packaging_name,
        packages_count: activeData.packages_count,
        package_cost: activeData.package_cost,
        wholesale_price: activeData.wholesale_price,
        half_package_price: activeData.half_package_price,
        quarter_package_price: activeData.quarter_package_price,
        lot_quantity: activeData.lot_quantity,
        lot_price: activeData.lot_price,
        trade_type: activeData.trade_type,
        barcode: '',
      }

      const existingId = matchingExistingProduct ? matchingExistingProduct.id : undefined
      await onAddProduct(formState, existingId)

      setJustAddedName(activeData.name)
      setInputText('')
      setOverrides({})
      if (inputRef.current) inputRef.current.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (activeData.name.trim()) {
        handleConfirm()
      }
    } else if (e.key === 'Escape') {
      setInputText('')
      setOverrides({})
    }
  }

  const handleOpenDetailed = () => {
    if (onOpenAdvancedModalWithData) {
      const formState: StockFormState = {
        name: activeData.name,
        initial_stock: activeData.initial_stock,
        unit_cost: activeData.unit_cost,
        unit_price: activeData.unit_price,
        alert_threshold: activeData.alert_threshold,
        category: activeData.category,
        unit: activeData.unit,
        multiplier: activeData.multiplier,
        packaging_name: activeData.packaging_name,
        packages_count: activeData.packages_count,
        package_cost: activeData.package_cost,
        wholesale_price: activeData.wholesale_price,
        half_package_price: activeData.half_package_price,
        quarter_package_price: activeData.quarter_package_price,
        lot_quantity: activeData.lot_quantity,
        lot_price: activeData.lot_price,
        trade_type: activeData.trade_type,
        barcode: '',
      }
      onOpenAdvancedModalWithData(formState)
    }
  }

  return (
    <div className="bg-gradient-to-br from-amber-50/90 via-[#fdfbf7] to-amber-100/50 border-2 border-amber-300/80 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3 mb-4 transition-all">
      {/* Entête avec badge magique */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-200/90 text-amber-950 border border-amber-300 shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-800" strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-handwritten font-black text-sm sm:text-base text-amber-950 leading-tight">
              Saisie Rapide & Chiffres Modifiables
            </h4>
            <p className="text-[11px] text-amber-900/80 font-mono hidden sm:block">
              Tapez au vol ou ajustez directement chaque montant du bout du doigt
            </p>
          </div>
        </div>

        {justAddedName && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-mono font-bold animate-in fade-in slide-in-from-right-3 duration-200">
            <Check className="w-3.5 h-3.5 text-emerald-700" strokeWidth={2.5} />
            <span>✓ « {justAddedName} » enregistré au stock !</span>
          </div>
        )}
      </div>

      {/* Barre de saisie principale */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value)
            setOverrides({})
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSubmitting}
          placeholder="Ex: 10 ctn bf 25 20k 500 (ou Sucre 30 paquets à 900)..."
          className="w-full pl-3.5 pr-24 sm:pr-32 py-2.5 bg-white border-2 border-amber-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 font-mono font-bold focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-400/40 shadow-inner transition-all"
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputText && (
            <button
              type="button"
              onClick={() => {
                setInputText('')
                setOverrides({})
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg active:scale-95 transition-all cursor-pointer"
              title="Effacer (Échap)"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!activeData.name.trim() || isSubmitting || disabled}
            className="px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-950 text-white font-mono text-xs font-black flex items-center gap-1 shadow-xs active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Valider l'ajout du produit (Entrée)"
          >
            {isSubmitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Valider</span>
                <CornerDownLeft className="w-3 h-3 text-amber-200 hidden sm:inline" strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Panneau interactif avec pastilles éditables du bout du doigt */}
      {hasContent && (
        <div className="p-3 bg-white/95 rounded-xl border border-amber-300 shadow-2xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between text-[11px] font-mono border-b border-amber-100 pb-1.5 text-gray-600">
            <span className="font-bold flex items-center gap-1.5 text-amber-950">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Chiffres détectés (Touchez une case pour modifier) :</span>
            </span>

            {onOpenAdvancedModalWithData && (
              <button
                type="button"
                onClick={handleOpenDetailed}
                className="text-amber-900 hover:text-amber-950 underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Mode complet</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Grille des pastilles tactiles et éditables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
            {/* 1. NOM DU PRODUIT */}
            <div className="p-2 bg-amber-50/70 border border-amber-300 rounded-xl space-y-1">
              <span className="text-[10px] text-amber-800 uppercase font-extrabold flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-700" />
                <span>Nom :</span>
              </span>
              <input
                type="text"
                value={activeData.name}
                onChange={(e) => setOverrides((prev) => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                placeholder="Nom du produit"
                className="w-full font-bold text-xs text-amber-950 bg-white border border-amber-300 rounded-lg px-2 py-1 focus:border-amber-600 outline-none"
              />
            </div>

            {/* 2. QUANTITÉ & CARTONS (AVEC BOUTONS + ET -) */}
            <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <span className="text-[10px] text-blue-800 uppercase font-extrabold flex items-center gap-1">
                <Package className="w-3 h-3 text-blue-700" />
                <span>{activeData.multiplier > 1 ? 'Cartons / Packs :' : 'Quantité :'}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    audioFeedback.playTick()
                    if (activeData.multiplier > 1) {
                      const next = Math.max(1, (activeData.packages_count || 1) - 1)
                      setOverrides((prev) => ({
                        ...prev,
                        packages_count: next,
                        initial_stock: next * activeData.multiplier,
                      }))
                    } else {
                      const next = Math.max(1, (activeData.initial_stock || 1) - 1)
                      setOverrides((prev) => ({ ...prev, initial_stock: next }))
                    }
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-200 hover:bg-blue-300 active:scale-[0.95] text-blue-950 font-black text-xs cursor-pointer shadow-2xs transition-transform"
                  title="Diminuer"
                >
                  <Minus className="w-3 h-3" strokeWidth={3} />
                </button>

                <input
                  type="number"
                  value={
                    activeData.multiplier > 1
                      ? activeData.packages_count || ''
                      : activeData.initial_stock || ''
                  }
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    if (activeData.multiplier > 1) {
                      setOverrides((prev) => ({
                        ...prev,
                        packages_count: val,
                        initial_stock: val * activeData.multiplier,
                      }))
                    } else {
                      setOverrides((prev) => ({ ...prev, initial_stock: val }))
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  className="w-14 text-center font-black text-xs text-blue-950 bg-white border border-blue-300 rounded-lg py-1 focus:border-blue-600 outline-none tabular-nums"
                />

                <button
                  type="button"
                  onClick={() => {
                    audioFeedback.playTick()
                    if (activeData.multiplier > 1) {
                      const next = (activeData.packages_count || 0) + 1
                      setOverrides((prev) => ({
                        ...prev,
                        packages_count: next,
                        initial_stock: next * activeData.multiplier,
                      }))
                    } else {
                      const next = (activeData.initial_stock || 0) + 1
                      setOverrides((prev) => ({ ...prev, initial_stock: next }))
                    }
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-200 hover:bg-blue-300 active:scale-[0.95] text-blue-950 font-black text-xs cursor-pointer shadow-2xs transition-transform"
                  title="Augmenter"
                >
                  <Plus className="w-3 h-3" strokeWidth={3} />
                </button>

                <span className="text-[11px] font-bold text-blue-950 tabular-nums">
                  {activeData.multiplier > 1 ? (
                    <span>= {activeData.initial_stock} pcs</span>
                  ) : (
                    <span>{activeData.unit}</span>
                  )}
                </span>
              </div>
            </div>

            {/* 3. PRIX D'ACHAT (ÉDITABLE) */}
            <div className="p-2 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1">
              <span className="text-[10px] text-rose-800 uppercase font-extrabold flex items-center gap-1">
                <Coins className="w-3 h-3 text-rose-700" />
                <span>
                  {activeData.multiplier > 1 ? "Achat Carton :" : "Prix d'Achat :"}
                </span>
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={
                    (activeData.multiplier > 1
                      ? activeData.package_cost
                      : activeData.unit_cost) || ''
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    if (activeData.multiplier > 1) {
                      setOverrides((prev) => ({
                        ...prev,
                        package_cost: val,
                        unit_cost: Math.round(val / activeData.multiplier),
                      }))
                    } else {
                      setOverrides((prev) => ({ ...prev, unit_cost: val }))
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  placeholder="0"
                  className="w-full font-black text-xs text-rose-950 bg-white border border-rose-300 rounded-lg px-2 py-1 focus:border-rose-600 outline-none tabular-nums"
                />
                <span className="text-xs font-black text-rose-900">F</span>
              </div>
              {activeData.multiplier > 1 && (
                <div className="text-[10px] text-rose-700 font-bold tabular-nums">
                  Soit {formatPrice(activeData.unit_cost)} / pièce
                </div>
              )}
            </div>

            {/* 4. PRIX DE VENTE DÉTAIL (ÉDITABLE) */}
            <div className="p-2 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-1">
              <span className="text-[10px] text-emerald-800 uppercase font-extrabold flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-700" />
                <span>Vente Détail (1 pc) :</span>
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={activeData.unit_price || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    setOverrides((prev) => ({ ...prev, unit_price: val }))
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  placeholder="0"
                  className="w-full font-black text-xs text-emerald-950 bg-white border border-emerald-400 rounded-lg px-2 py-1 focus:border-emerald-600 outline-none tabular-nums"
                />
                <span className="text-xs font-black text-emerald-900">F</span>
              </div>
              {liveMargin && (
                <div
                  className={`text-[10px] font-black tabular-nums ${
                    liveMargin.margin >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  Marge : {liveMargin.margin >= 0 ? '+' : ''}
                  {formatPrice(liveMargin.margin)} ({liveMargin.percent}%)
                </div>
              )}
            </div>
          </div>

          {/* Si c'est un carton : Mini-barre des tarifs de gros dégressifs modifiables */}
          {activeData.multiplier > 1 && (
            <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1.5 font-mono">
              <span className="text-[10px] text-amber-900 uppercase font-extrabold block">
                Tarifs de Gros Dégressifs (modifiables directement) :
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* 1/2 Carton */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-300">
                  <span className="text-[10px] text-indigo-700 font-extrabold uppercase">
                    1/2 ctn :
                  </span>
                  <input
                    type="number"
                    value={activeData.half_package_price || ''}
                    onChange={(e) =>
                      setOverrides((prev) => ({
                        ...prev,
                        half_package_price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    placeholder="ex: 11250"
                    className="w-16 text-center font-bold text-xs text-indigo-950 bg-transparent outline-none tabular-nums"
                  />
                  <span className="text-[10px] text-gray-500 font-bold">F</span>
                </div>

                {/* Carton Plein */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-300">
                  <span className="text-[10px] text-purple-700 font-extrabold uppercase">
                    Carton :
                  </span>
                  <input
                    type="number"
                    value={activeData.wholesale_price || ''}
                    onChange={(e) =>
                      setOverrides((prev) => ({
                        ...prev,
                        wholesale_price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    placeholder="ex: 21300"
                    className="w-18 text-center font-bold text-xs text-purple-950 bg-transparent outline-none tabular-nums"
                  />
                  <span className="text-[10px] text-gray-500 font-bold">F</span>
                </div>

                {/* Contenance du carton */}
                <div className="flex items-center gap-1 bg-amber-100/70 px-2 py-1 rounded-lg text-[11px] text-amber-950 font-bold">
                  <span>1 ctn =</span>
                  <input
                    type="number"
                    value={activeData.multiplier || ''}
                    onChange={(e) => {
                      const m = parseInt(e.target.value) || 1
                      setOverrides((prev) => ({
                        ...prev,
                        multiplier: m,
                        initial_stock: (activeData.packages_count || 1) * m,
                      }))
                    }}
                    className="w-10 text-center font-black text-amber-950 bg-white border border-amber-300 rounded px-1 py-0.5 outline-none tabular-nums"
                  />
                  <span>pièces</span>
                </div>
              </div>
            </div>
          )}

          {/* Alerte si le produit existe déjà en stock */}
          {matchingExistingProduct && (
            <div className="p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-950 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div className="space-y-0.5">
                <p className="font-extrabold">
                  Produit déjà présent en stock ({matchingExistingProduct.name}) !
                </p>
                <p className="text-[11px] text-amber-900 font-sans">
                  Stock actuel :{' '}
                  <span className="font-mono font-bold">
                    {matchingExistingProduct.current_stock ?? matchingExistingProduct.initial_stock}{' '}
                    {activeData.unit}
                  </span>
                  . En validant, le stock passera à{' '}
                  <span className="font-mono font-extrabold text-emerald-900">
                    {(matchingExistingProduct.current_stock ??
                      matchingExistingProduct.initial_stock) + activeData.initial_stock}{' '}
                    {activeData.unit}
                  </span>{' '}
                  et les prix seront actualisés.
                </p>
              </div>
            </div>
          )}

          {/* Grand bouton de confirmation tactile */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!activeData.name.trim() || isSubmitting || disabled}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 active:scale-[0.98] text-white font-mono font-black text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all duration-100 ease-out disabled:opacity-40"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 text-amber-300" strokeWidth={2.5} />
                <span>Enregistrer « {activeData.name || 'le produit'} » au Stock (Entrée ↵)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
