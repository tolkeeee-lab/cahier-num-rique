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
        return 'bg-rose-100/80 text-rose-800 border-rose-300'
      case 'green':
        return 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
      case 'purple':
        return 'bg-fuchsia-100/80 text-fuchsia-800 border-fuchsia-300'
      case 'yellow':
        return 'bg-amber-100/80 text-amber-800 border-amber-300'
      default:
        return 'bg-blue-100/80 text-blue-800 border-blue-300'
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
    <div className="w-full max-w-4xl mx-auto rounded-3xl shadow-2xl border-2 border-[#064e3b]/30 overflow-hidden relative min-h-[650px] flex flex-col justify-between transition-all">
      
      {/* Reliure Cuir Émeraude & Anneaux Métalliques en Laiton */}
      <div className="absolute left-0 top-0 bottom-0 w-12 notebook-cover-left flex flex-col justify-around py-6 z-20 pointer-events-none">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-1">
            <div className="brass-screw" />
            <div className="w-8 h-2 spiral-ring shadow-lg" />
          </div>
        ))}
      </div>

      {/* Véritable Papier Seyes Ivoire */}
      <div className="lined-paper relative pl-16 pr-8 py-8 flex-grow flex flex-col justify-between">
        
        <div className="relative z-10 space-y-6">
          {/* Entête du Cahier avec Médaillon en Laiton */}
          <div className="flex items-center justify-between border-b-2 border-blue-300/40 pb-3">
            <div className="flex items-center gap-2">
              <div className="brass-medallion w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="font-handwritten text-xl font-bold text-blue-900 tracking-wide">
                📅 {currentDateStr || "Aujourd'hui"}
              </div>
            </div>
            
            <div className="text-xs font-mono font-bold text-amber-900/70 uppercase tracking-widest bg-amber-200/50 px-3 py-1 rounded-full border border-amber-300/60 shadow-sm">
              Cahier de Caisse Seyes
            </div>
          </div>

          {/* Liste des Écritures Manuscrites */}
          {filteredSales.length === 0 ? (
            <div className="py-20 text-center text-gray-400 handwritten text-xl">
              Aucune écriture enregistrée sur cette page.
              <p className="text-xs font-sans text-gray-500 mt-2">
                Choisissez un stylo et saisissez votre première opération ci-dessus.
              </p>
            </div>
          ) : (
            <div className="space-y-4 lined-text-container">
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
                        : 'bg-white/75 hover:bg-white border-blue-200/60 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Détail de l'écriture au stylo */}
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

                      {/* Montant & Boutons d'Impression/Annulation */}
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-base font-extrabold ${inkClass}`}>
                          {formatPrice(sale.total)}
                        </span>

                        {!isCrossedOut && (
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onPrintReceipt && (
                              <button
                                onClick={() => onPrintReceipt(sale)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Imprimer le reçu"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
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
    </div>
  )
}
