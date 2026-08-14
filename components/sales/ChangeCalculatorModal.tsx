'use client'

import React, { useState } from 'react'
import { X, Calculator } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface ChangeCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  totalAmount: number
}

export const ChangeCalculatorModal: React.FC<ChangeCalculatorModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
}) => {
  const [givenAmount, setGivenAmount] = useState('')

  if (!isOpen) return null

  const given = parseFloat(givenAmount) || 0
  const changeToReturn = Math.max(0, given - totalAmount)

  const quickBills = [500, 1000, 2000, 5000, 10000]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1e1a18] border border-[#2a2421] rounded-2xl p-6 shadow-2xl space-y-5">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">Calculateur de Rendu de Monnaie</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Montant de la facture */}
        <div className="bg-[#141210] p-4 rounded-xl border border-gray-800 space-y-1 font-mono text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Total Facture :</span>
            <span className="font-bold text-white">{formatPrice(totalAmount)}</span>
          </div>
        </div>

        {/* Saisie montant donné par le client */}
        <div className="space-y-3">
          <label className="block text-xs font-mono font-bold text-gray-300 uppercase">
            Somme Donnée par le Client (FCFA) :
          </label>
          <input
            type="number"
            value={givenAmount}
            onChange={(e) => setGivenAmount(e.target.value)}
            placeholder="ex: 5000"
            className="w-full px-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50 font-mono"
          />

          {/* Raccourcis billets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {quickBills.map((bill) => (
              <button
                key={bill}
                type="button"
                onClick={() => setGivenAmount(String(bill))}
                className="px-2.5 py-1 rounded-lg bg-[#2a2421] border border-gray-800 text-xs font-mono text-amber-400 hover:bg-[#342d29] transition-all"
              >
                {formatPrice(bill)}
              </button>
            ))}
          </div>
        </div>

        {/* Résultat Rendu de Monnaie */}
        {given > 0 && (
          <div className={`p-4 rounded-xl border font-mono text-center space-y-1 ${
            given >= totalAmount ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' : 'bg-rose-950/40 border-rose-800/60 text-rose-400'
          }`}>
            <p className="text-xs uppercase font-bold">
              {given >= totalAmount ? 'Monnaie à Rendre :' : 'Montant Insuffisant (Reste) :'}
            </p>
            <p className="text-xl font-extrabold">
              {given >= totalAmount ? formatPrice(changeToReturn) : formatPrice(totalAmount - given)}
            </p>
          </div>
        )}

        {/* Action */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
