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

  const given = parseFloat(givenAmount.replace(/\s/g, '')) || 0
  const changeToReturn = Math.max(0, given - totalAmount)

  const quickBills = [500, 1000, 2000, 5000, 10000]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#fdfaf2] border-2 border-amber-300 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-amber-200 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-700" />
            <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">Calculateur de Rendu de Monnaie</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Montant de la facture */}
        <div className="bg-amber-100/90 p-4 rounded-xl border border-amber-300 space-y-1 font-mono text-xs shadow-xs">
          <div className="flex justify-between text-amber-950 font-bold">
            <span>Total Facture :</span>
            <span className="font-black text-gray-900">{formatPrice(totalAmount)}</span>
          </div>
        </div>

        {/* Saisie montant donné par le client */}
        <div className="space-y-3 font-mono text-xs">
          <label className="block font-mono font-extrabold text-amber-950 uppercase">
            Somme Donnée par le Client (FCFA) :
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={givenAmount}
            onChange={(e) => setGivenAmount(e.target.value)}
            placeholder="ex: 5 000"
            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-base text-gray-900 font-black focus:outline-none focus:border-amber-500 shadow-inner"
          />

          {/* Raccourcis billets & Compte Juste */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => setGivenAmount(String(totalAmount))}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 border border-emerald-700 text-xs font-mono font-black text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-xs"
            >
              Compte Juste ({formatPrice(totalAmount)})
            </button>
            <button
              type="button"
              onClick={() => setGivenAmount(prev => String((parseFloat(prev.replace(/\s/g, '')) || totalAmount) + 500))}
              className="px-3 py-1.5 rounded-xl bg-amber-200 border border-amber-400 text-xs font-mono font-black text-amber-950 hover:bg-amber-300 transition-all cursor-pointer shadow-xs"
            >
              +500 F
            </button>
            {quickBills.map((bill) => (
              <button
                key={bill}
                type="button"
                onClick={() => setGivenAmount(String(bill))}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-extrabold transition-all cursor-pointer shadow-xs ${
                  given === bill ? 'bg-amber-900 text-white border-amber-950 font-black' : 'bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200'
                }`}
              >
                {formatPrice(bill)}
              </button>
            ))}
          </div>
        </div>

        {/* Résultat Rendu de Monnaie */}
        {given > 0 && (
          <div className={`p-4 rounded-xl border font-mono text-center space-y-1 shadow-xs ${
            given >= totalAmount ? 'bg-emerald-100 border-emerald-300 text-emerald-950' : 'bg-rose-100 border-rose-300 text-rose-950'
          }`}>
            <p className="text-xs uppercase font-extrabold">
              {given >= totalAmount ? 'Monnaie à Rendre :' : 'Montant Insuffisant (Reste) :'}
            </p>
            <p className="text-xl font-black">
              {given >= totalAmount ? formatPrice(changeToReturn) : formatPrice(totalAmount - given)}
            </p>
          </div>
        )}

        {/* Action */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-300 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
