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
    const val = parseFloat(repayAmount) || 0
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1e1a18] border border-[#2a2421] rounded-2xl p-6 shadow-2xl space-y-5">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">Règlement de Dette Client</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Détails dette */}
        <div className="bg-[#141210] p-4 rounded-xl border border-gray-800 space-y-1 font-mono text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Client :</span>
            <span className="font-bold text-white">{sale.client || 'Client anonyme'}</span>
          </div>
          <div className="flex justify-between text-amber-400">
            <span>Dette Actuelle :</span>
            <span className="font-bold">{formatPrice(sale.debt)}</span>
          </div>
        </div>

        {/* Formulaire */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
              Montant Remboursé (FCFA) :
            </label>
            <input
              type="number"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              placeholder={`Max: ${sale.debt}`}
              className="w-full px-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
              Note / Mode de Paiement :
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: Cash, Mobile Money..."
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
            disabled={!repayAmount || parseFloat(repayAmount) <= 0 || isSubmitting}
            className="px-5 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#141210] text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Enregistrement...' : 'Valider le Règlement'}
          </button>
        </div>
      </div>
    </div>
  )
}
