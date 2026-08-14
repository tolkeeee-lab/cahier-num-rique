'use client'

/**
 * ChangeCalculatorPostIt.tsx
 *
 * Post-it de monnaie affiché après chaque vente cash.
 * Permet au commerçant de calculer rapidement la monnaie à rendre.
 * Se ferme en cliquant sur X ou en appuyant Échap.
 *
 * 100% UI — la logique est dans useChangeCalculator.
 */

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ChangeCalculatorPostItProps {
  show: boolean
  changeTotal: string
  setChangeTotal: (v: string) => void
  changeReceived: string
  setChangeReceived: (v: string) => void
  monnaie: number
  onDismiss: () => void
}

export function ChangeCalculatorPostIt({
  show,
  changeTotal,
  setChangeTotal,
  changeReceived,
  setChangeReceived,
  monnaie,
  onDismiss,
}: ChangeCalculatorPostItProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (show && inputRef.current) {
      inputRef.current.focus()
    }
  }, [show])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onDismiss])

  if (!show) return null

  const monnaieColor = monnaie < 0 ? 'text-red-600' : monnaie === 0 ? 'text-gray-500' : 'text-emerald-600'

  return (
    <div className="flex-shrink-0 bg-yellow-50 border border-yellow-300 rounded-xl px-3 py-2.5 shadow-md relative">
      {/* Bouton fermer */}
      <button
        onClick={onDismiss}
        className="absolute top-1.5 right-1.5 text-gray-400 hover:text-gray-700 transition-colors"
        title="Fermer (Échap)"
      >
        <X className="w-4 h-4" />
      </button>

      <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-2">
        🧾 Calculateur de Monnaie
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Total de la vente */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">Total :</label>
          <input
            type="number"
            value={changeTotal}
            onChange={e => setChangeTotal(e.target.value)}
            className="w-24 text-xs font-bold bg-white border border-yellow-300 rounded-lg px-2 py-1 focus:outline-none focus:border-yellow-500 text-right"
            placeholder="0"
          />
          <span className="text-xs text-gray-400">F</span>
        </div>

        {/* Argent reçu */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">Reçu :</label>
          <input
            ref={inputRef}
            type="number"
            value={changeReceived}
            onChange={e => setChangeReceived(e.target.value)}
            className="w-24 text-xs font-bold bg-white border border-yellow-300 rounded-lg px-2 py-1 focus:outline-none focus:border-yellow-500 text-right"
            placeholder="0"
          />
          <span className="text-xs text-gray-400">F</span>
        </div>

        {/* Monnaie à rendre */}
        {changeReceived !== '' && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-gray-500">Monnaie :</span>
            <span className={`text-sm font-extrabold ${monnaieColor}`}>
              {monnaie >= 0 ? '+' : ''}{monnaie.toLocaleString('fr-FR')} F
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
