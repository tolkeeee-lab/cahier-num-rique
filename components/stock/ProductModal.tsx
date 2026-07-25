'use client'

import React from 'react'
import { X } from 'lucide-react'
import { StockItem, StockFormState } from './types'
import { CATEGORIES, UNITS } from './stockUtils'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  editingItem: StockItem | null
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
  saving: boolean
  onSave: () => void
  orphanPastSales: number
  deductPastSales: boolean
  setDeductPastSales: (val: boolean) => void
}

export function ProductModal({
  isOpen,
  onClose,
  editingItem,
  formData,
  setFormData,
  saving,
  onSave,
  orphanPastSales,
  deductPastSales,
  setDeductPastSales,
}: ProductModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="w-full max-w-sm bg-[#fdfaf2] border border-gray-300 shadow-2xl rounded-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-[#f5f1e8]">
          <h3 className="font-handwritten text-xl font-bold text-gray-800">
            {editingItem ? 'Modifier le produit' : 'Nouveau produit'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">

          {/* Nom */}
          <div>
            <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Nom du produit *</label>
            <input
              type="text"
              placeholder="ex: Riz 25kg, Huile palme 5L, Savon Lux..."
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-handwritten outline-none focus:border-gray-400 transition-colors"
              autoFocus
            />

            {/* Pilules d'attributs rapides génériques (Papeterie & Commerce) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
              <span className="text-[9px] font-bold text-gray-400 font-mono uppercase">Attributs :</span>
              {[
                '100 Pages', '200 Pages', '300 Pages', 'Grand Format', 'Petit Format', 'Cartonné', 'Souple', 'TP', 'Boîte', 'Sachet'
              ].map(attr => (
                <button
                  key={attr}
                  type="button"
                  onClick={() => {
                    const currentName = formData.name.trim()
                    if (currentName.includes(attr)) return
                    setFormData(p => ({ ...p, name: currentName ? `${currentName} ${attr}` : attr }))
                  }}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-amber-100 border border-gray-200 hover:border-amber-300 rounded-lg text-[9.5px] font-bold text-gray-700 transition-all hover:scale-105 active:scale-95"
                >
                  +{attr}
                </button>
              ))}
            </div>
          </div>

          {/* Ventes antérieures détectées (Orphelin) */}
          {orphanPastSales > 0 && !editingItem && (
            <div className="bg-[#fffdf2] border border-amber-250 rounded-2xl p-3.5 text-xs space-y-2 select-none shadow-sm">
              <div className="flex gap-2 items-start text-amber-800">
                <span className="text-base flex-shrink-0">⚠️</span>
                <div className="leading-snug">
                  <p className="font-bold text-[11px]">Ventes passées détectées :</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Ce produit a été vendu <strong className="text-amber-900 font-mono">{orphanPastSales} fois</strong> avant d'être officiellement ajouté au catalogue.</p>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-amber-100 font-sans text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-medium">
                  <input
                    type="radio"
                    name="deductPastSales"
                    checked={!deductPastSales}
                    onChange={() => setDeductPastSales(false)}
                    className="text-gray-800 focus:ring-gray-800"
                  />
                  <span>Repartir à zéro (Ignorer les ventes passées)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-medium">
                  <input
                    type="radio"
                    name="deductPastSales"
                    checked={deductPastSales}
                    onChange={() => setDeductPastSales(true)}
                    className="text-gray-800 focus:ring-gray-800"
                  />
                  <span>Déduire du stock initial ({orphanPastSales} ventes)</span>
                </label>
              </div>
            </div>
          )}

          {/* Adaptateur dynamique Menu Carte vs Stock Physique */}
          {formData.category.includes('Cuisiné') || formData.category.includes('Cafétéria') ? (
            <div className="bg-amber-50 border border-amber-250 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-amber-900">
                <span className="text-base">🍽️</span>
                <div>
                  <h4 className="font-bold text-xs">Mode Plat / Menu Carte</h4>
                  <p className="text-[10px] text-amber-700">Plat cuisiné ou servi à la demande. Aucun stock physique d'alerte ni prix d'achat grossiste requis.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[9px] uppercase font-bold text-amber-950 tracking-wider font-sans block mb-1">Catégorie Carte</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-800 outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-amber-950 tracking-wider font-sans block mb-1">Prix Vente (FCFA) *</label>
                  <input
                    type="number" min="0" required
                    value={formData.unit_price || ''}
                    onChange={e => setFormData(p => ({ ...p, unit_price: parseInt(e.target.value) || 0 }))}
                    placeholder="Ex: 1500"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono font-bold text-amber-950 outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {formData.category.includes('Prestations') && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 flex items-center gap-2 text-purple-900 text-[10px] mb-3">
                  <span className="text-sm">✂️</span>
                  <p><strong>Carte Prestation / Service :</strong> Main d'œuvre ou service rendu (Coiffure, Couture, Réparation, Nettoyage). Aucun stock physique requis.</p>
                </div>
              )}
              {formData.category.includes('Matières') && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-emerald-900 text-[10px] mb-3">
                  <span className="text-sm">🥬</span>
                  <p><strong>Matière Première / Cuisine :</strong> Ingrédients achetés au marché (sacs de riz, huile, viandes, condiments) pour préparer les plats et calculer le bénéfice brut global de la cuisine.</p>
                </div>
              )}
              {formData.category.includes('Boissons') && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center gap-2 text-blue-900 text-[10px] mb-3">
                  <span className="text-sm">🥤</span>
                  <p><strong>Boisson / Bar en Stock :</strong> Produit acheté tout fait et revendu (avec suivi du nombre de bouteilles/casiers, prix d'achat grossiste et alerte de rupture).</p>
                </div>
              )}

              {/* Catégorie + Unité */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-gray-400"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Unité</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-gray-400"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Stock initial + Seuil alerte */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Stock initial</label>
                  <input
                    type="number" min="0"
                    value={formData.initial_stock}
                    onChange={e => setFormData(p => ({ ...p, initial_stock: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-gray-400"
                  />
                  <p className="text-[8px] text-gray-400 mt-0.5">Ce que tu as déjà</p>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Seuil d'alerte</label>
                  <input
                    type="number" min="0"
                    value={formData.alert_threshold}
                    onChange={e => setFormData(p => ({ ...p, alert_threshold: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-gray-400"
                  />
                  <p className="text-[8px] text-gray-400 mt-0.5">Alerte en dessous de</p>
                </div>
              </div>

              {/* Prix */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Prix achat (F)</label>
                  <input
                    type="number" min="0"
                    value={formData.unit_cost || ''}
                    onChange={e => setFormData(p => ({ ...p, unit_cost: parseInt(e.target.value) || 0 }))}
                    placeholder="Optionnel"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Prix vente (F)</label>
                  <input
                    type="number" min="0"
                    value={formData.unit_price || ''}
                    onChange={e => setFormData(p => ({ ...p, unit_price: parseInt(e.target.value) || 0 }))}
                    placeholder="Optionnel"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              {/* Conditionnement / Multiplicateur */}
              <div className="border-t border-dashed border-gray-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">📦 Conditionnement / Lots</span>
                  <input
                    type="checkbox"
                    checked={formData.multiplier > 1}
                    onChange={e => {
                      setFormData(p => ({
                        ...p,
                        multiplier: e.target.checked ? 50 : 1,
                        packaging_name: e.target.checked ? 'sac' : '',
                      }))
                    }}
                    className="rounded text-gray-800 focus:ring-gray-800"
                  />
                </div>

                {formData.multiplier > 1 && (
                  <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-gray-200 rounded-xl shadow-inner mt-2">
                    <div>
                      <label className="text-[8px] uppercase font-bold text-gray-500 block mb-0.5">Nom du lot</label>
                      <input
                        type="text"
                        placeholder="ex: sac, carton, pack"
                        value={formData.packaging_name}
                        onChange={e => setFormData(p => ({ ...p, packaging_name: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none focus:border-gray-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] uppercase font-bold text-gray-500 block mb-0.5">Contenance (Multiplicateur)</label>
                      <input
                        type="number"
                        min="2"
                        value={formData.multiplier}
                        onChange={e => setFormData(p => ({ ...p, multiplier: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none focus:border-gray-400 font-mono"
                      />
                    </div>
                    <div className="col-span-2 text-[8px] text-gray-400 leading-tight">
                      Chaque entrée/sortie de ce produit comptée dans le journal fera automatiquement <strong>+{formData.multiplier} / -{formData.multiplier} {formData.unit}</strong>.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 bg-[#f5f1e8]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            disabled={!formData.name.trim() || saving}
            className="flex-1 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-full text-xs font-bold disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
          >
            {saving ? 'Sauvegarde...' : editingItem ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
