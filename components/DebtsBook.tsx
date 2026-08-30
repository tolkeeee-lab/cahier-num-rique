'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DebtSummaryCards } from '@/components/debts/DebtSummaryCards'
import { DebtFilterBar } from '@/components/debts/DebtFilterBar'
import { DebtItemCard } from '@/components/debts/DebtItemCard'
import { DebtRepaymentModal } from '@/components/sales/DebtRepaymentModal'

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
  onSettleDebt?: (debtId: string, amount: number) => Promise<void>
  onRefreshTotals?: () => void
  onError?: (err: string) => void
}

export function DebtsBook({
  shopId = 'default-shop',
  sales,
  onSettleDebt,
  onRefreshTotals,
  onError,
}: DebtsBookProps) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debtTypeFilter, setDebtTypeFilter] = useState<'all' | 'client' | 'supplier'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('pending')
  const [activeRepayDebt, setActiveRepayDebt] = useState<Debt | null>(null)

  const loadDebts = useCallback(async () => {
    try {
      const res = await fetch('/api/debts', {
        headers: { 'x-shop-id': shopId },
      })
      if (res.ok) {
        const data = await res.json()
        setDebts(data.debts || [])
        return
      }
    } catch (err: any) {
      console.warn('Erreur API dettes, repli sur calcul local offline:', err)
    }

    // ─── REPLI OFFLINE LOCAL ───
    if (sales && sales.length > 0) {
      const offlineDebts: Debt[] = []
      
      // Clients
      const clientSales = sales.filter((s) => s.status !== 'crossed_out' && (s.type === 'sale_credit' || s.type === 'payment_client'))
      const clientNames = Array.from(new Set(clientSales.map(s => s.client_name).filter(Boolean)))
      
      clientNames.forEach(name => {
        const cSales = clientSales.filter(s => s.client_name === name)
        const owed = cSales.filter(s => s.type === 'sale_credit').reduce((sum, s) => sum + (s.debt_amount ?? s.total_amount ?? 0), 0)
        const paid = cSales.filter(s => s.type === 'payment_client').reduce((sum, s) => sum + (s.paid_amount ?? s.total_amount ?? 0), 0)
        const balance = Math.max(0, owed - paid)
        
        offlineDebts.push({
          id: `local-client-${name}`,
          client_name: name as string,
          amount_owed: balance,
          paid_amount: paid,
          debt_type: 'client',
          status: balance <= 0 ? 'settled' : 'pending',
          created_at: new Date().toISOString()
        })
      })

      // Fournisseurs
      const suppSales = sales.filter((s) => s.status !== 'crossed_out' && (s.type === 'purchase_credit' || s.type === 'payment_supplier'))
      const suppNames = Array.from(new Set(suppSales.map(s => s.client_name).filter(Boolean)))

      suppNames.forEach(name => {
        const sSales = suppSales.filter(s => s.client_name === name)
        const owed = sSales.filter(s => s.type === 'purchase_credit').reduce((sum, s) => sum + (s.debt_amount ?? s.total_amount ?? 0), 0)
        const paid = sSales.filter(s => s.type === 'payment_supplier').reduce((sum, s) => sum + (s.paid_amount ?? s.total_amount ?? 0), 0)
        const balance = Math.max(0, owed - paid)

        offlineDebts.push({
          id: `local-supp-${name}`,
          client_name: name as string,
          amount_owed: balance,
          paid_amount: paid,
          debt_type: 'supplier',
          status: balance <= 0 ? 'settled' : 'pending',
          created_at: new Date().toISOString()
        })
      })

      setDebts(offlineDebts)
    }
  }, [shopId, sales])

  useEffect(() => {
    loadDebts()
  }, [loadDebts])

  const handleConfirmRepayment = async (debtId: string, amount: number) => {
    if (onSettleDebt) {
      await onSettleDebt(debtId, amount)
    } else {
      try {
        await fetch('/api/debts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
          body: JSON.stringify({ id: debtId, amount }),
        })
      } catch (e) {
        console.error('Erreur règlement dette:', e)
      }
    }
    loadDebts()
    if (onRefreshTotals) onRefreshTotals()
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
    if (statusFilter !== 'all' && d.status !== statusFilter) {
      return false
    }
    return true
  })

  const totalClientDebts = debts
    .filter((d) => d.status === 'pending' && d.debt_type !== 'supplier')
    .reduce((sum, d) => sum + (d.amount_owed || 0), 0)

  const totalSupplierDebts = debts
    .filter((d) => d.status === 'pending' && d.debt_type === 'supplier')
    .reduce((sum, d) => sum + (d.amount_owed || 0), 0)

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
          }}
          onConfirmRepayment={(id, amount) => handleConfirmRepayment(id, amount)}
        />
      )}
    </div>
  )
}
