'use client'

import React from 'react'
import { X } from 'lucide-react'
import { StockItem } from './types'
import { getStockStatus } from './stockUtils'

interface WhatsAppPOModalProps {
  isOpen: boolean
  onClose: () => void
  supplierPhone: string
  setSupplierPhone: (phone: string) => void
  items: StockItem[]
  generateWhatsAppUrl: () => string
}

export function WhatsAppPOModal({
  isOpen,
  onClose,
  supplierPhone,
  setSupplierPhone,
  items,
  generateWhatsAppUrl,
}: WhatsAppPOModalProps) {
  if (!isOpen) return null

  const alertItems = items.filter(i => getStockStatus(i) === 'low' || getStockStatus(i) === 'out')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[#fbf9f4] border border-emerald-300 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-emerald-200 bg-emerald-100 flex items-center justify-between text-emerald-950">
          <div className="font-bold text-sm flex items-center gap-2">
            <span>📲 Bon de Commande WhatsApp</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-emerald-200/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Numéro WhatsApp du Grossiste / Fournisseur (Optionnel)</label>
            <input
              type="tel"
              placeholder="ex: +22997000000 ou laisser vide"
              value={supplierPhone}
              onChange={e => setSupplierPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-xs outline-none focus:border-emerald-600"
            />
          </div>

          <div className="bg-white p-3.5 border border-gray-200 rounded-2xl max-h-48 overflow-y-auto space-y-2">
            <div className="font-bold text-gray-800 text-[11px] uppercase tracking-wider mb-1">Articles en alerte de rupture :</div>
            {alertItems.length === 0 ? (
              <p className="text-gray-400 italic py-2 text-center">Aucun produit en alerte de rupture pour le moment !</p>
            ) : (
              alertItems.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-0 font-mono">
                  <span className="font-bold text-gray-800">{item.name}</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                    A commander: {Math.max(item.alert_threshold * 2 - Math.max(0, item.current_stock), 10)} {item.unit}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-full font-bold text-gray-600 hover:bg-gray-100"
            >
              Fermer
            </button>
            <a
              href={generateWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-center transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
            >
              <span>Envoyer WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
