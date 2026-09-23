'use client'

import React, { useEffect } from 'react'
import { X, Save, Edit3, Tag, Package, Coins, TrendingUp, AlertTriangle, Barcode, Layers } from 'lucide-react'
import { StockItem, StockFormState } from './types'
import { formatPrice } from '@/lib/penUtils'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  editingItem?: StockItem | null
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
  saving?: boolean
  onSave: () => void
}

const CATEGORIES = [
  'Épicerie & Vivres',
  'Boissons & Brasserie',
  'Produits Laitiers',
  'Hygiène & Entretien',
  'Quincaillerie & Énergie',
  'Papeterie',
  'Alimentation',
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
  'casier',
]

export function ProductModal({
  isOpen,
  onClose,
  editingItem,
  formData,
  setFormData,
  saving = false,
  onSave,
}: ProductModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    onSave()
  }

  const isCarton = (formData.multiplier && formData.multiplier > 1) || formData.unit === 'carton' || formData.unit === 'sac' || formData.unit === 'casier'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg bg-[#fdfaf2] border-2 border-amber-300 rounded-3xl p-4 sm:p-5 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Entête fixe */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-amber-200 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-200/80 rounded-xl border border-amber-300">
              <Edit3 className="w-4 h-4 text-amber-900" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">
                {editingItem ? `Modifier : ${editingItem.name}` : 'Fiche Produit'}
              </h3>
              <p className="text-[11px] text-amber-900/70 font-mono">
                Ajustez les informations du produit ci-dessous
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-amber-100/80 hover:bg-amber-200 text-gray-700 hover:text-gray-950 rounded-xl transition-all active:scale-[0.97] cursor-pointer border border-amber-300"
            title="Fermer la fenêtre (Échap)"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Formulaire Unique et Épuré */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1 sm:pr-1.5 space-y-3.5 scrollbar-thin font-mono text-xs">
            
            {/* 1. Nom du produit */}
            <div className="p-3 bg-white rounded-2xl border border-amber-300/80 space-y-1">
              <label className="text-[10px] text-amber-900 font-extrabold uppercase flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-700" />
                <span>Nom du produit</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Savon BF"
                required
                className="w-full font-bold text-sm text-gray-900 bg-amber-50/40 border border-amber-300 rounded-xl px-3 py-2 focus:border-amber-600 focus:bg-white outline-none"
              />
            </div>

            {/* 2. Catégorie & Unité */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white rounded-2xl border border-amber-300/80 space-y-1">
                <label className="text-[10px] text-amber-900 font-extrabold uppercase">
                  Catégorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full font-bold text-xs text-gray-900 bg-amber-50/40 border border-amber-300 rounded-xl px-2.5 py-2 focus:border-amber-600 focus:bg-white outline-none cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-amber-300/80 space-y-1">
                <label className="text-[10px] text-amber-900 font-extrabold uppercase">
                  Unité de vente
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full font-bold text-xs text-gray-900 bg-amber-50/40 border border-amber-300 rounded-xl px-2.5 py-2 focus:border-amber-600 focus:bg-white outline-none cursor-pointer"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Stock actuel & Seuil d'alerte */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-1">
                <label className="text-[10px] text-blue-900 font-extrabold uppercase flex items-center gap-1">
                  <Package className="w-3 h-3 text-blue-700" />
                  <span>Stock en Rayon</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={formData.initial_stock || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, initial_stock: parseInt(e.target.value) || 0 }))}
                    className="w-full font-black text-sm text-blue-950 bg-white border border-blue-300 rounded-xl px-2.5 py-2 outline-none tabular-nums"
                  />
                  <span className="text-xs font-bold text-blue-900 pr-1">pcs</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-300/80 space-y-1">
                <label className="text-[10px] text-amber-900 font-extrabold uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                  <span>Seuil Alerte Faible</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={formData.alert_threshold || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, alert_threshold: parseInt(e.target.value) || 0 }))}
                    className="w-full font-black text-sm text-amber-950 bg-white border border-amber-300 rounded-xl px-2.5 py-2 outline-none tabular-nums"
                  />
                  <span className="text-xs font-bold text-amber-900 pr-1">pcs</span>
                </div>
              </div>
            </div>

            {/* 4. Tarification : Coût d'achat & Prix de vente */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-1">
                <label className="text-[10px] text-rose-900 font-extrabold uppercase flex items-center gap-1">
                  <Coins className="w-3 h-3 text-rose-700" />
                  <span>Coût d'Achat (PA)</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={formData.unit_cost || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full font-black text-sm text-rose-950 bg-white border border-rose-300 rounded-xl px-2.5 py-2 outline-none tabular-nums"
                  />
                  <span className="text-xs font-black text-rose-900 pr-1">F</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-1">
                <label className="text-[10px] text-emerald-900 font-extrabold uppercase flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-700" />
                  <span>Prix de Vente (PV)</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={formData.unit_price || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    required
                    className="w-full font-black text-sm text-emerald-950 bg-white border border-emerald-300 rounded-xl px-2.5 py-2 outline-none tabular-nums"
                  />
                  <span className="text-xs font-black text-emerald-900 pr-1">F</span>
                </div>
              </div>
            </div>

            {/* Marge calculée */}
            {formData.unit_price > 0 && formData.unit_cost > 0 && (
              <div className="p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-950">Marge brute par pièce :</span>
                <span className="font-black text-emerald-800 tabular-nums">
                  +{formatPrice(formData.unit_price - formData.unit_cost)} (+{Math.round(((formData.unit_price - formData.unit_cost) / formData.unit_cost) * 100)}%)
                </span>
              </div>
            )}

            {/* 5. Conditionnement Carton / Multiplicateur */}
            <div className="p-3 bg-white rounded-2xl border border-amber-300/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-amber-900 font-extrabold uppercase flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-700" />
                  <span>Vente par Carton / Gros</span>
                </label>
                <span className="text-[10px] text-gray-500">
                  {isCarton ? `1 carton = ${formData.multiplier} pcs` : 'Non activé'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-gray-600 block">Pièces par carton :</span>
                  <input
                    type="number"
                    value={formData.multiplier || 1}
                    onChange={(e) => setFormData((prev) => ({ ...prev, multiplier: parseInt(e.target.value) || 1 }))}
                    className="w-full font-bold text-xs bg-amber-50/40 border border-amber-300 rounded-lg px-2 py-1.5 outline-none tabular-nums"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-600 block">Prix carton complet :</span>
                  <input
                    type="number"
                    value={formData.wholesale_price || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, wholesale_price: parseFloat(e.target.value) || 0 }))}
                    placeholder="Ex: 10000"
                    className="w-full font-bold text-xs bg-amber-50/40 border border-amber-300 rounded-lg px-2 py-1.5 outline-none tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* 6. Code-barres */}
            <div className="p-3 bg-white rounded-2xl border border-amber-300/80 space-y-1">
              <label className="text-[10px] text-amber-900 font-extrabold uppercase flex items-center gap-1">
                <Barcode className="w-3 h-3 text-amber-700" />
                <span>Code-barres (optionnel)</span>
              </label>
              <input
                type="text"
                value={formData.barcode || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
                placeholder="Scanner ou taper le code-barres..."
                className="w-full font-bold text-xs text-gray-900 bg-amber-50/40 border border-amber-300 rounded-xl px-3 py-2 outline-none"
              />
            </div>
          </div>

          {/* Boutons d'Action Fixes en Bas */}
          <div className="flex-shrink-0 flex items-center justify-end gap-2.5 pt-3 mt-2 border-t border-amber-200 bg-[#fdfaf2]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 active:scale-[0.97] text-gray-800 text-xs font-black rounded-xl transition-all cursor-pointer font-mono flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Annuler</span>
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || saving}
              className="px-5 py-2.5 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white text-xs font-black rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] active:scale-[0.97] transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md font-mono"
            >
              <Save className="w-4 h-4" strokeWidth={1.75} />
              <span>{saving ? 'Enregistrement...' : 'Sauvegarder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
