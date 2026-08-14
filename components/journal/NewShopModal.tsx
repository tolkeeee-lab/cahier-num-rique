'use client'

import React from 'react'
import { X, Store, Utensils, Scissors } from 'lucide-react'

interface NewShopModalProps {
  isOpen: boolean
  onClose: () => void
  newShopName: string
  onNameChange: (name: string) => void
  newShopActivity: 'boutique' | 'resto' | 'prestations'
  onActivityChange: (activity: 'boutique' | 'resto' | 'prestations') => void
  onCreate: () => void
}

export const NewShopModal: React.FC<NewShopModalProps> = ({
  isOpen,
  onClose,
  newShopName,
  onNameChange,
  newShopActivity,
  onActivityChange,
  onCreate,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1e1a18] border border-[#2a2421] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Entête Modale */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <h3 className="text-base font-extrabold text-white">Nouveau Point de Vente</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulaire */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1.5">
              Nom du Point de Vente :
            </label>
            <input
              type="text"
              value={newShopName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="ex: Annexe Akpakpa, Boutique 2..."
              className="w-full px-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1.5">
              Type d'Activité :
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onActivityChange('boutique')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  newShopActivity === 'boutique'
                    ? 'bg-[#064e3b] text-[#f59e0b] border-[#047857] font-bold shadow-md'
                    : 'bg-[#141210] text-gray-400 border-gray-800 hover:border-gray-700'
                }`}
              >
                <Store className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs block">Commerce</span>
              </button>

              <button
                type="button"
                onClick={() => onActivityChange('resto')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  newShopActivity === 'resto'
                    ? 'bg-[#064e3b] text-[#f59e0b] border-[#047857] font-bold shadow-md'
                    : 'bg-[#141210] text-gray-400 border-gray-800 hover:border-gray-700'
                }`}
              >
                <Utensils className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs block">Resto / Bar</span>
              </button>

              <button
                type="button"
                onClick={() => onActivityChange('prestations')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  newShopActivity === 'prestations'
                    ? 'bg-[#064e3b] text-[#f59e0b] border-[#047857] font-bold shadow-md'
                    : 'bg-[#141210] text-gray-400 border-gray-800 hover:border-gray-700'
                }`}
              >
                <Scissors className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs block">Service</span>
              </button>
            </div>
          </div>
        </div>

        {/* Boutons d'Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onCreate}
            disabled={!newShopName.trim()}
            className="px-5 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#141210] text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            Créer la Boutique
          </button>
        </div>
      </div>
    </div>
  )
}
