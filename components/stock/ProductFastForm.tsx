'use client'

import React from 'react'
import { StockFormState, TradeType } from './types'
import { Store, Layers, Truck } from 'lucide-react'

interface ProductFastFormProps {
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
}

export const ProductFastForm: React.FC<ProductFastFormProps> = ({
  formData,
  setFormData,
}) => {
  const currentTradeType: TradeType = formData.trade_type || (
    (formData.lot_quantity && formData.lot_quantity > 1) || formData.packaging_name === 'pack' || formData.packaging_name === 'fardeau'
      ? 'semi_wholesale'
      : (formData.multiplier && formData.multiplier > 1) || formData.unit === 'carton' || formData.unit === 'sac' || formData.packaging_name === 'carton' || formData.packaging_name === 'sac'
      ? 'wholesale'
      : 'retail'
  )

  const handleSelectTradeType = (type: TradeType) => {
    if (type === 'retail') {
      setFormData(prev => ({
        ...prev,
        trade_type: 'retail',
        unit: 'unité',
        multiplier: 1,
        packaging_name: '',
        lot_quantity: 0,
        lot_price: 0,
      }))
    } else if (type === 'semi_wholesale') {
      setFormData(prev => ({
        ...prev,
        trade_type: 'semi_wholesale',
        unit: 'unité',
        multiplier: 1,
        packaging_name: 'pack',
        lot_quantity: prev.lot_quantity || 6,
        lot_price: prev.lot_price || (prev.unit_price ? Math.round(prev.unit_price * 6 * 0.9) : 0),
      }))
    } else if (type === 'wholesale') {
      setFormData(prev => ({
        ...prev,
        trade_type: 'wholesale',
        unit: 'carton',
        multiplier: prev.multiplier > 1 ? prev.multiplier : 24,
        packaging_name: 'carton',
        lot_quantity: 0,
        lot_price: 0,
      }))
    }
  }

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Sélecteur Rapide des 3 Modes */}
      <div className="grid grid-cols-3 gap-1.5 bg-amber-100/70 p-1 rounded-xl border border-amber-300">
        <button
          type="button"
          onClick={() => handleSelectTradeType('retail')}
          className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            currentTradeType === 'retail' ? 'bg-amber-900 text-white font-black shadow-xs' : 'text-amber-950 hover:bg-amber-200/60 font-bold'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span className="text-[10px] text-center leading-tight">Détail (Pièce)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTradeType('semi_wholesale')}
          className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            currentTradeType === 'semi_wholesale' ? 'bg-amber-900 text-white font-black shadow-xs' : 'text-amber-950 hover:bg-amber-200/60 font-bold'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="text-[10px] text-center leading-tight">Demi-Gros (Pack)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTradeType('wholesale')}
          className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            currentTradeType === 'wholesale' ? 'bg-amber-900 text-white font-black shadow-xs' : 'text-amber-950 hover:bg-amber-200/60 font-bold'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span className="text-[10px] text-center leading-tight">Grossiste (Carton)</span>
        </button>
      </div>

      {/* Nom du produit */}
      <div>
        <label className="block text-amber-950 font-extrabold uppercase mb-1">
          Nom du produit :
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder={
            currentTradeType === 'wholesale'
              ? 'ex: Carton Canettes Beaufort, Sac Riz 50kg...'
              : currentTradeType === 'semi_wholesale'
              ? 'ex: Pack de 6 Lait Peak, Fardeau Eau...'
              : 'ex: Savon Fanico, Coca 50cl, Pain...'
          }
          className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Prix de Vente */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">
            {currentTradeType === 'wholesale'
              ? 'Prix Carton/Sac (F) :'
              : currentTradeType === 'semi_wholesale'
              ? 'Prix Détail / Pièce (F) :'
              : 'Prix Unitaire (F) :'}
          </label>
          <input
            type="number"
            value={formData.unit_price === 0 ? '' : (formData.unit_price || '')}
            onChange={(e) => {
              const val = e.target.value
              setFormData((prev) => ({ ...prev, unit_price: val === '' ? 0 : (parseFloat(val) || 0) }))
            }}
            placeholder={currentTradeType === 'wholesale' ? 'ex: 12500' : 'ex: 500'}
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>

        {/* Quantité Initiale */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">
            {currentTradeType === 'wholesale'
              ? 'Nb de Cartons/Sacs :'
              : currentTradeType === 'semi_wholesale'
              ? 'Nb Total Pièces :'
              : 'Quantité Pièces :'}
          </label>
          <input
            type="number"
            value={formData.initial_stock === 0 ? '' : (formData.initial_stock || '')}
            onChange={(e) => {
              const val = e.target.value
              setFormData((prev) => ({ ...prev, initial_stock: val === '' ? 0 : (parseFloat(val) || 0) }))
            }}
            placeholder="ex: 10"
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>
      </div>

      {/* Spécificité Demi-Gros : Prix du Pack */}
      {currentTradeType === 'semi_wholesale' && (
        <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl space-y-2">
          <label className="block text-amber-950 font-extrabold uppercase text-[10px]">
            Tarif Promo Pack / Lot (ex: Pack de 6) :
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
                className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-lg text-gray-900 font-bold text-xs"
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
                placeholder="Prix lot (ex: 2800 F)"
                className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-lg text-gray-900 font-black text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
