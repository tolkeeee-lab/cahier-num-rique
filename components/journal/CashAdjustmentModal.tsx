'use client'

import React, { useState } from 'react'
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

  if (!isOpen) return null

  const handleConfirm = () => {
    const val = parseFloat(amountInput) || 0
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1e1a18] border border-[#2a2421] rounded-2xl p-6 shadow-2xl space-y-5">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">Ajustement du Tiroir-Caisse</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Onglets de mode */}
        <div className="grid grid-cols-2 gap-2 bg-[#141210] p-1 rounded-xl border border-gray-800">
          <button
            type="button"
            onClick={() => setMode('flow')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'flow'
                ? 'bg-[#064e3b] text-[#f59e0b] shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Apport / Retrait
          </button>
          <button
            type="button"
            onClick={() => setMode('count')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'count'
                ? 'bg-[#064e3b] text-[#f59e0b] shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Comptage Physique
          </button>
        </div>

        {/* Solde Actuel */}
        <div className="bg-[#141210] p-3 rounded-xl border border-gray-800 flex justify-between items-center">
          <span className="text-xs text-gray-400 font-mono">Solde actuel théorique :</span>
          <span className="text-sm font-extrabold text-emerald-400 font-mono">
            {formatPrice(currentCash)}
          </span>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          {mode === 'flow' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFlowDirection('in')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    flowDirection === 'in'
                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                      : 'bg-[#141210] border-gray-800 text-gray-400'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                  <span>Apport (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlowDirection('out')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    flowDirection === 'out'
                      ? 'bg-rose-950/60 border-rose-700 text-rose-300'
                      : 'bg-[#141210] border-gray-800 text-gray-400'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-rose-400" />
                  <span>Retrait (-)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                  Montant (FCFA) :
                </label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="ex: 10000"
                  className="w-full px-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                Cash réellement compté en caisse (FCFA) :
              </label>
              <input
                type="number"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="ex: 45000"
                className="w-full px-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
              Motif / Note :
            </label>
            <input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="ex: Fond de caisse matin, Erreur rendu monnaie..."
              className="w-full px-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!amountInput || parseFloat(amountInput) <= 0}
            className="px-5 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#141210] text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50"
          >
            Enregistrer l'Ajustement
          </button>
        </div>
      </div>
    </div>
  )
}
