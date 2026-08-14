'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Printer, Trash2, Edit3, AlertTriangle } from 'lucide-react'

interface SaleItemCardProps {
  sale: {
    id: string
    date: string
    time: string
    client: string
    articles: Array<{
      name: string
      quantity: number
      unit_price: number
    }>
    total: number
    paid: number
    debt: number
    status: 'paid' | 'debt' | 'crossed_out'
    type: string
    pen_color: string
    notes: string
    category?: string
  }
  onCrossOut?: (saleId: string) => void
  onPrintReceipt?: (sale: any) => void
  onEdit?: (sale: any) => void
  isEmployee?: boolean
}

export const SaleItemCard: React.FC<SaleItemCardProps> = ({
  sale,
  onCrossOut,
  onPrintReceipt,
  onEdit,
  isEmployee,
}) => {
  const isCrossedOut = sale.status === 'crossed_out'

  const getBadgeStyle = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-rose-950/40 text-rose-300 border-rose-800/60'
      case 'green':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
      case 'purple':
        return 'bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-800/60'
      case 'yellow':
        return 'bg-amber-950/40 text-amber-300 border-amber-800/60'
      default:
        return 'bg-blue-950/40 text-blue-300 border-blue-800/60'
    }
  }

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isCrossedOut
          ? 'opacity-40 bg-[#1a1715] border-gray-800 line-through'
          : 'bg-[#1e1a18] hover:bg-[#25201d] border-gray-800/80 shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Infos Vente */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">{sale.time}</span>
            <span className="font-bold text-sm text-white">{sale.client || 'Client anonyme'}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border ${getBadgeStyle(sale.pen_color)}`}>
              {sale.pen_color === 'red' ? 'DÉPENSE' : sale.pen_color === 'green' ? 'STOCK' : sale.pen_color === 'purple' ? 'DETTE' : 'VENTE'}
            </span>
          </div>

          {/* Note / Détail */}
          {sale.notes && (
            <p className="text-xs text-gray-400 font-mono italic">
              {sale.notes}
            </p>
          )}

          {/* Liste condensée des articles */}
          {sale.articles && sale.articles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sale.articles.map((art, idx) => (
                <span key={idx} className="text-[11px] px-2 py-0.5 bg-[#141210] border border-gray-800 rounded-lg text-gray-300 font-mono">
                  {art.quantity}x {art.name} ({formatPrice(art.unit_price)})
                </span>
              ))}
            </div>
          )}

          {/* Information dette si existante */}
          {sale.debt > 0 && !isCrossedOut && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono pt-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Dette client : {formatPrice(sale.debt)}</span>
            </div>
          )}
        </div>

        {/* Montant total & Actions */}
        <div className="flex flex-col items-end gap-2">
          <span className="text-sm font-extrabold text-white font-mono">
            {formatPrice(sale.total)}
          </span>

          {!isCrossedOut && (
            <div className="flex items-center gap-1">
              {onPrintReceipt && (
                <button
                  onClick={() => onPrintReceipt(sale)}
                  className="p-1.5 rounded-lg bg-[#2a2421] text-gray-400 hover:text-white transition-colors"
                  title="Imprimer le reçu"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              )}

              {onEdit && (
                <button
                  onClick={() => onEdit(sale)}
                  className="p-1.5 rounded-lg bg-[#2a2421] text-gray-400 hover:text-white transition-colors"
                  title="Modifier l'écriture"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              {!isEmployee && onCrossOut && (
                <button
                  onClick={() => onCrossOut(sale.id)}
                  className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 transition-colors border border-red-800/40"
                  title="Raturer l'écriture"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
