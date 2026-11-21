'use client'

import React, { useState } from 'react'
import { formatPrice } from '@/lib/penUtils'
import { MessageCircle, Phone, Banknote, AlertTriangle, Calendar, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { getTodayDateString } from '@/lib/dateUtils'

export interface DebtHistoryEntry {
  id: string
  date: string
  time?: string
  type: string
  amount: number
  notes?: string
  articles?: Array<{ name?: string; quantity?: number; unit_price?: number }>
}

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
  shopName?: string
  history?: DebtHistoryEntry[]
  onOpenRepaymentModal?: (debt: Debt) => void
}

function extractPhoneNumber(str?: string): string {
  if (!str) return ''
  const match = str.match(/(?:\+?\d{1,4}[\s-]?)?(?:0\d{9}|\d{8,12})/)
  if (match) {
    const raw = match[0].replace(/[^\d+]/g, '')
    if (raw.length === 10 && raw.startsWith('0')) {
      return `225${raw.slice(1)}`
    }
    return raw.replace(/^\+/, '')
  }
  return ''
}

function getInitials(name?: string): string {
  const clean = (name || 'C').replace(/\+?\d[\d\s-]{6,}/g, '').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (clean.slice(0, 2) || 'CL').toUpperCase()
}

export const DebtItemCard: React.FC<DebtItemCardProps> = ({
  debt,
  shopName,
  history = [],
  onOpenRepaymentModal,
}) => {
  const [expanded, setExpanded] = useState(false)
  const isSettled = debt.status === 'settled' || debt.amount_owed <= 0
  const isSupplier = debt.debt_type === 'supplier'

  const todayStr = getTodayDateString()
  const isOverdue = !isSettled && Boolean(debt.due_date && debt.due_date < todayStr)
  const isDueToday = !isSettled && Boolean(debt.due_date && debt.due_date === todayStr)

  const paidAmount = Number(debt.paid_amount || 0)
  const totalContracted = Number(debt.amount_owed || 0) + paidAmount
  const paidPercent = totalContracted > 0 ? Math.min(100, Math.round((paidAmount / totalContracted) * 100)) : 0
  const targetPhone = extractPhoneNumber(debt.notes) || extractPhoneNumber(debt.client_name)

  const handleSendWhatsAppReminder = (e: React.MouseEvent) => {
    e.stopPropagation()
    const storeLabel = shopName ? `*${shopName}*` : 'notre boutique'
    const message = `Bonjour ${debt.client_name},\n\nNous vous rappelons amicalement qu'il reste un solde impayÃ© de *${formatPrice(debt.amount_owed)}* sur votre compte chez ${storeLabel}.\n\nMerci de bien vouloir passer Ã  la boutique pour rÃ©gulariser votre situation.\nExcellente journÃ©e !`

    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isSettled
          ? 'bg-stone-50/80 border-stone-900/10 opacity-75'
          : isOverdue
          ? 'bg-[#faf5e8] border-rose-300'
          : 'bg-[#faf5e8] border-stone-900/10 hover:border-stone-900/20'
      }`}
    >
      <div className="p-3.5 space-y-3">
        {/* En-tÃªte : Avatar + IdentitÃ© + Montant */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 border ${
                isSettled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-900/15'
                  : isSupplier
                  ? 'bg-stone-100 text-stone-700 border-violet-900/15'
                  : 'bg-[#faf5e8] text-stone-800 border-stone-900/10'
              }`}
            >
              {isSettled ? <CheckCircle2 className="w-4 h-4 text-emerald-700" strokeWidth={1.75} /> : getInitials(debt.client_name)}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm text-stone-950 truncate">
                  {debt.client_name || 'Client anonyme'}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                    isSupplier
                      ? 'bg-stone-100 text-stone-700 border-violet-900/15'
                      : 'bg-[#faf5e8] text-stone-700 border-stone-900/10'
                  }`}
                >
                  {isSupplier ? 'Fournisseur' : 'Client'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-[11px] text-stone-500">
                <span className="font-mono">
                  {new Date(debt.created_at).toLocaleDateString('fr-FR')}
                </span>
                {isOverdue && (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                    <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
                    <span>En retard ({new Date(debt.due_date!).toLocaleDateString('fr-FR')})</span>
                  </span>
                )}
                {isDueToday && (
                  <span className="inline-flex items-center gap-1 text-amber-800 font-medium">
                    <Calendar className="w-3 h-3" strokeWidth={1.75} />
                    <span>Ã‰chÃ©ance aujourd&apos;hui</span>
                  </span>
                )}
                {!isOverdue && !isDueToday && debt.due_date && (
                  <span className="inline-flex items-center gap-1 text-stone-600">
                    <Calendar className="w-3 h-3" strokeWidth={1.75} />
                    <span>Promesse {new Date(debt.due_date).toLocaleDateString('fr-FR')}</span>
                  </span>
                )}
              </div>

              {debt.notes && (
                <p className="text-xs text-stone-600 line-clamp-1 pt-0.5">{debt.notes}</p>
              )}
            </div>
          </div>

          {/* Solde restant */}
          <div className="text-right flex-shrink-0">
            <div
              className={`text-base font-semibold font-mono tabular-nums tracking-tight ${
                isSettled
                  ? 'text-emerald-800 line-through'
                  : isSupplier
                  ? 'text-stone-950'
                  : 'text-rose-900'
              }`}
            >
              {formatPrice(debt.amount_owed)}
            </div>
            <div className="text-[10px] text-stone-500">
              {isSettled ? 'SoldÃ©' : 'Reste Ã  payer'}
            </div>
          </div>
        </div>

        {/* Barre de progression si des acomptes ont dÃ©jÃ  Ã©tÃ© versÃ©s */}
        {paidAmount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono tabular-nums">
              <span>DÃ©jÃ  rÃ©glÃ© : {formatPrice(paidAmount)}</span>
              <span>{paidPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-stone-900/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-[width] duration-300"
                style={{ width: `${paidPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Barre d'actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-900/10">
          {/* Bouton DÃ©tails / Historique */}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-950 transition-colors cursor-pointer"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.75} />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />
            )}
            <span>
              Historique{history.length > 0 ? ` (${history.length})` : ''}
            </span>
          </button>

          {/* Actions rapides */}
          {!isSettled && (
            <div className="flex items-center gap-1.5">
              {targetPhone && (
                <a
                  href={`tel:+${targetPhone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-[#faf5e8] hover:bg-stone-200/70 text-stone-700 border border-stone-900/10 transition-colors active:scale-[0.97]"
                  title={`Appeler (+${targetPhone})`}
                >
                  <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
                </a>
              )}

              {!isSupplier && (
                <button
                  type="button"
                  onClick={handleSendWhatsAppReminder}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-900/15 text-xs font-medium transition-colors active:scale-[0.97] cursor-pointer"
                  title="Relancer par WhatsApp (1-Clic)"
                >
                  <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Relancer</span>
                </button>
              )}

              {onOpenRepaymentModal && (
                <button
                  type="button"
                  onClick={() => onOpenRepaymentModal(debt)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#064e3b] hover:bg-[#075e47] text-[#f59e0b] text-xs font-semibold transition-colors active:scale-[0.97] cursor-pointer"
                >
                  <Banknote className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>{isSupplier ? 'Payer' : 'Encaisser'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Historique dÃ©pliable des crÃ©dits & acomptes de ce client */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-stone-900/10 bg-[#faf5e8]/60 rounded-b-xl space-y-1.5">
          {history.length === 0 ? (
            <p className="text-[11px] text-stone-500">
              Aucun dÃ©tail d&apos;opÃ©ration locale disponible pour ce compte.
            </p>
          ) : (
            history.slice(0, 8).map((entry) => {
              const isPayment = entry.type === 'payment_client' || entry.type === 'payment_supplier'
              const articleSummary =
                entry.articles && entry.articles.length > 0
                  ? entry.articles.map((a) => `${a.quantity || 1}x ${a.name || 'Article'}`).join(', ')
                  : entry.notes || (isPayment ? 'Remboursement' : 'CrÃ©dit')

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-stone-900/5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-stone-500 mr-2">
                      {entry.date}
                      {entry.time ? ` ${entry.time}` : ''}
                    </span>
                    <span className="text-stone-800 truncate">{articleSummary}</span>
                  </div>
                  <span
                    className={`font-mono font-semibold tabular-nums flex-shrink-0 ${
                      isPayment ? 'text-emerald-700' : 'text-rose-800'
                    }`}
                  >
                    {isPayment ? `-${formatPrice(entry.amount)}` : `+${formatPrice(entry.amount)}`}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
