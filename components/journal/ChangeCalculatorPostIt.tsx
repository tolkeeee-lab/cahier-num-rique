'use client'

/**
 * ChangeCalculatorPostIt.tsx
 *
 * Post-it de monnaie affiché après chaque vente cash.
 * Permet au commerçant de calculer rapidement la monnaie à rendre en 1 clic.
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

  const totalNum = parseFloat(changeTotal.replace(/\s/g, '')) || 0
  const receivedNum = parseFloat(changeReceived.replace(/\s/g, '')) || 0
  const realMonnaie = receivedNum - totalNum

  const monnaieColor = realMonnaie < 0 ? 'text-red-600' : realMonnaie === 0 ? 'text-gray-500' : 'text-emerald-700'
  const quickBills = [500, 1000, 2000, 5000, 10000]

  return (
    <div className="flex-shrink-0 bg-[#fffef0] border-2 border-yellow-400 rounded-2xl p-3.5 shadow-lg relative font-mono space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
      {/* Bouton fermer */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer"
        title="Fermer (Échap)"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center justify-between pr-6">
        <p className="text-[11px] font-black text-amber-900 uppercase tracking-wider">
          🧾 Calculateur de Rendu de Monnaie
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Total de la vente */}
        <div className="flex items-center justify-between bg-amber-50 p-2 rounded-xl border border-amber-200">
          <label className="text-xs font-bold text-gray-600">Total :</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={changeTotal}
              onChange={e => setChangeTotal(e.target.value)}
              className="w-24 text-sm font-black bg-white border border-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 text-right"
              placeholder="0"
            />
            <span className="text-xs font-bold text-gray-500">F</span>
          </div>
        </div>

        {/* Argent reçu */}
        <div className="flex items-center justify-between bg-amber-50 p-2 rounded-xl border border-amber-200">
          <label className="text-xs font-bold text-gray-600">Reçu :</label>
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={changeReceived}
              onChange={e => setChangeReceived(e.target.value)}
              className="w-24 text-sm font-black bg-white border border-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 text-right shadow-inner"
              placeholder="0"
            />
            <span className="text-xs font-bold text-gray-500">F</span>
          </div>
        </div>
      </div>

      {/* Raccourcis 1-clic Coupures FCFA */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <button
          type="button"
          onClick={() => setChangeReceived(String(totalNum))}
          className="px-2.5 py-1 rounded-xl bg-emerald-600 border border-emerald-700 text-[11px] font-black text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
        >
          Compte Juste
        </button>
        <button
          type="button"
          onClick={() => setChangeReceived(String((parseFloat(changeReceived.replace(/\s/g, '')) || totalNum) + 500))}
          className="px-2.5 py-1 rounded-xl bg-amber-200 border border-amber-400 text-[11px] font-black text-amber-950 hover:bg-amber-300 transition-all cursor-pointer shadow-xs"
        >
          +500 F
        </button>
        {quickBills.map(bill => (
          <button
            key={bill}
            type="button"
            onClick={() => setChangeReceived(String(bill))}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-extrabold transition-all cursor-pointer shadow-xs ${
              receivedNum === bill ? 'bg-amber-900 text-white border-amber-950 font-black' : 'bg-white border-amber-300 text-amber-950 hover:bg-amber-100'
            }`}
          >
            {bill.toLocaleString('fr-FR')} F
          </button>
        ))}
      </div>

      {/* Monnaie à rendre */}
      {changeReceived !== '' && (
        <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
          realMonnaie >= 0 ? 'bg-emerald-100 border-emerald-300' : 'bg-rose-100 border-rose-300'
        }`}>
          <span className="text-xs font-bold uppercase text-gray-700">
            {realMonnaie >= 0 ? 'Monnaie à rendre :' : 'Manque encore :'}
          </span>
          <span className={`text-lg font-black ${monnaieColor}`}>
            {realMonnaie >= 0 ? '+' : ''}{Math.abs(realMonnaie).toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      )}
    </div>
  )
}
