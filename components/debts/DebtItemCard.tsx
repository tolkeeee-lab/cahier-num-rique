'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Share2, Calculator, AlertTriangle, Bell, Calendar } from 'lucide-react'

interface Debt {
  id: string
  client_name: string
  amount_owed: number
  paid_amount?: number
  debt_type?: 'client' | 'supplier'
  status: 'pending' | 'settled'
  created_at: string
  due_date?: string
  notes?: string
}

interface DebtItemCardProps {
  debt: Debt
  onOpenRepaymentModal?: (debt: Debt) => void
}

export const DebtItemCard: React.FC<DebtItemCardProps> = ({
  debt,
  onOpenRepaymentModal,
}) => {
  const isSettled = debt.status === 'settled' || debt.amount_owed <= 0
  const isSupplier = debt.debt_type === 'supplier'

  const todayStr = new Date().toISOString().split('T')[0]
  const isOverdue = !isSettled && debt.due_date && debt.due_date < todayStr
  const isDueToday = !isSettled && debt.due_date && debt.due_date === todayStr

  const handleSendWhatsAppReminder = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = encodeURIComponent(
      `Bonjour ${debt.client_name}, nous vous rappelons amicalement qu'il reste un solde impayé de ${formatPrice(debt.amount_owed)} sur votre compte chez notre boutique. Merci de passer pour régulariser.`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-200 ${
        isSettled
          ? 'bg-gray-50/80 border-gray-200 opacity-60'
          : isOverdue
          ? 'bg-rose-50/50 hover:bg-rose-50 border-rose-300 shadow-sm'
          : 'bg-white hover:bg-amber-50/50 border-amber-300/80 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Infos Dette */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-sm text-gray-900">{debt.client_name || 'Client anonyme'}</span>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase font-extrabold border ${
                isSupplier
                  ? 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              {isSupplier ? 'FOURNISSEUR' : 'CLIENT'}
            </span>

            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono bg-rose-100 text-rose-800 border border-rose-300 font-extrabold animate-pulse">
                <AlertTriangle className="w-3 h-3 text-rose-600" strokeWidth={1.75} />
                <span>En retard ({new Date(debt.due_date!).toLocaleDateString('fr-FR')})</span>
              </span>
            )}
            {isDueToday && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-200 text-amber-950 border border-amber-400 font-extrabold">
                <Bell className="w-3 h-3 text-amber-800" strokeWidth={1.75} />
                <span>Échéance aujourd'hui !</span>
              </span>
            )}
            {!isOverdue && !isDueToday && debt.due_date && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                <Calendar className="w-3 h-3 text-blue-600" strokeWidth={1.75} />
                <span>Promesse : {new Date(debt.due_date).toLocaleDateString('fr-FR')}</span>
              </span>
            )}
          </div>

          {debt.notes && <p className="text-xs text-gray-600 font-mono italic">{debt.notes}</p>}

          <p className="text-[11px] text-gray-500 font-mono">
            Date : {new Date(debt.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>

        {/* Montant & Actions */}
        <div className="flex flex-col items-end gap-2">
          <span className={`text-base font-black font-mono tabular-nums tracking-tight ${isSupplier ? 'text-fuchsia-900' : 'text-rose-900'}`}>
            {formatPrice(debt.amount_owed)}
          </span>

          {!isSettled && (
            <div className="flex items-center gap-1.5">
              {!isSupplier && (
                <button
                  type="button"
                  onClick={handleSendWhatsAppReminder}
                  className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 active:scale-[0.97] text-emerald-800 border border-emerald-300 transition-all duration-100 ease-out cursor-pointer"
                  title="Relancer par WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              )}

              {onOpenRepaymentModal && (
                <button
                  type="button"
                  onClick={() => onOpenRepaymentModal(debt)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 active:scale-[0.97] text-amber-950 border border-amber-300 transition-all duration-100 ease-out text-xs font-mono font-bold cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-700" strokeWidth={1.75} />
                  <span>Solder</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
