'use client'

import React, { useState } from 'react'
import { X, Calculator } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface DebtRepaymentModalProps {
  isOpen: boolean
  onClose: () => void
  sale: any
  onConfirmRepayment: (saleId: string, amount: number, notes: string) => Promise<void>
}

export const DebtRepaymentModal: React.FC<DebtRepaymentModalProps> = ({
  isOpen,
  onClose,
  sale,
  onConfirmRepayment,
}) => {
  const [repayAmount, setRepayAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !sale) return null

  const handleConfirm = async () => {
    const val = parseFloat(repayAmount.replace(/\s/g, '')) || 0
    if (val <= 0) return

    setIsSubmitting(true)
    try {
      await onConfirmRepayment(sale.id, val, notes)
      onClose()
    } catch (err) {
      console.error('Erreur remboursement:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#fdfaf2] border-2 border-amber-300 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-amber-200 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-700" />
            <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">Règlement de Dette Client</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Détails dette */}
        <div className="bg-amber-100/90 p-4 rounded-xl border border-amber-300 space-y-1 font-mono text-xs shadow-xs">
          <div className="flex justify-between text-amber-950 font-bold">
            <span>Client :</span>
            <span className="font-extrabold text-gray-900">{sale.client || 'Client anonyme'}</span>
          </div>
          <div className="flex justify-between text-rose-800 font-bold">
            <span>Dette Actuelle :</span>
            <span className="font-black">{formatPrice(sale.debt)}</span>
          </div>
        </div>

        {/* Formulaire */}
        <div className="space-y-3 font-mono text-xs">
          <div>
            <label className="block font-extrabold text-amber-950 uppercase mb-1">
              Montant Remboursé (FCFA) :
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              placeholder={`Max: ${sale.debt} F`}
              className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-base text-gray-900 font-black focus:outline-none focus:border-amber-500 shadow-inner"
            />

            {/* Raccourcis de remboursement */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2">
              <button
                type="button"
                onClick={() => setRepayAmount(String(sale.debt))}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 border border-emerald-700 text-white font-black text-[11px] hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
              >
                Tout Solder ({formatPrice(sale.debt)})
              </button>
              {[1000, 2000, 5000, 10000].filter(b => b < sale.debt).map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setRepayAmount(String(b))}
                  className="px-2.5 py-1 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 font-bold text-[11px] hover:bg-amber-200 transition-all cursor-pointer shadow-xs"
                >
                  {formatPrice(b)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-extrabold text-amber-950 uppercase mb-1">
              Mode de Règlement :
            </label>
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {['💵 Espèces', '📱 Wave / Mobile Money', '🏦 Virement'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setNotes(mode)}
                  className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer shadow-xs ${
                    notes === mode ? 'bg-amber-900 text-white border-amber-950' : 'bg-white border-amber-300 text-amber-950 hover:bg-amber-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: Espèces, Wave..."
              className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs text-gray-900 font-bold focus:outline-none focus:border-amber-500 shadow-inner"
            />
          </div>
        </div>

        {/* Actions */}
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
            onClick={handleConfirm}
            disabled={!repayAmount || parseFloat(repayAmount) <= 0 || isSubmitting}
            className="px-5 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            {isSubmitting ? 'Enregistrement...' : 'Valider le Règlement'}
          </button>
        </div>
      </div>
    </div>
  )
}
