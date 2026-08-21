'use client'

import React, { useState } from 'react'
import { X, Share2, Copy, Check, Sparkles } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface SaleData {
  id?: string
  date?: string
  time?: string
  client?: string
  total?: number
  paid?: number
  debt?: number
  notes?: string
  articles?: Array<{ name: string; quantity: number; unit_price: number }>
}

interface ReceiptShareModalProps {
  isOpen: boolean
  onClose: () => void
  sale: SaleData | null
  shopName?: string
}

export const ReceiptShareModal: React.FC<ReceiptShareModalProps> = ({
  isOpen,
  onClose,
  sale,
  shopName = 'Ma Boutique',
}) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !sale) return null

  const dateStr = sale.date || new Date().toLocaleDateString('fr-FR')
  const timeStr = sale.time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const clientName = sale.client || 'Client'
  const total = sale.total || 0
  const paid = sale.paid ?? total
  const debt = sale.debt || 0

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

  const receiptText = `🧾 *REÇU DE CAISSE* — ${shopName}
📅 *Date :* ${dateStr} à ${timeStr}
👤 *Client :* ${clientName}

📦 *Articles :*
${articlesText}

----------------------------
💰 *TOTAL :* ${formatPrice(total)}
💵 *Payé :* ${formatPrice(paid)}
${debt > 0 ? `💳 *Reste à payer (Dette) :* ${formatPrice(debt)}\n` : ''}----------------------------
🙏 _Merci de votre confiance et à bientôt !_`

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(receiptText)}`, '_blank')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#fdfaf2] border-2 border-amber-300 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" />
            <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">
              Reçu Numérique WhatsApp
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aperçu Ticket de Caisse */}
        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-inner font-mono text-xs whitespace-pre-wrap text-gray-800 leading-relaxed max-h-60 overflow-y-auto">
          {receiptText}
        </div>

        {/* Boutons d'Action */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs font-mono"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4 text-amber-800" />}
            <span>{copied ? 'Copié !' : 'Copier texte'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md font-mono"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp (1-Clic)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
