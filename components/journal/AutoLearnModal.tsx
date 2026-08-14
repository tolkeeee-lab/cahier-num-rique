'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'

interface AutoLearnModalProps {
  isOpen: boolean
  autoLearnData: { name: string; price: number } | null
  onClose: () => void
  onConfirmSave: (name: string, price: number) => Promise<void>
}

export const AutoLearnModal: React.FC<AutoLearnModalProps> = ({
  isOpen,
  autoLearnData,
  onClose,
  onConfirmSave,
}) => {
  if (!isOpen || !autoLearnData) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#fffdf2] border border-amber-300 rounded-[28px] p-6 max-w-md w-full shadow-2xl space-y-4 font-sans animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-handwritten text-xl font-bold text-gray-900">
              Enregistrer ce produit au catalogue ?
            </h3>
            <p className="text-[10px] text-amber-800 font-mono">
              MÉMORISATION AUTOMATIQUE DE VOS SITES ET VENTES HABITUELLES
            </p>
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-gray-800">{autoLearnData.name}</span>
            <span className="text-emerald-700 font-mono">{formatPrice(autoLearnData.price)}</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed font-sans">
            Voulez-vous mémoriser définitivement « <strong>{autoLearnData.name}</strong> » pour que son nom et son tarif soient suggérés automatiquement lors des prochaines écritures au cahier ?
          </p>
        </div>

        <div className="flex gap-3 pt-2 font-mono">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-amber-300 text-amber-950 text-xs font-bold uppercase rounded-xl hover:bg-amber-50 transition-all"
          >
            Non, juste pour cette fois ✕
          </button>
          <button
            type="button"
            onClick={() => onConfirmSave(autoLearnData.name, autoLearnData.price)}
            className="flex-1 py-2.5 px-4 bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            👍 Oui, Mémoriser !
          </button>
        </div>
      </div>
    </div>
  )
}
