'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { AlertTriangle, Printer, Trash2, BookOpen } from 'lucide-react'

interface SaleItem {
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

interface NotebookPageProps {
  sales: SaleItem[]
  onCrossOutSale: (saleId: string) => void
  onPrintReceipt?: (sale: SaleItem) => void
  searchQuery: string
  currentDateStr: string
}

export const NotebookPage: React.FC<NotebookPageProps> = ({
  sales,
  onCrossOutSale,
  onPrintReceipt,
  searchQuery,
  currentDateStr,
}) => {
  const getPenInkClass = (penId: string) => {
    switch (penId) {
      case 'red':
        return 'ink-red'
      case 'green':
        return 'ink-green'
      case 'purple':
        return 'ink-purple'
      case 'yellow':
        return 'ink-yellow'
      default:
        return 'ink-blue'
    }
  }

  const getBadgeClass = (penId: string) => {
    switch (penId) {
      case 'red':
        return 'bg-rose-100/90 text-rose-800 border-rose-300'
      case 'green':
        return 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
      case 'purple':
        return 'bg-fuchsia-100/90 text-fuchsia-800 border-fuchsia-300'
      case 'yellow':
        return 'bg-amber-100/90 text-amber-800 border-amber-300'
      default:
        return 'bg-blue-100/90 text-blue-800 border-blue-300'
    }
  }

  const filteredSales = sales.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const matchClient = s.client.toLowerCase().includes(q)
    const matchNotes = (s.notes || '').toLowerCase().includes(q)
    const matchArticle = s.articles.some((a) => a.name.toLowerCase().includes(q))
    return matchClient || matchNotes || matchArticle
  })

  return (
    <div className="lined-paper relative pl-10 pr-4 py-4 flex-grow flex flex-col justify-between min-h-[500px] rounded-2xl border border-amber-300/40 shadow-sm">
      <div className="relative z-10 space-y-4">
        {/* Entête du Cahier Seyes avec Stamp Date */}
        <div className="flex items-center justify-between border-b-2 border-blue-200/60 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="brass-medallion w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="font-handwritten text-lg font-bold text-blue-900 tracking-wide">
              📅 {currentDateStr || "Aujourd'hui"}
            </div>
          </div>
          
          <div className="text-[11px] font-mono font-bold text-amber-900/80 uppercase tracking-widest bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300/60 shadow-sm">
            Cahier de Caisse Seyes
          </div>
        </div>

        {/* Liste des Écritures Manuscrites */}
        {filteredSales.length === 0 ? (
          <div className="py-16 text-center text-gray-400 handwritten text-lg">
            Aucune écriture enregistrée sur cette page.
            <p className="text-xs font-sans text-gray-500 mt-1.5">
              Choisissez un stylo et saisissez votre première opération ci-dessus.
            </p>
          </div>
        ) : (
          <div className="space-y-3 lined-text-container">
            {filteredSales.map((sale) => {
              const inkClass = getPenInkClass(sale.pen_color)
              const badgeClass = getBadgeClass(sale.pen_color)
              const isCrossedOut = sale.status === 'crossed_out'

              return (
                <div
                  key={sale.id}
                  className={`relative group p-3 rounded-xl transition-all border ${
                    isCrossedOut
                      ? 'opacity-40 bg-gray-200/40 border-gray-300 line-through'
                      : 'bg-white/80 hover:bg-white border-blue-200/60 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Contenu principal de l'écriture au stylo */}
                    <div className="flex-grow space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400 font-bold">{sale.time}</span>
                        <span className={`text-base font-bold ${inkClass}`}>
                          {sale.notes || sale.client}
                        </span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase font-extrabold border ${badgeClass}`}>
                          {sale.pen_color === 'red'
                            ? 'DÉPENSE'
                            : sale.pen_color === 'green'
                            ? 'ACHAT STOCK'
                            : sale.pen_color === 'purple'
                            ? 'ACHAT CRÉDIT'
                            : sale.pen_color === 'yellow'
                            ? 'VENTE CRÉDIT'
                            : 'VENTE CASH'}
                        </span>
                      </div>

                      {/* Articles détaillés */}
                      {sale.articles && sale.articles.length > 0 && (
                        <div className="pl-6 space-y-0.5 text-xs text-gray-700 font-mono">
                          {sale.articles.map((art, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-blue-500">•</span>
                              <span className="font-semibold">{art.quantity}x {art.name}</span>
                              <span>@ {formatPrice(art.unit_price)}</span>
                              <span className="text-gray-400">({formatPrice(art.quantity * art.unit_price)})</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reste Dû / Note Dette */}
                      {sale.debt > 0 && !isCrossedOut && (
                        <div className="pl-6 text-xs text-amber-800 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reste dû : {formatPrice(sale.debt)} par {sale.client}</span>
                        </div>
                      )}
                    </div>

                    {/* Montant Total et Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-base font-extrabold ${inkClass}`}>
                        {formatPrice(sale.total)}
                      </span>

                      {!isCrossedOut && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onPrintReceipt && (
                            <button
                              type="button"
                              onClick={() => onPrintReceipt(sale)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Imprimer le reçu"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onCrossOutSale(sale.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Raturer / Annuler cette écriture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
