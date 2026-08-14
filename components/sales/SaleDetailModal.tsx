'use client'

import React from 'react'
import { X, Printer } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface SaleDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sale: any
  onPrintReceipt?: (sale: any) => void
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
  onPrintReceipt,
}) => {
  if (!isOpen || !sale) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#fdfaf2] border-2 border-amber-300 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-amber-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">Détails de la Vente</h3>
              <p className="text-xs text-gray-600 font-mono">
                {sale.date} à {sale.time} • {sale.client || 'Client anonyme'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
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
                  <p className="text-[11px] text-gray-600 font-mono">
                    {art.quantity} × {formatPrice(art.unit_price)}
                  </p>
                </div>
                <span className="text-xs font-mono font-black text-amber-950">
                  {formatPrice(art.quantity * art.unit_price)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 italic text-center py-4">
              Aucun détail d'article spécifique enregistré.
            </p>
          )}
        </div>

        {/* Bilan financier */}
        <div className="bg-amber-100/90 p-4 rounded-xl border border-amber-300 space-y-2 font-mono text-xs shadow-xs">
          <div className="flex justify-between text-amber-950 font-bold">
            <span>Total Facturé :</span>
            <span className="font-black text-gray-900">{formatPrice(sale.total)}</span>
          </div>
          <div className="flex justify-between text-emerald-800 font-bold">
            <span>Montant Encaissé :</span>
            <span className="font-black">{formatPrice(sale.paid)}</span>
          </div>
          {sale.debt > 0 && (
            <div className="flex justify-between text-rose-800 font-bold pt-1 border-t border-amber-300">
              <span>Dette Restante :</span>
              <span className="font-black">{formatPrice(sale.debt)}</span>
            </div>
          )}
        </div>

        {/* Boutons d'Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onPrintReceipt && (
            <button
              type="button"
              onClick={() => {
                onPrintReceipt(sale)
                onClose()
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-700" />
              <span>Imprimer Reçu</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-300 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
