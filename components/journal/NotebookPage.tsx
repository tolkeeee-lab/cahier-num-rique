'use client'

import React, { useEffect, useRef } from 'react'
import { formatPrice } from '@/lib/penUtils'
import { AlertTriangle, Printer, Trash2, BookOpen, PlusCircle } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

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
  onAddArticleToSale?: (saleId: string, clientName: string) => void
  searchQuery: string
  currentDateStr: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getPenInkClass(penId: string) {
  switch (penId) {
    case 'red':    return 'ink-red'
    case 'green':  return 'ink-green'
    case 'purple': return 'ink-purple'
    case 'yellow': return 'ink-yellow'
    default:       return 'ink-blue'
  }
}

function getBadgeClass(penId: string) {
  switch (penId) {
    case 'red':    return 'bg-rose-100/90 text-rose-800 border-rose-300'
    case 'green':  return 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
    case 'purple': return 'bg-fuchsia-100/90 text-fuchsia-800 border-fuchsia-300'
    case 'yellow': return 'bg-amber-100/90 text-amber-800 border-amber-300'
    default:       return 'bg-blue-100/90 text-blue-800 border-blue-300'
  }
}

function getPenLabel(penId: string) {
  switch (penId) {
    case 'red':    return 'DÉPENSE'
    case 'green':  return 'ACHAT STOCK'
    case 'purple': return 'ACHAT CRÉDIT'
    case 'yellow': return 'VENTE CRÉDIT'
    default:       return 'VENTE CASH'
  }
}

// ─── Composant ─────────────────────────────────────────────────────────────

export const NotebookPage: React.FC<NotebookPageProps> = ({
  sales,
  onCrossOutSale,
  onPrintReceipt,
  onAddArticleToSale,
  searchQuery,
  currentDateStr,
}) => {
  // Auto-scroll vers le bas à chaque nouvelle vente
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current && sales.length > 0) {
      const el = listRef.current
      setTimeout(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }, 80)
    }
  }, [sales.length])

  const filteredSales = sales.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      s.client.toLowerCase().includes(q) ||
      (s.notes || '').toLowerCase().includes(q) ||
      s.articles.some((a) => a.name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="lined-paper relative pl-10 pr-4 py-4 flex-1 min-h-0 flex flex-col rounded-2xl border border-amber-300/40 shadow-sm overflow-hidden">
      <div className="relative z-10 flex flex-col h-full space-y-3">

        {/* En-tête de page (FIXE) */}
        <div className="flex items-center justify-between border-b-2 border-blue-200/60 pb-2.5 flex-shrink-0">
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

        {/* Liste des écritures (DÉFILE) */}
        {filteredSales.length === 0 ? (
          <div className="py-12 text-center text-gray-400 handwritten text-lg flex-1 flex flex-col items-center justify-center">
            Aucune écriture enregistrée sur cette page.
            <p className="text-xs font-sans text-gray-500 mt-1.5">
              Choisissez un stylo et saisissez votre première opération ci-dessous.
            </p>
          </div>
        ) : (
          <div
            ref={listRef}
            className="flex-1 min-h-0 overflow-y-auto space-y-3 lined-text-container pr-1 scrollbar-none"
          >
            {filteredSales.map((sale) => {
              const inkClass = getPenInkClass(sale.pen_color)
              const badgeClass = getBadgeClass(sale.pen_color)
              const isCrossedOut = sale.status === 'crossed_out'
              // Seules les ventes cash (bleu) peuvent recevoir des ajouts d'articles
              const canAddArticle = !isCrossedOut && sale.pen_color === 'blue' && !!onAddArticleToSale

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
                    {/* Contenu principal */}
                    <div className="flex-grow space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-gray-400 font-bold flex-shrink-0">
                          {sale.time}
                        </span>
                        <span className={`text-base font-bold truncate ${inkClass}`}>
                          {sale.notes || sale.client}
                        </span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase font-extrabold border flex-shrink-0 ${badgeClass}`}>
                          {getPenLabel(sale.pen_color)}
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

                      {/* Reste dû */}
                      {sale.debt > 0 && !isCrossedOut && (
                        <div className="pl-6 text-xs text-amber-800 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reste dû : {formatPrice(sale.debt)} — {sale.client}</span>
                        </div>
                      )}
                    </div>

                    {/* Montant + Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-base font-extrabold ${inkClass}`}>
                        {formatPrice(sale.total)}
                      </span>

                      {!isCrossedOut && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Bouton ajouter article — visible uniquement sur ventes bleues */}
                          {canAddArticle && (
                            <button
                              type="button"
                              onClick={() => onAddArticleToSale!(sale.id, sale.client)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                              title="Ajouter un article à cette vente"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

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
