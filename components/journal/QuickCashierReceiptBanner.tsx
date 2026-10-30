'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, Share2, Receipt, X, ArrowRight, CornerDownLeft } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'
import { audioFeedback } from '@/lib/audioFeedback'
import { OfflineSale } from '@/lib/offlineDb'

interface QuickCashierReceiptBannerProps {
  sale: OfflineSale | null
  shopName?: string
  shopPhone?: string
  shopAddress?: string
  onDismiss: () => void
  onOpenFullReceiptModal: (saleWithChange: OfflineSale & { amountGiven?: number; changeReturned?: number }) => void
}

export const QuickCashierReceiptBanner: React.FC<QuickCashierReceiptBannerProps> = ({
  sale,
  shopName = 'Ma Boutique',
  shopPhone = '',
  shopAddress = '',
  onDismiss,
  onOpenFullReceiptModal,
}) => {
  const [givenAmountStr, setGivenAmountStr] = useState<string>('')
  const [changeReturned, setChangeReturned] = useState<number | null>(null)

  useEffect(() => {
    if (sale) {
      setGivenAmountStr('')
      setChangeReturned(null)
    }
  }, [sale?.id])

  if (!sale || sale.total <= 0) return null

  const total = sale.total || 0
  const isCredit = sale.type === 'sale_credit' || (sale.debt || 0) > 0

  const handleSelectGivenAmount = (amount: number) => {
    audioFeedback.playTick()
    setGivenAmountStr(String(amount))
    const diff = amount - total
    setChangeReturned(diff >= 0 ? diff : null)
  }

  const handleGivenInputChange = (val: string) => {
    setGivenAmountStr(val)
    const num = parseFloat(val.replace(/[^\d]/g, '')) || 0
    if (num > 0) {
      const diff = num - total
      setChangeReturned(diff >= 0 ? diff : null)
    } else {
      setChangeReturned(null)
    }
  }

  // Coupures rapides en FCFA
  const standardBills = [500, 1000, 2000, 5000, 10000]
  const relevantBills = standardBills.filter(b => b >= total)
  if (relevantBills.length === 0) {
    relevantBills.push(Math.ceil(total / 5000) * 5000)
    relevantBills.push((Math.ceil(total / 5000) + 1) * 5000)
  }

  const handleOneClickWhatsApp = () => {
    audioFeedback.playPenClick()
    const dateStr = sale.date || new Date().toLocaleDateString('fr-FR')
    const timeStr = sale.time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const clientName = sale.client || 'Client'
    const paid = sale.paid ?? total
    const debt = sale.debt || 0
    const givenNum = parseFloat(givenAmountStr.replace(/[^\d]/g, '')) || 0

    let articlesText = ''
    if (sale.articles && sale.articles.length > 0) {
      articlesText = sale.articles
        .map(a => `• ${a.quantity}x ${a.name} (${formatPrice(a.unit_price)}) : ${formatPrice(a.quantity * a.unit_price)}`)
        .join('\n')
    } else if (sale.notes) {
      articlesText = `• ${sale.notes}`
    } else {
      articlesText = `• Achat comptant : ${formatPrice(total)}`
    }

    const shopHeaderLines = [
      `🧾 *REÇU DE CAISSE* — ${shopName}`,
      shopAddress ? `📍 ${shopAddress}` : '',
      shopPhone ? `📞 ${shopPhone}` : '',
      `📅 *Date :* ${dateStr} à ${timeStr}`,
      `👤 *Client :* ${clientName}`,
    ].filter(Boolean).join('\n')

    const changeLines = givenNum > 0 && changeReturned !== null
      ? `💵 *Montant remis :* ${formatPrice(givenNum)}\n🤝 *Monnaie rendue :* ${formatPrice(changeReturned)}\n`
      : ''

    const receiptText = `${shopHeaderLines}

📦 *Articles :*
${articlesText}

----------------------------
💰 *TOTAL :* ${formatPrice(total)}
💵 *Payé :* ${formatPrice(paid)}
${changeLines}${debt > 0 ? `💳 *Reste à payer (Dette) :* ${formatPrice(debt)}\n` : ''}----------------------------
🙏 _Merci de votre confiance et à très bientôt !_`

    window.open(`https://wa.me/?text=${encodeURIComponent(receiptText)}`, '_blank')
  }

  const handleOpenDetailedModal = () => {
    const givenNum = parseFloat(givenAmountStr.replace(/[^\d]/g, '')) || undefined
    onOpenFullReceiptModal({
      ...sale,
      amountGiven: givenNum,
      changeReturned: changeReturned ?? undefined,
    })
  }

  return (
    <aside 
      aria-label="Expérience Caisse et Reçu"
      className="flex-shrink-0 bg-[#fffdfa] border-2 border-amber-300/90 rounded-2xl p-3 shadow-xl relative font-mono space-y-2.5 animate-in slide-in-from-bottom-3 duration-200 z-30 ring-2 ring-amber-400/20"
      style={{
        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.9), 0 4px 16px -2px rgba(0, 0, 0, 0.12)',
      }}
    >
      {/* Ligne 1 : Titre de la vente et bouton fermer */}
      <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" strokeWidth={1.75} />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs font-black text-gray-900 tracking-tight truncate">
              {sale.client && sale.client !== 'Client' ? `${sale.client} • ` : ''}
              {sale.articles && sale.articles.length > 0 
                ? sale.articles.map(a => `${a.quantity} ${a.name}`).join(', ')
                : (sale.notes || 'Vente enregistrée')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300">
            <span className="text-xs font-black text-amber-950 tabular-nums tracking-tight">
              {formatPrice(total)}
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer active:scale-[0.97]"
            title="Fermer ce bandeau"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Ligne 2 : Coupures espèces & Rendu de monnaie (uniquement pour les ventes cash) */}
      {!isCredit && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wide">
              Coupures & Monnaie :
            </span>

            {/* Rendu affiché en direct si calculé */}
            {changeReturned !== null && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 font-black text-xs animate-in fade-in zoom-in-95 duration-150">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-700" strokeWidth={2} />
                <span>Rendu :</span>
                <span className="text-emerald-900 font-extrabold tabular-nums tracking-tight">
                  {formatPrice(changeReturned)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Bouton Compte Juste */}
            <button
              type="button"
              onClick={() => handleSelectGivenAmount(total)}
              className="px-2.5 py-1 rounded-xl bg-emerald-600 border border-emerald-700 text-white font-extrabold text-[11px] hover:bg-emerald-700 transition-all cursor-pointer shadow-2xs active:scale-[0.97] flex items-center gap-1"
            >
              <CornerDownLeft className="w-3 h-3" strokeWidth={2} />
              <span>Compte Juste</span>
            </button>

            {/* Coupures pertinentes */}
            {relevantBills.map(bill => (
              <button
                key={bill}
                type="button"
                onClick={() => handleSelectGivenAmount(bill)}
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-extrabold transition-all cursor-pointer shadow-2xs active:scale-[0.97] ${
                  parseFloat(givenAmountStr) === bill
                    ? 'bg-amber-900 text-white border-amber-950 font-black ring-1 ring-amber-400'
                    : 'bg-white border-amber-300 text-amber-950 hover:bg-amber-100'
                }`}
              >
                <span className="tabular-nums">{bill.toLocaleString('fr-FR')} F</span>
              </button>
            ))}

            {/* Saisie montant libre */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[10px] text-gray-500 font-bold hidden sm:inline">Reçu :</span>
              <input
                type="text"
                inputMode="numeric"
                value={givenAmountStr}
                onChange={(e) => handleGivenInputChange(e.target.value)}
                placeholder="Autre..."
                className="w-20 px-2 py-0.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-gray-900 text-right tabular-nums focus:outline-none focus:border-amber-500 shadow-inner"
              />
              <span className="text-[10px] text-gray-500 font-bold">F</span>
            </div>
          </div>
        </div>
      )}

      {/* Ligne 3 : Actions Reçu WhatsApp 1-Clic */}
      <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60">
        <button
          type="button"
          onClick={handleOneClickWhatsApp}
          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.97]"
          title="Partager immédiatement le reçu sur WhatsApp"
        >
          <Share2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>Reçu WhatsApp (1-Clic)</span>
        </button>

        <button
          type="button"
          onClick={handleOpenDetailedModal}
          className="py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.97]"
          title="Ouvrir le reçu avec options de numéro et aperçu"
        >
          <Receipt className="w-3.5 h-3.5 text-amber-800" strokeWidth={1.75} />
          <span className="hidden sm:inline">Options / N°</span>
        </button>
      </div>
    </aside>
  )
}

