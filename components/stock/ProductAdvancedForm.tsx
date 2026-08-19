'use client'

import React, { useState } from 'react'
import { StockFormState } from './types'
import { CATEGORIES, UNITS } from './stockUtils'
import { Store, Package, Truck, Layers } from 'lucide-react'

interface ProductAdvancedFormProps {
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
}

type TradeType = 'retail' | 'semi_wholesale' | 'wholesale'

export const ProductAdvancedForm: React.FC<ProductAdvancedFormProps> = ({
  formData,
  setFormData,
}) => {
  // Déduire le mode de commerce selon les données existantes
  const [tradeType, setTradeType] = useState<TradeType>(() => {
    if (formData.multiplier && formData.multiplier > 1) return 'wholesale'
    if (formData.lot_quantity && formData.lot_quantity > 1) return 'semi_wholesale'
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

  const handleSelectTradeType = (type: TradeType) => {
    setTradeType(type)
    if (type === 'retail') {
      setFormData(prev => ({ ...prev, multiplier: 1, packaging_name: '', lot_quantity: 0, lot_price: 0 }))
    } else if (type === 'semi_wholesale') {
      setFormData(prev => ({
        ...prev,
        multiplier: 1,
        packaging_name: '',
        lot_quantity: prev.lot_quantity || 6,
        lot_price: prev.lot_price || (prev.unit_price ? prev.unit_price * 6 * 0.9 : 0),
      }))
    } else if (type === 'wholesale') {
      const defaultMult = formData.multiplier > 1 ? formData.multiplier : 24
      setFormData(prev => ({
        ...prev,
        multiplier: defaultMult,
        packaging_name: prev.packaging_name || 'carton',
      }))
    }
  }

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* ── 1. SÉLECTEUR DE MODÈLE DE COMMERCE ── */}
      <div>
        <label className="block text-amber-950 font-extrabold uppercase mb-1.5 flex items-center justify-between">
          <span>Type de commerce adapté :</span>
          <span className="text-[10px] text-amber-800 font-bold font-sans">Options sur mesure</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5 bg-amber-100/70 p-1.5 rounded-2xl border border-amber-300">
          <button
            type="button"
            onClick={() => handleSelectTradeType('retail')}
            className={`py-2 px-2 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
              tradeType === 'retail'
                ? 'bg-amber-900 text-white font-extrabold shadow-xs'
                : 'text-amber-950 hover:bg-amber-200/60 font-bold'
            }`}
          >
            <Store className="w-4 h-4" />
            <span className="text-[11px] leading-tight">Détaillant</span>
            <span className="text-[8px] opacity-80">(À la pièce)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTradeType('semi_wholesale')}
            className={`py-2 px-2 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
              tradeType === 'semi_wholesale'
                ? 'bg-amber-900 text-white font-extrabold shadow-xs'
                : 'text-amber-950 hover:bg-amber-200/60 font-bold'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-[11px] leading-tight">Demi-Gros</span>
            <span className="text-[8px] opacity-80">(Pièces & Lots)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTradeType('wholesale')}
            className={`py-2 px-2 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
              tradeType === 'wholesale'
                ? 'bg-amber-900 text-white font-extrabold shadow-xs'
                : 'text-amber-950 hover:bg-amber-200/60 font-bold'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span className="text-[11px] leading-tight">Grossiste</span>
            <span className="text-[8px] opacity-80">(Cartons / Sacs)</span>
          </button>
        </div>
      </div>

      {/* ── 2. INFORMATIONS GÉNÉRALES ── */}
      <div>
        <label className="block text-amber-950 font-extrabold uppercase mb-1">
          Nom complet du produit :
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder={
            tradeType === 'wholesale'
              ? 'ex: Carton Canettes Beaufort 33cl, Sac de Riz 50kg...'
              : tradeType === 'semi_wholesale'
              ? 'ex: Savon Fanico (Pack de 6), Lait Peak...'
              : 'ex: Coca 50cl, Savon Lux, Pain...'
          }
          className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Catégorie */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">Catégorie :</label>
          <select
            value={formData.category}
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
            value={formData.unit}
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

      {/* ── 3. SECTION SPÉCIFIQUE GROSSISTE (COLISAGE & MULTIPLICATEUR) ── */}
      {tradeType === 'wholesale' && (
        <div className="p-3 bg-amber-100/60 border-2 border-amber-300/90 rounded-2xl space-y-3">
          <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs">
            <Layers className="w-4 h-4 text-amber-800" />
            <span>Colisage & Conditionnement de Gros :</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-amber-900 font-bold uppercase mb-1 text-[11px]">Type d'emballage :</label>
              <select
                value={formData.packaging_name || 'carton'}
                onChange={(e) => setFormData(prev => ({ ...prev, packaging_name: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-bold"
              >
                <option value="carton">Carton</option>
                <option value="sac">Sac (25kg / 50kg)</option>
                <option value="caisse">Caisse</option>
                <option value="fardeau">Fardeau</option>
                <option value="palette">Palette</option>
                <option value="bidon">Bidon</option>
                <option value="pack">Pack</option>
              </select>
            </div>

            <div>
              <label className="block text-amber-900 font-bold uppercase mb-1 text-[11px]">
                Contenance (pièces / kg) :
              </label>
              <input
                type="number"
                value={formData.multiplier || ''}
                onChange={(e) => {
                  const m = parseInt(e.target.value) || 1
                  setFormData(prev => ({ ...prev, multiplier: m }))
                  if (cartonCost && m > 0) {
                    setFormData(prev => ({ ...prev, unit_cost: Math.round(parseFloat(cartonCost) / m) }))
                  }
                  if (cartonPrice && m > 0) {
                    setFormData(prev => ({ ...prev, unit_price: Math.round(parseFloat(cartonPrice) / m) }))
                  }
                }}
                placeholder="ex: 24 (bouteilles/carton)"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-amber-900 font-bold uppercase mb-1 text-[11px]">
                Prix Achat Carton/Sac (F) :
              </label>
              <input
                type="number"
                value={cartonCost}
                onChange={(e) => {
                  const val = e.target.value
                  setCartonCost(val)
                  const cCost = parseFloat(val) || 0
                  const m = formData.multiplier || 1
                  if (m > 0) {
                    setFormData(prev => ({ ...prev, unit_cost: Math.round(cCost / m) }))
                  }
                }}
                placeholder="ex: 12000"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold"
              />
            </div>

            <div>
              <label className="block text-amber-900 font-bold uppercase mb-1 text-[11px]">
                Prix Vente Carton/Sac (F) :
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
                    setFormData(prev => ({ ...prev, unit_price: Math.round(cPrice / m) }))
                  }
                }}
                placeholder="ex: 14000"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 4. SECTION SPÉCIFIQUE DEMI-GROSSISTE (VENTE PAR LOT / PACK) ── */}
      {tradeType === 'semi_wholesale' && (
        <div className="p-3 bg-amber-100/60 border-2 border-amber-300/90 rounded-2xl space-y-3">
          <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs">
            <Package className="w-4 h-4 text-amber-800" />
            <span>Tarif Demi-Gros / Vente par Lot :</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-amber-900 font-bold uppercase mb-1 text-[11px]">
                Nombre de pièces par Lot :
              </label>
              <input
                type="number"
                value={formData.lot_quantity || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, lot_quantity: parseInt(e.target.value) || 0 }))}
                placeholder="ex: 6 (demi-carton) ou 12"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold"
              />
            </div>

            <div>
              <label className="block text-amber-900 font-bold uppercase mb-1 text-[11px]">
                Prix du Lot complet (F) :
              </label>
              <input
                type="number"
                value={formData.lot_price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, lot_price: parseFloat(e.target.value) || 0 }))}
                placeholder="ex: 2700 (remise demi-gros)"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 5. TARIFS ET STOCK À L'UNITÉ (POUR TOUS LES MODÈLES) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Prix d'Achat Unitaire */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1 text-[11px]">
            Achat Unit. (F) :
          </label>
          <input
            type="number"
            value={formData.unit_cost || ''}
            onChange={(e) => {
              const cost = parseFloat(e.target.value) || 0
              setFormData((prev) => ({ ...prev, unit_cost: cost }))
              if (tradeType === 'wholesale' && formData.multiplier > 1) {
                setCartonCost(String(Math.round(cost * formData.multiplier)))
              }
            }}
            placeholder="Prix achat"
            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>

        {/* Prix de Vente Unitaire (Détail) */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1 text-[11px]">
            Vente Unit. (F) :
          </label>
          <input
            type="number"
            value={formData.unit_price || ''}
            onChange={(e) => {
              const price = parseFloat(e.target.value) || 0
              setFormData((prev) => ({ ...prev, unit_price: price }))
              if (tradeType === 'wholesale' && formData.multiplier > 1) {
                setCartonPrice(String(Math.round(price * formData.multiplier)))
              }
            }}
            placeholder="Prix vente"
            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>

        {/* Seuil d'Alerte */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-amber-950 font-extrabold uppercase mb-1 text-[11px]">
            Seuil Alerte :
          </label>
          <input
            type="number"
            value={formData.alert_threshold || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, alert_threshold: parseFloat(e.target.value) || 5 }))}
            placeholder="ex: 5"
            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>
      </div>

      {/* ── 6. STOCK INITIAL ── */}
      <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl space-y-2">
        <label className="block text-amber-950 font-extrabold uppercase text-[11px]">
          Stock initial disponible :
        </label>
        {tradeType === 'wholesale' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-amber-800 font-bold text-[10px] mb-0.5">En Cartons / Sacs :</label>
              <input
                type="number"
                value={cartonsCount}
                onChange={(e) => {
                  const val = e.target.value
                  setCartonsCount(val)
                  const c = parseInt(val) || 0
                  const m = formData.multiplier || 1
                  setFormData(prev => ({ ...prev, initial_stock: c * m }))
                }}
                placeholder="ex: 10 cartons"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold"
              />
            </div>
            <div>
              <label className="block text-amber-800 font-bold text-[10px] mb-0.5">Total Unités calculé :</label>
              <input
                type="number"
                value={formData.initial_stock || ''}
                onChange={(e) => {
                  const st = parseInt(e.target.value) || 0
                  setFormData(prev => ({ ...prev, initial_stock: st }))
                  const m = formData.multiplier || 1
                  if (m > 1) {
                    setCartonsCount(String(Math.floor(st / m)))
                  }
                }}
                placeholder="ex: 240 unités"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold"
              />
            </div>
          </div>
        ) : (
          <div>
            <input
              type="number"
              value={formData.initial_stock || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, initial_stock: parseFloat(e.target.value) || 0 }))}
              placeholder="ex: 25 pièces en rayon"
              className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
            />
          </div>
        )}
      </div>
    </div>
  )
}
