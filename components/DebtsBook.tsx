'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DebtSummaryCards } from '@/components/debts/DebtSummaryCards'
import { DebtFilterBar, DebtSortOption } from '@/components/debts/DebtFilterBar'
import { DebtItemCard, DebtHistoryEntry } from '@/components/debts/DebtItemCard'
import { DebtRepaymentModal } from '@/components/sales/DebtRepaymentModal'
import { saveOfflineSale, generateOfflineId, getOfflineSales, markAsSynced, OfflineSale } from '@/lib/offlineDb'
import { broadcastInstantSync } from '@/lib/realtimeSync'
import { getTodayDateString } from '@/lib/dateUtils'
import { X, CheckCircle2 } from 'lucide-react'

interface Debt {
  id: string
  client_name: string
  amount_owed: number
  paid_amount?: number
  debt_type?: 'client' | 'supplier'
  status: 'pending' | 'settled'
  created_at: string
  due_date?: string
  notes?: string
}

export interface DebtsBookProps {
  shopId?: string
  shopName?: string
  sales?: any[]
  currentCash?: number
  isEmployee?: boolean
  onSettleDebt?: (debtId: string, amount: number, notes?: string, clientName?: string, isSupplier?: boolean) => Promise<void>
  onRefreshTotals?: () => void
  onError?: (err: string) => void
}

