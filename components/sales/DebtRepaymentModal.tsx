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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md bg-[#faf5e8] border border-[#e2d6be] rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-700" strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-stone-900">
              {isSupplier ? 'Règlement dette grossiste' : 'Règlement dette client'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer active:scale-[0.97]"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="bg-white border border-stone-200 p-4 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>{isSupplier ? 'Fournisseur' : 'Client'}</span>
            <span className="font-semibold text-stone-900">
              {sale.client || sale.client_name || (isSupplier ? 'Fournisseur divers' : 'Client anonyme')}
            </span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Dette actuelle</span>
            <span className="font-mono font-semibold text-rose-700 tabular-nums">{formatPrice(maxDebt)}</span>
          </div>
          {isSupplier && typeof currentCash === 'number' && (
            <div className="flex justify-between text-stone-500 text-[11px] pt-1.5 border-t border-stone-100">
              <span>Disponible en caisse</span>
              <span className={`font-mono font-semibold tabular-nums ${currentCash < maxDebt ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatPrice(currentCash)}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-stone-700 mb-1.5">
              Montant remboursé (FCFA)
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              placeholder={`Max : ${maxDebt.toLocaleString('fr-FR')} F`}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-base text-stone-900 font-mono font-semibold tabular-nums focus:outline-none focus:border-emerald-700"
            />

            {isOverpaid && (
              <div className="flex items-center gap-1.5 mt-1.5 text-rose-700 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
                <span>Le montant dépasse la dette restante ({formatPrice(maxDebt)}).</span>
              </div>
            )}

            {isCashShortage && (
              <div className="flex items-center gap-1.5 mt-1.5 text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" strokeWidth={1.5} />
                <span>Solde insuffisant en caisse ({formatPrice(currentCash!)} disponible).</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-wrap pt-2">
              <button
                type="button"
                onClick={() => setRepayAmount(String(maxDebt))}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-medium text-xs hover:bg-emerald-800 transition-colors active:scale-[0.97] cursor-pointer"
              >
                Tout solder (<span className="font-mono tabular-nums">{formatPrice(maxDebt)}</span>)
              </button>
              {[1000, 2000, 5000, 10000].filter(b => b < maxDebt).map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setRepayAmount(String(b))}
                  className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-medium text-xs hover:bg-stone-50 transition-colors active:scale-[0.97] cursor-pointer"
                >
                  <span className="font-mono tabular-nums">{formatPrice(b)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1.5">
              Mode de règlement
            </label>
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {[
                { label: 'Espèces', value: 'Espèces', icon: Banknote },
                { label: 'Wave / MoMo', value: 'Wave / Mobile Money', icon: Smartphone },
                { label: 'Virement', value: 'Virement bancaire', icon: Landmark },
              ].map(({ label, value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNotes(value)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer active:scale-[0.97] flex items-center gap-1.5 ${
                    notes === value
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex : Espèces, Wave..."
              className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-stone-200 text-stone-700 text-xs font-medium rounded-xl hover:bg-stone-50 transition-colors cursor-pointer active:scale-[0.97]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!repayAmount || parsedVal <= 0 || isSubmitting || isOverpaid || isCashShortage}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-xl transition-colors active:scale-[0.97] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting
              ? (isSupplier ? 'Décaissement...' : 'Enregistrement...')
              : (isSupplier ? 'Valider le décaissement' : 'Valider le règlement')}
          </button>
        </div>
      </div>
    </div>
  )
}
