'use client'

/**
 * StockWizardModal.tsx
 *
 * Wizard multi-étapes pour ajouter un produit au stock.
 * Étapes : Nom → Conditionnement → Prix achat/vente → Seuil alerte
 *
 * 100% UI — expose onComplete(product) pour laisser le parent gérer la sauvegarde.
 */

import React, { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Check, Package } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WizardProduct {
  name: string
  category: string
  packaging: string       // 'unité' | 'carton' | 'sac' | 'boite' | 'paquet'
  multiplier: number      // Ex: 1 carton = 24 bouteilles
  unit: string            // Ex: 'bouteille', 'pièce', 'kg'
  alertThreshold: number
  purchasePrice: number
  salePrice: number
  initialStock: number
}

interface StockWizardModalProps {
  isOpen: boolean
  shopActivity: string
  prefillName?: string
  prefillPrice?: number
  onClose: () => void
  onComplete: (product: WizardProduct) => Promise<void>
}

// ─── Données par défaut ─────────────────────────────────────────────────────

const PACKAGINGS = ['unité', 'carton', 'sac', 'boite', 'paquet', 'casier']
const UNITS = ['pièce', 'bouteille', 'kg', 'litre', 'sachet', 'bloc']

const CATEGORIES_BY_ACTIVITY: Record<string, string[]> = {
  boutique: ['Alimentation', 'Boissons', 'Fournitures', 'Hygiène', 'Divers'],
  resto:    ['Cuisine', 'Cafétéria', 'Boissons', 'Ingrédients', 'Divers'],
  prestations: ['Services', 'Produits capillaires', 'Matériel', 'Divers'],
  particulier: ['Foyer', 'Alimentation', 'École', 'Divers'],
}

// ─── Composant ─────────────────────────────────────────────────────────────

