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
  const [rawWholesaleInput, setRawWholesaleInput] = React.useState<string>(() => {
    if (formData.unit_cost > 0 && formData.multiplier > 1) {
      return (formData.unit_cost * formData.multiplier).toString()
    }
    return ''
  })

  React.useEffect(() => {
    if (formData.unit_cost > 0 && formData.multiplier > 1 && !rawWholesaleInput) {
      setRawWholesaleInput((formData.unit_cost * formData.multiplier).toString())
    }
  }, [editingItem, formData.unit_cost, formData.multiplier])

  if (!isOpen) return null
  const isPrestation = formData.category.includes('Prestations')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="w-full max-w-sm bg-[#fdfaf2] border border-gray-300 shadow-2xl rounded-2xl overflow-hidden">

        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isPrestation ? 'bg-purple-100 border-purple-200 text-purple-950' : 'bg-[#f5f1e8] border-gray-200 text-gray-800'
        }`}>
          <h3 className="font-handwritten text-xl font-bold">
            {editingItem
              ? (isPrestation ? '✂️ Modifier la prestation' : 'Modifier le produit')
              : (isPrestation ? '✂️ Nouvelle Prestation / Service' : 'Nouveau produit')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">

          {/* Nom */}
          <div>
            <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">
              {isPrestation ? "Nom de la prestation / service *" : "Nom du produit *"}
            </label>
            <input
              type="text"
              placeholder={
                isPrestation
                  ? "ex: Coiffure Homme, Couture Robe, Réparation Téléphone, Lavage..."
                  : "ex: Riz 25kg, Huile palme 5L, Savon Lux..."
              }
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-handwritten outline-none focus:border-purple-400 transition-colors"
              autoFocus
            />

            {/* Pilules d'attributs rapides (Adaptées pour Prestations vs Produits) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
              <span className="text-[9px] font-bold text-gray-400 font-mono uppercase">Attributs :</span>
              {(isPrestation
                ? ['Tarif Fixe', 'Sur Devis', 'Par Heure', 'Express', 'Main d\'œuvre', 'Rendez-vous', 'Forfait']
                : ['100 Pages', '200 Pages', '300 Pages', 'Grand Format', 'Petit Format', 'Cartonné', 'Souple', 'TP', 'Boîte', 'Sachet']
              ).map(attr => (
                <button
                  key={attr}
                  type="button"
                  onClick={() => {
                    const currentName = formData.name.trim()
                    if (currentName.includes(attr)) return
                    setFormData(p => ({ ...p, name: currentName ? `${currentName} ${attr}` : attr }))
                  }}
                  className={`px-2 py-0.5 border rounded-lg text-[9.5px] font-bold transition-all hover:scale-105 active:scale-95 ${
                    isPrestation
                      ? 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900'
                      : 'bg-gray-100 hover:bg-amber-100 border-gray-200 text-gray-700'
                  }`}
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
                  <p className="text-[10px] text-gray-500 mt-0.5">Cet article a été vendu <strong className="text-amber-900 font-mono">{orphanPastSales} fois</strong> avant d'être officiellement ajouté au catalogue.</p>
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
                  <span>Déduire des saisies antérieures ({orphanPastSales} ventes)</span>
                </label>
              </div>
            </div>
          )}

          {/* Formulaire dédié Prestations & Services (Masquage Total des Champs Physique) */}
          {isPrestation ? (
            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-purple-900">
                <span className="text-base">✂️</span>
                <div>
                  <h4 className="font-bold text-xs">Prestation & Service Rendu</h4>
                  <p className="text-[10px] text-purple-700">Service manuel, atelier ou main d'œuvre. Aucun stock physique requis.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[9px] uppercase font-bold text-purple-950 tracking-wider font-sans block mb-1">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-gray-800 outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-purple-950 tracking-wider font-sans block mb-1">Tarif / Prix (FCFA) *</label>
                  <input
                    type="number" min="0" required
                    value={formData.unit_price || ''}
                    onChange={e => setFormData(p => ({ ...p, unit_price: parseInt(e.target.value) || 0 }))}
                    placeholder="Ex: 2000"
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-sm font-mono font-bold text-purple-950 outline-none"
                  />
                </div>
              </div>
            </div>
          ) : formData.category.includes('Cuisiné') || formData.category.includes('Cafétéria') ? (
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

              {/* 📦 Calculateur d'Achat en Gros / Carton / Sac (Nouveau & Mis en Avant) */}
              <div className="bg-[#fcf8ee] border border-amber-300 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                    <span>📦</span>
                    <span>Prix d'Achat en Gros & Nombre de Cartons</span>
                  </div>
                  <span className="text-[9px] font-mono text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                    Calcul unitaire auto
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[8px] uppercase font-bold text-amber-900 tracking-wider font-sans block mb-1">
                      Prix d'un carton / sac (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 12000 F"
                      value={rawWholesaleInput}
                      onChange={e => {
                        const rawVal = e.target.value
                        setRawWholesaleInput(rawVal)
                        const wholesaleVal = parseFloat(rawVal) || 0
                        const mult = formData.multiplier > 1 ? formData.multiplier : 1
                        const calculatedUnitCost = wholesaleVal > 0 && mult > 0
                          ? Math.round(wholesaleVal / mult)
                          : 0
                        setFormData(p => ({ ...p, unit_cost: calculatedUnitCost }))
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-amber-950 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] uppercase font-bold text-amber-900 tracking-wider font-sans block mb-1">
                      Pièces / unités par carton
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex: 24 pièces"
                      value={formData.multiplier > 1 ? formData.multiplier : ''}
                      onChange={e => {
                        const newMult = Math.max(1, parseInt(e.target.value) || 1)
                        const currentWholesale = parseFloat(rawWholesaleInput) || (formData.unit_cost * (formData.multiplier > 1 ? formData.multiplier : 1))
                        const newUnitCost = currentWholesale > 0 && newMult > 0 ? Math.round(currentWholesale / newMult) : formData.unit_cost
                        const currentCartons = formData.initial_stock > 0 ? Math.max(1, Math.round(formData.initial_stock / (formData.multiplier || 1))) : 1
                        setFormData(p => ({
                          ...p,
                          multiplier: newMult,
                          unit_cost: newUnitCost,
                          initial_stock: currentCartons * newMult,
                          packaging_name: p.packaging_name || 'carton'
                        }))
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-amber-950 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[8px] uppercase font-bold text-amber-900 tracking-wider font-sans block mb-1">
                      Cartons / sacs achetés
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 5 cartons"
                      value={formData.multiplier > 1 && formData.initial_stock > 0 ? Math.round(formData.initial_stock / formData.multiplier) : (formData.initial_stock > 0 ? formData.initial_stock : '')}
                      onChange={e => {
                        const cartons = parseInt(e.target.value) || 0
                        const mult = formData.multiplier > 1 ? formData.multiplier : 1
                        setFormData(p => ({
                          ...p,
                          initial_stock: cartons * mult
                        }))
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-amber-950 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {formData.multiplier > 1 && (formData.unit_cost > 0 || parseFloat(rawWholesaleInput) > 0) && (
                  <div className="bg-amber-100/90 border border-amber-300 p-2 rounded-xl text-[10px] text-amber-950 font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                    <span>
                      💡 <strong>{(parseFloat(rawWholesaleInput) || (formData.unit_cost * formData.multiplier)).toLocaleString('fr-FR')} F</strong> ÷ <strong>{formData.multiplier} pcs</strong> = <strong>{formData.unit_cost} F/unité</strong>
                    </span>
                    {formData.initial_stock > 0 && (
                      <span className="font-bold bg-white px-2 py-0.5 rounded-lg border border-amber-300 text-amber-900">
                        📦 Total en stock = {formData.initial_stock} {formData.unit || 'unités'} ({Math.round(formData.initial_stock / formData.multiplier)} cartons)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Prix d'Achat Unitaire & Prix de Vente Unitaire (Fixé par le Propriétaire) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-600 tracking-wider font-sans block mb-1">
                    Coût Achat Unitaire (F)
                  </label>
                  <input
                    type="number" min="0"
                    value={formData.unit_cost || ''}
                    onChange={e => setFormData(p => ({ ...p, unit_cost: parseInt(e.target.value) || 0 }))}
                    placeholder="Prix de revient"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-mono outline-none focus:border-amber-500 font-bold"
                  />
                  <p className="text-[8px] text-gray-400 mt-0.5">Calculé ou saisi manuellement</p>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-amber-900 tracking-wider font-sans block mb-1">
                    Prix Vente Unitaire (F) *
                  </label>
                  <input
                    type="number" min="0"
                    value={formData.unit_price || ''}
                    onChange={e => setFormData(p => ({ ...p, unit_price: parseInt(e.target.value) || 0 }))}
                    placeholder="Prix fixé par le gérant"
                    className="w-full px-3 py-2 bg-[#fefcf6] border-2 border-amber-400 rounded-xl text-sm font-mono font-bold text-amber-950 outline-none focus:border-amber-600 shadow-xs"
                  />
                </div>
                
                {formData.unit_price > 0 && formData.unit_cost > 0 && (
                  <div className="col-span-2 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-900">
                      💰 Marge Net / Unité : <strong className="text-emerald-950">+{formData.unit_price - formData.unit_cost} FCFA</strong>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {Math.round(((formData.unit_price - formData.unit_cost) / formData.unit_cost) * 100)}% de marge
                    </span>
                  </div>
                )}
              </div>

              {/* 🎁 Tarification Dégressive par Lot (Optionnel) */}
              <div className="border-t border-dashed border-amber-300 pt-3 bg-amber-50/50 p-3 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🎁</span>
                    <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wide">
                      Offre / Tarif par Lot (Optionnel)
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    Ex: 3 pour 275 F
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[8px] uppercase font-bold text-amber-900 tracking-wider font-sans block mb-1">
                      Taille du lot (Quantité)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.lot_quantity || ''}
                      onChange={e => setFormData(p => ({ ...p, lot_quantity: parseInt(e.target.value) || 0 }))}
                      placeholder="Ex: 3"
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-bold text-amber-900 tracking-wider font-sans block mb-1">
                      Prix Global du lot (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.lot_price || ''}
                      onChange={e => setFormData(p => ({ ...p, lot_price: parseInt(e.target.value) || 0 }))}
                      placeholder="Ex: 275"
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono outline-none focus:border-amber-500 font-bold text-amber-950"
                    />
                  </div>
                </div>

                {(formData.lot_quantity || 0) > 1 && (formData.lot_price || 0) > 0 && (
                  <div className="mt-2 text-[10px] text-amber-900 bg-amber-100/70 border border-amber-300 p-2 rounded-xl font-mono leading-tight">
                    💡 <strong>{formData.lot_quantity} {formData.name || 'articles'}</strong> vendus pour <strong>{formData.lot_price} FCFA</strong> au lieu de {(formData.unit_price || 0) * (formData.lot_quantity || 0)} FCFA
                    {(formData.unit_price || 0) * (formData.lot_quantity || 0) > (formData.lot_price || 0) && (
                      <span className="text-emerald-800 font-bold block mt-0.5">
                        (Réduction accordée au client : -{(formData.unit_price || 0) * (formData.lot_quantity || 0) - (formData.lot_price || 0)} FCFA)
                      </span>
                    )}
                  </div>
                )}
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
                  <div className="grid grid-cols-2 gap-3 bg-[#fefcf6] p-3 border border-amber-300 rounded-xl shadow-inner mt-2">
                    <div>
                      <label className="text-[8px] uppercase font-bold text-amber-900 block mb-0.5">Nom du lot / gros</label>
                      <input
                        type="text"
                        placeholder="ex: carton, sac, caisse"
                        value={formData.packaging_name}
                        onChange={e => setFormData(p => ({ ...p, packaging_name: e.target.value }))}
                        className="w-full px-2.5 py-1 border border-amber-300 rounded-lg text-xs outline-none focus:border-amber-500 font-mono bg-white text-amber-950 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] uppercase font-bold text-amber-900 block mb-0.5">Nombre d'unités par lot</label>
                      <input
                        type="number"
                        min="2"
                        value={formData.multiplier}
                        onChange={e => {
                          const newMult = Math.max(1, parseInt(e.target.value) || 1)
                          setFormData(p => ({ ...p, multiplier: newMult }))
                        }}
                        className="w-full px-2.5 py-1 border border-amber-300 rounded-lg text-xs outline-none focus:border-amber-500 font-mono bg-white text-amber-950 font-bold"
                      />
                    </div>

                    <div className="col-span-2 bg-white p-2.5 rounded-lg border border-amber-200">
                      <label className="text-[9px] uppercase font-bold text-amber-900 block mb-1">
                        Prix d'Achat du Lot Complet ({formData.packaging_name || 'Carton / Sac'}) (FCFA)
                      </label>
                      <input
                        type="number"
                        placeholder={`Ex: ${formData.unit_cost * formData.multiplier || 12000}`}
                        value={formData.unit_cost > 0 ? formData.unit_cost * formData.multiplier : ''}
                        onChange={e => {
                          const wholesaleVal = parseFloat(e.target.value) || 0
                          const calculatedUnitCost = wholesaleVal > 0 && formData.multiplier > 0
                            ? Math.round(wholesaleVal / formData.multiplier)
                            : 0
                          setFormData(p => ({ ...p, unit_cost: calculatedUnitCost }))
                        }}
                        className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-950 outline-none focus:border-amber-500"
                      />
                      <p className="text-[9px] text-amber-800 font-mono mt-1">
                        💡 Coût d'achat unitaire calculé : <strong>{formData.unit_cost} F / {formData.unit}</strong>
                      </p>
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
