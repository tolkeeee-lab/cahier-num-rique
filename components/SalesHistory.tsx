'use client'

import React, { useState, useMemo } from 'react'
import { Calendar } from 'lucide-react'
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
        const today = new Date().toISOString().slice(0, 10)
        if (s.date !== today) return false
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

  const handleConfirmRepayment = async (saleId: string, amount: number, notes: string) => {
    const target = sales.find(s => s.id === saleId)
    const clientName = target?.client || 'Client'
    const newSaleId = generateOfflineId()
    const now = new Date()
    const isSupplier = target?.type === 'purchase_credit' || target?.pen_color === 'purple'

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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cahier_sale_created'))
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
            const salesTotal = validDateSales
              .filter(s => s.pen_color === 'blue' || s.type === 'cash_in' || s.type === 'sale_credit' || s.type === 'sale')
              .reduce((sum, s) => sum + Number(s.total || 0), 0)

            return (
              <div key={dateKey} className="space-y-2.5">
                {/* ── Séparateur de Date avec CA de la journée ── */}
                <div className="flex items-center justify-between gap-2 py-2 px-3.5 bg-gradient-to-r from-amber-100/90 via-yellow-50 to-amber-100/90 border border-amber-300/90 rounded-2xl font-mono text-xs shadow-2xs select-none">
                  <div className="flex items-center gap-2 font-handwritten font-black text-sm sm:text-base text-amber-950">
                    <Calendar className="w-4 h-4 text-amber-900 flex-shrink-0" strokeWidth={1.75} />
                    <span>{formatLongDateFr(dateKey)}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-blue-600 text-white shadow-2xs tabular-nums">
                      CA : +{formatPrice(salesTotal)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full font-extrabold bg-amber-900/10 text-amber-950 border border-amber-300 text-[11px] tabular-nums">
                      {validDateSales.length} vente(s)
                    </span>
                  </div>
                </div>

                {/* Grille des ventes pour cette date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dateSales.map((sale) => (
                    <SaleItemCard
                      key={sale.id}
                      sale={sale}
                      onCrossOut={onSaleCrossedOut}
                      onPrintReceipt={(s) => setActiveReceiptSale(s)}
                      onShareWhatsApp={(s) => setActiveShareSale(s)}
                      onEdit={(s) => setEditingSale(s)}
                      isEmployee={isEmployee}
                    />
                  ))}
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
