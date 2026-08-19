'use client'

import React, { useState } from 'react'
import { X, Save, Sparkles } from 'lucide-react'
import { ProductFastForm } from './ProductFastForm'
import { ProductAdvancedForm } from './ProductAdvancedForm'
import { StockItem, StockFormState } from './types'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  editingItem?: StockItem | null
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
  saving?: boolean
  onSave: () => void
  orphanPastSales?: number
  deductPastSales?: boolean
  setDeductPastSales?: (val: boolean) => void
  initialMode?: 'fast' | 'advanced'
}

export function ProductModal({
  isOpen,
  onClose,
  editingItem,
  formData,
  setFormData,
  saving = false,
  onSave,
  initialMode = 'fast',
}: ProductModalProps) {
  const [mode, setMode] = useState<'fast' | 'advanced'>(editingItem ? 'advanced' : initialMode)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    onSave()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg bg-[#fdfaf2] border-2 border-amber-300 rounded-3xl p-4 sm:p-5 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Entête fixe */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-amber-200 pb-3 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" />
            <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">
              {editingItem ? 'Modifier le Produit' : 'Nouveau Produit en Stock'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Mode Rapide / Avancé */}
            {!editingItem && (
              <div className="flex items-center gap-1 bg-amber-100/80 p-1 rounded-xl border border-amber-300 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setMode('fast')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    mode === 'fast' ? 'bg-amber-800 text-white font-extrabold shadow-xs' : 'text-amber-900 font-bold'
                  }`}
                >
                  Rapide
                </button>
                <button
                  type="button"
                  onClick={() => setMode('advanced')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    mode === 'advanced' ? 'bg-amber-800 text-white font-extrabold shadow-xs' : 'text-amber-900 font-bold'
                  }`}
                >
                  Avancé
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-amber-100/80 hover:bg-amber-200 text-gray-700 hover:text-gray-950 rounded-xl transition-colors cursor-pointer border border-amber-300"
              title="Fermer la fenêtre"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formulaire avec scroll interne fluide */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1 sm:pr-1.5 space-y-4 scrollbar-thin">
            {mode === 'fast' ? (
              <ProductFastForm formData={formData} setFormData={setFormData} />
            ) : (
              <ProductAdvancedForm formData={formData} setFormData={setFormData} />
            )}
          </div>

          {/* Boutons d'Action Fixes en Bas */}
          <div className="flex-shrink-0 flex items-center justify-end gap-2.5 pt-3 mt-2 border-t border-amber-200 bg-[#fdfaf2]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-black rounded-xl transition-colors cursor-pointer font-mono"
            >
              ✕ Fermer
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || saving}
              className="px-5 py-2.5 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white text-xs font-black rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md font-mono"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Enregistrement...' : 'Sauvegarder le Produit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
