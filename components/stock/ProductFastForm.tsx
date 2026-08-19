'use client'

import React from 'react'
import { StockFormState } from './types'
import { Store, Truck } from 'lucide-react'

interface ProductFastFormProps {
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
}

export const ProductFastForm: React.FC<ProductFastFormProps> = ({
  formData,
  setFormData,
}) => {
  const isWholesale = (formData.multiplier && formData.multiplier > 1) || formData.unit === 'carton' || formData.unit === 'sac'

  const handleToggleMode = (wholesale: boolean) => {
    if (wholesale) {
      setFormData(prev => ({
        ...prev,
        unit: 'carton',
        multiplier: 24,
        packaging_name: 'carton',
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        unit: 'unité',
        multiplier: 1,
        packaging_name: '',
      }))
    }
  }

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Sélecteur Rapide Vente Pièce vs Gros */}
      <div className="flex items-center gap-1.5 bg-amber-100/70 p-1 rounded-xl border border-amber-300">
        <button
          type="button"
          onClick={() => handleToggleMode(false)}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            !isWholesale ? 'bg-amber-900 text-white font-black shadow-xs' : 'text-amber-950 font-bold'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Vente Détail (À la pièce)</span>
        </button>

        <button
          type="button"
          onClick={() => handleToggleMode(true)}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isWholesale ? 'bg-amber-900 text-white font-black shadow-xs' : 'text-amber-950 font-bold'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Vente Gros (Carton / Sac)</span>
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
          placeholder={isWholesale ? 'ex: Carton Canettes Beaufort, Sac Riz 50kg...' : 'ex: Savon Fanico, Coca 50cl, Pain...'}
          className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Prix de Vente */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">
            {isWholesale ? 'Prix Carton/Sac (F) :' : 'Prix Unitaire (F) :'}
          </label>
          <input
            type="number"
            value={formData.unit_price === 0 ? '' : (formData.unit_price || '')}
            onChange={(e) => {
              const val = e.target.value
              setFormData((prev) => ({ ...prev, unit_price: val === '' ? 0 : (parseFloat(val) || 0) }))
            }}
            placeholder={isWholesale ? 'ex: 12500' : 'ex: 500'}
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>

        {/* Quantité Initiale */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">
            {isWholesale ? 'Nb de Cartons/Sacs :' : 'Quantité Pièces :'}
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
    </div>
  )
}
