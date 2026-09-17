'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Calculator, Banknote, Smartphone, Landmark, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface DebtRepaymentModalProps {
  isOpen: boolean
  onClose: () => void
  sale: any
  onConfirmRepayment: (saleId: string, amount: number, notes: string) => Promise<void>
  debtType?: 'client' | 'supplier'
  currentCash?: number
}

export const DebtRepaymentModal: React.FC<DebtRepaymentModalProps> = ({
  isOpen,
  onClose,
  sale,
  onConfirmRepayment,
  debtType,
  currentCash,
}) => {
  const [repayAmount, setRepayAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isSupplier = debtType === 'supplier' || sale?.debt_type === 'supplier'
  const parsedVal = parseFloat(repayAmount.replace(/\s/g, '').replace(/,/g, '.')) || 0
  const maxDebt = sale ? Number(sale.debt ?? sale.debt_amount ?? 0) : 0
  const isOverpaid = parsedVal > maxDebt
  const isCashShortage = isSupplier && typeof currentCash === 'number' && parsedVal > currentCash

  const handleConfirm = async () => {
    if (parsedVal <= 0 || isSubmitting || !sale || isOverpaid || isCashShortage) return

    setIsSubmitting(true)
    try {
      await onConfirmRepayment(sale.id, parsedVal, notes)
      onClose()
    } catch (err) {
      console.error('Erreur remboursement:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && parsedVal > 0 && !isSubmitting && !isOverpaid) {
        handleConfirm()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [isOpen, onClose, parsedVal, isSubmitting, isOverpaid])

  if (!isOpen || !sale) return null

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
            <Calculator className={`w-5 h-5 ${isSupplier ? 'text-fuchsia-700' : 'text-amber-700'}`} strokeWidth={1.75} />
            <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">
              {isSupplier ? 'Règlement Dette Grossiste / Fournisseur' : 'Règlement de Dette Client'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer active:scale-[0.97]"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Détails dette */}
        <div className={`${isSupplier ? 'bg-fuchsia-100/90 border-fuchsia-300' : 'bg-amber-100/90 border-amber-300'} p-4 rounded-xl border space-y-1 font-mono text-xs shadow-xs`}>
          <div className="flex justify-between text-gray-900 font-bold">
            <span className={isSupplier ? 'text-fuchsia-950' : 'text-amber-950'}>
              {isSupplier ? 'Fournisseur / Grossiste :' : 'Client :'}
            </span>
            <span className="font-extrabold text-gray-900">{sale.client || sale.client_name || (isSupplier ? 'Fournisseur divers' : 'Client anonyme')}</span>
          </div>
          <div className="flex justify-between text-rose-800 font-bold">
            <span>Dette Actuelle :</span>
            <span className="font-black tabular-nums tracking-tight">{formatPrice(maxDebt)}</span>
          </div>
          {isSupplier && typeof currentCash === 'number' && (
            <div className="flex justify-between text-gray-600 text-[11px] pt-1 border-t border-fuchsia-200/80">
              <span>Disponible en Caisse :</span>
              <span className={`font-bold tabular-nums ${currentCash < maxDebt ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatPrice(currentCash)}
              </span>
            </div>
          )}
        </div>

        {/* Formulaire */}
        <div className="space-y-3 font-mono text-xs">
          <div>
            <label className="block font-extrabold text-amber-950 uppercase mb-1">
              Montant Remboursé (FCFA) :
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              placeholder={`Max: ${maxDebt.toLocaleString('fr-FR')} F`}
              className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-base text-gray-900 font-black tabular-nums tracking-tight focus:outline-none focus:border-amber-500 shadow-inner"
            />

            {isOverpaid && (
              <div className="flex items-center gap-1.5 mt-1.5 text-rose-600 text-[11px] font-bold">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                <span>Le montant dépasse la dette restante ({formatPrice(maxDebt)}).</span>
              </div>
            )}

            {isCashShortage && (
              <div className="flex items-center gap-1.5 mt-1.5 text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 text-[11px] font-bold">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" strokeWidth={1.75} />
                <span>Solde insuffisant en caisse ({formatPrice(currentCash!)} disponible) pour payer ce montant.</span>
              </div>
            )}

            {/* Raccourcis de remboursement */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2">
              <button
                type="button"
                onClick={() => setRepayAmount(String(maxDebt))}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 border border-emerald-700 text-white font-black text-[11px] hover:bg-emerald-700 transition-all active:scale-[0.97] cursor-pointer shadow-xs"
              >
                Tout Solder (<span className="tabular-nums">{formatPrice(maxDebt)}</span>)
              </button>
              {[1000, 2000, 5000, 10000].filter(b => b < maxDebt).map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setRepayAmount(String(b))}
                  className="px-2.5 py-1 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 font-bold text-[11px] hover:bg-amber-200 transition-all active:scale-[0.97] cursor-pointer shadow-xs"
                >
                  <span className="tabular-nums">{formatPrice(b)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-extrabold text-amber-950 uppercase mb-1 text-[11px]">
              Mode de Règlement :
            </label>
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {[
                { label: 'Espèces', value: 'Espèces', icon: Banknote },
                { label: 'Wave / MoMo', value: 'Wave / Mobile Money', icon: Smartphone },
                { label: 'Virement', value: 'Virement bancaire', icon: Landmark },
              ].map(({ label, value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNotes(value)}
                  className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer shadow-xs active:scale-[0.97] flex items-center gap-1.5 ${
                    notes === value ? 'bg-amber-900 text-white border-amber-950' : 'bg-white border-amber-300 text-amber-950 hover:bg-amber-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>{label}</span>
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
            className="px-4 py-2 bg-gray-200 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-300 transition-colors cursor-pointer active:scale-[0.97]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!repayAmount || parsedVal <= 0 || isSubmitting || isOverpaid || isCashShortage}
            className={`px-5 py-2 text-white text-xs font-extrabold rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 cursor-pointer shadow-md ${
              isSupplier
                ? 'bg-gradient-to-r from-fuchsia-700 to-rose-700 hover:from-fuchsia-600 hover:to-rose-600'
                : 'bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#fbbf24] hover:to-[#f59e0b]'
            }`}
          >
            {isSubmitting 
              ? (isSupplier ? 'Décaissement...' : 'Enregistrement...') 
              : (isSupplier ? 'Valider le Décaissement' : 'Valider le Règlement')
            }
          </button>
        </div>
      </div>
    </div>
  )
}
