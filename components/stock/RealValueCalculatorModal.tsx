'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  X,
  Sparkles,
  Package,
  Coins,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react'
import {
  calculateInfallibleValuation,
  generateInfalliblePriceTiers,
  InfallibleTier,
} from '@/lib/stock/infallibleValuation'
import { formatPrice } from '@/lib/penUtils'
import { audioFeedback } from '@/lib/audioFeedback'
import { StockItem } from './types'

export interface RealValueCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  product?: StockItem | null
  onSaveProduct?: (updated: {
    multiplier: number
    unit_cost: number
    unit_price: number
    current_stock: number
    wholesale_price?: number
    half_package_price?: number
    quarter_package_price?: number
    lot_quantity?: number
    lot_price?: number
  }) => Promise<void> | void
}

export function RealValueCalculatorModal({
  isOpen,
  onClose,
  product,
  onSaveProduct,
}: RealValueCalculatorModalProps) {
  // ── 4 Données Physiques du Commerçant ─────────────────────────────────────
  const [cartonCostInput, setCartonCostInput] = useState<string>('')
  const [multiplierInput, setMultiplierInput] = useState<string>('24')
  const [unitSalePriceInput, setUnitSalePriceInput] = useState<string>('')
  const [currentStockInput, setCurrentStockInput] = useState<string>('0')

  // Paliers personnalisés par l'utilisateur
  const [customTierPrices, setCustomTierPrices] = useState<Record<string, number>>({})
  const [showTiersAccordion, setShowTiersAccordion] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Pré-remplissage dès l'ouverture avec le produit sélectionné
  useEffect(() => {
    if (!isOpen) return

    const initialMult = product?.multiplier && product.multiplier > 1 ? product.multiplier : 24
    const initialUnitCost = product?.unit_cost || 0
    const initialSalePrice = product?.unit_price || 0
    const initialStock = product?.current_stock ?? 0
    const initialCartonCost = product?.wholesale_price || (initialUnitCost > 0 ? initialUnitCost * initialMult : '')

    setMultiplierInput(String(initialMult))
    setUnitSalePriceInput(initialSalePrice > 0 ? String(initialSalePrice) : '')
    setCurrentStockInput(String(initialStock))
    setCartonCostInput(initialCartonCost ? String(initialCartonCost) : '')

    // Paliers existants
    const existing: Record<string, number> = {}
    if (product?.wholesale_price) existing.carton = product.wholesale_price
    if (product?.half_package_price) existing.half = product.half_package_price
    if (product?.quarter_package_price) existing.quarter = product.quarter_package_price
    if (product?.lot_price) existing.lot3 = product.lot_price
    setCustomTierPrices(existing)
  }, [isOpen, product])

  // Conversion en nombres sécurisés
  const cartonCost = parseFloat(cartonCostInput) || 0
  const multiplier = Math.max(1, parseInt(multiplierInput) || 1)
  const unitSalePrice = parseFloat(unitSalePriceInput) || 0
  const currentStock = Math.max(0, parseFloat(currentStockInput) || 0)

  // ── Calculs Infaillibles ──────────────────────────────────────────────────
  const valuation = useMemo(() => {
    return calculateInfallibleValuation(cartonCost, multiplier, unitSalePrice, currentStock)
  }, [cartonCost, multiplier, unitSalePrice, currentStock])

  const autoTiers = useMemo(() => {
    return generateInfalliblePriceTiers(cartonCost, multiplier, unitSalePrice)
  }, [cartonCost, multiplier, unitSalePrice])

  // Paliers fusionnés avec les surcharges de l'utilisateur
  const activeTiers: InfallibleTier[] = useMemo(() => {
    return autoTiers.map(tier => {
      const customPrice = customTierPrices[tier.id]
      if (customPrice && customPrice > 0) {
        const profit = customPrice - tier.realCost
        const unitEq = Math.round(customPrice / tier.pieces)
        return {
          ...tier,
          suggestedPrice: customPrice,
          netProfit: profit,
          marginPercent: customPrice > 0 ? Math.round((profit / customPrice) * 100) : 0,
          unitEquivalentPrice: unitEq,
          isLoss: customPrice < tier.realCost,
          isInconsistent: unitEq > unitSalePrice,
        }
      }
      return tier
    })
  }, [autoTiers, customTierPrices, unitSalePrice])

  if (!isOpen) return null

  const handleTierPriceChange = (tierId: string, val: string) => {
    const num = parseFloat(val) || 0
    setCustomTierPrices(prev => ({
      ...prev,
      [tierId]: num,
    }))
  }

  const handleApplyQuickMultiplier = (m: number) => {
    audioFeedback.playTick()
    setMultiplierInput(String(m))
  }

  const handleSave = async () => {
    audioFeedback.playInkStamp()
    setIsSubmitting(true)
    try {
      if (onSaveProduct) {
        const cartonTier = activeTiers.find(t => t.id === 'carton')
        const halfTier = activeTiers.find(t => t.id === 'half')
        const quarterTier = activeTiers.find(t => t.id === 'quarter')
        const lot3Tier = activeTiers.find(t => t.id === 'lot3')

        await onSaveProduct({
          multiplier,
          unit_cost: valuation.unitCost,
          unit_price: unitSalePrice,
          current_stock: currentStock,
          wholesale_price: cartonTier?.suggestedPrice,
          half_package_price: halfTier?.suggestedPrice,
          quarter_package_price: quarterTier?.suggestedPrice,
          lot_quantity: lot3Tier ? 3 : undefined,
          lot_price: lot3Tier?.suggestedPrice,
        })
      }
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full sm:max-w-2xl bg-[#fefcf8] border-t sm:border border-amber-300/80 rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        style={{
          boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.9), 0 20px 40px -10px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* ── EN-TÊTE FIGMA-GRADE ────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-amber-200/80 bg-gradient-to-r from-amber-100/70 via-amber-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-200/80 border border-amber-300 flex items-center justify-center text-amber-900 shadow-2xs">
              <Sparkles className="w-4 h-4 text-amber-800" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-amber-950 font-handwritten tracking-wide flex items-center gap-1.5">
                <span>Calculateur de Valeur Réelle & Tarification</span>
              </h3>
              <p className="text-[10px] text-amber-800 font-medium">
                {product?.name ? `Pour : ${product.name}` : 'Calculatrice de rentabilité et marges infaillibles'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audioFeedback.playTick()
              onClose()
            }}
            className="w-8 h-8 rounded-full bg-amber-200/50 hover:bg-amber-200 text-amber-900 flex items-center justify-center transition-all active:scale-[0.97]"
            title="Fermer"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* ── CONTENU DÉFILANT ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* 1. LES 4 CHIFFRES PHYSIQUES DU COMMERÇANT */}
          <div className="bg-amber-100/40 border border-amber-300/80 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-800" strokeWidth={2} />
                <span>Les 4 Chiffres Clés du Marché</span>
              </span>
              <span className="text-[10px] font-mono text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full font-bold">
                Arrondis stricts FCFA
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Case 1 : Prix d'achat carton */}
              <div className="p-2.5 bg-white border border-amber-200 rounded-xl space-y-1">
                <label className="text-[10px] font-extrabold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                  <span>1. Prix Achat Carton</span>
                  <span className="text-amber-800 font-normal">Fournisseur</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={cartonCostInput}
                    onChange={(e) => setCartonCostInput(e.target.value)}
                    placeholder="Ex: 20000"
                    className="w-full pr-12 pl-3 py-1.5 bg-amber-50/40 border border-amber-300 rounded-lg text-sm font-mono font-extrabold text-amber-950 tabular-nums focus:outline-none focus:border-amber-500 shadow-inner"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-400">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Case 2 : Contenance du carton */}
              <div className="p-2.5 bg-white border border-amber-200 rounded-xl space-y-1">
                <label className="text-[10px] font-extrabold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                  <span>2. Pièces par Carton</span>
                  <span className="text-amber-800 font-normal">Contenance</span>
                </label>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="number"
                    min="1"
                    value={multiplierInput}
                    onChange={(e) => setMultiplierInput(e.target.value)}
                    placeholder="Ex: 24, 48, 50"
                    className="w-20 px-2.5 py-1.5 bg-amber-50/40 border border-amber-300 rounded-lg text-sm font-mono font-extrabold text-amber-950 tabular-nums focus:outline-none focus:border-amber-500 shadow-inner text-center"
                  />
                  {/* Raccourcis rapides */}
                  <div className="flex gap-1 flex-1 overflow-x-auto scrollbar-none">
                    {[12, 24, 48, 50, 100].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleApplyQuickMultiplier(num)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-extrabold border transition-all active:scale-[0.97] ${
                          multiplier === num
                            ? 'bg-amber-900 text-white border-amber-900 shadow-2xs'
                            : 'bg-amber-50/70 border-amber-200 text-amber-950 hover:bg-amber-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Case 3 : Prix de vente détail */}
              <div className="p-2.5 bg-white border border-amber-200 rounded-xl space-y-1">
                <label className="text-[10px] font-extrabold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                  <span>3. Prix Vente Détail (1 pc)</span>
                  <span className="text-emerald-700 font-normal">Au comptoir</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="25"
                    value={unitSalePriceInput}
                    onChange={(e) => setUnitSalePriceInput(e.target.value)}
                    placeholder="Ex: 500"
                    className="w-full pr-12 pl-3 py-1.5 bg-amber-50/40 border border-amber-300 rounded-lg text-sm font-mono font-extrabold text-amber-950 tabular-nums focus:outline-none focus:border-amber-500 shadow-inner"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-400">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Case 4 : Reste en rayon */}
              <div className="p-2.5 bg-white border border-amber-200 rounded-xl space-y-1">
                <label className="text-[10px] font-extrabold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                  <span>4. Reste en Rayon</span>
                  <span className="text-indigo-700 font-normal">Stock actuel</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={currentStockInput}
                    onChange={(e) => setCurrentStockInput(e.target.value)}
                    placeholder="Ex: 2 ou 52"
                    className="w-full pr-14 pl-3 py-1.5 bg-amber-50/40 border border-amber-300 rounded-lg text-sm font-mono font-extrabold text-amber-950 tabular-nums focus:outline-none focus:border-amber-500 shadow-inner"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-400">
                    pièces
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. LE TABLEAU DE BORD DE VÉRITÉ IMMÉDIATE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* KPI 1 : Coût unitaire net */}
            <div className="p-3 bg-white border border-amber-200/90 rounded-2xl shadow-2xs space-y-0.5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Coût de Revient
              </div>
              <div className="text-base font-mono font-extrabold text-amber-950 tabular-nums">
                {formatPrice(valuation.unitCost)}
              </div>
              <div className="text-[9px] font-medium text-amber-800">
                par pièce
              </div>
            </div>

            {/* KPI 2 : Marge unitaire */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-2xs space-y-0.5">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Marge Nette
              </div>
              <div className="text-base font-mono font-extrabold text-emerald-700 tabular-nums">
                +{formatPrice(valuation.unitMargin)}
              </div>
              <div className="text-[9px] font-bold text-emerald-800 font-mono">
                {valuation.unitMarginPercent > 0 ? `+${valuation.unitMarginPercent}% de marge` : '0%'}
              </div>
            </div>

            {/* KPI 3 : Bénéfice par carton */}
            <div className="p-3 bg-amber-950 text-amber-100 border border-amber-950 rounded-2xl shadow-xs space-y-0.5">
              <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                Bénéfice / Carton
              </div>
              <div className="text-base font-mono font-black text-white tabular-nums">
                +{formatPrice(valuation.cartonNetProfitDetail)}
              </div>
              <div className="text-[9px] font-bold text-amber-300">
                si vendu au détail
              </div>
            </div>

            {/* KPI 4 : Valeur d'achat immobilisée */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl shadow-2xs space-y-0.5">
              <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                Valeur en Rayon
              </div>
              <div className="text-base font-mono font-extrabold text-indigo-900 tabular-nums">
                {formatPrice(valuation.immobilizedPurchaseValue)}
              </div>
              <div className="text-[9px] font-bold text-indigo-700 font-mono">
                {valuation.fullCartons > 0 ? `${valuation.fullCartons} ctn + ${valuation.loosePieces} pcs` : `${valuation.loosePieces} pcs`}
              </div>
            </div>
          </div>

          {/* Alertes d'incohérence si prix inférieur au coût */}
          {unitSalePrice > 0 && unitSalePrice < valuation.unitCost && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-2xl flex items-center gap-2 text-xs font-bold text-red-700 shadow-2xs">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>
                Attention : Tu vends à perte ! Ton prix de vente ({formatPrice(unitSalePrice)}) est inférieur au coût d'achat ({formatPrice(valuation.unitCost)}).
              </span>
            </div>
          )}

          {/* 3. GRILLE COMPLÈTE DES 6 PALIERS TACTILES */}
          <div className="border border-amber-300/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => {
                audioFeedback.playTick()
                setShowTiersAccordion(!showTiersAccordion)
              }}
              className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-100/60 to-amber-50 text-left border-b border-amber-200/80 hover:bg-amber-100/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-800" strokeWidth={2} />
                <span className="text-xs sm:text-sm font-black text-amber-950">
                  Grille des Paliers Dégressifs Infaillibles (6 Paliers)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-900 font-bold">
                <span>{showTiersAccordion ? 'Masquer' : 'Voir les Paliers'}</span>
                {showTiersAccordion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showTiersAccordion && (
              <div className="p-3.5 space-y-2.5">
                <p className="text-[11px] text-gray-500">
                  Les prix sont calculés automatiquement avec une marge garantie. Tu peux modifier n'importe quel prix en tapant directement dessus :
                </p>

                <div className="space-y-2">
                  {activeTiers.map((tier) => (
                    <div
                      key={tier.id}
                      className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                        tier.isLoss
                          ? 'bg-red-50 border-red-300 text-red-900'
                          : tier.id === 'carton'
                          ? 'bg-amber-50/80 border-amber-300'
                          : 'bg-white border-amber-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-[10px] font-bold text-amber-950 font-mono">
                          {tier.pieces}
                        </div>
                        <div>
                          <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                            <span>{tier.label}</span>
                            {tier.isLoss && (
                              <span className="px-1.5 py-0.2 bg-red-200 text-red-800 text-[9px] font-bold rounded">
                                À perte
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            Coût d'achat réel : {formatPrice(tier.realCost)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-right">
                          <div className="text-[10px] font-mono font-bold text-emerald-700">
                            +{formatPrice(tier.netProfit)} ({tier.marginPercent}%)
                          </div>
                          <div className="text-[9px] text-gray-400 font-mono">
                            ~{formatPrice(tier.unitEquivalentPrice)}/pc
                          </div>
                        </div>

                        <div className="relative w-28">
                          <input
                            type="number"
                            step="25"
                            value={tier.suggestedPrice || ''}
                            onChange={(e) => handleTierPriceChange(tier.id, e.target.value)}
                            className="w-full pl-2 pr-7 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-black text-amber-950 tabular-nums focus:outline-none focus:border-amber-500 shadow-inner text-right"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-gray-400">
                            F
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PIED DE PAGE : BOUTONS D'ACTION ──────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-amber-200/80 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-amber-100/70 hover:bg-amber-200 text-amber-950 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || unitSalePrice <= 0}
            className="flex-1 max-w-xs flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white rounded-xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.25), 0 4px 12px -2px rgba(180, 83, 9, 0.4)',
            }}
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            <span>Enregistrer la Tarification</span>
          </button>
        </div>
      </div>
    </div>
  )
}
