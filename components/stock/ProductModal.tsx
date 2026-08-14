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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1e1a18] border border-[#2a2421] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">
              {editingItem ? 'Modifier le Produit' : 'Nouveau Produit en Stock'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Mode Rapide / Avancé */}
            {!editingItem && (
              <div className="flex items-center gap-1 bg-[#141210] p-1 rounded-xl border border-gray-800 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setMode('fast')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    mode === 'fast' ? 'bg-[#2a2421] text-amber-400 font-bold' : 'text-gray-400'
                  }`}
                >
                  Rapide
                </button>
                <button
                  type="button"
                  onClick={() => setMode('advanced')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    mode === 'advanced' ? 'bg-[#2a2421] text-amber-400 font-bold' : 'text-gray-400'
                  }`}
                >
                  Avancé
                </button>
              </div>
            )}

            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Formulaire selon mode */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'fast' ? (
            <ProductFastForm formData={formData} setFormData={setFormData} />
          ) : (
            <ProductAdvancedForm formData={formData} setFormData={setFormData} />
          )}

          {/* Boutons d'Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || saving}
              className="px-5 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#141210] text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Enregistrement...' : 'Sauvegarder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
