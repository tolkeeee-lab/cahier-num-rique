'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Lightbulb, Check } from 'lucide-react'

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
  React.useEffect(() => {
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

  if (!isOpen || !autoLearnData) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-[#fffdf2] border border-amber-300 rounded-[28px] p-6 max-w-md w-full shadow-2xl space-y-4 font-sans animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 border-b border-amber-200 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
          </div>
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
            <span className="text-emerald-700 font-mono tabular-nums">{formatPrice(autoLearnData.price)}</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed font-sans">
            Voulez-vous mémoriser définitivement « <strong>{autoLearnData.name}</strong> » pour que son nom et son tarif soient suggérés automatiquement lors des prochaines écritures au cahier ?
          </p>
        </div>

        <div className="flex gap-3 pt-2 font-mono">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-amber-300 text-amber-950 text-xs font-bold uppercase rounded-xl hover:bg-amber-50 transition-all cursor-pointer active:scale-[0.97]"
          >
            Non, une seule fois
          </button>
          <button
            type="button"
            onClick={() => onConfirmSave(autoLearnData.name, autoLearnData.price)}
            className="flex-1 py-2.5 px-4 bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-md active:scale-[0.97] cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Oui, Mémoriser</span>
          </button>
        </div>
      </div>
    </div>
  )
}
