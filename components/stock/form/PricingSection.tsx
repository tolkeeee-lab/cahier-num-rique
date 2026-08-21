'use client'

import React from 'react'
import { Package } from 'lucide-react'
import { StockFormState, TradeType } from '../types'

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
  return (
    <div className="p-3.5 bg-white border border-amber-300/90 rounded-2xl space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-amber-200 pb-2">
        <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs sm:text-sm">
          <Package className="w-4 h-4 text-amber-800" />
          <span>2. Prix de Vente & Marges :</span>
        </div>
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
              if (formData.multiplier > 1) {
                setCartonPrice(price > 0 ? String(Math.round(price * formData.multiplier)) : '')
              }
            }}
            placeholder="ex: 600 FCFA"
            className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-black text-xs"
          />
          {formData.unit_price > 0 && formData.unit_cost > 0 && (
            <div className="text-[10px] text-emerald-800 font-bold flex items-center justify-between">
              <span>Marge brute :</span>
              <span className="font-extrabold">+{formData.unit_price - formData.unit_cost} F (+{Math.round(((formData.unit_price - formData.unit_cost) / formData.unit_cost) * 100)}%)</span>
            </div>
          )}
        </div>

        {/* Prix de Vente Demi-Gros / Lot (si demi-grossiste) */}
        {tradeType === 'semi_wholesale' && (
          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
            <label className="block text-amber-950 font-extrabold uppercase text-[10px]">
              Prix Lot Demi-Gros (ex: Pack de 6) :
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
                  placeholder="Nb pièces (ex: 6)"
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
                  placeholder="Prix lot (ex: 3300)"
                  className="w-full px-2 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-black text-xs"
                />
              </div>
            </div>
            {formData.lot_price > 0 && formData.lot_quantity > 0 && (
              <div className="text-[10px] text-amber-900 font-bold">
                Soit {Math.round(formData.lot_price / formData.lot_quantity)} F / pièce
              </div>
            )}
          </div>
        )}

        {/* Prix de Vente Carton complet (si Grossiste) */}
        {tradeType === 'wholesale' && (
          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
            <label className="block text-amber-950 font-extrabold uppercase text-[10px]">
              Prix de Vente Carton/Sac Complet :
            </label>
            <input
              type="number"
              value={cartonPrice}
              onChange={(e) => {
                const val = e.target.value
                setCartonPrice(val)
                const cPrice = parseFloat(val) || 0
                const m = formData.multiplier || 1
                if (m > 0) {
                  setFormData(prev => ({ ...prev, unit_price: cPrice / m }))
                }
              }}
              placeholder="ex: 13500 FCFA"
              className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-black text-xs"
            />
            {parseFloat(cartonPrice) > 0 && parseFloat(cartonCost) > 0 && (
              <div className="text-[10px] text-emerald-800 font-bold flex items-center justify-between">
                <span>Bénéfice par carton :</span>
                <span className="font-extrabold">+{Math.round(parseFloat(cartonPrice) - parseFloat(cartonCost))} F</span>
              </div>
            )}
          </div>
        )}

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
    </div>
  )
}
