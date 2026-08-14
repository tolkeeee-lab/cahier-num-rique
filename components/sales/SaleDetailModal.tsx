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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1e1a18] border border-[#2a2421] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <div>
              <h3 className="text-base font-extrabold text-white">Détails de la Vente</h3>
              <p className="text-xs text-gray-400 font-mono">
                {sale.date} à {sale.time} • {sale.client || 'Client anonyme'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Liste des articles */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {sale.articles && sale.articles.length > 0 ? (
            sale.articles.map((art: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-[#141210] rounded-xl border border-gray-800/60"
              >
                <div>
                  <p className="text-xs font-bold text-white">{art.name}</p>
                  <p className="text-[11px] text-gray-400 font-mono">
                    {art.quantity} × {formatPrice(art.unit_price)}
                  </p>
                </div>
                <span className="text-xs font-mono font-extrabold text-amber-400">
                  {formatPrice(art.quantity * art.unit_price)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic text-center py-4">
              Aucun détail d'article spécifique enregistré.
            </p>
          )}
        </div>

        {/* Bilan financier */}
        <div className="bg-[#141210] p-4 rounded-xl border border-gray-800 space-y-2 font-mono text-xs">
          <div className="flex justify-between text-gray-300">
            <span>Total Facturé :</span>
            <span className="font-bold text-white">{formatPrice(sale.total)}</span>
          </div>
          <div className="flex justify-between text-emerald-400">
            <span>Montant Encaissé :</span>
            <span className="font-bold">{formatPrice(sale.paid)}</span>
          </div>
          {sale.debt > 0 && (
            <div className="flex justify-between text-amber-400 pt-1 border-t border-gray-800">
              <span>Dette Restante :</span>
              <span className="font-bold">{formatPrice(sale.debt)}</span>
            </div>
          )}
        </div>

        {/* Boutons d'Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onPrintReceipt && (
            <button
              onClick={() => {
                onPrintReceipt(sale)
                onClose()
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2a2421] text-amber-400 border border-amber-900/40 text-xs font-bold rounded-xl hover:bg-[#342d29] transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer Reçu</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
