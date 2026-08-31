'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DebtSummaryCards } from '@/components/debts/DebtSummaryCards'
import { DebtFilterBar } from '@/components/debts/DebtFilterBar'
import { DebtItemCard } from '@/components/debts/DebtItemCard'
import { DebtRepaymentModal } from '@/components/sales/DebtRepaymentModal'
import { saveOfflineSale, generateOfflineId } from '@/lib/offlineDb'
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
    let apiDebts: Debt[] = []
    try {
      const res = await fetch('/api/debts', {
        headers: { 'x-shop-id': shopId },
      })
      if (res.ok) {
        const data = await res.json()
        apiDebts = data.debts || []
      }
    } catch (err: any) {
      console.warn('Erreur API dettes, repli sur calcul local offline:', err)
      if (onError) onError(err.message)
    }

    // ─── FUSION AVEC LES VENTES LOCALES (NON SYNCHRONISÉES OU OFFLINE) ───
    if (sales && sales.length > 0) {
      const mergedDebts = [...apiDebts]
      
      // On ne prend que les ventes qui n'ont pas encore été synchronisées avec l'API
      const unsyncedSales = sales.filter(s => s.status !== 'crossed_out' && s.is_synced === false)

      const processSales = (filteredSales: any[], type: 'client' | 'supplier') => {
        const names = Array.from(new Set(filteredSales.map(s => s.client_name || s.client).filter(Boolean)))
        
        names.forEach(name => {
          const sSales = filteredSales.filter(s => s.client_name === name || s.client === name)
          const owed = sSales.filter(s => s.type === (type === 'client' ? 'sale_credit' : 'purchase_credit')).reduce((sum, s) => sum + (s.debt_amount ?? s.debt ?? s.total_amount ?? s.total ?? 0), 0)
          const paid = sSales.filter(s => s.type === (type === 'client' ? 'payment_client' : 'payment_supplier')).reduce((sum, s) => sum + (s.paid_amount ?? s.paid ?? s.total_amount ?? s.total ?? 0), 0)
          
          const existingIdx = mergedDebts.findIndex(d => d.client_name === name && d.debt_type === type)
          if (existingIdx >= 0) {
            mergedDebts[existingIdx].amount_owed += owed
            mergedDebts[existingIdx].paid_amount = (mergedDebts[existingIdx].paid_amount || 0) + paid
            const newBalance = mergedDebts[existingIdx].amount_owed - (mergedDebts[existingIdx].paid_amount || 0)
            mergedDebts[existingIdx].status = newBalance <= 0 ? 'settled' : 'pending'
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
  }, [shopId, sales])

  useEffect(() => {
    loadDebts()
  }, [loadDebts])

  const handleConfirmRepayment = async (debtId: string, amount: number) => {
    const debt = debts.find((d) => d.id === debtId)
    if (!debt) return

    const isSupplier = debt.debt_type === 'supplier'
    const newSale = {
      id: generateOfflineId(),
      shop_id: shopId,
      date: getTodayDateString(),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      client_name: debt.client_name,
      total_amount: amount,
      paid_amount: amount,
      debt_amount: 0,
      status: 'paid',
      type: isSupplier ? 'payment_supplier' : 'payment_client',
      pen_color: isSupplier ? 'red' : 'blue',
      notes: isSupplier ? 'Remboursement fournisseur' : 'Remboursement',
      created_at: new Date().toISOString(),
      articles: [],
      is_synced: false
    }

    // Sauvegarde OFFLINE instantanée !
    saveOfflineSale(shopId, newSale as any)

    // Si on avait une callback depuis le parent, on l'appelle
    if (onSettleDebt) {
      await onSettleDebt(debtId, amount)
    } else {
      // Sinon, on tente de synchroniser silencieusement en arrière-plan avec l'API route correcte
      try {
        await fetch('/api/debts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
          body: JSON.stringify({ 
            name: debt.client_name, 
            amount, 
            type: isSupplier ? 'supplier' : 'client', 
            action: 'pay' 
          }),
        })
      } catch (e) {
        console.warn('Règlement conservé en local (hors ligne):', e)
        if (onError) onError('⚠️ Paiement sauvegardé hors-ligne.')
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
