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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#fdfaf2] border-2 border-amber-300 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Entête Modale */}
        <div className="flex items-center justify-between border-b border-amber-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">Nouveau Point de Vente</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <div className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-xs font-mono font-extrabold text-amber-950 uppercase mb-1.5">
              Nom du Point de Vente :
            </label>
            <input
              type="text"
              value={newShopName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="ex: Annexe Akpakpa, Boutique 2..."
              className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-sm text-gray-900 font-extrabold placeholder-gray-400 focus:outline-none focus:border-amber-500 shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-extrabold text-amber-950 uppercase mb-1.5">
              Type d'Activité :
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onActivityChange('boutique')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  newShopActivity === 'boutique'
                    ? 'bg-amber-800 text-white border-amber-900 font-extrabold shadow-md'
                    : 'bg-white text-gray-700 border-amber-300 hover:bg-amber-50'
                }`}
              >
                <Store className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs block font-bold">Commerce</span>
              </button>

              <button
                type="button"
                onClick={() => onActivityChange('resto')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  newShopActivity === 'resto'
                    ? 'bg-amber-800 text-white border-amber-900 font-extrabold shadow-md'
                    : 'bg-white text-gray-700 border-amber-300 hover:bg-amber-50'
                }`}
              >
                <Utensils className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs block font-bold">Resto / Bar</span>
              </button>

              <button
                type="button"
                onClick={() => onActivityChange('prestations')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  newShopActivity === 'prestations'
                    ? 'bg-amber-800 text-white border-amber-900 font-extrabold shadow-md'
                    : 'bg-white text-gray-700 border-amber-300 hover:bg-amber-50'
                }`}
              >
                <Scissors className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs block font-bold">Service</span>
              </button>
            </div>
          </div>
        </div>

        {/* Boutons d'Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-300 transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={!newShopName.trim()}
            className="px-5 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
          >
            Créer la Boutique
          </button>
        </div>
      </div>
    </div>
  )
}
