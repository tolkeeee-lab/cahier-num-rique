'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { AlertTriangle, Printer, Trash2 } from 'lucide-react'

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
  const getPenStyle = (penId: string) => {
    switch (penId) {
      case 'red':
        return { textClass: 'text-rose-600 dark:text-rose-400', badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' }
      case 'green':
        return { textClass: 'text-emerald-700 dark:text-emerald-400', badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' }
      case 'purple':
        return { textClass: 'text-fuchsia-800 dark:text-fuchsia-400', badgeClass: 'bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-800 dark:text-fuchsia-300 border-fuchsia-300' }
      case 'yellow':
        return { textClass: 'text-amber-600 dark:text-amber-400', badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' }
      default:
        return { textClass: 'text-blue-700 dark:text-blue-400', badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300' }
    }
  }

  const filteredSales = sales.filter(s => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const matchClient = s.client.toLowerCase().includes(q)
    const matchNotes = (s.notes || '').toLowerCase().includes(q)
    const matchArticle = s.articles.some(a => a.name.toLowerCase().includes(q))
    return matchClient || matchNotes || matchArticle
  })

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#fdfaf2] text-[#1e1a18] rounded-2xl shadow-2xl border border-amber-950/20 overflow-hidden relative min-h-[600px] flex flex-col justify-between">
      
      {/* Reliure spirale à gauche */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#064e3b] to-[#043c2d] flex flex-col justify-around py-6 z-20 pointer-events-none shadow-inner">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-4 h-1.5 bg-gradient-to-r from-amber-800 to-yellow-400 rounded-full shadow-md -ml-1" />
        ))}
      </div>

      {/* Page Seyes Lignes de fond */}
      <div className="relative pl-12 pr-6 py-6 flex-grow flex flex-col justify-between">
        
        {/* Marge rouge verticale */}
        <div className="absolute left-12 top-0 bottom-0 w-[1.5px] bg-red-400/50 z-10 pointer-events-none" />

        {/* Quadrillage Lignes Seyes */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_23px,rgba(14,165,233,0.12)_24px)] bg-[size:100%_24px] pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Entête Date du Jour sur le Cahier */}
          <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
            <div className="font-handwritten text-lg font-bold text-blue-900 tracking-wide">
              📅 {currentDateStr || 'Aujourd\'hui'}
            </div>
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">
              Cahier de Caisse
            </div>
          </div>

          {/* Liste des Écritures */}
          {filteredSales.length === 0 ? (
            <div className="py-16 text-center text-gray-400 font-handwritten text-lg">
              Aucune écriture enregistrée pour le moment.
              <p className="text-xs font-sans text-gray-500 mt-1">
                Choisissez un stylo et saisissez votre première opération ci-dessus.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSales.map((sale) => {
                const style = getPenStyle(sale.pen_color)
                const isCrossedOut = sale.status === 'crossed_out'

                return (
                  <div
                    key={sale.id}
                    className={`relative group p-3 rounded-xl transition-all border ${
                      isCrossedOut
                        ? 'opacity-40 bg-gray-100/50 border-gray-300 line-through'
                        : 'bg-white/60 hover:bg-white border-blue-100 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      
                      {/* Contenu principal de l'écriture */}
                      <div className="flex-grow space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">{sale.time}</span>
                          <span className={`font-handwritten text-base font-bold ${style.textClass}`}>
                            {sale.notes || sale.client}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border ${style.badgeClass}`}>
                            {sale.pen_color === 'red'
                              ? 'DÉPENSE'
                              : sale.pen_color === 'green'
                              ? 'STOCK'
                              : sale.pen_color === 'purple'
                              ? 'DETTE'
                              : 'VENTE'}
                          </span>
                        </div>

                        {/* Articles détaillés */}
                        {sale.articles && sale.articles.length > 0 && (
                          <div className="pl-6 space-y-0.5 text-xs text-gray-600 font-mono">
                            {sale.articles.map((art, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span>•</span>
                                <span className="font-semibold">{art.quantity}x {art.name}</span>
                                <span>@ {formatPrice(art.unit_price)}</span>
                                <span className="text-gray-400">({formatPrice(art.quantity * art.unit_price)})</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Note Dette si applicable */}
                        {sale.debt > 0 && !isCrossedOut && (
                          <div className="pl-6 text-xs text-amber-700 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Reste dû : {formatPrice(sale.debt)} par {sale.client}</span>
                          </div>
                        )}
                      </div>

                      {/* Montant Total et Actions */}
                      <div className="flex flex-col items-end gap-2">
                        <span className={`font-mono text-sm font-extrabold ${style.textClass}`}>
                          {formatPrice(sale.total)}
                        </span>

                        {!isCrossedOut && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onPrintReceipt && (
                              <button
                                onClick={() => onPrintReceipt(sale)}
                                className="p-1 text-gray-500 hover:text-blue-600 rounded"
                                title="Imprimer le reçu"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onCrossOutSale(sale.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
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
    </div>
  )
}
