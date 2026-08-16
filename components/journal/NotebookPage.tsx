'use client'

import React, { useEffect, useRef, useMemo } from 'react'
import { formatPrice } from '@/lib/penUtils'
import { AlertTriangle, Printer, Trash2, PlusCircle, Calculator, X, Edit3, MoreVertical } from 'lucide-react'

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
  searchQuery?: string
  currentDateStr: string
  activeFilter?: string
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
  searchQuery = '',
  currentDateStr,
  activeFilter = 'all',
}) => {
  const listRef = useRef<HTMLDivElement>(null)
  const [activeChangeSaleId, setActiveChangeSaleId] = React.useState<string | null>(null)
  const [changeReceivedMap, setChangeReceivedMap] = React.useState<Record<string, string>>({})
  const [activeActionMenuSaleId, setActiveActionMenuSaleId] = React.useState<string | null>(null)

  useEffect(() => {
    if (listRef.current && sales.length > 0) {
      const el = listRef.current
      setTimeout(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }, 80)
    }
  }, [sales.length])

  // Filtrage combiné (Recherche + Filtre par catégorie de stylo)
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Filtre par catégorie de stylo cliqué
      if (activeFilter === 'blue' && !(s.pen_color === 'blue' || s.type === 'cash_in' || s.type === 'sale_credit')) return false
      if (activeFilter === 'red' && !(s.pen_color === 'red' || s.type === 'cash_out')) return false
      if (activeFilter === 'green' && !(s.pen_color === 'green' || s.type === 'stock_cash')) return false
      if (activeFilter === 'purple' && !(s.pen_color === 'purple' || s.type === 'stock_credit')) return false
      if (activeFilter === 'yellow' && !(s.pen_color === 'yellow' || s.type === 'sale_credit')) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        s.client.toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q) ||
        (s.articles || []).some((a) => (a.name || '').toLowerCase().includes(q))
      )
    })
  }, [sales, searchQuery, activeFilter])

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
    <div className="lined-paper relative pl-5 sm:pl-9 pr-1.5 sm:pr-3.5 py-1 sm:py-2 flex-1 min-h-0 flex flex-col rounded-xl sm:rounded-2xl border border-amber-300/40 shadow-xs overflow-hidden bg-[#fdfaf2]">
      <div className="relative z-10 flex flex-col h-full space-y-1 sm:space-y-1.5">

        {/* Liste des écritures avec Bannière Dynamique de Catégorie sur chaque journée */}
        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto space-y-2 sm:space-y-3 lined-text-container pr-1 scrollbar-none pb-2"
        >
          {salesByDate.map(([dateKey, dateSales]) => {
            const allDaySales = sales.filter(s => s.date === dateKey && s.status !== 'crossed_out')

            const salesTotal = allDaySales
              .filter(s => s.pen_color === 'blue' || s.type === 'cash_in' || s.type === 'sale_credit')
              .reduce((sum, s) => sum + (s.total || 0), 0)

            const expensesTotal = allDaySales
              .filter(s => s.pen_color === 'red' || s.type === 'cash_out')
              .reduce((sum, s) => sum + (s.total || 0), 0)

            const stockCashTotal = allDaySales
              .filter(s => s.pen_color === 'green' || s.type === 'stock_cash')
              .reduce((sum, s) => sum + (s.total || 0), 0)

            const purpleCreditTotal = allDaySales
              .filter(s => s.pen_color === 'purple' || s.type === 'stock_credit')
              .reduce((sum, s) => sum + (s.total || 0), 0)

            const yellowCreditTotal = allDaySales
              .filter(s => s.pen_color === 'yellow' || s.type === 'sale_credit')
              .reduce((sum, s) => sum + (s.debt || s.total || 0), 0)

            const dayNet = salesTotal - expensesTotal - stockCashTotal

            return (
              <div key={dateKey} className="space-y-1.5">
                {/* ── BANNIÈRE DYNAMIQUE DE CATÉGORIE DU CAHIER ── */}
                {activeFilter === 'blue' ? (
                  <div className="flex items-center justify-between gap-2 py-1 px-2 border border-blue-300 font-mono text-xs text-blue-950 font-bold bg-blue-50/90 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-1.5 font-handwritten text-xs sm:text-sm text-blue-900 font-bold">
                      <span>📅</span>
                      <span>{formatLongDateFr(dateKey)}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-blue-600 text-white shadow-xs">
                      🔵 Ventes (CA) : +{formatPrice(salesTotal)}
                    </span>
                  </div>
                ) : activeFilter === 'red' ? (
                  <div className="flex items-center justify-between gap-2 py-1 px-2 border border-rose-300 font-mono text-xs text-rose-950 font-bold bg-rose-50/90 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-1.5 font-handwritten text-xs sm:text-sm text-rose-900 font-bold">
                      <span>📅</span>
                      <span>{formatLongDateFr(dateKey)}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-rose-600 text-white shadow-xs">
                      🔴 Dépenses : -{formatPrice(expensesTotal)}
                    </span>
                  </div>
                ) : activeFilter === 'green' ? (
                  <div className="flex items-center justify-between gap-2 py-1 px-2 border border-emerald-300 font-mono text-xs text-emerald-950 font-bold bg-emerald-50/90 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-1.5 font-handwritten text-xs sm:text-sm text-emerald-900 font-bold">
                      <span>📅</span>
                      <span>{formatLongDateFr(dateKey)}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-emerald-600 text-white shadow-xs">
                      🟢 Achats Stock : -{formatPrice(stockCashTotal)}
                    </span>
                  </div>
                ) : activeFilter === 'purple' ? (
                  <div className="flex items-center justify-between gap-2 py-1 px-2 border border-fuchsia-300 font-mono text-xs text-fuchsia-950 font-bold bg-fuchsia-50/90 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-1.5 font-handwritten text-xs sm:text-sm text-fuchsia-900 font-bold">
                      <span>📅</span>
                      <span>{formatLongDateFr(dateKey)}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-fuchsia-600 text-white shadow-xs">
                      🟣 Dettes Fournisseurs : -{formatPrice(purpleCreditTotal)}
                    </span>
                  </div>
                ) : activeFilter === 'yellow' ? (
                  <div className="flex items-center justify-between gap-2 py-1 px-2 border border-amber-300 font-mono text-xs text-amber-950 font-bold bg-amber-50/90 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-1.5 font-handwritten text-xs sm:text-sm text-amber-900 font-bold">
                      <span>📅</span>
                      <span>{formatLongDateFr(dateKey)}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-amber-600 text-white shadow-xs">
                      🟡 Crédits Clients : +{formatPrice(yellowCreditTotal)}
                    </span>
                  </div>
                ) : activeFilter === 'total' ? (
                  /* ── CALCUL COMPLET EN PAGE POUR LE TOTAL ── */
                  <div className="py-1 px-2 border border-emerald-300 font-mono text-xs bg-emerald-50/90 rounded-xl space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between font-handwritten text-xs sm:text-sm text-emerald-950 font-bold">
                      <span>📅 {formatLongDateFr(dateKey)}</span>
                      <span className="px-2 py-0.5 rounded-full font-black text-xs bg-emerald-200 text-emerald-950 border border-emerald-300">
                        Solde Net : {dayNet >= 0 ? `+${formatPrice(dayNet)}` : `-${formatPrice(Math.abs(dayNet))}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px] sm:text-[11px] font-bold text-gray-700 pt-0.5">
                      <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 whitespace-nowrap">🔵 CA : +{formatPrice(salesTotal)}</span>
                      <span>-</span>
                      <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-900 whitespace-nowrap">🔴 Dép. : -{formatPrice(expensesTotal)}</span>
                      <span>-</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 whitespace-nowrap">🟢 Achats : -{formatPrice(stockCashTotal)}</span>
                      <span>=</span>
                      <span className={`px-1.5 py-0.2 rounded font-black whitespace-nowrap ${dayNet >= 0 ? 'bg-emerald-200 text-emerald-950' : 'bg-rose-200 text-rose-950'}`}>
                        💰 {dayNet >= 0 ? `+${formatPrice(dayNet)}` : `-${formatPrice(Math.abs(dayNet))}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* ── BANNIÈRE TOUS ── */
                  <div className="flex items-center justify-between gap-2 py-1 px-2 border-b border-dashed border-amber-300/80 font-handwritten text-xs sm:text-sm text-amber-900 select-none font-bold bg-amber-50/60 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <span>📅</span>
                      <span className="font-extrabold text-amber-950">{formatLongDateFr(dateKey)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-xs">
                      <span className="px-2 py-0.2 rounded-full font-extrabold bg-blue-50 text-blue-900 border border-blue-200">
                        CA : +{formatPrice(salesTotal)}
                      </span>
                      <span className="px-2 py-0.2 rounded-full font-black bg-amber-200/90 text-amber-950 border border-amber-300">
                        {allDaySales.length} écriture(s)
                      </span>
                    </div>
                  </div>
                )}

                {/* Ventes du jour */}
                {dateSales.length === 0 ? (
                  <div className="py-4 text-center text-gray-400 handwritten text-sm flex flex-col items-center justify-center">
                    Aucune écriture enregistrée pour cette journée.
                  </div>
                ) : (
                  dateSales.map((sale) => {
                    const inkClass = getPenInkClass(sale.pen_color)
                    const badgeClass = getBadgeClass(sale.pen_color)
                    const isCrossedOut = sale.status === 'crossed_out'
                    const canAddArticle = !isCrossedOut && sale.pen_color === 'blue' && !!onAddArticleToSale
                    const isChangeActive = activeChangeSaleId === sale.id

                    const cleanTime = (sale.time || '').slice(0, 5)

                    return (
                      <div
                        key={sale.id}
                        className={`relative group p-2 sm:p-2.5 rounded-xl transition-all border ${
                          isCrossedOut
                            ? 'opacity-40 bg-gray-200/40 border-gray-300 line-through'
                            : 'bg-white/90 hover:bg-white border-blue-200/70 shadow-2xs hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          {/* Contenu principal */}
                          <div className="flex-grow space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* 1. Type d'écriture tout devant */}
                              <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-black border flex-shrink-0 shadow-2xs ${badgeClass}`}>
                                {getPenLabel(sale.pen_color)}
                              </span>

                              {/* 2. Heure propre sans secondes */}
                              {cleanTime && (
                                <span className="text-[10px] sm:text-[11px] font-mono text-gray-400 font-bold flex-shrink-0">
                                  {cleanTime}
                                </span>
                              )}

                              {/* 3. Texte manuscrit de l'écriture */}
                              <span className={`text-xs sm:text-sm font-bold break-words whitespace-normal leading-snug ${inkClass}`}>
                                {sale.notes || sale.client}
                              </span>
                            </div>

                            {/* Reste dû */}
                            {sale.debt > 0 && !isCrossedOut && (
                              <div className="pl-4 text-[11px] text-amber-800 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Dû : {formatPrice(sale.debt)} — {sale.client}</span>
                              </div>
                            )}
                          </div>

                          {/* Montant + Actions */}
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-xs sm:text-sm font-extrabold px-2 py-0.2 rounded-lg font-mono ${
                              sale.pen_color === 'red'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              {sale.pen_color === 'red' ? `-${formatPrice(sale.total)}` : `+${formatPrice(sale.total)}`}
                            </span>

                            {!isCrossedOut && (
                              <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity relative">
                                {/* Bouton Trois Points Unique (Actions Rapides) */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setActiveActionMenuSaleId(activeActionMenuSaleId === sale.id ? null : sale.id)}
                                    className="p-1 rounded-lg text-amber-950 hover:bg-amber-200/90 bg-amber-100/90 border border-amber-300 shadow-2xs transition-colors cursor-pointer"
                                    title="Actions sur cette écriture"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Menu Popup d'actions pour cette écriture */}
                                  {activeActionMenuSaleId === sale.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setActiveActionMenuSaleId(null)}
                                      />
                                      <div className="absolute right-0 top-full mt-1 w-52 bg-[#fffdf2] border-2 border-amber-400 rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5 font-mono text-xs animate-in fade-in zoom-in-95">
                                        {canAddArticle && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveActionMenuSaleId(null)
                                              onAddArticleToSale!(sale.id, sale.client)
                                            }}
                                            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-900 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                          >
                                            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Ajouter un article</span>
                                          </button>
                                        )}

                                        {onEditSale && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveActionMenuSaleId(null)
                                              onEditSale(sale)
                                            }}
                                            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-amber-100 text-gray-900 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                          >
                                            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                            <span>Modifier</span>
                                          </button>
                                        )}

                                        {onPrintReceipt && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveActionMenuSaleId(null)
                                              onPrintReceipt(sale)
                                            }}
                                            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-blue-50 text-blue-900 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                          >
                                            <Printer className="w-3.5 h-3.5 text-blue-700" />
                                            <span>Imprimer le reçu</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveActionMenuSaleId(null)
                                            setActiveChangeSaleId(sale.id)
                                            if (changeReceivedMap[sale.id] === undefined) {
                                              setChangeReceivedMap(prev => ({ ...prev, [sale.id]: '' }))
                                            }
                                          }}
                                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-amber-100 text-amber-900 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <Calculator className="w-3.5 h-3.5 text-amber-700" />
                                          <span>Calculer la monnaie</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveActionMenuSaleId(null)
                                            onCrossOutSale(sale.id)
                                          }}
                                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-rose-100 text-rose-700 font-bold flex items-center gap-2 transition-colors cursor-pointer border-t border-amber-200 mt-1 pt-1"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                          <span>Rayer cette ligne</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Calculateur de monnaie en ligne */}
                        {isChangeActive && !isCrossedOut && (
                          <div className="mt-1.5 pt-1.5 border-t border-amber-200/80 flex flex-wrap items-center gap-1.5 text-xs font-mono bg-amber-50/70 p-1.5 rounded-lg">
                            <span className="text-amber-900 font-bold text-[10px]">Reçu :</span>
                            <input
                              type="number"
                              placeholder="5000"
                              value={changeReceivedMap[sale.id] || ''}
                              onChange={(e) => setChangeReceivedMap(prev => ({ ...prev, [sale.id]: e.target.value }))}
                              className="w-20 px-1.5 py-0.5 bg-white border border-amber-300 rounded text-xs font-bold text-gray-900 focus:outline-none focus:border-amber-500 shadow-inner"
                              autoFocus
                            />
                            {[500, 1000, 2000, 5000].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setChangeReceivedMap(prev => ({ ...prev, [sale.id]: String(val) }))}
                                className="px-1 py-0.2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded border border-amber-300 text-[9px] cursor-pointer"
                              >
                                {val}
                              </button>
                            ))}
                            {Number(changeReceivedMap[sale.id]) > 0 && (
                              <div className="ml-auto flex items-center gap-1 font-bold text-[10px]">
                                {Number(changeReceivedMap[sale.id]) >= sale.total ? (
                                  <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                                    Monnaie : {formatPrice(Number(changeReceivedMap[sale.id]) - sale.total)}
                                  </span>
                                ) : (
                                  <span className="text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">
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

                {/* ── BILAN MANUSCRIT DE LA JOURNÉE (Dans le Cahier Seyes) ── */}
                <div className="mt-3 pt-2.5 pb-2 px-3 sm:px-4 bg-gradient-to-br from-amber-50/95 to-yellow-50/80 border-2 border-dashed border-amber-300/90 rounded-2xl font-mono text-xs shadow-2xs space-y-2 select-none">
                  <div className="flex items-center justify-between border-b border-amber-300/80 pb-1 font-handwritten font-black text-amber-950 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5">
                      <span>📐</span>
                      <span className="tracking-wide uppercase">Bilan de Caisse du Jour</span>
                    </div>
                    <span className="font-mono text-[11px] text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full font-bold">
                      {allDaySales.length} opération(s)
                    </span>
                  </div>

                  {/* Lignes de décomposition du calcul */}
                  <div className="space-y-1.5 text-[11px] sm:text-xs">
                    <div className="flex items-center justify-between text-blue-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                        <span>(+) Ventes encaissées (CA)</span>
                      </span>
                      <span className="font-extrabold text-blue-950">+{formatPrice(salesTotal)}</span>
                    </div>

                    <div className="flex items-center justify-between text-rose-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                        <span>(-) Dépenses réglées</span>
                      </span>
                      <span className="font-extrabold text-rose-950">-{formatPrice(expensesTotal)}</span>
                    </div>

                    <div className="flex items-center justify-between text-emerald-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                        <span>(-) Achats stock au comptant</span>
                      </span>
                      <span className="font-extrabold text-emerald-950">-{formatPrice(stockCashTotal)}</span>
                    </div>

                    {/* Ligne de Solde Net */}
                    <div className={`mt-2 pt-2 border-t-2 border-amber-300 flex items-center justify-between font-black text-xs sm:text-sm p-2 rounded-xl ${
                      dayNet >= 0
                        ? 'bg-emerald-100/90 text-emerald-950 border border-emerald-300'
                        : 'bg-rose-100/90 text-rose-950 border border-rose-300'
                    }`}>
                      <span className="flex items-center gap-1.5 font-handwritten sm:text-base">
                        <span>💰</span>
                        <span>SOLDE NET DU JOUR</span>
                      </span>
                      <span className="font-mono font-black text-sm sm:text-base">
                        {dayNet >= 0 ? `+${formatPrice(dayNet)}` : `-${formatPrice(Math.abs(dayNet))}`}
                      </span>
                    </div>

                    {/* Dettes et Crédits à suivre si présents */}
                    {(yellowCreditTotal > 0 || purpleCreditTotal > 0) && (
                      <div className="pt-1.5 border-t border-dashed border-amber-300/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-gray-700 flex-wrap gap-2">
                        {yellowCreditTotal > 0 && (
                          <span className="text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-lg border border-amber-300">
                            ⏳ Crédits clients : +{formatPrice(yellowCreditTotal)}
                          </span>
                        )}
                        {purpleCreditTotal > 0 && (
                          <span className="text-fuchsia-900 bg-fuchsia-100/90 px-2 py-0.5 rounded-lg border border-fuchsia-300">
                            💳 Dettes fournisseurs : -{formatPrice(purpleCreditTotal)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
