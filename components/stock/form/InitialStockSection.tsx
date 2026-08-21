'use client'

import React from 'react'
import { StockFormState, TradeType } from '../types'

interface InitialStockSectionProps {
  tradeType: TradeType
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
  cartonsCount: string
  setCartonsCount: (val: string) => void
}

export const InitialStockSection: React.FC<InitialStockSectionProps> = ({
  tradeType,
  formData,
  setFormData,
  cartonsCount,
  setCartonsCount,
}) => {
  const isBulk = tradeType === 'wholesale' || tradeType === 'semi_wholesale' || (formData.multiplier && formData.multiplier > 1)

  return (
    <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl space-y-2.5">
      <label className="block text-amber-950 font-extrabold uppercase text-[11px]">
        3. Stock initial disponible en magasin :
      </label>

      {isBulk ? (
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
  )
}