export function DebtsBook({
  shopId = '',
  shopName = 'Ma Boutique',
  sales,
  currentCash,
  isEmployee = false,
  onSettleDebt,
  onRefreshTotals,
  onError,
}: DebtsBookProps) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debtTypeFilter, setDebtTypeFilter] = useState<'all' | 'client' | 'supplier'>(isEmployee ? 'client' : 'all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('pending')
  const [sortBy, setSortBy] = useState<DebtSortOption>('amount_desc')
  const [activeRepayDebt, setActiveRepayDebt] = useState<Debt | null>(null)

  // Formulaire rapide "+ Nouvelle dette"
  const [showNewDebtForm, setShowNewDebtForm] = useState(false)
  const [newDebtName, setNewDebtName] = useState('')
  const [newDebtPhone, setNewDebtPhone] = useState('')
  const [newDebtAmount, setNewDebtAmount] = useState('')
  const [newDebtDueDate, setNewDebtDueDate] = useState('')
  const [newDebtType, setNewDebtType] = useState<'client' | 'supplier'>('client')
  const [newDebtNotes, setNewDebtNotes] = useState('')
  const [isCreatingDebt, setIsCreatingDebt] = useState(false)

  const loadDebts = useCallback(async (currentSales?: any[]) => {
    let apiDebts: Debt[] = []
    if (!shopId) return
    try {
      const res = await fetch('/api/debts', {
        headers: { 'x-shop-id': shopId },
        cache: 'no-store',
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
      const unsyncedSales = salesToMerge.filter((s) => s.status !== 'crossed_out' && s.is_synced === false)

      const processSales = (filteredSales: any[], type: 'client' | 'supplier') => {
        const names = Array.from(new Set(filteredSales.map((s) => (s.client_name || s.client || '').trim()).filter(Boolean)))

        names.forEach((name) => {
          const lowerName = name.toLowerCase()
          const sSales = filteredSales.filter((s) => (s.client_name || s.client || '').toLowerCase().trim() === lowerName)
          const owed = sSales
            .filter((s) => s.type === (type === 'client' ? 'sale_credit' : 'purchase_credit'))
            .reduce((sum, s) => sum + Number(s.debt_amount ?? s.debt ?? s.total_amount ?? s.total ?? 0), 0)
          const paid = sSales
            .filter((s) => s.type === (type === 'client' ? 'payment_client' : 'payment_supplier'))
            .reduce((sum, s) => sum + Number(s.paid_amount ?? s.paid ?? s.total_amount ?? s.total ?? 0), 0)

          const existingIdx = mergedDebts.findIndex(
            (d) => (d.client_name || '').toLowerCase().trim() === lowerName && d.debt_type === type
          )
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
              created_at: new Date().toISOString(),
            })
          }
        })
      }

      processSales(unsyncedSales.filter((s) => s.type === 'sale_credit' || s.type === 'payment_client'), 'client')
      processSales(unsyncedSales.filter((s) => s.type === 'purchase_credit' || s.type === 'payment_supplier'), 'supplier')

      setDebts(mergedDebts)
    } else {
      setDebts(apiDebts)
    }
  }, [shopId, sales, onError])

  useEffect(() => {
    loadDebts()
    const handleSalesUpdate = () => loadDebts()
    window.addEventListener('cahier_sale_created', handleSalesUpdate)
    window.addEventListener('cahier_sales_updated', handleSalesUpdate)
    return () => {
      window.removeEventListener('cahier_sale_created', handleSalesUpdate)
      window.removeEventListener('cahier_sales_updated', handleSalesUpdate)
    }
  }, [loadDebts])

  // Indexer l'historique des écritures par (type, nom) pour le panneau dépliable de chaque fiche
  const historyByKey = useMemo(() => {
    const map = new Map<string, DebtHistoryEntry[]>()
    const list = sales || []
    for (const s of list) {
      if (!s || s.status === 'crossed_out') continue
      const isClientOp = s.type === 'sale_credit' || s.type === 'payment_client'
      const isSuppOp = s.type === 'purchase_credit' || s.type === 'payment_supplier'
      if (!isClientOp && !isSuppOp) continue
      const name = (s.client_name || s.client || '').trim().toLowerCase()
      if (!name) continue
      const key = `${isSuppOp ? 'supplier' : 'client'}:${name}`
      const amount =
        s.type === 'payment_client' || s.type === 'payment_supplier'
          ? Number(s.paid ?? s.paid_amount ?? s.total ?? s.total_amount ?? 0)
          : Number(s.debt ?? s.debt_amount ?? s.total ?? s.total_amount ?? 0)
      const arr = map.get(key) || []
      arr.push({
        id: s.id,
        date: s.date || '',
        time: s.time || '',
        type: s.type,
        amount,
        notes: s.notes || '',
        articles: Array.isArray(s.articles) ? s.articles : [],
      })
      map.set(key, arr)
    }
    return map
  }, [sales])

  const handleCreateNewDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = newDebtName.trim()
    const amount = Math.round(Number(newDebtAmount.replace(/[^\d]/g, '')))
    if (!cleanName || !amount || amount <= 0 || isCreatingDebt) return

    setIsCreatingDebt(true)
    const effectiveType = isEmployee ? 'client' : newDebtType
    const fullName = newDebtPhone.trim() ? `${cleanName} ${newDebtPhone.trim()}` : cleanName
    const today = getTodayDateString()
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const saleId = generateOfflineId()

    const baseNote = newDebtNotes.trim() || `Crédit ${effectiveType === 'supplier' ? 'fournisseur' : 'client'} - ${cleanName}`
    const dueTag = newDebtDueDate ? ` [Échéance: ${newDebtDueDate}]` : ''
    const finalNotes = `${baseNote}${dueTag}`

    const newSale: OfflineSale = {
      id: saleId,
      shop_id: shopId,
      date: today,
      time,
      type: effectiveType === 'supplier' ? 'purchase_credit' : 'sale_credit',
      client: fullName,
      total: amount,
      paid: 0,
      debt: amount,
      status: 'debt',
      notes: finalNotes,
      pen_color: effectiveType === 'supplier' ? 'purple' : 'yellow',
      articles: [],
      is_synced: false,
      created_at: now.toISOString(),
    }

    // 1. Sauvegarde locale immédiate (Offline-First)
    saveOfflineSale(shopId, newSale)
    broadcastInstantSync(shopId, 'sales', newSale)

    // 2. Synchronisation API en arrière-plan
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
        body: JSON.stringify({
          id: saleId,
          date: today,
          time,
          created_at: newSale.created_at,
          name: fullName,
          amount,
          type: effectiveType,
          action: 'credit',
          description: newSale.notes,
        }),
      })
      if (res.ok) markAsSynced(shopId, saleId)
    } catch {
      console.warn('Mode hors-ligne : nouvelle dette enregistrée localement')
    }

    setNewDebtName('')
    setNewDebtPhone('')
    setNewDebtAmount('')
    setNewDebtDueDate('')
    setNewDebtNotes('')
    setShowNewDebtForm(false)
    setIsCreatingDebt(false)

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
      time,
      type: isSupplier ? 'payment_supplier' : 'payment_client',
      client: debt.client_name,
      total: repayAmount,
      paid: repayAmount,
      debt: 0,
      status: 'paid',
      notes:
        customNotes ||
        (isSupplier
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
        if (response.ok) markAsSynced(shopId, saleId)
      }
    } catch {
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

  const visibleDebts = useMemo(
    () => (isEmployee ? debts.filter((d) => d.debt_type !== 'supplier') : debts),
    [debts, isEmployee]
  )

  const filteredDebts = useMemo(() => {
    const list = visibleDebts.filter((d) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (d.client_name || '').toLowerCase().includes(q)
        const matchNotes = (d.notes || '').toLowerCase().includes(q)
        if (!matchName && !matchNotes) return false
      }
      if (debtTypeFilter !== 'all') {
        const isSupp = d.debt_type === 'supplier'
        if (debtTypeFilter === 'supplier' && !isSupp) return false
        if (debtTypeFilter === 'client' && isSupp) return false
      }
      if (statusFilter !== 'all') {
        const isSettled = d.status === 'settled' || (d as any).status === 'paid' || d.amount_owed <= 0
        if (statusFilter === 'settled' && !isSettled) return false
        if (statusFilter === 'pending' && isSettled) return false
      }
      return true
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'amount_desc') return Number(b.amount_owed || 0) - Number(a.amount_owed || 0)
      if (sortBy === 'name_asc') return (a.client_name || '').localeCompare(b.client_name || '', 'fr')
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })
  }, [visibleDebts, searchQuery, debtTypeFilter, statusFilter, sortBy])

  const pendingClientDebts = visibleDebts.filter(
    (d) => d.status === 'pending' && (d as any).status !== 'paid' && d.amount_owed > 0 && d.debt_type !== 'supplier'
  )
  const pendingSupplierDebts = visibleDebts.filter(
    (d) => d.status === 'pending' && (d as any).status !== 'paid' && d.amount_owed > 0 && d.debt_type === 'supplier'
  )

  const totalClientDebts = pendingClientDebts.reduce((sum, d) => sum + Number(d.amount_owed || 0), 0)
  const totalSupplierDebts = pendingSupplierDebts.reduce((sum, d) => sum + Number(d.amount_owed || 0), 0)
  const totalRecovered = visibleDebts
    .filter((d) => d.debt_type !== 'supplier')
    .reduce((sum, d) => sum + Number(d.paid_amount || 0), 0)

  return (
    <div className="space-y-3 pb-4">
      <DebtSummaryCards
        totalClientDebts={totalClientDebts}
        totalSupplierDebts={totalSupplierDebts}
        clientCount={pendingClientDebts.length}
        supplierCount={pendingSupplierDebts.length}
        totalRecovered={totalRecovered}
        isEmployee={isEmployee}
      />

      <DebtFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        debtTypeFilter={debtTypeFilter}
        onDebtTypeFilterChange={setDebtTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onOpenNewDebt={() => setShowNewDebtForm((prev) => !prev)}
        isEmployee={isEmployee}
      />

      {/* Panneau rapide "+ Nouvelle dette" */}
      {showNewDebtForm && (
        <form
          onSubmit={handleCreateNewDebt}
          className="bg-[#faf5e8] border border-emerald-900/20 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-stone-900">Enregistrer une nouvelle dette</h3>
            <button
              type="button"
              onClick={() => setShowNewDebtForm(false)}
              className="p-1 text-stone-500 hover:text-stone-800 rounded cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <input
              type="text"
              required
              value={newDebtName}
              onChange={(e) => setNewDebtName(e.target.value)}
              placeholder="Nom du client ou fournisseur"
              className="px-3 py-2 bg-white border border-stone-900/15 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-emerald-700"
            />
            <input
              type="tel"
              value={newDebtPhone}
              onChange={(e) => setNewDebtPhone(e.target.value)}
              placeholder="Téléphone WhatsApp (facultatif)"
              className="px-3 py-2 bg-white border border-stone-900/15 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:border-emerald-700"
            />
            <input
              type="number"
              required
              min={1}
              value={newDebtAmount}
              onChange={(e) => setNewDebtAmount(e.target.value)}
              placeholder="Montant (FCFA)"
              className="px-3 py-2 bg-white border border-stone-900/15 rounded-lg text-xs font-mono font-semibold text-stone-900 focus:outline-none focus:border-emerald-700"
            />
            <input
              type="date"
              value={newDebtDueDate}
              onChange={(e) => setNewDebtDueDate(e.target.value)}
              title="Date d'échéance / promesse de paiement (facultatif)"
              className="px-3 py-2 bg-white border border-stone-900/15 rounded-lg text-xs font-mono text-stone-700 focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {!isEmployee && (
              <div className="inline-flex bg-[#f3ecda] p-0.5 rounded-lg border border-stone-900/10 text-xs flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setNewDebtType('client')}
                  className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-colors ${
                    newDebtType === 'client' ? 'bg-[#faf5e8] text-stone-950 shadow-2xs' : 'text-stone-600'
                  }`}
                >
                  Crédit client
                </button>
                <button
                  type="button"
                  onClick={() => setNewDebtType('supplier')}
                  className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-colors ${
                    newDebtType === 'supplier' ? 'bg-[#faf5e8] text-stone-950 shadow-2xs' : 'text-stone-600'
                  }`}
                >
                  Dette grossiste
                </button>
              </div>
            )}

            <input
              type="text"
              value={newDebtNotes}
              onChange={(e) => setNewDebtNotes(e.target.value)}
              placeholder="Motif / articles pris à crédit (facultatif)"
              className="flex-1 px-3 py-2 bg-white border border-stone-900/15 rounded-lg text-xs text-stone-900 focus:outline-none focus:border-emerald-700"
            />

            <button
              type="submit"
              disabled={isCreatingDebt || !newDebtName.trim() || !newDebtAmount}
              className="px-4 py-2 bg-[#064e3b] hover:bg-[#075e47] text-[#f59e0b] text-xs font-semibold rounded-lg transition-colors active:scale-[0.98] disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {isCreatingDebt ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* Liste des dettes */}
      {filteredDebts.length === 0 ? (
        <div className="p-10 text-center bg-[#faf5e8] rounded-xl border border-stone-900/10 space-y-1.5">
          <CheckCircle2 className="w-6 h-6 text-emerald-700 mx-auto" strokeWidth={1.75} />
          <p className="text-sm font-medium text-stone-800">Aucune dette ne correspond à vos filtres</p>
          <p className="text-xs text-stone-500">
            Cliquez sur « Nouvelle dette » ou saisissez un crédit directement dans votre Cahier.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredDebts.map((debt) => {
            const key = `${debt.debt_type === 'supplier' ? 'supplier' : 'client'}:${(debt.client_name || '').trim().toLowerCase()}`
            return (
              <DebtItemCard
                key={debt.id}
                debt={debt}
                shopName={shopName}
                history={historyByKey.get(key) || []}
                onOpenRepaymentModal={(d) => setActiveRepayDebt(d)}
              />
            )
          })}
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