export function StockWizardModal({
  isOpen,
  shopActivity,
  prefillName = '',
  prefillPrice = 0,
  onClose,
  onComplete,
}: StockWizardModalProps) {
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  // Champs
  const [name, setName] = useState(prefillName)
  const [category, setCategory] = useState('')
  const [packaging, setPackaging] = useState('unité')
  const [multiplier, setMultiplier] = useState('1')
  const [unit, setUnit] = useState('pièce')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [salePrice, setSalePrice] = useState(prefillPrice > 0 ? String(prefillPrice) : '')
  const [initialStock, setInitialStock] = useState('0')
  const [alertThreshold, setAlertThreshold] = useState('5')

  const categories = CATEGORIES_BY_ACTIVITY[shopActivity] || CATEGORIES_BY_ACTIVITY.boutique
  const hasMultiplier = packaging !== 'unité'

  const reset = () => {
    setStep(1)
    setName(prefillName)
    setCategory('')
    setPackaging('unité')
    setMultiplier('1')
    setUnit('pièce')
    setPurchasePrice('')
    setSalePrice(prefillPrice > 0 ? String(prefillPrice) : '')
    setInitialStock('0')
    setAlertThreshold('5')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!isOpen) return null

  const handleComplete = async () => {
    setIsSaving(true)
    try {
      await onComplete({
        name: name.trim(),
        category: category || categories[0],
        packaging,
        multiplier: parseInt(multiplier) || 1,
        unit,
        alertThreshold: parseInt(alertThreshold) || 5,
        purchasePrice: parseInt(purchasePrice) || 0,
        salePrice: parseInt(salePrice) || 0,
        initialStock: parseInt(initialStock) || 0,
      })
      handleClose()
    } finally {
      setIsSaving(false)
    }
  }

  const STEP_LABELS = ['Produit', 'Conditionnement', 'Prix & Stock']
  const totalSteps = 3

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="bg-[#fffdf2] border border-amber-300 rounded-[28px] p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
            <h3 className="font-bold text-gray-900 text-lg">Nouveau Produit</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 active:scale-[0.97] p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-2">
          {STEP_LABELS.map((label, idx) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-1.5 ${idx + 1 <= step ? 'text-emerald-700' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  idx + 1 < step
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : idx + 1 === step
                    ? 'border-emerald-500 text-emerald-700'
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {idx + 1 < step ? <Check className="w-3 h-3" strokeWidth={2} /> : idx + 1}
                </div>
                <span className="text-[11px] font-semibold hidden sm:block">{label}</span>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div className={`flex-1 h-0.5 ${idx + 1 < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Étape 1 : Nom & Catégorie ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nom du produit *</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ex: Beaufort, Sardines, Flag..."
                className="w-full px-3 py-2.5 border border-amber-300 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Catégorie</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all cursor-pointer active:scale-[0.97] ${
                      category === cat
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Étape 2 : Conditionnement ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Comment vous achetez ce produit ?</label>
              <div className="flex flex-wrap gap-2">
                {PACKAGINGS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPackaging(p)}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-medium capitalize transition-all cursor-pointer active:scale-[0.97] ${
                      packaging === p
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {hasMultiplier && (
              <div className="bg-amber-50 rounded-xl p-3 space-y-3">
                <p className="text-xs text-amber-800 font-semibold">
                  1 {packaging} = combien d'unités individuelles ?
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={multiplier}
                    onChange={e => setMultiplier(e.target.value)}
                    min="1"
                    className="w-20 px-2 py-1.5 border border-amber-300 rounded-lg text-sm text-center font-bold focus:outline-none focus:border-emerald-500 font-mono tabular-nums"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {UNITS.map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnit(u)}
                        className={`px-2.5 py-1 text-[11px] rounded-lg border font-medium transition-all cursor-pointer active:scale-[0.97] ${
                          unit === u
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                            : 'bg-white text-gray-600 border-gray-300'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                {parseInt(multiplier) > 1 && (
                  <p className="text-xs text-emerald-700 font-bold flex items-center gap-1 font-mono tabular-nums">
                    <Check className="w-3.5 h-3.5 inline-block text-emerald-600" strokeWidth={1.75} />
                    1 {packaging} = {multiplier} {unit}s
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Étape 3 : Prix & Stock ── */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Prix d'achat (F)</label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Prix de vente (F) *</label>
                <input
                  autoFocus
                  type="number"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-amber-300 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white font-bold font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Stock initial</label>
                <input
                  type="number"
                  value={initialStock}
                  onChange={e => setInitialStock(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Alerte stock (min)</label>
                <input
                  type="number"
                  value={alertThreshold}
                  onChange={e => setAlertThreshold(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white font-mono tabular-nums"
                />
              </div>
            </div>

            {parseInt(purchasePrice) > 0 && parseInt(salePrice) > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-800 font-mono">
                <span className="font-bold">Marge unitaire : </span>
                <span className="tabular-nums tracking-tight font-black">
                  {(parseInt(salePrice) - parseInt(purchasePrice)).toLocaleString('fr-FR')} F
                </span>{' '}
                <span className="tabular-nums">
                  ({Math.round(((parseInt(salePrice) - parseInt(purchasePrice)) / parseInt(purchasePrice)) * 100)}%)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Boutons navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={step === 1 ? handleClose : () => setStep(s => s - 1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 active:scale-[0.97] transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
            <span>{step === 1 ? 'Annuler' : 'Retour'}</span>
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !name.trim()}
              className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 active:scale-[0.97] disabled:opacity-50 transition-all cursor-pointer shadow-xs"
            >
              <span>Suivant</span>
              <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={!name.trim() || !salePrice || isSaving}
              className="flex items-center gap-1.5 bg-amber-500 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-amber-600 active:scale-[0.97] disabled:opacity-50 transition-all shadow-md cursor-pointer"
            >
              {isSaving ? 'Enregistrement...' : (
                <>
                  <Check className="w-4 h-4" strokeWidth={1.75} />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
