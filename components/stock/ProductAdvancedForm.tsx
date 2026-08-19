'use client'

import React, { useState } from 'react'
import { StockFormState } from './types'
import { CATEGORIES, UNITS } from './stockUtils'
import { Store, Package, Truck } from 'lucide-react'

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

      {/* ── 3. SECTION SPÉCIFIQUE DEMI-GROSSISTE & GROSSISTE : ACHAT EN GROS (CARTON/SAC) ── */}
      {(tradeType === 'semi_wholesale' || tradeType === 'wholesale') && (
        <div className="p-3.5 bg-gradient-to-br from-amber-100/90 to-yellow-100/60 border-2 border-amber-400/90 rounded-2xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-amber-300 pb-2">
            <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs sm:text-sm">
              <Truck className="w-4 h-4 text-amber-800" />
              <span>1. Achat chez le Fournisseur (En Gros) :</span>
            </div>
            <span className="text-[10px] text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full font-bold border border-amber-300">
              Calcul auto du coût unitaire
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* Type de colisage */}
            <div>
              <label className="block text-amber-950 font-bold uppercase mb-1 text-[10px]">Emballage acheté :</label>
              <select
                value={formData.packaging_name || 'carton'}
                onChange={(e) => setFormData(prev => ({ ...prev, packaging_name: e.target.value }))}
                className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-bold text-xs"
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

            {/* Prix d'Achat du Carton / Sac */}
            <div>
              <label className="block text-amber-950 font-bold uppercase mb-1 text-[10px]">
                Prix Achat Carton/Sac (F) :
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
                Nb de pièces dedans :
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
      )}

      {/* ── 4. SECTION TARIFS DE REVENTE SOUHAITÉS ── */}
      <div className="p-3.5 bg-white border border-amber-300/90 rounded-2xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-amber-200 pb-2">
          <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs sm:text-sm">
            <Package className="w-4 h-4 text-amber-800" />
            <span>2. Prix de Vente Souhaités :</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <span>Marge brute détail :</span>
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
        </div>
      </div>

      {/* ── 5. TARIFS ET STOCK À L'UNITÉ (POUR TOUS LES MODÈLES) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Prix d'Achat Unitaire */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1 text-[11px]">
            Achat Unit. (F) :
          </label>
          <input
            type="number"
            value={formData.unit_cost === 0 ? '' : (formData.unit_cost || '')}
            onChange={(e) => {
              const val = e.target.value
              const cost = val === '' ? 0 : (parseFloat(val) || 0)
              setFormData((prev) => ({ ...prev, unit_cost: cost }))
              if (tradeType === 'wholesale' && formData.multiplier > 1) {
                setCartonCost(cost > 0 ? String(Math.round(cost * formData.multiplier)) : '')
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
            value={formData.unit_price === 0 ? '' : (formData.unit_price || '')}
            onChange={(e) => {
              const val = e.target.value
              const price = val === '' ? 0 : (parseFloat(val) || 0)
              setFormData((prev) => ({ ...prev, unit_price: price }))
              if (tradeType === 'wholesale' && formData.multiplier > 1) {
                setCartonPrice(price > 0 ? String(Math.round(price * formData.multiplier)) : '')
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
            value={formData.alert_threshold === 0 ? '' : (formData.alert_threshold || '')}
            onChange={(e) => {
              const val = e.target.value
              setFormData(prev => ({ ...prev, alert_threshold: val === '' ? 0 : (parseFloat(val) || 0) }))
            }}
            placeholder="ex: 5"
            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>
      </div>

      {/* ── 6. STOCK INITIAL ── */}
      <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl space-y-2.5">
        <label className="block text-amber-950 font-extrabold uppercase text-[11px]">
          3. Stock initial disponible en magasin :
        </label>
        {tradeType === 'wholesale' || tradeType === 'semi_wholesale' || (formData.multiplier && formData.multiplier > 1) ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-amber-900 font-black text-[10px] uppercase mb-1">
                  Nombre de {formData.packaging_name ? `${formData.packaging_name}s` : 'cartons / packs'} reçus :
                </label>
                <input
                  type="number"
                  value={cartonsCount}
                  onChange={(e) => {
                    const val = e.target.value
                    setCartonsCount(val)
                    const c = val === '' ? 0 : (parseInt(val, 10) || 0)
                    const m = formData.multiplier || 1
                    setFormData(prev => ({ ...prev, initial_stock: c * m }))
                  }}
                  placeholder={tradeType === 'semi_wholesale' ? 'ex: 10 packs' : 'ex: 10 cartons'}
                  className="w-full px-3 py-2 bg-white border-2 border-amber-400 rounded-xl text-gray-900 font-black text-sm shadow-inner"
                />
              </div>

              <div>
                <label className="block text-amber-900 font-bold text-[10px] uppercase mb-1">
                  Total Unités / Pièces calculé :
                </label>
                <input
                  type="number"
                  value={formData.initial_stock === 0 ? '' : (formData.initial_stock || '')}
                  onChange={(e) => {
                    const val = e.target.value
                    const st = val === '' ? 0 : (parseInt(val, 10) || 0)
                    setFormData(prev => ({ ...prev, initial_stock: st }))
                    const m = formData.multiplier || 1
                    if (m > 1) {
                      setCartonsCount(st > 0 ? String(Math.floor(st / m)) : '')
                    }
                  }}
                  placeholder="ex: 60 unités"
                  className="w-full px-3 py-2 bg-amber-100/70 border border-amber-300 rounded-xl text-gray-900 font-black text-sm"
                />
              </div>
            </div>

            {/* Aide visuelle calcul automatique */}
            <div className="p-2 bg-white border border-amber-300 rounded-xl text-amber-950 font-mono text-xs flex items-center justify-between">
              <span className="font-bold text-gray-700">📦 Calcul du stock :</span>
              <span className="font-black text-amber-900">
                {cartonsCount ? `${cartonsCount} ${formData.packaging_name || 'carton(s)'} × ${formData.multiplier || 1} = ` : ''}
                <span className="text-emerald-800 font-extrabold">{formData.initial_stock || 0} {formData.unit || 'pièces'}</span>
              </span>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-amber-900 font-bold text-[10px] uppercase mb-1">
              Nombre de pièces en rayon :
            </label>
            <input
              type="number"
              value={formData.initial_stock === 0 ? '' : (formData.initial_stock || '')}
              onChange={(e) => {
                const val = e.target.value
                setFormData(prev => ({ ...prev, initial_stock: val === '' ? 0 : (parseFloat(val) || 0) }))
              }}
              placeholder="ex: 25 pièces"
              className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
            />
          </div>
        )}
      </div>
    </div>
  )
}
