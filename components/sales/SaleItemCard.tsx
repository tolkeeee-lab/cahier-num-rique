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
  onSettleDebt?: (sale: any) => void
  remainingDebt?: number
  isEmployee?: boolean
}

export const SaleItemCard: React.FC<SaleItemCardProps> = React.memo(({
  sale,
  onCrossOut,
  onPrintReceipt,
  onShareWhatsApp,
  onEdit,
  onSettleDebt,
  remainingDebt,
  isEmployee,
}) => {
  const isCrossedOut = sale.status === 'crossed_out'

  const getBadgeStyle = (color: string, type?: string) => {
    if (type === 'client_request') return 'bg-amber-50 text-amber-800 border-amber-200'
    switch (color) {
      case 'red':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      case 'green':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200'
      case 'purple':
        return 'bg-stone-100 text-stone-700 border-stone-200'
      case 'yellow':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200'
    }
  }

  const isExpenseOrStock = sale.pen_color === 'red' || sale.pen_color === 'green' || sale.type === 'cash_out' || sale.type === 'purchase_cash'
  const cardTitle = isExpenseOrStock
    ? (sale.notes || sale.client || (sale.pen_color === 'green' ? 'Achat stock' : 'Dépense'))
    : (sale.client || sale.notes || 'Client anonyme')

  const cardSubtitle = isExpenseOrStock
    ? (sale.client && sale.client !== 'Client anonyme' && sale.client !== cardTitle ? sale.client : (sale.notes && sale.notes !== cardTitle ? sale.notes : null))
    : (sale.notes && sale.notes !== cardTitle ? sale.notes : null)

  return (
    <div
      className={`p-4 rounded-xl border transition-colors ${
        isCrossedOut
          ? 'opacity-45 bg-stone-100 border-stone-200 line-through'
          : 'bg-[#faf5e8] hover:bg-white border-[#e2d6be]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-stone-500 tabular-nums">{sale.time}</span>
            <span className="font-semibold text-sm text-stone-900 truncate">{cardTitle}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${getBadgeStyle(sale.pen_color, sale.type)}`}>
              {sale.type === 'payment_client'
                ? 'Règlement reçu'
                : sale.type === 'payment_supplier'
                ? 'Règlement payé'
                : sale.type === 'client_request'
                ? 'Demande'
                : sale.pen_color === 'red' || sale.type === 'cash_out'
                ? 'Dépense'
                : sale.pen_color === 'green' || sale.type === 'purchase_cash'
                ? 'Achat stock'
                : sale.pen_color === 'purple' || sale.type === 'purchase_credit'
                ? 'Achat crédit'
                : sale.pen_color === 'yellow' || sale.type === 'sale_credit'
                ? 'Vente crédit'
                : 'Vente cash'}
            </span>
          </div>

          {cardSubtitle && (
            <p className="text-xs text-stone-600">
              {cardSubtitle}
            </p>
          )}

          {sale.articles && sale.articles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {sale.articles.map((art, idx) => (
                <span key={idx} className="text-[11px] px-2 py-0.5 bg-white border border-stone-200 rounded-md text-stone-700 font-mono tabular-nums">
                  {art.quantity}× {art.name} ({formatPrice(art.unit_price)})
                </span>
              ))}
            </div>
          )}

          {(sale.debt > 0 || sale.type === 'sale_credit' || sale.type === 'purchase_credit' || sale.pen_color === 'yellow' || sale.pen_color === 'purple') && !isCrossedOut && (
            <div className="pt-1">
              {(typeof remainingDebt === 'number' ? remainingDebt <= 0 : sale.debt <= 0) ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Dette soldée
                </span>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-amber-800 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                    <span>
                      {sale.type === 'purchase_credit' || sale.pen_color === 'purple' ? 'Dette fournisseur :' : 'Dette client :'}{' '}
                      <span className="font-mono font-semibold tabular-nums">
                        {formatPrice(typeof remainingDebt === 'number' ? remainingDebt : sale.debt)}
                      </span>
                    </span>
                  </div>
                  {onSettleDebt && (
                    <button
                      type="button"
                      onClick={() => onSettleDebt(sale)}
                      className="px-2 py-0.5 rounded-md bg-emerald-700 hover:bg-emerald-800 active:scale-[0.97] text-white text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Solder
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {sale.type === 'client_request' ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              Demande
            </span>
          ) : (
            (() => {
              let badgeClass = 'bg-white text-stone-800 border-stone-200'
              let prefix = ''

              if (sale.pen_color === 'blue' || sale.type === 'sale' || sale.type === 'cash_in' || sale.type === 'payment_client') {
                badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200'
                prefix = '+'
              } else if (sale.pen_color === 'yellow' || sale.type === 'sale_credit') {
                badgeClass = 'bg-amber-50 text-amber-800 border-amber-200'
                prefix = ''
              } else if (sale.pen_color === 'red' || sale.type === 'cash_out' || sale.type === 'payment_supplier' || (sale.type === 'cash_adjustment' && ((sale.notes || '').toLowerCase().includes('retrait') || sale.pen_color === 'red'))) {
                badgeClass = 'bg-rose-50 text-rose-700 border-rose-200'
                prefix = '-'
              } else if (sale.pen_color === 'green' || sale.type === 'purchase_cash') {
                badgeClass = 'bg-stone-100 text-stone-800 border-stone-200'
                prefix = '-'
              } else if (sale.pen_color === 'purple' || sale.type === 'purchase_credit') {
                badgeClass = 'bg-stone-100 text-stone-800 border-stone-200'
                prefix = ''
              }

              return (
                <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-lg font-mono tabular-nums border ${badgeClass}`}>
                  {prefix}{formatPrice(sale.total)}
                </span>
              )
            })()
          )}

          {!isCrossedOut && (
            <div className="flex items-center gap-1">
              {onShareWhatsApp && (
                <button
                  type="button"
                  onClick={() => onShareWhatsApp(sale)}
                  className="p-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-stone-200 active:scale-[0.97] transition-colors cursor-pointer"
                  title="Partager le reçu WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              )}

              {onPrintReceipt && (
                <button
                  type="button"
                  onClick={() => onPrintReceipt(sale)}
                  className="p-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-600 border border-stone-200 active:scale-[0.97] transition-colors cursor-pointer"
                  title="Imprimer le reçu"
                >
                  <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              )}

              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(sale)}
                  className="p-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-600 border border-stone-200 active:scale-[0.97] transition-colors cursor-pointer"
                  title="Modifier l'écriture"
                >
                  <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              )}

              {!isEmployee && onCrossOut && (
                <button
                  type="button"
                  onClick={() => onCrossOut(sale.id)}
                  className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-stone-200 active:scale-[0.97] transition-colors cursor-pointer"
                  title="Raturer l'écriture"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
