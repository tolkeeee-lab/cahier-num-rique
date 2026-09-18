'use client'

import React from 'react'
import { Package, Sparkles, TrendingUp } from 'lucide-react'
import { StockFormState, TradeType } from '../types'
import { formatPrice } from '../stockUtils'

interface PricingSectionProps {
  tradeType: TradeType
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
  cartonPrice: string
  setCartonPrice: (val: string) => void
  cartonCost: string
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  tradeType,
  formData,
  setFormData,
  cartonPrice,
  setCartonPrice,
  cartonCost,
}) => {
  const mult = formData.multiplier && formData.multiplier > 1 ? formData.multiplier : 1
  const hasPackaging = mult > 1 || tradeType === 'wholesale'

  // Suggestion automatique des tarifs dégressifs réalistes
  const handleAutoSuggestTiers = () => {
    const unitPrice = formData.unit_price || 0
    if (unitPrice <= 0) return

    // 1. Carton entier : ~15% de remise
    const rawCarton = unitPrice * mult * 0.85
    const suggestedCarton = Math.max(unitPrice, Math.round(rawCarton / 100) * 100)

    // 2. Demi-carton : ~10% de remise
    const rawHalf = unitPrice * (mult / 2) * 0.90
    const suggestedHalf = Math.max(unitPrice, Math.round(rawHalf / 50) * 50)

    // 3. Quart de carton : ~5% de remise
    const rawQuarter = unitPrice * (mult / 4) * 0.95
    const suggestedQuarter = Math.max(unitPrice, Math.round(rawQuarter / 25) * 25)

    // 4. Lot dégressif (3 pièces)
    const suggestedLot = Math.round(unitPrice * 3 * 0.93 / 25) * 25

    setFormData(prev => ({
      ...prev,
      wholesale_price: suggestedCarton,
      half_package_price: mult >= 2 ? suggestedHalf : 0,
      quarter_package_price: mult >= 4 ? suggestedQuarter : 0,
      lot_quantity: 3,
      lot_price: suggestedLot,
    }))
    setCartonPrice(String(suggestedCarton))
  }

  // Calcul des bénéfices simulés par carton vendu selon le mode
  const costPerCarton = parseFloat(cartonCost) > 0 
    ? parseFloat(cartonCost) 
    : (formData.unit_cost > 0 ? formData.unit_cost * mult : 0)

  const revenueDetail = formData.unit_price * mult
  const revenueQuarter = (formData.quarter_package_price || 0) * 4
  const revenueHalf = (formData.half_package_price || 0) * 2
  const revenueCarton = formData.wholesale_price || parseFloat(cartonPrice) || 0

  return (
    <div className="p-3.5 bg-white border border-amber-300/90 rounded-2xl space-y-3.5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-amber-200 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs sm:text-sm">
          <Package className="w-4 h-4 text-amber-800" strokeWidth={1.75} />
          <span>2. Prix de Vente & Marges :</span>
        </div>

        {hasPackaging && formData.unit_price > 0 && (
          <button
            type="button"
            onClick={handleAutoSuggestTiers}
            className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-extrabold text-[10px] rounded-lg border border-amber-400 shadow-2xs flex items-center gap-1 cursor-pointer transition-transform duration-100 ease-out active:scale-[0.97]"
            title="Calculer automatiquement des remises de gros réalistes pour le quart, le demi et le carton"
          >
            <Sparkles className="w-3 h-3 text-amber-950" />
            <span>Suggérer tarifs 1/4, 1/2, Carton</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Prix d'Achat Unitaire (si Détaillant) */}
        {tradeType === 'retail' && (
          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
            <label className="block text-amber-950 font-extrabold uppercase text-[10px]">
              Prix d'Achat Unitaire (F) :
            </label>
            <input
              type="number"
              value={formData.unit_cost === 0 ? '' : (formData.unit_cost || '')}
              onChange={(e) => {
                const val = e.target.value
                setFormData((prev) => ({ ...prev, unit_cost: val === '' ? 0 : (parseFloat(val) || 0) }))
              }}
              placeholder="ex: 400 (optionnel)"
              className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-black text-xs"
            />
          </div>
        )}

        {/* Prix de Vente Détail (À l'unité) */}
        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
          <label className="block text-amber-950 font-extrabold uppercase text-[10px]">
            Prix de Vente Détail (À l'unité) :
          </label>
          <input
            type="number"
            value={formData.unit_price === 0 ? '' : (formData.unit_price || '')}
            onChange={(e) => {
              const val = e.target.value
              const price = val === '' ? 0 : (parseFloat(val) || 0)
              setFormData((prev) => ({ ...prev, unit_price: price }))
            }}
            placeholder="ex: 500 FCFA"
            className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-black text-xs"
          />
          {formData.unit_price > 0 && formData.unit_cost > 0 && (
            <div className="text-[10px] text-emerald-800 font-bold flex items-center justify-between font-mono">
              <span>Marge brute détail :</span>
              <span className="font-extrabold tabular-nums tracking-tight">+{formData.unit_price - formData.unit_cost} F (+{Math.round(((formData.unit_price - formData.unit_cost) / formData.unit_cost) * 100)}%)</span>
            </div>
          )}
        </div>

        {/* Prix de Vente Carton complet */}
        {(tradeType === 'wholesale' || mult > 1) && (
          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
            <label className="block text-amber-950 font-extrabold uppercase text-[10px]">
              Prix Vente Carton Entier (Gros) :
            </label>
            <input
              type="number"
              value={formData.wholesale_price ? formData.wholesale_price : cartonPrice}
              onChange={(e) => {
                const val = e.target.value
                setCartonPrice(val)
                const cPrice = val === '' ? 0 : (parseFloat(val) || 0)
                setFormData(prev => ({ ...prev, wholesale_price: cPrice }))
              }}
              placeholder="ex: 10000 FCFA"
              className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-black text-xs"
            />
            {Boolean(formData.wholesale_price || parseFloat(cartonPrice) > 0) && parseFloat(cartonCost) > 0 && (
              <div className="text-[10px] text-emerald-800 font-bold flex items-center justify-between font-mono">
                <span>Bénéfice par carton :</span>
                <span className="font-extrabold tabular-nums tracking-tight">+{Math.round((formData.wholesale_price || parseFloat(cartonPrice)) - parseFloat(cartonCost))} F</span>
              </div>
            )}
          </div>
        )}

        {/* Prix Demi-Carton (si conditionnement de gros ou demi-gros) */}
        {(tradeType === 'wholesale' || mult > 1) && (
          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
            <label className="block text-amber-950 font-extrabold uppercase text-[10px]">
              Prix Demi-Carton (1/2) :
            </label>
            <input
              type="number"
              value={formData.half_package_price === 0 ? '' : (formData.half_package_price || '')}
              onChange={(e) => {
                const val = e.target.value
                setFormData(prev => ({ ...prev, half_package_price: val === '' ? 0 : (parseFloat(val) || 0) }))
              }}
              placeholder="ex: 5200 FCFA (optionnel)"
              className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-black text-xs"
            />
          </div>
        )}

        {/* Prix Quart de Carton (si conditionnement >= 4) */}
        {(tradeType === 'wholesale' || mult >= 4) && (
          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
            <label className="block text-amber-950 font-extrabold uppercase text-[10px]">
              Prix Quart de Carton (1/4) :
            </label>
            <input
              type="number"
              value={formData.quarter_package_price === 0 ? '' : (formData.quarter_package_price || '')}
              onChange={(e) => {
                const val = e.target.value
                setFormData(prev => ({ ...prev, quarter_package_price: val === '' ? 0 : (parseFloat(val) || 0) }))
              }}
              placeholder="ex: 2650 FCFA (optionnel)"
              className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-black text-xs"
            />
          </div>
        )}

        {/* Prix de Vente Demi-Gros / Seuil par lot */}
        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
          <label className="block text-amber-950 font-extrabold uppercase text-[10px]">
            Seuil Dégressif / Pack (ex: dès 3 ou 6 pièces) :
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                value={formData.lot_quantity === 0 ? '' : (formData.lot_quantity || '')}
                onChange={(e) => {
                  const val = e.target.value
                  setFormData(prev => ({ ...prev, lot_quantity: val === '' ? 0 : (parseInt(val, 10) || 0) }))
                }}
                placeholder="Nb pièces (ex: 3)"
                className="w-full px-2 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-bold text-xs"
              />
            </div>
            <div>
              <input
                type="number"
                value={formData.lot_price === 0 ? '' : (formData.lot_price || '')}
                onChange={(e) => {
                  const val = e.target.value
                  setFormData(prev => ({ ...prev, lot_price: val === '' ? 0 : (parseFloat(val) || 0) }))
                }}
                placeholder="Prix lot (ex: 1400)"
                className="w-full px-2 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-black text-xs"
              />
            </div>
          </div>
          {formData.lot_price > 0 && formData.lot_quantity > 0 && (
            <div className="text-[10px] text-amber-900 font-bold font-mono">
              Soit <span className="tabular-nums tracking-tight">{Math.round(formData.lot_price / formData.lot_quantity)}</span> F / pièce
            </div>
          )}
        </div>

        {/* Seuil d'Alerte */}
        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
          <label className="block text-amber-950 font-extrabold uppercase text-[10px]">
            Seuil d'Alerte Stock :
          </label>
          <input
            type="number"
            value={formData.alert_threshold === 0 ? '' : (formData.alert_threshold || '')}
            onChange={(e) => {
              const val = e.target.value
              setFormData(prev => ({ ...prev, alert_threshold: val === '' ? 0 : (parseFloat(val) || 0) }))
            }}
            placeholder="ex: 5 pièces"
            className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold text-xs"
          />
        </div>
      </div>

      {/* Simulateur comparatif de rentabilité par mode de vente */}
      {hasPackaging && costPerCarton > 0 && formData.unit_price > 0 && (
        <div className="p-2.5 bg-amber-100/60 border border-amber-300 rounded-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-950">
            <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
            <span>Comparateur de Bénéfice Réel (sur 1 carton de {mult} pièces) :</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono">
            {/* Détail */}
            <div className="p-1.5 bg-white/90 border border-amber-200 rounded-lg">
              <span className="block text-gray-500 font-sans font-bold">Au détail</span>
              <span className="font-bold text-amber-950">{formatPrice(revenueDetail)}</span>
              <span className="block font-black text-emerald-700">+{formatPrice(revenueDetail - costPerCarton)}</span>
            </div>

            {/* En 1/4 */}
            {revenueQuarter > 0 && (
              <div className="p-1.5 bg-white/90 border border-amber-200 rounded-lg">
                <span className="block text-gray-500 font-sans font-bold">Par 1/4</span>
                <span className="font-bold text-amber-950">{formatPrice(revenueQuarter)}</span>
                <span className="block font-black text-emerald-700">+{formatPrice(revenueQuarter - costPerCarton)}</span>
              </div>
            )}

            {/* En 1/2 */}
            {revenueHalf > 0 && (
              <div className="p-1.5 bg-white/90 border border-amber-200 rounded-lg">
                <span className="block text-gray-500 font-sans font-bold">Par 1/2</span>
                <span className="font-bold text-amber-950">{formatPrice(revenueHalf)}</span>
                <span className="block font-black text-emerald-700">+{formatPrice(revenueHalf - costPerCarton)}</span>
              </div>
            )}

            {/* Carton entier */}
            {revenueCarton > 0 && (
              <div className="p-1.5 bg-amber-900 text-amber-100 rounded-lg">
                <span className="block text-amber-200 font-sans font-bold">Carton entier</span>
                <span className="font-bold text-white">{formatPrice(revenueCarton)}</span>
                <span className="block font-black text-emerald-300">+{formatPrice(revenueCarton - costPerCarton)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
