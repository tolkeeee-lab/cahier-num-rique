'use client'

import React from 'react'
import { StockFormState } from './types'
import { CATEGORIES, UNITS } from './stockUtils'

interface ProductAdvancedFormProps {
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
}

export const ProductAdvancedForm: React.FC<ProductAdvancedFormProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Nom du produit */}
      <div>
        <label className="block text-amber-950 font-extrabold uppercase mb-1">
          Nom complet du produit :
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="ex: Carton de Canettes Beaufort 33cl"
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

        {/* Unité de mesure */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">Unité de vente :</label>
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

      <div className="grid grid-cols-3 gap-3">
        {/* Prix d'Achat */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">Coût d'Achat (F) :</label>
          <input
            type="number"
            value={formData.unit_cost || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
            placeholder="Prix d'achat"
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>

        {/* Prix de Vente */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">Prix de Vente (F) :</label>
          <input
            type="number"
            value={formData.unit_price || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
            placeholder="Prix de vente"
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>

        {/* Seuil d'Alerte */}
        <div>
          <label className="block text-amber-950 font-extrabold uppercase mb-1">Seuil d'Alerte :</label>
          <input
            type="number"
            value={formData.alert_threshold || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, alert_threshold: parseFloat(e.target.value) || 5 }))}
            placeholder="ex: 5"
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>
      </div>
    </div>
  )
}
