'use client'

import React, { useEffect } from 'react'
import { X, Printer, Receipt, Share2 } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface SaleDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sale: any
  onPrintReceipt?: (sale: any) => void
  shopName?: string
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
  onPrintReceipt,
  shopName = 'Cahier Numérique',
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !sale) return null

  const handleShareWhatsApp = () => {
    const dateStr = sale.date || new Date().toLocaleDateString('fr-FR')
    const timeStr = sale.time || ''
    const clientName = sale.client || sale.client_name || 'Client'
    const total = sale.total ?? sale.total_amount ?? 0
    const paid = sale.paid ?? sale.paid_amount ?? total
    const debt = sale.debt ?? sale.debt_amount ?? 0

    let articlesText = ''
    if (sale.articles && sale.articles.length > 0) {
      articlesText = sale.articles
        .map((a: any) => `• ${a.quantity}x ${a.name} (${formatPrice(a.unit_price)}) : ${formatPrice((a.quantity || 1) * (a.unit_price || 0))}`)
        .join('\n')
    } else if (sale.notes) {
      articlesText = `• ${sale.notes}`
    } else {
      articlesText = `• Achat comptant : ${formatPrice(total)}`
    }

    const receiptText = `🧾 *REÇU DE CAISSE* — ${shopName}
📅 *Date :* ${dateStr}${timeStr ? ` à ${timeStr}` : ''}
👤 *Client :* ${clientName}

📦 *Articles :*
${articlesText}

----------------------------
💰 *TOTAL :* ${formatPrice(total)}
💵 *Payé :* ${formatPrice(paid)}
${debt > 0 ? `💳 *Reste à payer (Dette) :* ${formatPrice(debt)}\n` : ''}----------------------------
🙏 _Merci de votre fidélité et à bientôt !_`

    window.open(`https://wa.me/?text=${encodeURIComponent(receiptText)}`, '_blank')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg bg-[#fdfaf2] border-2 border-amber-300 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-amber-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-100 text-amber-900">
              <Receipt className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">Détails de la Vente</h3>
              <p className="text-xs text-gray-600 font-mono">
                {sale.date} {sale.time ? `à ${sale.time}` : ''} • {sale.client || sale.client_name || 'Client anonyme'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer active:scale-[0.97]"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Liste des articles */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {sale.articles && sale.articles.length > 0 ? (
            sale.articles.map((art: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-200 shadow-xs"
              >
                <div>
                  <p className="text-xs font-extrabold text-gray-900">{art.name}</p>
                  <p className="text-[11px] text-gray-600 font-mono tabular-nums">
                    {art.quantity} × {formatPrice(art.unit_price)}
                  </p>
                </div>
                <span className="text-xs font-mono font-black text-amber-950 tabular-nums tracking-tight">
                  {formatPrice((art.quantity || 1) * (art.unit_price || 0))}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 italic text-center py-4 font-mono">
              {sale.notes ? `Notes : ${sale.notes}` : "Aucun détail d'article spécifique enregistré."}
            </p>
          )}
        </div>

        {/* Bilan financier */}
        <div className="bg-amber-100/90 p-4 rounded-xl border border-amber-300 space-y-2 font-mono text-xs shadow-xs">
          <div className="flex justify-between text-amber-950 font-bold">
            <span>Total Facturé :</span>
            <span className="font-black text-gray-900 tabular-nums tracking-tight">{formatPrice(sale.total ?? sale.total_amount ?? 0)}</span>
          </div>
          <div className="flex justify-between text-emerald-800 font-bold">
            <span>Montant Encaissé :</span>
            <span className="font-black tabular-nums tracking-tight">{formatPrice(sale.paid ?? sale.paid_amount ?? 0)}</span>
          </div>
          {(sale.debt > 0 || sale.debt_amount > 0) && (
            <div className="flex justify-between text-rose-800 font-bold pt-1 border-t border-amber-300">
              <span>Dette Restante :</span>
              <span className="font-black tabular-nums tracking-tight">{formatPrice(sale.debt ?? sale.debt_amount ?? 0)}</span>
            </div>
          )}
        </div>

        {/* Boutons d'Action */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-[0.97] shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>WhatsApp</span>
          </button>
          {onPrintReceipt && (
            <button
              type="button"
              onClick={() => {
                onPrintReceipt(sale)
                onClose()
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-[0.97]"
            >
              <Printer className="w-3.5 h-3.5 text-amber-700" strokeWidth={1.75} />
              <span>Imprimer</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-300 transition-colors cursor-pointer active:scale-[0.97]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
