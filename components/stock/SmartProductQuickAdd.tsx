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
  Layers,
  CheckCircle2,
  History,
  ScanBarcode,
  Wallet,
} from 'lucide-react'
import { parseSmartProductText, ParsedProductResult } from '@/lib/stock/smartProductParser'
import { formatPrice } from '@/lib/penUtils'
import { audioFeedback } from '@/lib/audioFeedback'
import { VoiceInputButton } from '@/components/sales/VoiceInputButton'
import { StockFormState } from './types'

export interface FinancialImpactOption {
  type: 'none' | 'cash_expense' | 'supplier_credit'
  amount: number
  supplierName?: string
}

interface ProductCandidate {
  id: string
  name: string
  current_stock?: number
  initial_stock: number
  unit_price: number
  unit_cost?: number
  category?: string
  multiplier?: number
  packaging_name?: string
  wholesale_price?: number
  half_package_price?: number
  quarter_package_price?: number
  alert_threshold?: number
  barcode?: string
}

interface SmartProductQuickAddProps {
  existingProducts: ProductCandidate[]
  onAddProduct: (
    productData: StockFormState,
    existingIdToRestock?: string,
    financialImpact?: FinancialImpactOption
  ) => Promise<void>
  onOpenAdvancedModalWithData?: (data: StockFormState) => void
  onOpenBarcodeScanner?: () => void
  disabled?: boolean
}

