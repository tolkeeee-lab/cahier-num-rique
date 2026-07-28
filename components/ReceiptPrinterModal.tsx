'use client'

import React, { useState } from 'react'
import { Printer, X } from 'lucide-react'

interface ReceiptArticle {
  name: string
  quantity: number
  unit_price: number
  category?: string
}

export interface ReceiptSale {
  id: string
  date: string
  time?: string
  client?: string
  articles: ReceiptArticle[]
  total: number
  paid: number
  debt: number
  status: string
  type: string
  notes?: string
  shop_id?: string
}

interface ReceiptPrinterModalProps {
  isOpen: boolean
  onClose: () => void
  sale: ReceiptSale | null
  shopName?: string
}

export function ReceiptPrinterModal({
  isOpen,
  onClose,
  sale,
  shopName = 'Cahier Numérique',
}: ReceiptPrinterModalProps) {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm')

  if (!isOpen || !sale) return null

  const handlePrint = () => {
    window.print()
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' F'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-xs">
      {/* Styles CSS dédiés à l'impression thermique */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-printable, #thermal-receipt-printable * {
            visibility: visible !important;
          }
          #thermal-receipt-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            color: black !important;
            font-family: monospace !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="bg-[#fbf9f4] border border-gray-300 rounded-[28px] max-w-sm w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-3.5 border-b border-gray-200 bg-[#f5f1e8] flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-gray-800 text-sm">
            <Printer className="w-4 h-4 text-emerald-700" />
            <span>Ticket de Caisse</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Format papier */}
            <div className="flex bg-gray-200 rounded-lg p-0.5 text-[10px] font-mono">
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                  paperWidth === '58mm' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
                }`}
              >
                58mm
              </button>
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                  paperWidth === '80mm' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
                }`}
              >
                80mm
              </button>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Aperçu du reçu thermique */}
        <div className="p-5 max-h-[65vh] overflow-y-auto bg-gray-100 flex justify-center">
          <div
            id="thermal-receipt-printable"
            className={`bg-white p-4 shadow-md font-mono text-[11px] text-black leading-tight border border-gray-200 ${
              paperWidth === '58mm' ? 'w-[230px]' : 'w-[300px]'
            }`}
          >
            {/* En-tête ticket */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <div className="font-bold text-sm uppercase tracking-wider">{shopName}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">Reçu de caisse</div>
              <div className="text-[9px] mt-1">
                Date: {sale.date} {sale.time ? `• ${sale.time}` : ''}
              </div>
              <div className="text-[9px] text-gray-500">Réf: #{sale.id.slice(0, 8)}</div>
              {sale.client && (
                <div className="text-[10px] font-bold mt-1 uppercase">Client: {sale.client}</div>
              )}
            </div>

            {/* Articles */}
            <div className="py-2 border-b border-dashed border-black space-y-1.5">
              <div className="flex justify-between text-[9px] font-bold uppercase border-b border-gray-300 pb-0.5">
                <span>Article</span>
                <span>Total</span>
              </div>
              {sale.articles && sale.articles.length > 0 ? (
                sale.articles.map((art, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold truncate">{art.name}</div>
                    <div className="flex justify-between text-[10px] text-gray-700">
                      <span>{art.quantity} x {formatPrice(art.unit_price)}</span>
                      <span className="font-bold">{formatPrice(art.quantity * art.unit_price)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span>{sale.notes || 'Vente enregistrée'}</span>
                  <span>{formatPrice(sale.total)}</span>
                </div>
              )}
            </div>

            {/* Totaux & Paiement */}
            <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL :</span>
                <span>{formatPrice(sale.total)}</span>
              </div>
              <div className="flex justify-between text-gray-800">
                <span>Montant Payé :</span>
                <span>{formatPrice(sale.paid || 0)}</span>
              </div>
              {sale.debt > 0 && (
                <div className="flex justify-between font-bold text-red-700 bg-red-50 p-1 rounded-sm mt-1">
                  <span>RESTANT DÛ (DETTE) :</span>
                  <span>{formatPrice(sale.debt)}</span>
                </div>
              )}
            </div>

            {/* Pied de page */}
            <div className="text-center pt-3 text-[9px] text-gray-600 space-y-0.5">
              <p className="font-bold uppercase">Merci de votre visite !</p>
              <p>À bientôt dans notre boutique</p>
              <p className="text-[8px] pt-1 opacity-70">Généré par Cahier Numérique PWA</p>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="p-4 bg-[#f5f1e8] border-t border-gray-200 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-full text-xs flex items-center justify-center gap-1.5 transition-transform hover:scale-105 active:scale-95 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>
    </div>
  )
}
