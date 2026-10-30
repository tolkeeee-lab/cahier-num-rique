'use client'

import React, { useState, useEffect } from 'react'
import { X, Share2, Copy, Check, Sparkles, Phone, Smartphone } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

export interface ReceiptSaleData {
  id?: string
  date?: string
  time?: string
  client?: string
  total?: number
  paid?: number
  debt?: number
  notes?: string
  articles?: Array<{ name: string; quantity: number; unit_price: number }>
  amountGiven?: number
  changeReturned?: number
}

interface ReceiptShareModalProps {
  isOpen: boolean
  onClose: () => void
  sale: ReceiptSaleData | null
  shopName?: string
  shopPhone?: string
  shopAddress?: string
}

export const ReceiptShareModal: React.FC<ReceiptShareModalProps> = ({
  isOpen,
  onClose,
  sale,
  shopName = 'Ma Boutique',
  shopPhone = '',
  shopAddress = '',
}) => {
  const [copied, setCopied] = useState(false)
  const [clientPhone, setClientPhone] = useState('')
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanNativeShare(true)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setClientPhone('')
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !sale) return null

  const dateStr = sale.date || new Date().toLocaleDateString('fr-FR')
  const timeStr = sale.time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const clientName = sale.client || 'Client'
  const total = sale.total || 0
  const paid = sale.paid ?? total
  const debt = sale.debt || 0
  const amountGiven = sale.amountGiven
  const changeReturned = sale.changeReturned

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

  const changeLines = amountGiven && changeReturned !== undefined && changeReturned >= 0
    ? `💵 *Montant remis :* ${formatPrice(amountGiven)}\n🤝 *Monnaie rendue :* ${formatPrice(changeReturned)}\n`
    : ''

  const receiptText = `${shopHeaderLines}

📦 *Articles :*
${articlesText}

----------------------------
💰 *TOTAL :* ${formatPrice(total)}
💵 *Payé :* ${formatPrice(paid)}
${changeLines}${debt > 0 ? `💳 *Reste à payer (Dette) :* ${formatPrice(debt)}\n` : ''}----------------------------
🙏 _Merci de votre confiance et à très bientôt !_`

  const getCleanPhoneNumber = (phone: string): string => {
    const digitsOnly = phone.replace(/[^\d+]/g, '')
    if (!digitsOnly) return ''
    if (digitsOnly.startsWith('+')) return digitsOnly.replace('+', '')
    // Si format local 10 chiffres (Côte d'Ivoire 01/05/07)
    if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
      return `225${digitsOnly.slice(1)}`
    }
    return digitsOnly
  }

  const handleShareWhatsApp = () => {
    const cleanNum = getCleanPhoneNumber(clientPhone)
    const url = cleanNum
      ? `https://wa.me/${cleanNum}?text=${encodeURIComponent(receiptText)}`
      : `https://wa.me/?text=${encodeURIComponent(receiptText)}`
    window.open(url, '_blank')
  }

  const handleNativeShare = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: `Reçu de caisse - ${shopName}`,
        text: receiptText,
      })
    } catch {
      // Annulation ou non supporté
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md bg-[#fdfaf2] border-2 border-amber-300 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
            <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">
              Reçu Numérique WhatsApp
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer active:scale-[0.97]"
            title="Fermer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Saisie facultative du téléphone WhatsApp */}
        <div className="space-y-1">
          <label className="text-[11px] font-mono font-bold text-amber-950 uppercase flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
            <span>N° WhatsApp du Client (Optionnel) :</span>
          </label>
          <input
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="ex: 07 01 02 03 04 ou +225..."
            className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs text-gray-900 font-mono tabular-nums tracking-tight placeholder-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-inner"
          />
          <p className="text-[10px] text-amber-900/70 font-mono">
            {clientPhone.trim() ? '✓ Envoi direct sur la conversation de ce numéro.' : '💡 Laissez vide pour choisir le contact directement dans WhatsApp.'}
          </p>
        </div>

        {/* Aperçu Ticket de Caisse */}
        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-inner font-mono text-xs whitespace-pre-wrap text-gray-800 leading-relaxed max-h-52 overflow-y-auto">
          {receiptText}
        </div>

        {/* Boutons d'Action */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs font-mono active:scale-[0.97] flex-1 min-w-[110px]"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-700" strokeWidth={1.75} /> : <Copy className="w-4 h-4 text-amber-800" strokeWidth={1.75} />}
            <span>{copied ? 'Copié !' : 'Copier texte'}</span>
          </button>

          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="py-2.5 px-3 rounded-xl bg-amber-200 hover:bg-amber-300 border border-amber-400 text-amber-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs font-mono active:scale-[0.97]"
              title="Partager via une application"
            >
              <Smartphone className="w-4 h-4 text-amber-900" strokeWidth={1.75} />
              <span className="hidden sm:inline">Partager</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md font-mono active:scale-[0.97] flex-1 min-w-[140px]"
          >
            <Share2 className="w-4 h-4" strokeWidth={1.75} />
            <span>Envoyer WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  )
}
