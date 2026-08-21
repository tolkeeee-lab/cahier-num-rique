'use client'

import React from 'react'
import { Truck } from 'lucide-react'
import { StockFormState, TradeType } from '../types'

interface WholesalePurchaseSectionProps {
  tradeType: TradeType
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
  cartonCost: string
  setCartonCost: (val: string) => void
}

export const WholesalePurchaseSection: React.FC<WholesalePurchaseSectionProps> = ({
  tradeType,
  formData,
  setFormData,
  cartonCost,
  setCartonCost,
}) => {
  if (tradeType !== 'semi_wholesale' && tradeType !== 'wholesale') {
    return null
  }

  return (
    <div className="p-3.5 bg-gradient-to-br from-amber-100/90 to-yellow-100/60 border-2 border-amber-400/90 rounded-2xl space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-amber-300 pb-2">
        <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs sm:text-sm">
          <Truck className="w-4 h-4 text-amber-800" />
          <span>1. Achat Fournisseur (Colisage) :</span>
        </div>
        <span className="text-[10px] text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full font-bold border border-amber-300">
          Coût calculé automatiquement
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Type de colisage */}
        <div>
          <label className="block text-amber-950 font-bold uppercase mb-1 text-[10px]">Conditionnement :</label>
          <select
            value={formData.packaging_name || (tradeType === 'semi_wholesale' ? 'pack' : 'carton')}
            onChange={(e) => setFormData(prev => ({ ...prev, packaging_name: e.target.value }))}
            className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-bold text-xs"
          >
            <option value="carton">Carton</option>
            <option value="pack">Pack</option>
            <option value="sac">Sac (25kg / 50kg)</option>
            <option value="caisse">Caisse</option>
            <option value="fardeau">Fardeau</option>
            <option value="palette">Palette</option>
            <option value="bidon">Bidon</option>
          </select>
        </div>

        {/* Prix d'Achat du Carton / Sac */}
        <div>
          <label className="block text-amber-950 font-bold uppercase mb-1 text-[10px]">
            Prix Achat Carton/Pack (F) :
          </label>
          <input
            type="number"
            value={cartonCost}
            onChange={(e) => {
              const val = e.target.value
              setCartonCost(val)
              const cCost = parseFloat(val) || 0
              const m = formData.multiplier || 24
              if (m > 0) {
                setFormData(prev => ({ ...prev, unit_cost: cCost / m }))
              }
            }}
            placeholder="ex: 10000"
            className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-black text-xs shadow-inner"
          />
        </div>

        {/* Nombre de pièces dedans (Contenance) */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-amber-950 font-bold uppercase mb-1 text-[10px]">
            Nb pièces dedans :
          </label>
          <input
            type="number"
            value={formData.multiplier === 0 ? '' : (formData.multiplier || '')}
            onChange={(e) => {
              const val = e.target.value
              const m = val === '' ? 0 : (parseInt(val, 10) || 0)
              setFormData(prev => ({ ...prev, multiplier: m }))
              if (cartonCost && m > 0) {
                setFormData(prev => ({ ...prev, unit_cost: parseFloat(cartonCost) / m }))
              }
            }}
            placeholder="ex: 24 pièces"
            className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-black text-xs shadow-inner"
          />
        </div>
      </div>

      {/* Badge Résultat Calcul automatique Coût Unitaire */}
      <div className="p-2 bg-white/90 border border-amber-300 rounded-xl flex items-center justify-between font-mono">
        <span className="text-gray-700 text-xs font-bold flex items-center gap-1">
          <span>💡</span>
          <span>Prix d'achat unitaire de revient :</span>
        </span>
        <span className="text-amber-950 font-black text-xs sm:text-sm px-2 py-0.5 bg-amber-100 rounded-lg border border-amber-300">
          {formData.unit_cost > 0 
            ? (formData.unit_cost % 1 === 0 
                ? `${formData.unit_cost} FCFA / ${formData.unit || 'pièce'}` 
                : `~${formData.unit_cost.toFixed(2)} FCFA / ${formData.unit || 'pièce'}`)
            : '0 FCFA'}
        </span>
      </div>
    </div>
  )
}
