'use client'

import React, { useState, useMemo } from 'react'
import { Calendar, ChevronDown, ChevronUp, Calculator, Coins, AlertTriangle, Clock } from 'lucide-react'
import { SalesFilterBar } from '@/components/sales/SalesFilterBar'
import { SaleItemCard } from '@/components/sales/SaleItemCard'
import { SaleDetailModal } from '@/components/sales/SaleDetailModal'
import { DebtRepaymentModal } from '@/components/sales/DebtRepaymentModal'
import { ReceiptPrinterModal } from '@/components/ReceiptPrinterModal'
import { ReceiptShareModal } from '@/components/sales/ReceiptShareModal'
import { exportSalesToCSV, exportSalesToPDF } from '@/lib/exportUtils'
import { formatPrice } from '@/lib/penUtils'
import { generateOfflineId, saveOfflineSale, markAsSynced } from '@/lib/offlineDb'
import { getTodayDateString } from '@/lib/dateUtils'
import { reconcileDebts } from '@/hooks/useJournalData'

function formatLongDateFr(dateStr?: string): string {
  if (!dateStr) return 'Date inconnue'
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

interface Article {
  name: string
  quantity: number
  unit_price: number
}

interface Sale {
  id: string
  date: string
  time: string
  client: string
  articles: Article[]
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt' | 'crossed_out'
  type: string
  pen_color: string
  notes: string
  category?: string
}

interface SalesHistoryProps {
  sales: Sale[]
  onSaleCrossedOut?: (id: string) => void
  onAddArticle?: (saleId: string, text: string) => Promise<void>
  onUpdateSale?: (saleId: string, updatedArticles: Article[], clientName?: string) => Promise<void>
  onUpdateCategory?: (saleId: string, category: string) => Promise<void>
  onSettleDebt?: (saleId: string, amount: number, notes?: string, clientName?: string, isSupplier?: boolean) => Promise<void>
  onError?: (err: string) => void
  shopId?: string
  isEmployee?: boolean
  showExpenseStats?: boolean
  externalAddingToId?: string | null
  externalAddInput?: string
  onExternalAddInputChange?: (val: string) => void
  onExternalStartAdd?: (saleId: string) => void
  onExternalCancelAdd?: () => void
  onExternalConfirmAdd?: (saleId: string) => Promise<void>
}

import { EditSaleModal } from '@/components/journal/EditSaleModal'

export function SalesHistory({
  sales,
  onSaleCrossedOut,
  onUpdateSale,
  onSettleDebt,
  shopId = 'default-shop',
  isEmployee = false,
}: SalesHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [activeDetailSale, setActiveDetailSale] = useState<Sale | null>(null)
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null)
  const [activeShareSale, setActiveShareSale] = useState<Sale | null>(null)
  const [activeRepaymentSale, setActiveRepaymentSale] = useState<Sale | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [expandedBilans, setExpandedBilans] = useState<Record<string, boolean>>({})

  const toggleBilan = (dateKey: string) => {
    setExpandedBilans(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }))
  }

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const clientStr = (s.client || '').toLowerCase()
        const notesStr = (s.notes || '').toLowerCase()
        const matchClient = clientStr.includes(q)
        const matchNotes = notesStr.includes(q)
        const matchArticle = Array.isArray(s.articles) && s.articles.some(a => (a?.name || '').toLowerCase().includes(q))
        if (!matchClient && !matchNotes && !matchArticle) return false
      }

      if (statusFilter !== 'all' && s.status !== statusFilter) return false

      if (dateFilter === 'today') {
        const today = getTodayDateString()
        if (s.date !== today) return false
      } else if (dateFilter === 'yesterday') {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        const yStr = d.toISOString().split('T')[0]
        if (s.date !== yStr) return false
      } else if (dateFilter === 'week') {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        const minStr = d.toISOString().split('T')[0]
        if (s.date < minStr) return false
      } else if (dateFilter === 'month') {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        const minStr = d.toISOString().split('T')[0]
        if (s.date < minStr) return false
      }

      return true
    })
  }, [sales, searchQuery, statusFilter, dateFilter])

  // Regroupement par date pour affichage chronologique avec sous-totaux CA
  const salesByDate = useMemo(() => {
    const map = new Map<string, Sale[]>()
    for (const sale of filteredSales) {
      const d = sale.date || 'Date inconnue'
      if (!map.has(d)) {
        map.set(d, [])
      }
      map.get(d)!.push(sale)
    }
    return Array.from(map.entries())
  }, [filteredSales])

  // Calcul des dettes restantes par client/fournisseur pour affichage en temps réel dans l'historique
  const clientDebtMap = useMemo(() => {
    const map = new Map<string, number>()
    const reconciled = reconcileDebts(sales as any)
    reconciled.forEach(s => {
      if (s.status === 'crossed_out') return
      const name = (s.client || '').trim().toLowerCase()
      if (!name) return
      const isClientCredit = s.type === 'sale_credit' || s.pen_color === 'yellow' || (Number(s.debt || 0) > 0 && s.type !== 'payment_client' && s.type !== 'payment_supplier')
      const isSupplierCredit = s.type === 'purchase_credit' || s.pen_color === 'purple'
      if (isClientCredit || isSupplierCredit) {
        map.set(name, (map.get(name) || 0) + Number(s.debt || 0))
      }
    })
    return map
  }, [sales])

  const handleConfirmRepayment = async (saleId: string, amount: number, notes: string) => {
    const target = sales.find(s => s.id === saleId)
    const clientName = target?.client || 'Client'
    const isSupplier = target?.type === 'purchase_credit' || target?.pen_color === 'purple'

    if (onSettleDebt) {
      await onSettleDebt(saleId, amount, notes, clientName, isSupplier)
      setActiveRepaymentSale(null)
      return
    }

    const newSaleId = generateOfflineId()
    const now = new Date()

    const repaymentSale: any = {
      id: newSaleId,
      shop_id: shopId,
      date: getTodayDateString(),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      client: clientName,
      total: amount,
      paid: amount,
      debt: 0,
      status: 'paid',
      type: isSupplier ? 'payment_supplier' : 'payment_client',
      pen_color: isSupplier ? 'red' : 'blue',
      notes: notes || (isSupplier ? `Remboursement fournisseur: ${clientName}` : `Règlement dette: ${clientName}`),
      category: 'Règlement Dette',
      created_at: now.toISOString(),
      articles: [],
      is_synced: false
    }

    saveOfflineSale(shopId, repaymentSale)

    try {
      await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
        body: JSON.stringify({
          id: newSaleId,
          date: repaymentSale.date,
          time: repaymentSale.time,
          created_at: repaymentSale.created_at,
          name: clientName,
          amount,
          type: isSupplier ? 'supplier' : 'client',
          action: 'pay',
          description: repaymentSale.notes,
        })
      })
      markAsSynced(shopId, newSaleId)
    } catch (e) {
      console.warn('Règlement sauvegardé hors-ligne:', e)
    }

    setActiveRepaymentSale(null)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cahier_sale_created'))
      window.dispatchEvent(new CustomEvent('cahier_sales_updated'))
    }
  }

  return (
    <div className="space-y-4">
      <SalesFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onExportCSV={() => exportSalesToCSV(filteredSales, `Ventes_${shopId}`)}
        onExportPDF={() => exportSalesToPDF(filteredSales, `Rapport_Ventes_${shopId}`)}
      />

      {filteredSales.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white/80 rounded-2xl border border-amber-300/80 font-mono text-xs shadow-sm">
          Aucune vente ne correspond à vos critères de recherche.
        </div>
      ) : (
        <div className="space-y-6">
          {salesByDate.map(([dateKey, dateSales]) => {
            const validDateSales = dateSales.filter(s => s.status !== 'crossed_out')

            // 1. Chiffre d'Affaires brut (Ventes effectives de la journée)
            const salesTotal = validDateSales
              .filter(s => (s.pen_color === 'blue' || s.type === 'cash_in' || s.type === 'sale_credit' || s.type === 'sale') && s.type !== 'payment_client' && s.type !== 'client_request')
              .reduce((sum, s) => sum + Number(s.total || 0), 0)

            // 2. Encaissements Ventes au comptant (argent liquide entré en caisse)
            const salesCashTotal = validDateSales
              .filter(s => (s.pen_color === 'blue' || s.type === 'sale' || s.type === 'cash_in') && s.type !== 'payment_client' && s.type !== 'client_request')
              .reduce((sum, s) => sum + Number(s.paid || s.total || 0), 0)

            // 3. Règlements de dettes reçus des clients
            const repaymentsReceivedTotal = validDateSales
              .filter(s => s.type === 'payment_client')
              .reduce((sum, s) => sum + Number(s.paid || s.total || 0), 0)

            // Total des rentrées de caisse du jour
            const totalCashIn = salesCashTotal + repaymentsReceivedTotal

            // 4. Dépenses diverses réglées
            const expensesTotal = validDateSales
              .filter(s => s.pen_color === 'red' || s.type === 'cash_out' || (s.type === 'cash_adjustment' && ((s.notes || '').toLowerCase().includes('retrait') || s.pen_color === 'red')))
              .reduce((sum, s) => sum + Number(s.total || s.paid || 0), 0)

            // 5. Achats stock au comptant
            const stockCashTotal = validDateSales
              .filter(s => s.pen_color === 'green' || s.type === 'purchase_cash')
              .reduce((sum, s) => sum + Number(s.total || s.paid || 0), 0)

            // 6. Règlements fournisseurs payés
            const supplierPaymentsTotal = validDateSales
              .filter(s => s.type === 'payment_supplier')
              .reduce((sum, s) => sum + Number(s.paid || s.total || 0), 0)

            // Total des sorties de caisse du jour
            const totalCashOut = expensesTotal + stockCashTotal + supplierPaymentsTotal

            // 7. Solde net de caisse de la journée
            const dayNet = totalCashIn - totalCashOut
            const expensesExceedCA = totalCashOut > totalCashIn

            // 8. Crédits accordés et dettes contractées ce jour
            const creditsGivenTotal = validDateSales
              .filter(s => s.pen_color === 'yellow' || s.type === 'sale_credit')
              .reduce((sum, s) => sum + Number(s.debt || s.total || 0), 0)

            const supplierDebtsContracted = validDateSales
              .filter(s => s.pen_color === 'purple' || s.type === 'purchase_credit')
              .reduce((sum, s) => sum + Number(s.debt || s.total || 0), 0)

            const isExpanded = !!expandedBilans[dateKey]

            return (
              <div key={dateKey} className="space-y-2.5">
                {/* ── Séparateur de Date Interactif avec CA & Déclencheur du Bilan ── */}
                <button
                  type="button"
                  onClick={() => toggleBilan(dateKey)}
                  className="w-full text-left flex items-center justify-between gap-2 py-2 px-3.5 bg-gradient-to-r from-amber-100/95 via-yellow-50 to-amber-100/95 hover:from-amber-200/90 hover:via-yellow-100 hover:to-amber-200/90 border border-amber-300/90 rounded-2xl font-mono text-xs shadow-2xs transition-all active:scale-[0.99] cursor-pointer group select-none"
                  title="Cliquer pour ouvrir ou fermer le bilan financier détaillé de cette journée"
                >
                  <div className="flex items-center gap-2 font-handwritten font-black text-sm sm:text-base text-amber-950">
                    <Calendar className="w-4 h-4 text-amber-900 flex-shrink-0" strokeWidth={1.75} />
                    <span>{formatLongDateFr(dateKey)}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs flex-wrap justify-end">
                    <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-blue-600 text-white shadow-2xs tabular-nums">
                      CA : +{formatPrice(salesTotal)}
                    </span>

                    {expensesExceedCA ? (
                      <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-rose-600 text-white border border-rose-700 shadow-2xs tabular-nums flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-white" strokeWidth={2} />
                        <span>Dépenses &gt; CA ({dayNet >= 0 ? `+${formatPrice(dayNet)}` : `-${formatPrice(Math.abs(dayNet))}`})</span>
                      </span>
                    ) : dayNet > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full font-extrabold text-xs bg-emerald-600 text-white shadow-2xs tabular-nums hidden sm:inline-flex">
                        Net : +{formatPrice(dayNet)}
                      </span>
                    ) : null}

                    <span className="px-2.5 py-0.5 rounded-full font-extrabold bg-amber-900/10 text-amber-950 border border-amber-300 text-[11px] tabular-nums">
                      {validDateSales.length} écriture(s)
                    </span>

                    <span className="px-2 py-0.5 rounded-lg bg-amber-200 text-amber-950 group-hover:bg-amber-300 border border-amber-400/80 transition-colors flex items-center gap-1 text-[11px] font-bold shadow-2xs">
                      <span>Bilan</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-amber-950" strokeWidth={2.2} />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-amber-950" strokeWidth={2.2} />
                      )}
                    </span>
                  </div>
                </button>

                {/* ── Bilan Financier & Flux de Caisse Déroulant ── */}
                {isExpanded && (
                  <div className="p-3.5 sm:p-4 bg-gradient-to-br from-amber-50/95 via-[#fffdf9] to-yellow-50/90 border-2 border-amber-300/90 rounded-2xl font-mono text-xs shadow-md space-y-3">
                    <div className="flex items-center justify-between border-b-2 border-dashed border-amber-300/80 pb-2 font-handwritten font-black text-amber-950 text-sm sm:text-base">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-emerald-800" strokeWidth={1.75} />
                        <span className="tracking-wide uppercase">Bilan & Flux de Caisse de la Journée</span>
                      </div>
                      <span className="font-mono text-xs text-amber-950 bg-amber-200/80 px-2.5 py-0.5 rounded-full font-bold border border-amber-300">
                        {formatLongDateFr(dateKey)}
                      </span>
                    </div>

                    {/* Alerte explicite si les dépenses dépassent les rentrées */}
                    {expensesExceedCA && (
                      <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 flex items-start gap-2.5 shadow-2xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                        <div className="text-xs space-y-0.5">
                          <p className="font-extrabold text-rose-900">
                            Attention : Les dépenses du jour dépassent le Chiffre d'Affaires !
                          </p>
                          <p className="text-[11px] text-rose-800 font-sans leading-relaxed">
                            Même si le Chiffre d'Affaires affiche <span className="font-mono font-bold">+{formatPrice(salesTotal)}</span>, le total des sorties réelles de caisse (dépenses, achats stock, règlements fournisseurs) s'élève à <span className="font-mono font-bold">-{formatPrice(totalCashOut)}</span>, laissant un déficit net de caisse de <span className="font-mono font-extrabold text-rose-950">-{formatPrice(Math.abs(dayNet))}</span>.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Lignes de décomposition arithmétique */}
                    <div className="space-y-1.5 pt-1">
                      {/* Ventes encaissées */}
                      <div className="flex justify-between items-center bg-blue-100/70 p-2 rounded-xl border border-blue-300/80">
                        <span className="text-blue-950 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                          <span>(+) Ventes au comptant (encaissées en caisse)</span>
                        </span>
                        <span className="font-black text-blue-950 text-sm font-mono tabular-nums">+{formatPrice(salesCashTotal)}</span>
                      </div>

                      {/* Règlements clients */}
                      {repaymentsReceivedTotal > 0 && (
                        <div className="flex justify-between items-center bg-sky-100/70 p-2 rounded-xl border border-sky-300/80">
                          <span className="text-sky-950 font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-600 inline-block" />
                            <span>(+) Dettes clients remboursées (cash reçu)</span>
                          </span>
                          <span className="font-black text-sky-950 text-sm font-mono tabular-nums">+{formatPrice(repaymentsReceivedTotal)}</span>
                        </div>
                      )}

                      {/* Dépenses */}
                      <div className="flex justify-between items-center bg-rose-100/70 p-2 rounded-xl border border-rose-300/80">
                        <span className="text-rose-950 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                          <span>(-) Dépenses diverses payées</span>
                        </span>
                        <span className="font-black text-rose-950 text-sm font-mono tabular-nums">-{formatPrice(expensesTotal)}</span>
                      </div>

                      {/* Achats Stock Cash */}
                      {stockCashTotal > 0 && (
                        <div className="flex justify-between items-center bg-emerald-100/70 p-2 rounded-xl border border-emerald-300/80">
                          <span className="text-emerald-950 font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                            <span>(-) Achats marchandises / stock (cash décaissé)</span>
                          </span>
                          <span className="font-black text-emerald-950 text-sm font-mono tabular-nums">-{formatPrice(stockCashTotal)}</span>
                        </div>
                      )}

                      {/* Règlements fournisseurs */}
                      {supplierPaymentsTotal > 0 && (
                        <div className="flex justify-between items-center bg-rose-100/70 p-2 rounded-xl border border-rose-300/80">
                          <span className="text-rose-950 font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                            <span>(-) Dettes fournisseurs remboursées (cash sorti)</span>
                          </span>
                          <span className="font-black text-rose-950 text-sm font-mono tabular-nums">-{formatPrice(supplierPaymentsTotal)}</span>
                        </div>
                      )}

                      {/* Ligne Maîtresse : Solde Net de Caisse */}
                      <div className={`mt-2 pt-2.5 pb-2.5 px-3 border-2 flex items-center justify-between font-black text-sm sm:text-base rounded-xl shadow-xs ${
                        dayNet >= 0
                          ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300/60'
                          : 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-300/60'
                      }`}>
                        <span className="flex items-center gap-2 font-handwritten text-base sm:text-lg">
                          <Coins className="w-5 h-5 text-white" />
                          <span>SOLDE NET DE CAISSE DU JOUR</span>
                        </span>
                        <span className="font-mono font-black text-base sm:text-lg tabular-nums">
                          {dayNet >= 0 ? `+${formatPrice(dayNet)}` : `-${formatPrice(Math.abs(dayNet))}`}
                        </span>
                      </div>

                      {/* Crédits et Dettes contractés aujourd'hui */}
                      {(creditsGivenTotal > 0 || supplierDebtsContracted > 0) && (
                        <div className="pt-2 border-t border-dashed border-amber-300 flex items-center justify-between text-[11px] font-bold text-gray-700 flex-wrap gap-2">
                          {creditsGivenTotal > 0 && (
                            <span className="text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1 font-mono tabular-nums">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>Crédits accordés aux clients : {formatPrice(creditsGivenTotal)}</span>
                            </span>
                          )}
                          {supplierDebtsContracted > 0 && (
                            <span className="text-fuchsia-900 bg-fuchsia-100 px-2.5 py-1 rounded-lg border border-fuchsia-300 flex items-center gap-1 font-mono tabular-nums">
                              <Clock className="w-3.5 h-3.5 text-fuchsia-700" />
                              <span>Dettes contractées (fournisseurs) : {formatPrice(supplierDebtsContracted)}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Grille des ventes pour cette date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dateSales.map((sale) => {
                    const clientKey = (sale.client || '').trim().toLowerCase()
                    const remDebt = clientKey ? clientDebtMap.get(clientKey) : undefined
                    return (
                      <SaleItemCard
                        key={sale.id}
                        sale={sale}
                        remainingDebt={remDebt}
                        onSettleDebt={(s) => setActiveRepaymentSale(s)}
                        onCrossOut={onSaleCrossedOut}
                        onPrintReceipt={(s) => setActiveReceiptSale(s)}
                        onShareWhatsApp={(s) => setActiveShareSale(s)}
                        onEdit={(s) => setEditingSale(s)}
                        isEmployee={isEmployee}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <SaleDetailModal
        isOpen={!!activeDetailSale}
        onClose={() => setActiveDetailSale(null)}
        sale={activeDetailSale}
        onPrintReceipt={(s) => setActiveReceiptSale(s)}
      />

      <EditSaleModal
        isOpen={!!editingSale}
        sale={editingSale}
        onClose={() => setEditingSale(null)}
        onSave={async (saleId, updatedArticles, clientName) => {
          if (onUpdateSale) {
            await onUpdateSale(saleId, updatedArticles, clientName)
          }
        }}
        onDelete={async (saleId) => {
          if (onSaleCrossedOut) {
            await onSaleCrossedOut(saleId)
          }
        }}
      />

      {activeReceiptSale && (
        <ReceiptPrinterModal
          isOpen={!!activeReceiptSale}
          onClose={() => setActiveReceiptSale(null)}
          sale={activeReceiptSale}
          shopName="Cahier Numérique"
        />
      )}

      {activeShareSale && (
        <ReceiptShareModal
          isOpen={!!activeShareSale}
          onClose={() => setActiveShareSale(null)}
          sale={activeShareSale}
          shopName="Cahier Numérique"
        />
      )}

      <DebtRepaymentModal
        isOpen={!!activeRepaymentSale}
        onClose={() => setActiveRepaymentSale(null)}
        sale={activeRepaymentSale}
        onConfirmRepayment={handleConfirmRepayment}
      />
    </div>
  )
}
