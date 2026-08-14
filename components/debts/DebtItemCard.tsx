'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Share2, Calculator } from 'lucide-react'

interface Debt {
  id: string
  client_name: string
  amount_owed: number
  paid_amount?: number
  debt_type?: 'client' | 'supplier'
  status: 'pending' | 'settled'
  created_at: string
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

  const handleSendWhatsAppReminder = () => {
    const msg = `Bonjour ${debt.client_name}, nous vous rappelons qu'un solde de ${formatPrice(debt.amount_owed)} reste à régler dans votre cahier. Merci !`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isSettled
          ? 'opacity-40 bg-gray-200/50 border-gray-300 line-through'
          : 'bg-white hover:bg-amber-50/50 border-amber-300/80 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Infos Dette */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
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
          </div>

          {debt.notes && <p className="text-xs text-gray-600 font-mono italic">{debt.notes}</p>}

          <p className="text-[11px] text-gray-500 font-mono">
            Date : {new Date(debt.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>

        {/* Montant & Actions */}
        <div className="flex flex-col items-end gap-2">
          <span className={`text-base font-black font-mono ${isSupplier ? 'text-fuchsia-900' : 'text-rose-900'}`}>
            {formatPrice(debt.amount_owed)}
          </span>

          {!isSettled && (
            <div className="flex items-center gap-1.5">
              {!isSupplier && (
                <button
                  type="button"
                  onClick={handleSendWhatsAppReminder}
                  className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer"
                  title="Relancer par WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}

              {onOpenRepaymentModal && (
                <button
                  type="button"
                  onClick={() => onOpenRepaymentModal(debt)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition-all text-xs font-mono font-bold cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-700" />
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
