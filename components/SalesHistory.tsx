'use client'

import React, { useState, useMemo } from 'react'
import { SalesFilterBar } from '@/components/sales/SalesFilterBar'
import { SaleItemCard } from '@/components/sales/SaleItemCard'
import { SaleDetailModal } from '@/components/sales/SaleDetailModal'
import { DebtRepaymentModal } from '@/components/sales/DebtRepaymentModal'
import { ReceiptPrinterModal } from '@/components/ReceiptPrinterModal'
import { exportSalesToCSV, exportSalesToPDF } from '@/lib/exportUtils'
import { formatPrice } from '@/lib/penUtils'

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
  onAddArticle,
  onUpdateSale,
  shopId = 'default-shop',
  isEmployee = false,
}: SalesHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [activeDetailSale, setActiveDetailSale] = useState<Sale | null>(null)
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null)
  const [activeRepaymentSale, setActiveRepaymentSale] = useState<Sale | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchClient = s.client.toLowerCase().includes(q)
        const matchNotes = (s.notes || '').toLowerCase().includes(q)
        const matchArticle = s.articles.some(a => a.name.toLowerCase().includes(q))
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
    if (onAddArticle) {
      await onAddArticle(saleId, `Paiement dette: ${amount} FCFA ${notes ? `(${notes})` : ''}`)
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
              .reduce((sum, s) => sum + (s.total || 0), 0)

            return (
              <div key={dateKey} className="space-y-2.5">
                {/* ── Séparateur de Date avec CA de la journée ── */}
                <div className="flex items-center justify-between gap-2 py-2 px-3.5 bg-gradient-to-r from-amber-100/90 via-yellow-50 to-amber-100/90 border border-amber-300/90 rounded-2xl font-mono text-xs shadow-2xs select-none">
                  <div className="flex items-center gap-2 font-handwritten font-black text-sm sm:text-base text-amber-950">
                    <span>📅</span>
                    <span>{formatLongDateFr(dateKey)}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-blue-600 text-white shadow-2xs">
                      🔵 CA : +{formatPrice(salesTotal)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full font-extrabold bg-amber-900/10 text-amber-950 border border-amber-300 text-[11px]">
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

      <DebtRepaymentModal
        isOpen={!!activeRepaymentSale}
        onClose={() => setActiveRepaymentSale(null)}
        sale={activeRepaymentSale}
        onConfirmRepayment={handleConfirmRepayment}
      />
    </div>
  )
}
