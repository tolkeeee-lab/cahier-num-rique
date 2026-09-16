'use client'

import React, { useState, useEffect } from 'react'
import { X, ArrowDownRight, ArrowUpRight, Calculator } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface CashAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  currentCash: number
  onSaveAdjustment: (data: {
    type: 'flow' | 'count'
    amount?: number
    direction?: 'in' | 'out'
    physicalAmount?: number
    notes: string
  }) => void
}

export const CashAdjustmentModal: React.FC<CashAdjustmentModalProps> = ({
  isOpen,
  onClose,
  currentCash,
  onSaveAdjustment,
}) => {
  const [mode, setMode] = useState<'flow' | 'count'>('flow')
  const [flowDirection, setFlowDirection] = useState<'in' | 'out'>('in')
  const [amountInput, setAmountInput] = useState('')
  const [notesInput, setNotesInput] = useState('')

  useEffect(() => {
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

  if (!isOpen) return null

  const handleConfirm = () => {
    const val = parseFloat(amountInput.replace(/\s+/g, '').replace(',', '.')) || 0
    if (val <= 0) return

    if (mode === 'flow') {
      onSaveAdjustment({
        type: 'flow',
        amount: val,
        direction: flowDirection,
        notes: notesInput || (flowDirection === 'in' ? 'Apport fond de caisse' : 'Retrait de caisse')
      })
    } else {
      onSaveAdjustment({
        type: 'count',
        physicalAmount: val,
        notes: notesInput || `Comptage physique: ${formatPrice(val)}`
      })
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md bg-[#fdfaf2] border-2 border-amber-300 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-amber-200 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
            <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">Ajustement du Tiroir-Caisse</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer active:scale-[0.97]"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Onglets de mode */}
        <div className="grid grid-cols-2 gap-2 bg-amber-100/80 p-1 rounded-xl border border-amber-300">
          <button
            type="button"
            onClick={() => setMode('flow')}
            className={`py-2 text-xs font-bold rounded-lg transition-all active:scale-[0.97] cursor-pointer ${
              mode === 'flow'
                ? 'bg-amber-800 text-white font-extrabold shadow-xs'
                : 'text-amber-900 hover:text-black font-bold'
            }`}
          >
            Apport / Retrait
          </button>
          <button
            type="button"
            onClick={() => setMode('count')}
            className={`py-2 text-xs font-bold rounded-lg transition-all active:scale-[0.97] cursor-pointer ${
              mode === 'count'
                ? 'bg-amber-800 text-white font-extrabold shadow-xs'
                : 'text-amber-900 hover:text-black font-bold'
            }`}
          >
            Comptage Physique
          </button>
        </div>

        {/* Solde Actuel */}
        <div className="bg-amber-100/90 p-3 rounded-xl border border-amber-300 flex justify-between items-center font-mono">
          <span className="text-xs text-amber-950 font-bold">Solde actuel théorique :</span>
          <span className="text-sm font-black text-emerald-800 font-mono tabular-nums">
            {formatPrice(currentCash)}
          </span>
        </div>

        {/* Inputs */}
        <div className="space-y-3 font-mono text-xs">
          {mode === 'flow' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFlowDirection('in')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer ${
                    flowDirection === 'in'
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-black shadow-xs'
                      : 'bg-white border-amber-300 text-gray-700'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 text-emerald-700" strokeWidth={1.75} />
                  <span>Apport (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlowDirection('out')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer ${
                    flowDirection === 'out'
                      ? 'bg-rose-100 border-rose-300 text-rose-900 font-black shadow-xs'
                      : 'bg-white border-amber-300 text-gray-700'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-rose-700" strokeWidth={1.75} />
                  <span>Retrait (-)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-mono font-extrabold text-amber-950 uppercase mb-1">
                  Montant (FCFA) :
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="ex: 10000"
                  className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-sm text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner font-mono tabular-nums"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-mono font-extrabold text-amber-950 uppercase mb-1">
                Cash réellement compté en caisse (FCFA) :
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="ex: 45000"
                className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-sm text-gray-900 font-extrabold focus:outline-none focus:border-amber-500 shadow-inner font-mono tabular-nums"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-extrabold text-amber-950 uppercase mb-1">
              Motif / Note :
            </label>
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="ex: Fond de caisse matin, Erreur rendu monnaie..."
              className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-sm text-gray-900 font-bold focus:outline-none focus:border-amber-500 shadow-inner"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-300 active:scale-[0.97] transition-all cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!amountInput || parseFloat(amountInput.replace(/\s+/g, '').replace(',', '.')) <= 0}
            className="px-5 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] active:scale-[0.97] transition-all disabled:opacity-50 cursor-pointer shadow-md font-mono"
          >
            Enregistrer l'Ajustement
          </button>
        </div>
      </div>
    </div>
  )
}
