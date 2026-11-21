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
import { generateOfflineId, saveOfflineSale, markAsSynced, getOfflineProducts, saveOfflineProduct } from '@/lib/offlineDb'
import { getTodayDateString } from '@/lib/dateUtils'
import { reconcileDebts } from '@/hooks/useJournalData'
import { ProductReturnPayload } from '@/components/sales/ProductReturnModal'
import { logAuditEvent } from '@/lib/auditLogger'

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
  onReturnItems?: (payload: ProductReturnPayload) => Promise<void>
}

import { EditSaleModal } from '@/components/journal/EditSaleModal'

export function SalesHistory({
  sales,
  onSaleCrossedOut,
  onUpdateSale,
  onSettleDebt,
  onError,
  shopId = '',
  isEmployee = false,
  onReturnItems,
}: SalesHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [visibleDaysCount, setVisibleDaysCount] = useState(7)

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

  const handleReturnItems = async (payload: ProductReturnPayload) => {
    if (onReturnItems) {
      await onReturnItems(payload)
      return
    }

    try {
      // 1. Audit log immuable
      await logAuditEvent({
        shopId,
        action: 'sale_returned',
        targetId: payload.saleId,
        details: {
          refundMode: payload.refundMode,
          totalRefundAmount: payload.totalRefundAmount,
          reason: payload.reason,
          items: payload.items,
          restock: payload.restock,
        },
      })

      // 2. Remise en stock automatique si demandée
      if (payload.restock && payload.items?.length > 0) {
        const currentProducts = getOfflineProducts(shopId)
        for (const item of payload.items) {
          const normItem = item.name.toLowerCase().trim()
          const matched = currentProducts.find(p => p.name.toLowerCase().trim() === normItem)
          if (matched) {
            const currentStock = (matched.current_stock ?? matched.initial_stock ?? 0) + item.quantity
            const updated = { ...matched, current_stock: currentStock, is_synced: false }
            saveOfflineProduct(shopId, updated)

            // Tentative serveur en tâche de fond
            fetch('/api/stock/adjust', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
              body: JSON.stringify({
                productId: matched.id,
                quantity: item.quantity,
                type: 'in',
                reason: 'inventory_correction',
                notes: `Retour client (${payload.reason})`,
              }),
            }).catch(() => {})
          }
        }
      }

      // 3. Mise à jour de la vente si onUpdateSale est disponible
      if (onUpdateSale && activeDetailSale) {
        const remainingArticles: Article[] = []
        for (const art of (activeDetailSale.articles || [])) {
          const ret = payload.items.find(i => i.name.toLowerCase().trim() === art.name.toLowerCase().trim())
          if (ret) {
            const remQty = Math.max(0, (art.quantity || 1) - ret.quantity)
            if (remQty > 0) {
              remainingArticles.push({ ...art, quantity: remQty })
            }
          } else {
            remainingArticles.push(art)
          }
        }
        await onUpdateSale(payload.saleId, remainingArticles, activeDetailSale.client)
      }
    } catch (err: any) {
      if (onError) onError(err?.message || 'Erreur lors du traitement du retour.')
    }
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
        <div className="p-12 text-center text-stone-500 bg-[#faf5e8] rounded-2xl border border-[#e2d6be] text-xs">
          Aucune vente ne correspond à vos critères de recherche.
        </div>
      ) : (
        <div className="space-y-6">
          {salesByDate.slice(0, visibleDaysCount).map(([dateKey, dateSales]) => {
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
                <button
                  type="button"
                  onClick={() => toggleBilan(dateKey)}
                  className="w-full text-left flex items-center justify-between gap-2 py-2.5 px-4 bg-[#faf5e8] hover:bg-[#f5efe0] border border-[#e2d6be] rounded-xl text-xs transition-colors active:scale-[0.99] cursor-pointer group select-none"
                  title="Cliquer pour ouvrir ou fermer le bilan financier détaillé de cette journée"
                >
                  <div className="flex items-center gap-2 font-semibold text-sm text-stone-900">
                    <Calendar className="w-4 h-4 text-stone-500 flex-shrink-0" strokeWidth={1.5} />
                    <span>{formatLongDateFr(dateKey)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
                    <span className="px-2.5 py-0.5 rounded-md font-semibold text-xs bg-white text-stone-900 border border-stone-200 font-mono tabular-nums">
                      CA : +{formatPrice(salesTotal)}
                    </span>

                    {expensesExceedCA ? (
                      <span className="px-2.5 py-0.5 rounded-md font-semibold text-xs bg-rose-50 text-rose-700 border border-rose-200 font-mono tabular-nums flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" strokeWidth={1.5} />
                        <span>Dépenses &gt; CA ({dayNet >= 0 ? `+${formatPrice(dayNet)}` : `-${formatPrice(Math.abs(dayNet))}`})</span>
                      </span>
                    ) : dayNet > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-md font-semibold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono tabular-nums hidden sm:inline-flex">
                        Net : +{formatPrice(dayNet)}
                      </span>
                    ) : null}

                    <span className="px-2 py-0.5 rounded-md font-medium bg-stone-100 text-stone-600 text-[11px] font-mono tabular-nums">
                      {validDateSales.length} écriture{validDateSales.length > 1 ? 's' : ''}
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-white text-stone-700 group-hover:bg-stone-50 border border-stone-200 transition-colors flex items-center gap-1 text-[11px] font-medium">
                      <span>Bilan</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.5} />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.5} />
                      )}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 bg-white border border-[#e2d6be] rounded-xl text-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                      <div className="flex items-center gap-2 font-semibold text-stone-900 text-sm">
                        <Calculator className="w-4 h-4 text-emerald-700" strokeWidth={1.5} />
                        <span>Bilan et flux de caisse</span>
                      </div>
                      <span className="text-xs text-stone-500">
                        {formatLongDateFr(dateKey)}
                      </span>
                    </div>

                    {expensesExceedCA && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-rose-900">
                            Les dépenses du jour dépassent le chiffre d&apos;affaires
                          </p>
                          <p className="text-xs text-rose-800 leading-relaxed">
                            Même si le chiffre d&apos;affaires affiche <span className="font-mono font-semibold tabular-nums">+{formatPrice(salesTotal)}</span>, les sorties réelles de caisse s&apos;élèvent à <span className="font-mono font-semibold tabular-nums">-{formatPrice(totalCashOut)}</span>, soit un déficit net de <span className="font-mono font-semibold tabular-nums">-{formatPrice(Math.abs(dayNet))}</span>.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center bg-[#faf5e8] px-3 py-2 rounded-lg border border-stone-200">
                        <span className="text-stone-700 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                          <span>Ventes au comptant (encaissées)</span>
                        </span>
                        <span className="font-semibold text-stone-900 text-sm font-mono tabular-nums">+{formatPrice(salesCashTotal)}</span>
                      </div>

                      {repaymentsReceivedTotal > 0 && (
                        <div className="flex justify-between items-center bg-[#faf5e8] px-3 py-2 rounded-lg border border-stone-200">
                          <span className="text-stone-700 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-600 inline-block" />
                            <span>Dettes clients remboursées</span>
                          </span>
                          <span className="font-semibold text-stone-900 text-sm font-mono tabular-nums">+{formatPrice(repaymentsReceivedTotal)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center bg-[#faf5e8] px-3 py-2 rounded-lg border border-stone-200">
                        <span className="text-stone-700 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                          <span>Dépenses diverses payées</span>
                        </span>
                        <span className="font-semibold text-rose-700 text-sm font-mono tabular-nums">-{formatPrice(expensesTotal)}</span>
                      </div>

                      {stockCashTotal > 0 && (
                        <div className="flex justify-between items-center bg-[#faf5e8] px-3 py-2 rounded-lg border border-stone-200">
                          <span className="text-stone-700 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-stone-500 inline-block" />
                            <span>Achats stock (cash décaissé)</span>
                          </span>
                          <span className="font-semibold text-stone-900 text-sm font-mono tabular-nums">-{formatPrice(stockCashTotal)}</span>
                        </div>
                      )}

                      {supplierPaymentsTotal > 0 && (
                        <div className="flex justify-between items-center bg-[#faf5e8] px-3 py-2 rounded-lg border border-stone-200">
                          <span className="text-stone-700 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                            <span>Dettes fournisseurs remboursées</span>
                          </span>
                          <span className="font-semibold text-rose-700 text-sm font-mono tabular-nums">-{formatPrice(supplierPaymentsTotal)}</span>
                        </div>
                      )}

                      <div className={`mt-2 px-3.5 py-2.5 border flex items-center justify-between font-semibold text-sm rounded-xl ${
                        dayNet >= 0
                          ? 'bg-emerald-700 text-white border-emerald-800'
                          : 'bg-rose-700 text-white border-rose-800'
                      }`}>
                        <span className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-white/90" strokeWidth={1.5} />
                          <span>Solde net de caisse du jour</span>
                        </span>
                        <span className="font-mono font-semibold text-base tabular-nums">
                          {dayNet >= 0 ? `+${formatPrice(dayNet)}` : `-${formatPrice(Math.abs(dayNet))}`}
                        </span>
                      </div>

                      {(creditsGivenTotal > 0 || supplierDebtsContracted > 0) && (
                        <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600 flex-wrap gap-2">
                          {creditsGivenTotal > 0 && (
                            <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5 font-mono tabular-nums">
                              <Clock className="w-3.5 h-3.5 text-amber-700" strokeWidth={1.5} />
                              <span>Crédits clients : {formatPrice(creditsGivenTotal)}</span>
                            </span>
                          )}
                          {supplierDebtsContracted > 0 && (
                            <span className="text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 flex items-center gap-1.5 font-mono tabular-nums">
                              <Clock className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.5} />
                              <span>Dettes fournisseurs : {formatPrice(supplierDebtsContracted)}</span>
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

          {salesByDate.length > visibleDaysCount && (
            <div className="flex justify-center pt-4 pb-8">
              <button
                onClick={() => setVisibleDaysCount(prev => prev + 7)}
                className="px-6 py-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl font-mono text-sm shadow-sm hover:bg-amber-100 transition-colors"
              >
                Voir {Math.min(7, salesByDate.length - visibleDaysCount)} jours plus anciens...
              </button>
            </div>
          )}
        </div>
      )}

      <SaleDetailModal
        isOpen={!!activeDetailSale}
        onClose={() => setActiveDetailSale(null)}
        sale={activeDetailSale}
        onPrintReceipt={(s) => setActiveReceiptSale(s)}
        onReturnItems={handleReturnItems}
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
