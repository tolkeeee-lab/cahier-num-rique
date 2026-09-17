'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DebtSummaryCards } from '@/components/debts/DebtSummaryCards'
import { DebtFilterBar } from '@/components/debts/DebtFilterBar'
import { DebtItemCard } from '@/components/debts/DebtItemCard'
import { DebtRepaymentModal } from '@/components/sales/DebtRepaymentModal'
import { saveOfflineSale, generateOfflineId, getOfflineSales, markAsSynced, OfflineSale } from '@/lib/offlineDb'
import { getTodayDateString } from '@/lib/dateUtils'
interface Debt {
  id: string
  client_name: string
  amount_owed: number
  paid_amount?: number
  debt_type?: 'client' | 'supplier'
  status: 'pending' | 'settled'
  created_at: string
  notes?: string
}

export interface DebtsBookProps {
  shopId?: string
  sales?: any[]
  currentCash?: number
  onSettleDebt?: (debtId: string, amount: number, notes?: string, clientName?: string, isSupplier?: boolean) => Promise<void>
  onRefreshTotals?: () => void
  onError?: (err: string) => void
}

export function DebtsBook({
  shopId = 'default-shop',
  sales,
  currentCash,
  onSettleDebt,
  onRefreshTotals,
  onError,
}: DebtsBookProps) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debtTypeFilter, setDebtTypeFilter] = useState<'all' | 'client' | 'supplier'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('pending')
  const [activeRepayDebt, setActiveRepayDebt] = useState<Debt | null>(null)

  const loadDebts = useCallback(async (currentSales?: any[]) => {
    let apiDebts: Debt[] = []
    try {
      const res = await fetch('/api/debts', {
        headers: { 'x-shop-id': shopId },
        cache: 'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        apiDebts = data.debts || []
      }
    } catch (err: any) {
      console.error('Erreur loadDebts', err)
      if (onError) onError(err.message)
    }

    const salesToMerge = currentSales || sales

    // ─── FUSION AVEC LES VENTES LOCALES (NON SYNCHRONISÉES OU OFFLINE) ───
    if (salesToMerge && salesToMerge.length > 0) {
      const mergedDebts = [...apiDebts]
      
      // On ne prend que les ventes qui n'ont pas encore été synchronisées avec l'API
      const unsyncedSales = salesToMerge.filter(s => s.status !== 'crossed_out' && s.is_synced === false)

      const processSales = (filteredSales: any[], type: 'client' | 'supplier') => {
        const names = Array.from(new Set(filteredSales.map(s => (s.client_name || s.client || '').trim()).filter(Boolean)))
        
        names.forEach(name => {
          const lowerName = name.toLowerCase()
          const sSales = filteredSales.filter(s => (s.client_name || s.client || '').toLowerCase().trim() === lowerName)
          const owed = sSales.filter(s => s.type === (type === 'client' ? 'sale_credit' : 'purchase_credit')).reduce((sum, s) => sum + Number(s.debt_amount ?? s.debt ?? s.total_amount ?? s.total ?? 0), 0)
          const paid = sSales.filter(s => s.type === (type === 'client' ? 'payment_client' : 'payment_supplier')).reduce((sum, s) => sum + Number(s.paid_amount ?? s.paid ?? s.total_amount ?? s.total ?? 0), 0)
          
          const existingIdx = mergedDebts.findIndex(d => (d.client_name || '').toLowerCase().trim() === lowerName && d.debt_type === type)
          if (existingIdx >= 0) {
            mergedDebts[existingIdx].amount_owed = Math.max(0, Number(mergedDebts[existingIdx].amount_owed || 0) + owed - paid)
            mergedDebts[existingIdx].paid_amount = Number(mergedDebts[existingIdx].paid_amount || 0) + paid
            mergedDebts[existingIdx].status = mergedDebts[existingIdx].amount_owed <= 0 ? 'settled' : 'pending'
          } else {
            const balance = Math.max(0, owed - paid)
            mergedDebts.push({
              id: `local-${type}-${name}`,
              client_name: name as string,
              amount_owed: balance,
              paid_amount: paid,
              debt_type: type,
              status: balance <= 0 ? 'settled' : 'pending',
              created_at: new Date().toISOString()
            })
          }
        })
      }

      const clientSales = unsyncedSales.filter(s => s.type === 'sale_credit' || s.type === 'payment_client')
      processSales(clientSales, 'client')

      const suppSales = unsyncedSales.filter(s => s.type === 'purchase_credit' || s.type === 'payment_supplier')
      processSales(suppSales, 'supplier')

      // Mettre à jour l'état final
      setDebts(mergedDebts)
    } else {
      setDebts(apiDebts)
    }
  }, [shopId, sales, onError])

  useEffect(() => {
    loadDebts()

    const handleSalesUpdate = () => {
      loadDebts()
    }

    window.addEventListener('cahier_sale_created', handleSalesUpdate)
    window.addEventListener('cahier_sales_updated', handleSalesUpdate)
    return () => {
      window.removeEventListener('cahier_sale_created', handleSalesUpdate)
      window.removeEventListener('cahier_sales_updated', handleSalesUpdate)
    }
  }, [loadDebts])

  const handleConfirmRepayment = async (repayAmount: number, customNotes?: string) => {
    if (!activeRepayDebt) return

    const debt = activeRepayDebt
    const isSupplier = debt.debt_type === 'supplier'
    const today = getTodayDateString()
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const saleId = generateOfflineId()

    const newSale: OfflineSale = {
      id: saleId,
      shop_id: shopId,
      date: today,
      time: time,
      type: isSupplier ? 'payment_supplier' : 'payment_client',
      client: debt.client_name,
      total: repayAmount,
      paid: repayAmount,
      debt: 0,
      status: 'paid',
      notes: customNotes || (isSupplier
        ? `Remboursement dette fournisseur (${debt.client_name})`
        : `Remboursement dette client (${debt.client_name})`),
      pen_color: isSupplier ? 'red' : 'blue',
      articles: [],
      is_synced: false,
      created_at: now.toISOString(),
    }

    try {
      if (onSettleDebt) {
        await onSettleDebt(debt.id, repayAmount, customNotes, debt.client_name, isSupplier)
      } else {
        saveOfflineSale(shopId, newSale)
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
          body: JSON.stringify({
            overrideData: newSale,
            type: newSale.type,
            penColor: newSale.pen_color,
          }),
        })
        if (response.ok) {
          markAsSynced(shopId, saleId)
        }
      }
    } catch (e) {
      console.warn('Mode hors-ligne : remboursement enregistré localement')
    }

    setActiveRepayDebt(null)

    const currentOffline = getOfflineSales(shopId)
    const combinedSales = [
      ...currentOffline,
      ...(sales || []).filter((s) => !currentOffline.some((o) => o.id === s.id)),
    ]
    loadDebts(combinedSales)
    if (onRefreshTotals) onRefreshTotals()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cahier_sale_created'))
      window.dispatchEvent(new CustomEvent('cahier_sales_updated'))
    }
  }

  const filteredDebts = debts.filter((d) => {
    if (searchQuery.trim() && !d.client_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (debtTypeFilter !== 'all') {
      const isSupp = d.debt_type === 'supplier'
      if (debtTypeFilter === 'supplier' && !isSupp) return false
      if (debtTypeFilter === 'client' && isSupp) return false
    }
    if (statusFilter !== 'all') {
      const isSettled = d.status === 'settled' || (d as any).status === 'paid'
      if (statusFilter === 'settled' && !isSettled) return false
      if (statusFilter === 'pending' && isSettled) return false
    }
    return true
  })

  const totalClientDebts = debts
    .filter((d) => (d.status === 'pending' && (d as any).status !== 'paid') && d.debt_type !== 'supplier')
    .reduce((sum, d) => sum + Number(d.amount_owed || 0), 0)

  const totalSupplierDebts = debts
    .filter((d) => (d.status === 'pending' && (d as any).status !== 'paid') && d.debt_type === 'supplier')
    .reduce((sum, d) => sum + Number(d.amount_owed || 0), 0)

  return (
    <div className="space-y-4">
      <DebtSummaryCards
        totalClientDebts={totalClientDebts}
        totalSupplierDebts={totalSupplierDebts}
      />

      <DebtFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        debtTypeFilter={debtTypeFilter}
        onDebtTypeFilterChange={setDebtTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {filteredDebts.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white/80 rounded-2xl border border-amber-300/80 font-mono text-xs shadow-sm">
          Aucune dette ne correspond à vos filtres.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredDebts.map((debt) => (
            <DebtItemCard
              key={debt.id}
              debt={debt}
              onOpenRepaymentModal={(d) => setActiveRepayDebt(d)}
            />
          ))}
        </div>
      )}

      {activeRepayDebt && (
        <DebtRepaymentModal
          isOpen={!!activeRepayDebt}
          onClose={() => setActiveRepayDebt(null)}
          sale={{
            id: activeRepayDebt.id,
            client: activeRepayDebt.client_name,
            debt: activeRepayDebt.amount_owed,
            debt_type: activeRepayDebt.debt_type,
          }}
          debtType={activeRepayDebt.debt_type}
          currentCash={currentCash}
          onConfirmRepayment={async (_id, amount, notes) => handleConfirmRepayment(amount, notes)}
        />
      )}
    </div>
  )
}
