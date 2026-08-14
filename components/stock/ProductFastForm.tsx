'use client'

import React from 'react'
import { StockFormState } from './types'

interface ProductFastFormProps {
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
}

export const ProductFastForm: React.FC<ProductFastFormProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Nom du produit */}
      <div>
        <label className="block text-amber-950 font-extrabold uppercase mb-1">
          Nom du produit :
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="ex: Sac de riz 50kg, Savon Fanico..."
          className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Prix de Vente Unitaire */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">
            Prix de Vente (FCFA) :
          </label>
          <input
            type="number"
            value={formData.unit_price || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
            placeholder="ex: 22000"
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>

        {/* Quantité Initiale en Stock */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">
            Quantité Initiale :
          </label>
          <input
            type="number"
            value={formData.initial_stock || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, initial_stock: parseFloat(e.target.value) || 0 }))}
            placeholder="ex: 10"
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>
      </div>
    </div>
  )
}
