import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Printer, Trash2, Edit3, AlertTriangle, Share2 } from 'lucide-react'

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
  onShareWhatsApp?: (sale: any) => void
  onEdit?: (sale: any) => void
  isEmployee?: boolean
}

export const SaleItemCard: React.FC<SaleItemCardProps> = ({
  sale,
  onCrossOut,
  onPrintReceipt,
  onShareWhatsApp,
  onEdit,
  isEmployee,
}) => {
  const isCrossedOut = sale.status === 'crossed_out'

  const getBadgeStyle = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-rose-100 text-rose-800 border-rose-300'
      case 'green':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'purple':
        return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300'
      case 'yellow':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isCrossedOut
          ? 'opacity-40 bg-gray-200/50 border-gray-300 line-through'
          : 'bg-white hover:bg-amber-50/50 border-amber-300/80 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Infos Vente */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500 font-bold">{sale.time}</span>
            <span className="font-extrabold text-sm text-gray-900">{sale.client || 'Client anonyme'}</span>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase font-extrabold border ${getBadgeStyle(sale.pen_color)}`}>
              {sale.pen_color === 'red' ? 'DÉPENSE' : sale.pen_color === 'green' ? 'STOCK' : sale.pen_color === 'purple' ? 'DETTE' : 'VENTE'}
            </span>
          </div>

          {/* Note / Détail */}
          {sale.notes && (
            <p className="text-xs text-gray-600 font-mono italic">
              {sale.notes}
            </p>
          )}

          {/* Liste condensée des articles */}
          {sale.articles && sale.articles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sale.articles.map((art, idx) => (
                <span key={idx} className="text-[11px] px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg text-gray-800 font-mono font-semibold">
                  {art.quantity}x {art.name} ({formatPrice(art.unit_price)})
                </span>
              ))}
            </div>
          )}

          {/* Information dette si existante */}
          {sale.debt > 0 && !isCrossedOut && (
            <div className="flex items-center gap-1.5 text-xs text-amber-900 font-bold font-mono pt-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Dette client : {formatPrice(sale.debt)}</span>
            </div>
          )}
        </div>

        {/* Montant total & Actions */}
        <div className="flex flex-col items-end gap-2">
          <span className="text-base font-black text-gray-900 font-mono">
            {formatPrice(sale.total)}
          </span>

          {!isCrossedOut && (
            <div className="flex items-center gap-1">
              {onShareWhatsApp && (
                <button
                  type="button"
                  onClick={() => onShareWhatsApp(sale)}
                  className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer"
                  title="Partager le reçu WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}

              {onPrintReceipt && (
                <button
                  type="button"
                  onClick={() => onPrintReceipt(sale)}
                  className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                  title="Imprimer le reçu"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              )}

              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(sale)}
                  className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                  title="Modifier l'écriture"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              {!isEmployee && onCrossOut && (
                <button
                  type="button"
                  onClick={() => onCrossOut(sale.id)}
                  className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 transition-colors cursor-pointer"
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
