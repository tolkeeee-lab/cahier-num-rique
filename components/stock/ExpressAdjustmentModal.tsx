'use client'

import React from 'react'
import { X } from 'lucide-react'
import { StockItem } from './types'

interface ExpressAdjustmentModalProps {
  expressItem: StockItem | null
  expressType: 'in' | 'out'
  expressQty: number
  setExpressQty: (qty: number) => void
  expressReason: string
  setExpressReason: (reason: string) => void
  expressUnitCost: string
  setExpressUnitCost: (cost: string) => void
  expressNotes: string
  setExpressNotes: (notes: string) => void
  adjusting: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}

export function ExpressAdjustmentModal({
  expressItem,
  expressType,
  expressQty,
  setExpressQty,
  expressReason,
  setExpressReason,
  expressUnitCost,
  setExpressUnitCost,
  expressNotes,
  setExpressNotes,
  adjusting,
  onClose,
  onSubmit,
}: ExpressAdjustmentModalProps) {
  const [wholesalePrice, setWholesalePrice] = React.useState('')
  const [cartonMult, setCartonMult] = React.useState(expressItem?.multiplier && expressItem.multiplier > 1 ? String(expressItem.multiplier) : '')
  const [cartonsTaken, setCartonsTaken] = React.useState('')

  const handleWholesalePriceChange = (val: string) => {
    setWholesalePrice(val)
    const price = parseFloat(val) || 0
    const mult = parseInt(cartonMult) || (expressItem?.multiplier && expressItem.multiplier > 1 ? expressItem.multiplier : 1)
    if (price > 0 && mult > 0) {
      setExpressUnitCost(Math.round(price / mult).toString())
    }
  }

  const handleCartonMultChange = (val: string) => {
    setCartonMult(val)
    const mult = parseInt(val) || 1
    const price = parseFloat(wholesalePrice) || 0
    const cartons = parseInt(cartonsTaken) || 0
    if (price > 0 && mult > 0) {
      setExpressUnitCost(Math.round(price / mult).toString())
    }
    if (cartons > 0 && mult > 0) {
      setExpressQty(cartons * mult)
    }
  }

  const handleCartonsTakenChange = (val: string) => {
    setCartonsTaken(val)
    const cartons = parseInt(val) || 0
    const mult = parseInt(cartonMult) || (expressItem?.multiplier && expressItem.multiplier > 1 ? expressItem.multiplier : 1)
    if (cartons > 0 && mult > 0) {
      setExpressQty(cartons * mult)
    }
  }

  if (!expressItem) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[#fbf9f4] border border-gray-200 rounded-[28px] max-w-sm w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          expressType === 'in' ? 'bg-emerald-100 border-emerald-200 text-emerald-900' : 'bg-rose-100 border-rose-200 text-rose-900'
        }`}>
          <div className="font-bold text-sm flex items-center gap-2">
            <span>{expressType === 'in' ? 'Entrée de Stock (+)' : 'Sortie de Stock (-)'}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4 text-xs">
          <div className="bg-white p-3 rounded-xl border border-gray-200">
            <div className="text-[10px] text-gray-400 font-mono uppercase">Produit sélectionné</div>
            <div className="font-handwritten text-lg font-bold text-gray-800">{expressItem.name}</div>
            <div className="text-[11px] text-gray-500 font-mono">Stock actuel : {expressItem.current_stock} {expressItem.unit}</div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Quantité à {expressType === 'in' ? 'ajouter' : 'retirer'}</label>
            <input
              type="number"
              min="1"
              value={expressQty}
              onChange={e => setExpressQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-sm font-bold text-gray-800 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Motif de l'ajustement</label>
            <select
              value={expressReason}
              onChange={e => setExpressReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-xs text-gray-800 outline-none focus:border-gray-900 bg-white"
            >
              {expressType === 'in' ? (
                <>
                  <option value="purchase">Achat / Reconstitution de stock</option>
                  <option value="inventory_correction">Ajustement d'inventaire (+)</option>
                </>
              ) : (
                <>
                  <option value="damage">Casse / Perte / Produit périmé</option>
                  <option value="personal_use">Consommation personnelle / Équipe</option>
                  <option value="inventory_correction">Ajustement d'inventaire (-)</option>
                </>
              )}
            </select>
          </div>

          {expressType === 'in' && expressReason === 'purchase' && (
            <div className="p-3 bg-amber-50 border border-amber-250 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-amber-950 uppercase">
                  Achat en Gros (Carton / Sac)
                </label>
                <span className="text-[9px] font-mono text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                  Calcul auto
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-[8px] font-bold text-amber-900 uppercase mb-0.5">Prix d'un carton</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 12000 F"
                    value={wholesalePrice}
                    onChange={e => handleWholesalePriceChange(e.target.value)}
                    className="w-full px-2 py-1.5 border border-amber-300 rounded-lg font-mono text-xs font-bold text-amber-950 outline-none focus:border-amber-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-amber-900 uppercase mb-0.5">Pcs par carton</label>
                  <input
                    type="number"
                    min="1"
                    placeholder={`Ex: ${expressItem.multiplier || 24}`}
                    value={cartonMult}
                    onChange={e => handleCartonMultChange(e.target.value)}
                    className="w-full px-2 py-1.5 border border-amber-300 rounded-lg font-mono text-xs font-bold text-amber-950 outline-none focus:border-amber-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-amber-900 uppercase mb-0.5">{expressItem?.packaging_name || 'Cartons'} pris</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 3"
                    value={cartonsTaken}
                    onChange={e => handleCartonsTakenChange(e.target.value)}
                    className="w-full px-2 py-1.5 border border-amber-300 rounded-lg font-mono text-xs font-bold text-amber-950 outline-none focus:border-amber-500 bg-white"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">
                  Coût d'Achat unitaire retenu (FCFA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="Ex: 500 F"
                  value={expressUnitCost}
                  onChange={e => setExpressUnitCost(e.target.value)}
                  className="w-full px-3 py-1.5 border border-amber-400 rounded-xl font-mono text-xs font-bold text-amber-950 outline-none focus:border-amber-600 bg-white"
                />
                <p className="text-[9px] font-mono text-amber-800 mt-0.5">
                  Prix exact payé au grossiste pour 1 unité.
                </p>
              </div>
            </div>
          )}


          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Notes optionnelles</label>
            <input
              type="text"
              placeholder="ex: Carton cassé lors du déchargement"
              value={expressNotes}
              onChange={e => setExpressNotes(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-mono text-xs outline-none focus:border-gray-400"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-full font-bold text-gray-600 hover:bg-gray-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={adjusting}
              className={`flex-1 py-2 text-white font-bold rounded-full transition-transform hover:scale-105 active:scale-95 ${
                expressType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {adjusting ? 'Validation...' : 'Valider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