export const SmartProductQuickAdd: React.FC<SmartProductQuickAddProps> = ({
  existingProducts,
  onAddProduct,
  onOpenAdvancedModalWithData,
  onOpenBarcodeScanner,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [justAddedName, setJustAddedName] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Partial<ParsedProductResult>>({})
  const [isPackagingCarton, setIsPackagingCarton] = useState(false)

  // Options de trésorerie / décaissement lié à l'approvisionnement
  const [financialImpactType, setFinancialImpactType] = useState<'cash_expense' | 'supplier_credit' | 'none'>('cash_expense')
  const [supplierName, setSupplierName] = useState('')

  // Références d'input pour le focus fluide au clavier
  const inputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const qtyInputRef = useRef<HTMLInputElement>(null)
  const costInputRef = useRef<HTMLInputElement>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)

  // Analyse en temps réel dès que l'utilisateur tape
  const parsed: ParsedProductResult = useMemo(() => {
    return parseSmartProductText(inputText)
  }, [inputText])

  // Recherche de produit existant pour suggestion & auto-complétion intelligente
  const matchingExistingProduct = useMemo(() => {
    const candidateName = (overrides.name ?? parsed.name ?? inputText).toLowerCase().trim()
    if (!candidateName || candidateName.length < 2) return null
    return (
      existingProducts.find((p) => p.name.toLowerCase().trim() === candidateName) ||
      existingProducts.find((p) => p.name.toLowerCase().trim().startsWith(candidateName)) ||
      null
    )
  }, [inputText, parsed.name, overrides.name, existingProducts])

  // Suggestions rapides quand l'utilisateur commence à taper un nom
  const quickSuggestions = useMemo(() => {
    const q = inputText.toLowerCase().trim()
    if (!q || q.length < 2) return []
    return existingProducts
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 3)
  }, [inputText, existingProducts])

  // Synchronisation automatique de l'état carton si détecté par le parser
  useEffect(() => {
    if (parsed.multiplier > 1 || parsed.packaging_name) {
      setIsPackagingCarton(true)
    }
  }, [parsed.multiplier, parsed.packaging_name])

  // Données actives combinant le texte, le produit existant connu et les saisies du commerçant
  const activeData = useMemo(() => {
    // Multiplicateur / Contenance
    let mult = overrides.multiplier ?? parsed.multiplier ?? 1
    if (mult <= 1 && isPackagingCarton) {
      mult = matchingExistingProduct?.multiplier && matchingExistingProduct.multiplier > 1
        ? matchingExistingProduct.multiplier
        : 24
    } else if (!isPackagingCarton && overrides.multiplier === undefined && parsed.multiplier <= 1) {
      mult = 1
    }

    const pkgName =
      overrides.packaging_name ??
      parsed.packaging_name ??
      (mult > 1 ? matchingExistingProduct?.packaging_name || 'carton' : '')

    // Quantité & Colisage
    let pkgCount = overrides.packages_count ?? parsed.packages_count ?? 0
    let totalPieces = overrides.initial_stock ?? parsed.initial_stock ?? 0

    if (mult > 1) {
      if (overrides.packages_count !== undefined) {
        totalPieces = (overrides.packages_count || 0) * mult
      } else if (pkgCount > 0 && totalPieces === 0) {
        totalPieces = pkgCount * mult
      } else if (pkgCount === 0 && totalPieces > 0) {
        pkgCount = Math.floor(totalPieces / mult)
      } else if (pkgCount === 0 && totalPieces === 0) {
        pkgCount = 1
        totalPieces = mult
      }
    } else {
      if (totalPieces === 0) {
        totalPieces = 1
      }
    }

    // Coût d'Achat
    let pkgCost = overrides.package_cost ?? parsed.package_cost ?? 0
    let uCost = overrides.unit_cost ?? parsed.unit_cost ?? 0

    if (uCost === 0 && pkgCost === 0 && matchingExistingProduct?.unit_cost) {
      uCost = matchingExistingProduct.unit_cost
      pkgCost = mult > 1 ? uCost * mult : 0
    }

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

    // Prix de Vente
    let uPrice = overrides.unit_price ?? parsed.unit_price ?? 0
    if (uPrice === 0 && matchingExistingProduct?.unit_price) {
      uPrice = matchingExistingProduct.unit_price
    }

    let wPrice =
      overrides.wholesale_price ??
      parsed.wholesale_price ??
      matchingExistingProduct?.wholesale_price ??
      0
    let hPrice =
      overrides.half_package_price ??
      parsed.half_package_price ??
      matchingExistingProduct?.half_package_price ??
      0
    let qPrice =
      overrides.quarter_package_price ??
      parsed.quarter_package_price ??
      matchingExistingProduct?.quarter_package_price ??
      0

    if (mult > 1 && uPrice > 0) {
      if (!wPrice) wPrice = Math.round((uPrice * mult * 0.88) / 100) * 100
      if (!hPrice) hPrice = Math.round((uPrice * (mult / 2) * 0.92) / 50) * 50
      if (!qPrice && mult >= 8) qPrice = Math.round((uPrice * (mult / 4) * 0.95) / 25) * 25
    }

    const finalName =
      overrides.name ??
      (parsed.name ? parsed.name : inputText.trim())

    return {
      name: finalName,
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
      alert_threshold:
        overrides.alert_threshold ??
        parsed.alert_threshold ??
        matchingExistingProduct?.alert_threshold ??
        5,
      category:
        overrides.category ??
        parsed.category ??
        matchingExistingProduct?.category ??
        'Épicerie & Vivres',
      trade_type:
        overrides.trade_type ??
        parsed.trade_type ??
        (mult > 1 ? 'wholesale' : 'retail'),
    }
  }, [parsed, overrides, isPackagingCarton, matchingExistingProduct, inputText])

  // Coût total de la commande / du lot acheté pour décaissement caisse
  const totalBatchCost = useMemo(() => {
    if (isPackagingCarton && activeData.package_cost > 0) {
      return activeData.package_cost * (activeData.packages_count || 1)
    }
    return (activeData.unit_cost || 0) * (activeData.initial_stock || 1)
  }, [isPackagingCarton, activeData.package_cost, activeData.packages_count, activeData.unit_cost, activeData.initial_stock])

  // La table se déplie dès qu'un nom commence à être saisi (>= 2 caractères)
  const isTableUnfolded = inputText.trim().length >= 2 || (activeData.name && activeData.name.trim().length >= 2)

  // Calcul de marge unitaire et bénéfice total attendu
  const profitMetrics = useMemo(() => {
    if (activeData.unit_price > 0 && activeData.unit_cost > 0) {
      const marginUnit = activeData.unit_price - activeData.unit_cost
      const marginPercent = Math.round((marginUnit / activeData.unit_cost) * 100)
      const totalExpectedProfit = marginUnit * (activeData.initial_stock || 1)
      return { marginUnit, marginPercent, totalExpectedProfit }
    }
    return null
  }, [activeData.unit_price, activeData.unit_cost, activeData.initial_stock])

  // Vérification de validité minimale
  const isReadyToSave =
    Boolean(activeData.name.trim()) &&
    activeData.initial_stock > 0 &&
    activeData.unit_price > 0

  // Notification temporaire de succès
  useEffect(() => {
    if (justAddedName) {
      const timer = setTimeout(() => setJustAddedName(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [justAddedName])

  // Réinitialiser les surcharges quand le texte est totalement vidé
  useEffect(() => {
    if (!inputText.trim()) {
      setOverrides({})
      setIsPackagingCarton(false)
      setSupplierName('')
    }
  }, [inputText])

  // Focus automatique sur la première case manquante
  const focusFirstMissingField = () => {
    if (!activeData.name.trim()) {
      nameInputRef.current?.focus()
    } else if (activeData.unit_cost === 0) {
      costInputRef.current?.focus()
      costInputRef.current?.select()
    } else if (activeData.unit_price === 0) {
      priceInputRef.current?.focus()
      priceInputRef.current?.select()
    } else if (activeData.initial_stock === 0) {
      qtyInputRef.current?.focus()
      qtyInputRef.current?.select()
    }
  }

  const handleConfirm = async () => {
    if (!activeData.name.trim() || isSubmitting || disabled) return

    // Si le prix de vente manque encore, orienter immédiatement le focus dessus
    if (activeData.unit_price === 0) {
      priceInputRef.current?.focus()
      priceInputRef.current?.select()
      return
    }

    setIsSubmitting(true)
    try {
      audioFeedback.playInkStamp()

      const formState: StockFormState = {
        name: activeData.name.trim(),
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

      const financialImpact: FinancialImpactOption | undefined =
        totalBatchCost > 0
          ? {
              type: financialImpactType,
              amount: totalBatchCost,
              supplierName: supplierName.trim() || undefined,
            }
          : undefined

      const existingId = matchingExistingProduct ? matchingExistingProduct.id : undefined
      await onAddProduct(formState, existingId, financialImpact)

      setJustAddedName(activeData.name)
      setInputText('')
      setOverrides({})
      setIsPackagingCarton(false)
      setSupplierName('')
      if (inputRef.current) inputRef.current.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMainInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isReadyToSave) {
        handleConfirm()
      } else {
        focusFirstMissingField()
      }
    } else if (e.key === 'Escape') {
      setInputText('')
      setOverrides({})
      setIsPackagingCarton(false)
      setSupplierName('')
    }
  }

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isReadyToSave) {
        handleConfirm()
      } else if (nextRef && nextRef.current) {
        nextRef.current.focus()
        nextRef.current.select()
      } else {
        focusFirstMissingField()
      }
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
    <div className="bg-[#fdfbf7] border-2 border-amber-300/90 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3 mb-4 transition-all">
      {/* ── EN-TÊTE CHALEUREUX DU CAHIER ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-200/90 text-amber-950 border border-amber-300 shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-800" strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-handwritten font-black text-sm sm:text-base text-amber-950 leading-tight">
              Ligne de Saisie Magique du Cahier
            </h4>
            <p className="text-[11px] text-amber-900/80 font-mono">
              Tapez un nom, parlez au micro ou scannez un code : la table s'adapte instantanément
            </p>
          </div>
        </div>

        {justAddedName && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-mono font-bold animate-in fade-in slide-in-from-right-3 duration-200">
            <Check className="w-3.5 h-3.5 text-emerald-700" strokeWidth={2.5} />
            <span>✓ « {justAddedName} » inscrit au stock !</span>
          </div>
        )}
      </div>

      {/* ── BARRE DE SAISIE INITIALE MULTI-MODALE (TEXTE + VOCAL + SCANNER) ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value)
              setOverrides({})
            }}
            onKeyDown={handleMainInputKeyDown}
            disabled={disabled || isSubmitting}
            placeholder="Tapez un nom (ex: Savon BF), parlez au micro ou formule rapide (10 ctn bf 20k 500)..."
            className="w-full pl-3.5 pr-20 py-2.5 bg-white border-2 border-amber-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-amber-900/40 font-mono font-bold focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-400/40 shadow-inner transition-all"
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {inputText && (
              <button
                type="button"
                onClick={() => {
                  setInputText('')
                  setOverrides({})
                  setIsPackagingCarton(false)
                  setSupplierName('')
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg active:scale-95 transition-all cursor-pointer"
                title="Effacer (Échap)"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}

            {/* Micro Vocal */}
            <VoiceInputButton
              onTranscript={(transcript) => {
                setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript))
              }}
              disabled={disabled || isSubmitting}
            />
          </div>
        </div>

        {/* Bouton Scanner Code-barres Caméra */}
        {onOpenBarcodeScanner && (
          <button
            type="button"
            onClick={onOpenBarcodeScanner}
            disabled={disabled || isSubmitting}
            className="p-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs active:scale-95 transition-all cursor-pointer flex-shrink-0"
            title="Scanner le code-barres d'un carton ou d'un produit"
          >
            <ScanBarcode className="w-4 h-4 text-amber-800" strokeWidth={2} />
          </button>
        )}

        {/* Bouton Valider / Remplir */}
        <button
          type="button"
          onClick={isReadyToSave ? handleConfirm : focusFirstMissingField}
          disabled={!activeData.name.trim() || isSubmitting || disabled}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-white font-mono text-xs font-black flex items-center gap-1.5 shadow-xs active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 ${
            isReadyToSave
              ? 'bg-emerald-800 hover:bg-emerald-900'
              : 'bg-amber-900 hover:bg-amber-950'
          }`}
          title="Valider ou aller au champ suivant (Entrée)"
        >
          {isSubmitting ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isReadyToSave ? (
            <>
              <span>Valider</span>
              <Check className="w-3.5 h-3.5 text-emerald-200" strokeWidth={3} />
            </>
          ) : (
            <>
              <span>Remplir</span>
              <CornerDownLeft className="w-3.5 h-3.5 text-amber-200 hidden sm:inline" strokeWidth={2.5} />
            </>
          )}
        </button>
      </div>

      {/* ── SUGGESTIONS DE PRODUITS HABITUELS (AUTO-COMPLÉTION DU BOUT DU DOIGT) ── */}
      {quickSuggestions.length > 0 && !matchingExistingProduct && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
          <span className="text-amber-900/70 font-semibold flex items-center gap-1">
            <History className="w-3 h-3" />
            <span>Déjà en boutique :</span>
          </span>
          {quickSuggestions.map((prod) => (
            <button
              key={prod.id}
              type="button"
              onClick={() => {
                audioFeedback.playTick()
                setInputText(prod.name)
                if (prod.multiplier && prod.multiplier > 1) {
                  setIsPackagingCarton(true)
                }
              }}
              className="px-2 py-0.5 bg-amber-100/80 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg cursor-pointer transition-colors active:scale-95"
            >
              + {prod.name}{' '}
              <span className="text-amber-700 font-bold">({formatPrice(prod.unit_price)})</span>
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── LA TABLE DU GRAND LIVRE COMPTABLE QUI SE DÉPLIE AUTOMATIQUEMENT ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isTableUnfolded && (
        <div className="bg-white border-2 border-amber-300/80 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Bandeau d'état et raccourci mode complet */}
          <div className="bg-amber-100/50 px-3 py-1.5 border-b border-amber-200 flex items-center justify-between text-[11px] font-mono text-amber-950">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-extrabold uppercase tracking-wide">
                Table Dépliée • Renseignez ou ajustez les cases
              </span>
              {matchingExistingProduct && (
                <span className="hidden sm:inline px-1.5 py-0.2 bg-emerald-200/70 text-emerald-950 rounded text-[10px] font-bold">
                  Produit connu (prix habituels appliqués)
                </span>
              )}
            </div>

            {onOpenAdvancedModalWithData && (
              <button
                type="button"
                onClick={handleOpenDetailed}
                className="text-amber-900 hover:text-amber-950 underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Fiche détaillée</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* TABLEAU RESPONSIVE (GRILLE SEYÈS DE HAUTE PRÉCISION) */}
          <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs font-mono">
            {/* 1. COLONNE : NOM DU PRODUIT */}
            <div className="md:col-span-3 p-2 bg-amber-50/40 border border-amber-200/80 rounded-xl space-y-1">
              <label className="text-[10px] text-amber-900 font-extrabold uppercase flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-700" />
                <span>1. Nom du produit</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={activeData.name}
                onChange={(e) => setOverrides((prev) => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => handleCellKeyDown(e, qtyInputRef)}
                placeholder="Ex: Savon BF"
                className="w-full font-bold text-xs text-amber-950 bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 focus:border-amber-600 focus:ring-1 focus:ring-amber-400 outline-none"
              />
              <div className="text-[10px] text-gray-500 truncate">
                Catégorie : <span className="text-amber-900 font-semibold">{activeData.category}</span>
              </div>
            </div>

            {/* 2. COLONNE : CONDITIONNEMENT & QUANTITÉ */}
            <div className="md:col-span-3 p-2 bg-blue-50/40 border border-blue-200/80 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-blue-900 font-extrabold uppercase flex items-center gap-1">
                  <Package className="w-3 h-3 text-blue-700" />
                  <span>2. Format & Qté</span>
                </label>

                {/* Sélecteur Unité vs Carton */}
                <button
                  type="button"
                  onClick={() => {
                    audioFeedback.playTick()
                    setIsPackagingCarton((prev) => !prev)
                    setOverrides((prev) => ({
                      ...prev,
                      multiplier: !isPackagingCarton ? 24 : 1,
                      packages_count: 1,
                      initial_stock: !isPackagingCarton ? 24 : 1,
                    }))
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-950 font-bold cursor-pointer transition-colors"
                >
                  {isPackagingCarton ? 'Mode: Carton' : 'Mode: Unité'}
                </button>
              </div>

              {/* Stepper + Input */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    audioFeedback.playTick()
                    if (isPackagingCarton) {
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
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-200 hover:bg-blue-300 text-blue-950 font-black cursor-pointer shadow-2xs active:scale-95 transition-transform"
                  title="Diminuer"
                >
                  <Minus className="w-3 h-3" strokeWidth={3} />
                </button>

                <input
                  ref={qtyInputRef}
                  type="number"
                  value={
                    isPackagingCarton
                      ? activeData.packages_count || ''
                      : activeData.initial_stock || ''
                  }
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    if (isPackagingCarton) {
                      setOverrides((prev) => ({
                        ...prev,
                        packages_count: val,
                        initial_stock: val * activeData.multiplier,
                      }))
                    } else {
                      setOverrides((prev) => ({ ...prev, initial_stock: val }))
                    }
                  }}
                  onKeyDown={(e) => handleCellKeyDown(e, costInputRef)}
                  placeholder="Qté"
                  className="w-14 text-center font-black text-xs text-blue-950 bg-white border border-blue-300 rounded-lg py-1.5 focus:border-blue-600 outline-none tabular-nums"
                />

                <button
                  type="button"
                  onClick={() => {
                    audioFeedback.playTick()
                    if (isPackagingCarton) {
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
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-200 hover:bg-blue-300 text-blue-950 font-black cursor-pointer shadow-2xs active:scale-95 transition-transform"
                  title="Augmenter"
                >
                  <Plus className="w-3 h-3" strokeWidth={3} />
                </button>

                <div className="text-[11px] font-bold text-blue-950 tabular-nums pl-1 truncate">
                  {isPackagingCarton ? (
                    <span>
                      {activeData.packages_count || 1} ctn ={' '}
                      <span className="text-blue-700 font-extrabold">{activeData.initial_stock} pcs</span>
                    </span>
                  ) : (
                    <span>{activeData.unit}</span>
                  )}
                </div>
              </div>

              {/* Si carton : réglage contenance en pièces */}
              {isPackagingCarton && (
                <div className="flex items-center gap-1 text-[10px] text-blue-900/80">
                  <span>1 carton =</span>
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
                    className="w-9 text-center font-bold bg-white border border-blue-300 rounded px-1 py-0.5 outline-none text-blue-950 tabular-nums"
                  />
                  <span>pièces</span>
                </div>
              )}
            </div>

            {/* 3. COLONNE : COÛT D'ACHAT */}
            <div
              className={`md:col-span-3 p-2 rounded-xl space-y-1 transition-all ${
                activeData.unit_cost === 0
                  ? 'bg-rose-50 border-2 border-rose-300/90 ring-2 ring-rose-200/50'
                  : 'bg-rose-50/40 border border-rose-200/80'
              }`}
            >
              <label className="text-[10px] text-rose-900 font-extrabold uppercase flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3 text-rose-700" />
                  <span>3. Coût d'Achat</span>
                </span>
                {activeData.unit_cost === 0 && (
                  <span className="text-[9px] text-rose-700 font-bold bg-rose-100 px-1 rounded">
                    À renseigner
                  </span>
                )}
              </label>

              <div className="flex items-center gap-1">
                <input
                  ref={costInputRef}
                  type="number"
                  value={
                    (isPackagingCarton
                      ? activeData.package_cost
                      : activeData.unit_cost) || ''
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    if (isPackagingCarton) {
                      setOverrides((prev) => ({
                        ...prev,
                        package_cost: val,
                        unit_cost: Math.round(val / activeData.multiplier),
                      }))
                    } else {
                      setOverrides((prev) => ({ ...prev, unit_cost: val }))
                    }
                  }}
                  onKeyDown={(e) => handleCellKeyDown(e, priceInputRef)}
                  placeholder="Ex: 20000"
                  className="w-full font-black text-xs text-rose-950 bg-white border border-rose-300 rounded-lg px-2 py-1.5 focus:border-rose-600 focus:ring-1 focus:ring-rose-400 outline-none tabular-nums"
                />
                <span className="text-xs font-black text-rose-900">F</span>
              </div>

              <div className="text-[10px] text-rose-700 font-bold tabular-nums truncate">
                {isPackagingCarton ? (
                  <span>Soit {formatPrice(activeData.unit_cost)} / pc</span>
                ) : (
                  <span>Prix payé au fournisseur</span>
                )}
              </div>
            </div>

            {/* 4. COLONNE : PRIX DE VENTE DÉTAIL */}
            <div
              className={`md:col-span-3 p-2 rounded-xl space-y-1 transition-all ${
                activeData.unit_price === 0
                  ? 'bg-emerald-50 border-2 border-emerald-400 ring-2 ring-emerald-200/50'
                  : 'bg-emerald-50/40 border border-emerald-300/80'
              }`}
            >
              <label className="text-[10px] text-emerald-900 font-extrabold uppercase flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-700" />
                  <span>4. Prix de Vente</span>
                </span>
                {activeData.unit_price === 0 && (
                  <span className="text-[9px] text-emerald-800 font-bold bg-emerald-100 px-1 rounded animate-pulse">
                    Obligatoire
                  </span>
                )}
              </label>

              <div className="flex items-center gap-1">
                <input
                  ref={priceInputRef}
                  type="number"
                  value={activeData.unit_price || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    setOverrides((prev) => ({ ...prev, unit_price: val }))
                  }}
                  onKeyDown={(e) => handleCellKeyDown(e)}
                  placeholder="Ex: 500"
                  className="w-full font-black text-xs text-emerald-950 bg-white border border-emerald-400 rounded-lg px-2 py-1.5 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-400 outline-none tabular-nums"
                />
                <span className="text-xs font-black text-emerald-900">F</span>
              </div>

              {/* Marge unitaire en direct */}
              <div className="text-[10px] font-bold tabular-nums truncate">
                {profitMetrics ? (
                  <span
                    className={
                      profitMetrics.marginUnit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }
                  >
                    Bénéfice : {profitMetrics.marginUnit >= 0 ? '+' : ''}
                    {formatPrice(profitMetrics.marginUnit)} ({profitMetrics.marginPercent}%)
                  </span>
                ) : (
                  <span className="text-gray-400">Prix client (1 pièce)</span>
                )}
              </div>
            </div>
          </div>

          {/* ── BARRE PALIERS GROS & LOTS DÉGRESSIFS ── */}
          {(isPackagingCarton || activeData.lot_quantity > 0) && (
            <div className="bg-amber-50/50 border-t border-amber-200 px-3 py-2 flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="text-[10px] text-amber-900 font-extrabold uppercase flex items-center gap-1">
                <Layers className="w-3 h-3 text-amber-700" />
                <span>Paliers & Gros :</span>
              </span>

              {isPackagingCarton && (
                <>
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-300">
                    <span className="text-[10px] text-indigo-700 font-bold">1/2 ctn :</span>
                    <input
                      type="number"
                      value={activeData.half_package_price || ''}
                      onChange={(e) =>
                        setOverrides((prev) => ({
                          ...prev,
                          half_package_price: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-14 text-center font-bold text-xs text-indigo-950 outline-none tabular-nums"
                    />
                    <span className="text-[10px] text-gray-400">F</span>
                  </div>

                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-300">
                    <span className="text-[10px] text-purple-700 font-bold">Carton :</span>
                    <input
                      type="number"
                      value={activeData.wholesale_price || ''}
                      onChange={(e) =>
                        setOverrides((prev) => ({
                          ...prev,
                          wholesale_price: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-16 text-center font-bold text-xs text-purple-950 outline-none tabular-nums"
                    />
                    <span className="text-[10px] text-gray-400">F</span>
                  </div>
                </>
              )}

              {/* Lot dégressif (ex: lot de 3 à 1400F) */}
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-emerald-300">
                <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-0.5">
                  <span>Lot</span>
                  <input
                    type="number"
                    value={activeData.lot_quantity || ''}
                    placeholder="3"
                    onChange={(e) =>
                      setOverrides((prev) => ({
                        ...prev,
                        lot_quantity: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-7 text-center font-bold text-xs text-emerald-950 outline-none tabular-nums bg-emerald-50 rounded"
                  />
                  <span>:</span>
                </span>
                <input
                  type="number"
                  value={activeData.lot_price || ''}
                  placeholder="Prix"
                  onChange={(e) =>
                    setOverrides((prev) => ({
                      ...prev,
                      lot_price: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-14 text-center font-bold text-xs text-emerald-950 outline-none tabular-nums"
                />
                <span className="text-[10px] text-gray-400">F</span>
              </div>
            </div>
          )}

          {/* ── MODULE DE LIAISON TRÉSORERIE & CAISSE (SI COÛT D'ACHAT DÉTECTÉ) ── */}
          {totalBatchCost > 0 && (
            <div className="bg-amber-100/50 border-t border-amber-200 p-2.5 space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] text-amber-950 font-extrabold uppercase flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-amber-800" />
                  <span>Règlement de l'approvisionnement ({formatPrice(totalBatchCost)}) :</span>
                </span>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Option 1: Débiter la Caisse Cash */}
                  <button
                    type="button"
                    onClick={() => {
                      audioFeedback.playTick()
                      setFinancialImpactType('cash_expense')
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                      financialImpactType === 'cash_expense'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-white text-emerald-950 border border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Débiter Caisse (-{formatPrice(totalBatchCost)})</span>
                  </button>

                  {/* Option 2: Crédit Fournisseur */}
                  <button
                    type="button"
                    onClick={() => {
                      audioFeedback.playTick()
                      setFinancialImpactType('supplier_credit')
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                      financialImpactType === 'supplier_credit'
                        ? 'bg-purple-800 text-white shadow-xs'
                        : 'bg-white text-purple-950 border border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Dette Fournisseur</span>
                  </button>

                  {/* Option 3: Sans impact */}
                  <button
                    type="button"
                    onClick={() => {
                      audioFeedback.playTick()
                      setFinancialImpactType('none')
                    }}
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-all active:scale-95 ${
                      financialImpactType === 'none'
                        ? 'bg-gray-700 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                    }`}
                    title="Simple ajustement d'inventaire sans toucher à la caisse"
                  >
                    <span>Sans impact caisse</span>
                  </button>
                </div>
              </div>

              {/* Si dette fournisseur : champ nom du grossiste */}
              {financialImpactType === 'supplier_credit' && (
                <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
                  <span className="text-[11px] text-purple-900 font-bold whitespace-nowrap">Nom du grossiste :</span>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Ex: SODIBE, Maman Chantal, Brasserie..."
                    className="flex-grow px-2.5 py-1 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-950 outline-none focus:border-purple-600"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── BARRE INFÉRIEURE : BÉNÉFICE TOTAL & BOUTON D'ENREGISTREMENT ── */}
          <div className="bg-amber-50/70 border-t border-amber-200 p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono">
            <div className="text-[11px] text-amber-900 font-sans">
              {profitMetrics ? (
                <span>
                  Bénéfice total attendu sur ce lot :{' '}
                  <strong className="text-emerald-800 font-mono font-black">
                    +{formatPrice(profitMetrics.totalExpectedProfit)}
                  </strong>
                </span>
              ) : (
                <span>Prêt à être inscrit sur les lignes de votre cahier</span>
              )}
            </div>

            {/* Bouton de validation final */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!activeData.name.trim() || isSubmitting || disabled}
              className={`py-2 px-5 rounded-xl text-white font-mono font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-100 ease-out shadow-xs active:scale-[0.98] ${
                isReadyToSave
                  ? 'bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-900 hover:to-black shadow-emerald-900/20'
                  : 'bg-amber-900 hover:bg-amber-950 opacity-90'
              }`}
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" strokeWidth={2.5} />
                  <span>
                    {isReadyToSave
                      ? `Inscrire « ${activeData.name} » (Entrée ↵)`
                      : `Compléter « ${activeData.name || 'le produit'} »`}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Alerte si le produit existe déjà en stock (réapprovisionnement) */}
          {matchingExistingProduct && (
            <div className="p-2.5 bg-amber-50 border-t border-amber-200 text-amber-950 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div className="space-y-0.5 font-sans">
                <p className="font-extrabold text-amber-950">
                  Produit déjà enregistré en boutique : « {matchingExistingProduct.name} »
                </p>
                <p className="text-[11px] text-amber-900">
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
                  et le prix de vente sera mis à jour.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
