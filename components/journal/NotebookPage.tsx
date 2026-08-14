'use client'

import React, { useEffect, useRef, useMemo } from 'react'
import { formatPrice } from '@/lib/penUtils'
import { AlertTriangle, Printer, Trash2, BookOpen, PlusCircle, Calculator, X, Edit3, Search } from 'lucide-react'

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
  onEditSale?: (sale: SaleItem) => void
  searchQuery: string
  onSearchChange?: (query: string) => void
  currentDateStr: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatLongDateFr(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date()
    const formatted = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }
  try {
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2])
      const formatted = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateObj)
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    }
    const dateObj = new Date(dateStr)
    if (!isNaN(dateObj.getTime())) {
      const formatted = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateObj)
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    }
    return dateStr
  } catch {
    return dateStr
  }
}

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
  onEditSale,
  searchQuery,
  onSearchChange,
  currentDateStr,
}) => {
  // Auto-scroll vers le bas à chaque nouvelle vente
  const listRef = useRef<HTMLDivElement>(null)

  // Calculateur de monnaie intégré par ligne de vente
  const [activeChangeSaleId, setActiveChangeSaleId] = React.useState<string | null>(null)
  const [changeReceivedMap, setChangeReceivedMap] = React.useState<Record<string, string>>({})

  useEffect(() => {
    if (listRef.current && sales.length > 0) {
      const el = listRef.current
      setTimeout(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }, 80)
    }
  }, [sales.length])

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        s.client.toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q) ||
        (s.articles || []).some((a) => (a.name || '').toLowerCase().includes(q))
      )
    })
  }, [sales, searchQuery])

  // Groupement des ventes par date pour afficher le CA sur chaque journée
  const salesByDate = useMemo(() => {
    const map = new Map<string, SaleItem[]>()
    for (const sale of filteredSales) {
      const d = sale.date || currentDateStr || 'Aujourd\'hui'
      if (!map.has(d)) {
        map.set(d, [])
      }
      map.get(d)!.push(sale)
    }
    if (map.size === 0) {
      map.set(currentDateStr || new Date().toISOString().slice(0, 10), [])
    }
    return Array.from(map.entries())
  }, [filteredSales, currentDateStr])

  return (
    <div className="lined-paper relative pl-7 sm:pl-9 pr-2.5 sm:pr-3.5 py-1.5 sm:py-2 flex-1 min-h-0 flex flex-col rounded-2xl border border-amber-300/40 shadow-sm overflow-hidden bg-[#fdfaf2]">
      <div className="relative z-10 flex flex-col h-full space-y-1.5">

        {/* En-tête de page fixe (Recherche + Badges) */}
        <div className="flex items-center justify-between border-b-2 border-blue-200/60 pb-1.5 flex-shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="brass-medallion w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-xs">
              <BookOpen className="w-3 h-3" />
            </div>
            <div className="font-handwritten text-sm sm:text-base font-bold text-blue-900 tracking-wide flex items-center gap-1.5">
              <span>Mon Cahier Journalier</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSearchChange && (
              <div className="relative min-w-[150px] sm:min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-700" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-8 pr-3 py-1 bg-amber-50/80 border border-amber-300/80 rounded-full text-xs text-gray-900 placeholder-amber-800/50 focus:outline-none focus:border-amber-500 font-mono shadow-inner"
                />
              </div>
            )}
            <div className="hidden sm:inline-block text-[11px] font-mono font-bold text-amber-900/80 uppercase tracking-widest bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300/60 shadow-xs">
              Seyes
            </div>
          </div>
        </div>

        {/* Liste des écritures avec Bannière Date & CA sur chaque journée */}
        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto space-y-4 lined-text-container pr-1 scrollbar-none pb-2"
        >
          {salesByDate.map(([dateKey, dateSales]) => {
            const dailyTurnover = dateSales
              .filter(s => s.status !== 'crossed_out')
              .reduce((sum, s) => {
                if (s.pen_color === 'blue' || s.type === 'cash_in' || s.type === 'sale_credit') {
                  return sum + (s.total || 0)
                }
                return sum
              }, 0)

            return (
              <div key={dateKey} className="space-y-3">
                {/* ── Bannière Date & CA du Jour (Design Cahier / Écolier) ── */}
                <div className="mx-auto my-1.5 flex flex-col items-center justify-center p-2.5 sm:p-3 bg-amber-50/90 border-2 border-amber-300/90 rounded-2xl shadow-xs text-center max-w-sm sm:max-w-md w-full animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm sm:text-base font-handwritten tracking-wide">
                    <span className="text-base sm:text-lg">📅</span>
                    <span>{formatLongDateFr(dateKey)}</span>
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-full font-mono text-xs font-black shadow-2xs">
                    <span className="text-emerald-700 font-bold">💰</span>
                    <span>CA du Jour : {dailyTurnover > 0 ? `+${formatPrice(dailyTurnover)}` : '0 F'}</span>
                  </div>
                </div>

                {/* Ventes du jour */}
                {dateSales.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 handwritten text-base flex flex-col items-center justify-center">
                    Aucune écriture enregistrée pour cette journée.
                  </div>
                ) : (
                  dateSales.map((sale) => {
                    const inkClass = getPenInkClass(sale.pen_color)
                    const badgeClass = getBadgeClass(sale.pen_color)
                    const isCrossedOut = sale.status === 'crossed_out'
                    const canAddArticle = !isCrossedOut && sale.pen_color === 'blue' && !!onAddArticleToSale
                    const isChangeActive = activeChangeSaleId === sale.id

                    return (
                      <div
                        key={sale.id}
                        className={`relative group p-2.5 sm:p-3 rounded-xl transition-all border ${
                          isCrossedOut
                            ? 'opacity-40 bg-gray-200/40 border-gray-300 line-through'
                            : 'bg-white/85 hover:bg-white border-blue-200/70 shadow-xs hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Contenu principal */}
                          <div className="flex-grow space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-gray-400 font-bold flex-shrink-0">
                                {sale.time}
                              </span>
                              <span className={`text-sm sm:text-base font-bold truncate ${inkClass}`}>
                                {sale.notes || sale.client}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-extrabold border flex-shrink-0 ${badgeClass}`}>
                                {getPenLabel(sale.pen_color)}
                              </span>
                            </div>

                            {/* Reste dû */}
                            {sale.debt > 0 && !isCrossedOut && (
                              <div className="pl-5 text-xs text-amber-800 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Reste dû : {formatPrice(sale.debt)} — {sale.client}</span>
                              </div>
                            )}
                          </div>

                          {/* Montant + Actions */}
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className={`text-sm sm:text-base font-extrabold px-2.5 py-0.5 rounded-lg font-mono ${
                              sale.pen_color === 'red'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              {sale.pen_color === 'red' ? `-${formatPrice(sale.total)}` : `+${formatPrice(sale.total)}`}
                            </span>

                            {!isCrossedOut && (
                              <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                {/* Bouton Monnaie */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isChangeActive) {
                                      setActiveChangeSaleId(null)
                                    } else {
                                      setActiveChangeSaleId(sale.id)
                                      if (changeReceivedMap[sale.id] === undefined) {
                                        setChangeReceivedMap(prev => ({ ...prev, [sale.id]: '' }))
                                      }
                                    }
                                  }}
                                  className={`px-1.5 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                                    isChangeActive
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                      : 'text-amber-800 bg-amber-100/90 hover:bg-amber-200 border-amber-300'
                                  }`}
                                  title="Calculer la monnaie pour cette vente"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-mono font-bold">Monnaie</span>
                                </button>

                                {/* Bouton ajouter article */}
                                {canAddArticle && (
                                  <button
                                    type="button"
                                    onClick={() => onAddArticleToSale!(sale.id, sale.client)}
                                    className="p-1 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                                    title="Ajouter un article à cette vente"
                                  >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Bouton modifier la vente */}
                                {onEditSale && (
                                  <button
                                    type="button"
                                    onClick={() => onEditSale(sale)}
                                    className="p-1 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                                    title="Modifier cette écriture"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {onPrintReceipt && (
                                  <button
                                    type="button"
                                    onClick={() => onPrintReceipt(sale)}
                                    className="p-1 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="Imprimer le reçu"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onCrossOutSale(sale.id)}
                                  className="p-1 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Barrer / Annuler cette écriture"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Calculateur de monnaie interactif en ligne */}
                        {isChangeActive && !isCrossedOut && (
                          <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex flex-wrap items-center gap-2 text-xs font-mono bg-amber-50/70 p-2 rounded-lg">
                            <span className="text-amber-900 font-bold">Reçu du client :</span>
                            <input
                              type="number"
                              placeholder="ex: 5000"
                              value={changeReceivedMap[sale.id] || ''}
                              onChange={(e) => setChangeReceivedMap(prev => ({ ...prev, [sale.id]: e.target.value }))}
                              className="w-24 px-2 py-0.5 bg-white border border-amber-300 rounded text-xs font-bold text-gray-900 focus:outline-none focus:border-amber-500 shadow-inner"
                              autoFocus
                            />
                            {[500, 1000, 2000, 5000, 10000].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setChangeReceivedMap(prev => ({ ...prev, [sale.id]: String(val) }))}
                                className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded border border-amber-300 text-[10px] cursor-pointer"
                              >
                                {val}
                              </button>
                            ))}
                            {Number(changeReceivedMap[sale.id]) > 0 && (
                              <div className="ml-auto flex items-center gap-1.5 font-bold">
                                {Number(changeReceivedMap[sale.id]) >= sale.total ? (
                                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                                    Monnaie à rendre : {formatPrice(Number(changeReceivedMap[sale.id]) - sale.total)}
                                  </span>
                                ) : (
                                  <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                                    Manque : {formatPrice(sale.total - Number(changeReceivedMap[sale.id]))}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setActiveChangeSaleId(null)}
                                  className="p-0.5 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
