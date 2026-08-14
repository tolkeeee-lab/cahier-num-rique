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
  onSettleDebt?: (debtId: string, amount: number) => Promise<void>
  onRefreshTotals?: () => void
  onError?: (err: string) => void
}

export function DebtsBook({
  shopId = 'default-shop',
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
      }
    } catch (err: any) {
      console.error('Erreur chargement dettes:', err)
      if (onError) onError(err.message)
    }
  }, [shopId, onError])

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
