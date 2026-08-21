'use client'

import React, { useState } from 'react'
import { StockFormState, TradeType } from './types'
import { TradeTypeSelector } from './form/TradeTypeSelector'
import { WholesalePurchaseSection } from './form/WholesalePurchaseSection'
import { PricingSection } from './form/PricingSection'
import { InitialStockSection } from './form/InitialStockSection'

interface ProductAdvancedFormProps {
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
}

const CATEGORIES = [
  'Alimentation',
  'Boissons',
  'Hygiène & Cosmétique',
  'Électronique',
  'Habillement',
  'Divers',
]

const UNITS = [
  'unité',
  'bouteille',
  'boîte',
  'paquet',
  'sachet',
  'kg',
  'litre',
  'carton',
  'sac',
]

export const ProductAdvancedForm: React.FC<ProductAdvancedFormProps> = ({
  formData,
  setFormData,
}) => {
  const [tradeType, setTradeType] = useState<TradeType>(() => {
    if (formData.trade_type) return formData.trade_type
    if ((formData.lot_quantity && formData.lot_quantity > 1) || formData.packaging_name === 'pack' || formData.packaging_name === 'fardeau') {
      return 'semi_wholesale'
    }
    if ((formData.multiplier && formData.multiplier > 1) || formData.unit === 'carton' || formData.unit === 'sac' || formData.packaging_name === 'carton' || formData.packaging_name === 'sac') {
      return 'wholesale'
    }
    return 'retail'
  })

  // Gestion de la saisie en cartons pleins pour les grossistes
  const mult = formData.multiplier || 1
  const [cartonsCount, setCartonsCount] = useState<string>(() => {
    if (mult > 1 && formData.initial_stock > 0) {
      return String(Math.floor(formData.initial_stock / mult))
    }
    return ''
  })

  const [cartonCost, setCartonCost] = useState<string>(() => {
    if (mult > 1 && formData.unit_cost > 0) {
      return String(Math.round(formData.unit_cost * mult))
    }
    return ''
  })

  const [cartonPrice, setCartonPrice] = useState<string>(() => {
    if (mult > 1 && formData.unit_price > 0) {
      return String(Math.round(formData.unit_price * mult))
    }
    return ''
  })

  React.useEffect(() => {
    if (formData.trade_type) {
      setTradeType(formData.trade_type)
    }
  }, [formData.trade_type])

  React.useEffect(() => {
    const m = formData.multiplier || 1
    if (m > 1 && formData.initial_stock > 0) {
      setCartonsCount(String(Math.floor(formData.initial_stock / m)))
    }
    if (m > 1 && formData.unit_cost > 0) {
      setCartonCost(String(Math.round(formData.unit_cost * m)))
    }
    if (m > 1 && formData.unit_price > 0) {
      setCartonPrice(String(Math.round(formData.unit_price * m)))
    }
  }, [formData.multiplier, formData.initial_stock, formData.unit_cost, formData.unit_price])

  const handleSelectTradeType = (type: TradeType) => {
    setTradeType(type)
    if (type === 'retail') {
      setFormData(prev => ({ ...prev, trade_type: 'retail', multiplier: 1, packaging_name: '', lot_quantity: 0, lot_price: 0 }))
    } else if (type === 'semi_wholesale') {
      setFormData(prev => ({
        ...prev,
        trade_type: 'semi_wholesale',
        multiplier: prev.multiplier > 1 ? prev.multiplier : 6,
        packaging_name: prev.packaging_name || 'pack',
        lot_quantity: prev.lot_quantity || 6,
        lot_price: prev.lot_price || (prev.unit_price ? Math.round(prev.unit_price * 6 * 0.9) : 0),
      }))
    } else if (type === 'wholesale') {
      setFormData(prev => ({
        ...prev,
        trade_type: 'wholesale',
        multiplier: prev.multiplier > 1 ? prev.multiplier : 24,
        packaging_name: prev.packaging_name || 'carton',
      }))
    }
  }

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* ── 1. SÉLECTEUR DE TYPE DE COMMERCE ── */}
      <TradeTypeSelector
        tradeType={tradeType}
        onSelect={handleSelectTradeType}
      />

      {/* ── 2. INFORMATIONS GÉNÉRALES ── */}
      <div>
        <label className="block text-amber-950 font-extrabold uppercase mb-1">
          Nom du produit :
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="ex: Lait Peak, Canette Beaufort, Huile Dinor..."
          className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Catégorie */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">Catégorie :</label>
          <select
            value={formData.category || 'Alimentation'}
            onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-bold focus:outline-none cursor-pointer"
          >
            {CATEGORIES.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Unité de détail */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">Unité de base :</label>
          <select
            value={formData.unit || 'unité'}
            onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-bold focus:outline-none cursor-pointer"
          >
            {UNITS.map((u, idx) => (
              <option key={idx} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Code-Barres / EAN */}
      <div>
        <label className="block text-amber-950 font-extrabold uppercase mb-1 flex items-center justify-between">
          <span>Code-Barres / EAN (Optionnel) :</span>
          <span className="text-[10px] text-amber-700 font-normal">Pour le bip au comptoir</span>
        </label>
        <input
          type="text"
          value={formData.barcode || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
          placeholder="ex: 8904406047268 ou bipez avec la douchette"
          className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-mono font-bold focus:outline-none focus:border-amber-500 shadow-inner text-xs"
        />
      </div>

      {/* ── 3. SECTION ACHAT EN GROS (DEMI-GROSSISTE & GROSSISTE) ── */}
      <WholesalePurchaseSection
        tradeType={tradeType}
        formData={formData}
        setFormData={setFormData}
        cartonCost={cartonCost}
        setCartonCost={setCartonCost}
      />

      {/* ── 4. SECTION TARIFS DE VENTE SOUHAITÉS ── */}
      <PricingSection
        tradeType={tradeType}
        formData={formData}
        setFormData={setFormData}
        cartonPrice={cartonPrice}
        setCartonPrice={setCartonPrice}
        cartonCost={cartonCost}
      />

      {/* ── 5. STOCK INITIAL DISPONIBLE ── */}
      <InitialStockSection
        tradeType={tradeType}
        formData={formData}
        setFormData={setFormData}
        cartonsCount={cartonsCount}
        setCartonsCount={setCartonsCount}
      />
    </div>
  )
}
