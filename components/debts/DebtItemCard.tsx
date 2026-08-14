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
          ? 'opacity-40 bg-[#1a1715] border-gray-800 line-through'
          : 'bg-[#1e1a18] hover:bg-[#25201d] border-gray-800 shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Infos Dette */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">{debt.client_name || 'Client anonyme'}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border ${
                isSupplier
                  ? 'bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-800/60'
                  : 'bg-amber-950/40 text-amber-300 border-amber-800/60'
              }`}
            >
              {isSupplier ? 'FOURNISSEUR' : 'CLIENT'}
            </span>
          </div>

          {debt.notes && <p className="text-xs text-gray-400 font-mono italic">{debt.notes}</p>}

          <p className="text-[11px] text-gray-500 font-mono">
            Date : {new Date(debt.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>

        {/* Montant & Actions */}
        <div className="flex flex-col items-end gap-2">
          <span className={`text-sm font-extrabold font-mono ${isSupplier ? 'text-fuchsia-400' : 'text-amber-400'}`}>
            {formatPrice(debt.amount_owed)}
          </span>

          {!isSettled && (
            <div className="flex items-center gap-1.5">
              {!isSupplier && (
                <button
                  onClick={handleSendWhatsAppReminder}
                  className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 transition-colors border border-emerald-800/40"
                  title="Relancer par WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}

              {onOpenRepaymentModal && (
                <button
                  onClick={() => onOpenRepaymentModal(debt)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2a2421] text-amber-400 border border-gray-800 hover:bg-[#342d29] transition-all text-xs font-mono font-bold"
                >
                  <Calculator className="w-3.5 h-3.5" />
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
