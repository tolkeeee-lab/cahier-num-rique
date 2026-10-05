'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTodayDateString } from '@/lib/dateUtils'
// Bypass offlineDb imports for emergency cloud-only fix
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'
import { logAuditEvent } from '@/lib/auditLogger'

import { getItemCashDelta } from '@/lib/sales/cashDrawerCalculator'
import { getDualShopIds } from '@/lib/shopCodeUtils'

export interface Sale {
  id: string
  shop_id?: string
  date: string
  time: string
  client: string
  articles: Array<{
    name: string
    quantity: number
    unit_price: number
    category?: string
  }>
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt' | 'crossed_out'
  type: string
  pen_color: string
  notes: string
  category?: string
  created_at?: string
  is_synced?: boolean
}

// Réconciliation chronologique (FIFO) : alloue les paiements reçus/émis aux ventes/achats à crédit
export function reconcileDebts(salesList: Sale[]): Sale[] {
  const clientRepayments = new Map<string, number>()
  const supplierRepayments = new Map<string, number>()

  salesList.forEach(s => {
    if (s.status === 'crossed_out') return
    const name = (s.client || '').trim().toLowerCase()
    if (!name) return
    const p = Number(s.paid || s.total || 0)
    if (s.type === 'payment_client') {
      clientRepayments.set(name, (clientRepayments.get(name) || 0) + p)
    } else if (s.type === 'payment_supplier') {
      supplierRepayments.set(name, (supplierRepayments.get(name) || 0) + p)
    }
  })

  if (clientRepayments.size === 0 && supplierRepayments.size === 0) {
    return salesList
  }

  const remainingClientRepay = new Map(clientRepayments)
  const remainingSuppRepay = new Map(supplierRepayments)

  // Du plus ancien au plus récent pour apurer les dettes les plus anciennes (sécurisé Safari/WebKit)
  const safeTimestamp = (d?: string) => {
    if (!d) return 0
    const normalized = d.includes(' ') && !d.includes('T') ? d.replace(' ', 'T') : d
    const t = new Date(normalized).getTime()
    return isNaN(t) ? 0 : t
  }
  const sortedOldestFirst = [...salesList].sort((a, b) => 
    safeTimestamp(a.created_at || a.date) - safeTimestamp(b.created_at || b.date)
  )

  const updatedSalesMap = new Map<string, { debt: number; status: 'paid' | 'debt' }>()

  for (const s of sortedOldestFirst) {
    if (s.status === 'crossed_out') continue
    const name = (s.client || '').trim().toLowerCase()
    if (!name) continue

    const isSupp = s.type === 'purchase_credit' || s.pen_color === 'purple'
    const isClientCredit = s.type === 'sale_credit' || s.pen_color === 'yellow' || (Number(s.debt || 0) > 0 && s.type !== 'payment_client' && s.type !== 'payment_supplier')

    if (isSupp) {
      const availableRepay = remainingSuppRepay.get(name) || 0
      const currentDebt = Number(s.debt ?? s.total ?? 0)
      if (currentDebt > 0) {
        const deduction = Math.min(currentDebt, availableRepay)
        const newDebt = Math.max(0, currentDebt - deduction)
        remainingSuppRepay.set(name, Math.max(0, availableRepay - deduction))
        updatedSalesMap.set(s.id, { debt: newDebt, status: newDebt <= 0 ? 'paid' : 'debt' })
      }
    } else if (isClientCredit) {
      const availableRepay = remainingClientRepay.get(name) || 0
      const currentDebt = Number(s.debt ?? s.total ?? 0)
      if (currentDebt > 0) {
        const deduction = Math.min(currentDebt, availableRepay)
        const newDebt = Math.max(0, currentDebt - deduction)
        remainingClientRepay.set(name, Math.max(0, availableRepay - deduction))
        updatedSalesMap.set(s.id, { debt: newDebt, status: newDebt <= 0 ? 'paid' : 'debt' })
      }
    }
  }

  return salesList.map(s => {
    const update = updatedSalesMap.get(s.id)
    if (update) {
      return {
        ...s,
        debt: update.debt,
        status: update.status,
      }
    }
    return s
  })
}

export function useJournalData(shopId: string, isOnline: boolean) {
  const [sales, setSales] = useState<Sale[]>([])
  const [allSales, setAllSales] = useState<Sale[]>([])
  const [tiroirCaisse, setTiroirCaisse] = useState(0)
  const [argentDehors, setArgentDehors] = useState(0)
  const [nosDettes, setNosDettes] = useState(0)
  const [soldeDuJour, setSoldeDuJour] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const reloadData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    async function loadJournal() {
      const today = getTodayDateString()

      try {
        if (isSupabaseClientConfigured()) {
          const targetShopIds = getDualShopIds(shopId)

          // Requête principale avec les articles détaillés - CLOUD ONLY BYPASS
          let { data, error } = await supabaseClient
              .from('sales')
              .select('*, sold_articles(*)')
              .in('shop_id', targetShopIds)
              .order('created_at', { ascending: false })

          // Si la jointure sold_articles échoue (400 / table inaccessible),
          // on retente sans la jointure
          if (error) {
            console.warn('[Journal] Jointure sold_articles échouée, nouvelle tentative sans:', error.message)
            const fallback = await supabaseClient
              .from('sales')
              .select('*')
              .in('shop_id', targetShopIds)
              .order('created_at', { ascending: false })
            data = fallback.data
            error = fallback.error
          }

          if (!error && data && isMounted) {
            const mappedSales: Sale[] = data.map((item: any) => ({
              id: item.id,
              shop_id: item.shop_id || shopId,
              date: (item.date || '').split('T')[0] || today,
              time: item.time || '00:00',
              client: item.client_name || 'Client anonyme',
              articles: (item.sold_articles || []).map((art: any) => ({
                name: art.product_name || art.name || art.nom || 'Produit',
                quantity: Number(art.quantity || art.quantite) || 1,
                unit_price: Number(art.unit_price || art.prix_unitaire) || 0,
              })),
              total: Number(item.total_amount) || 0,
              paid: Number(item.paid_amount) || 0,
              debt: Number(item.debt_amount) || 0,
              status: item.status || 'paid',
              type: item.type || 'sale',
              pen_color: item.pen_color || 'blue',
              notes: item.notes || '',
              category: item.category,
              created_at: item.created_at || new Date().toISOString(),
              is_synced: true,
            }))

            mappedSales.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
            const reconciledSales = reconcileDebts(mappedSales)

            setAllSales(reconciledSales)
            const todays = reconciledSales.filter(s => s.date === today)
            setSales(todays)
            calculateSummary(reconciledSales, todays)
            setIsLoading(false)
            return
          }
        }
      } catch (err) {
        console.warn('Erreur chargement Supabase Cloud-Only:', err)
      }

      // Fallback vide si pas internet en cloud only
      if (isMounted) {
         setAllSales([])
         setSales([])
         setIsLoading(false)
      }
    }

    loadJournal()

    // ── Supabase Realtime Channel pour synchronisation multi-appareils instantanée ──
    let channel: any = null
    if (isSupabaseClientConfigured() && isOnline && shopId) {
      try {
        const dualIds = getDualShopIds(shopId)
        const activeIds = dualIds.length > 0 ? dualIds : [shopId]
        channel = supabaseClient.channel(`realtime_shop_${shopId}`)

        // Écoute sur les ventes, produits et courses pour chaque identifiant possible
        activeIds.forEach(id => {
          channel
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'sales', filter: `shop_id=eq.${id}` },
              () => {
                if (isMounted) reloadData()
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'products', filter: `shop_id=eq.${id}` },
              () => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('cahier_stock_updated'))
                }
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'shopping_list', filter: `shop_id=eq.${id}` },
              () => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('cahier_shopping_updated'))
                }
              }
            )
        })

        channel.subscribe()
      } catch (err) {
        console.warn('[Realtime] Souscription non active:', err)
      }
    }

    // Polling de secours doux (120s) — uniquement si Realtime Supabase est indisponible
    // Le Realtime Channel ci-dessus est la méthode principale de sync multi-appareils.
    const pollInterval = setInterval(() => {
      if (isOnline && isMounted && !channel) {
        reloadData()
      }
    }, 120_000)

    return () => {
      isMounted = false
      if (channel) {
        try { supabaseClient.removeChannel(channel) } catch {}
      }
      clearInterval(pollInterval)
    }
  }, [shopId, isOnline, refreshTrigger, reloadData])

  const calculateSummary = useCallback((all: Sale[], todays: Sale[]) => {
    let cash = 0
    let todayBalance = 0
    let totalClientDebts = 0
    let totalSupplierDebts = 0

    // Les ventes passées dans all étant réconciliées via FIFO, s.debt reflète le solde restant réel
    all.forEach(s => {
      if (s.status === 'crossed_out') return
      const type = s.type

      // Calcul unifié du tiroir-caisse (gestion apports, retraits, ventes, dépenses, règlements)
      cash += getItemCashDelta(s)

      const d = Number(s.debt || 0)
      if (type === 'purchase_credit' || s.pen_color === 'purple') {
        totalSupplierDebts += d
      } else if (type === 'sale_credit' || s.pen_color === 'yellow' || (d > 0 && type !== 'payment_client' && type !== 'payment_supplier')) {
        totalClientDebts += d
      }
    })

    todays.forEach(s => {
      if (s.status === 'crossed_out') return
      if (s.pen_color === 'blue' || s.type === 'sale' || s.type === 'cash_in' || s.type === 'payment_client') {
        todayBalance += Number(s.paid ?? s.total ?? 0)
      } else if (s.pen_color === 'red' || s.type === 'cash_out' || s.type === 'payment_supplier') {
        todayBalance -= Number(s.total ?? s.paid ?? 0)
      }
    })

    setTiroirCaisse(Math.round(cash * 100) / 100)
    setArgentDehors(Math.max(0, Math.round(totalClientDebts * 100) / 100))
    setNosDettes(Math.max(0, Math.round(totalSupplierDebts * 100) / 100))
    setSoldeDuJour(Math.round(todayBalance * 100) / 100)
  }, [])

  const crossOutSale = useCallback(async (saleId: string) => {
    if (isSupabaseClientConfigured()) {
      try {
        await supabaseClient
          .from('sales')
          .update({ status: 'crossed_out' })
          .eq('id', saleId)
      } catch (e) {
        console.warn('Erreur mise à jour status Supabase:', e)
      }
    }

    logAuditEvent({
      shopId,
      action: 'sale_crossed_out',
      targetId: saleId,
    })

    reloadData()
  }, [reloadData, shopId])

  const returnSale = useCallback(async (
    originalSaleId: string,
    returnedArticles: Array<{ name: string; quantity: number; unit_price: number }>,
    refundAmount: number,
    notes?: string
  ) => {
    const today = getTodayDateString()
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const returnSaleId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ret_${Date.now()}`

    const originalSale = allSales.find(s => s.id === originalSaleId)
    const clientName = originalSale?.client || 'Client anonyme'

    const returnSaleItem = {
      id: returnSaleId,
      shop_id: shopId || 'default-shop',
      date: today,
      time: timeStr,
      client: clientName,
      articles: returnedArticles,
      total: refundAmount,
      paid: refundAmount,
      debt: 0,
      status: 'paid',
      type: 'sale_return',
      pen_color: 'red',
      notes: notes || `Retour marchandise réf #${originalSaleId.slice(0, 8)} - Remboursement`,
      category: 'Retour Marchandise',
      created_at: now.toISOString(),
      is_synced: false,
    }

    if (isSupabaseClientConfigured()) {
      try {
        await fetch('/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': shopId,
          },
          body: JSON.stringify({
            id: returnSaleId,
            date: today,
            time: timeStr,
            created_at: returnSaleItem.created_at,
            type: 'sale_return',
            status: 'paid',
            category: 'Retour Marchandise',
            text: returnSaleItem.notes,
            penColor: 'red',
            overrideData: {
              type: 'sale_return',
              status: 'paid',
              category: 'Retour Marchandise',
              articles: returnedArticles,
              total_amount: refundAmount,
              paid_amount: refundAmount,
              debt_amount: 0,
              client_name: clientName,
            },
          }),
        })
      } catch (err) {
        console.warn('Erreur synchronisation retour marchandise:', err)
      }
    }

    logAuditEvent({
      shopId,
      action: 'sale_returned',
      targetId: returnSaleId,
      details: {
        originalSaleId,
        refundAmount,
        returnedArticles,
      },
    })

    reloadData()
  }, [allSales, reloadData, shopId])

  const addArticleToSale = useCallback(async (saleId: string, text: string, penColor?: string) => {
    const activePen = penColor || 'blue'

    if (isSupabaseClientConfigured()) {
      try {
        await fetch('/api/sales', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': shopId,
          },
          body: JSON.stringify({
            id: saleId,
            action: 'add_article',
            text,
            penColor: activePen,
          }),
        })
      } catch (e) {
        console.warn('Erreur PATCH add_article:', e)
      }
    }

    reloadData()
  }, [reloadData, shopId])

  const updateSale = useCallback(async (
    saleId: string,
    updatedArticles: Array<{ name: string; quantity: number; unit_price: number }>,
    clientName?: string
  ) => {
    if (isSupabaseClientConfigured()) {
      try {
        await fetch('/api/sales', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': shopId,
          },
          body: JSON.stringify({
            id: saleId,
            action: 'update_sale',
            articles: updatedArticles,
            clientName,
          }),
        })
      } catch (e) {
        console.warn('Erreur PATCH update_sale:', e)
      }
    }
    reloadData()
  }, [reloadData, shopId])

  const updateCategory = useCallback(async (saleId: string, category: string) => {
    if (isSupabaseClientConfigured()) {
      try {
        await fetch('/api/sales', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': shopId,
          },
          body: JSON.stringify({
            id: saleId,
            action: 'update_category',
            category,
          }),
        })
      } catch (e) {
        console.warn('Erreur PATCH update_category:', e)
      }
    }
    reloadData()
  }, [reloadData, shopId])

  const settleDebt = useCallback(async (
    clientOrSupplierName: string,
    amount: number,
    isSupplier = false,
    customNotes?: string
  ) => {
    if (!clientOrSupplierName || amount <= 0) return

    const trimmedName = clientOrSupplierName.trim()
    const today = getTodayDateString()
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const repaymentSaleId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rep_${Date.now()}`

    const repaymentSale = {
      id: repaymentSaleId,
      shop_id: shopId || 'default-shop',
      date: today,
      time: timeStr,
      client: trimmedName,
      articles: [],
      total: amount,
      paid: amount,
      debt: 0,
      status: 'paid',
      type: isSupplier ? 'payment_supplier' : 'payment_client',
      pen_color: isSupplier ? 'red' : 'blue',
      notes: customNotes || (isSupplier
        ? `Remboursement dette fournisseur (${trimmedName})`
        : `Règlement dette client (${trimmedName})`),
      category: 'Règlement Dette',
      created_at: now.toISOString(),
      is_synced: false,
    }

    if (isSupabaseClientConfigured()) {
      try {
        await fetch('/api/debts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': shopId,
          },
          body: JSON.stringify({
            id: repaymentSaleId,
            date: today,
            time: timeStr,
            created_at: repaymentSale.created_at,
            name: trimmedName,
            amount,
            type: isSupplier ? 'supplier' : 'client',
            action: 'pay',
            description: repaymentSale.notes,
          }),
        })
      } catch (e) {
        console.warn('Erreur synchronisation dette', e)
      }
    }
    reloadData()
  }, [reloadData, shopId])

  return {
    sales,
    allSales,
    tiroirCaisse,
    argentDehors,
    nosDettes,
    soldeDuJour,
    isLoading,
    reloadData,
    crossOutSale,
    returnSale,
    addArticleToSale,
    updateSale,
    updateCategory,
    settleDebt,
  }
}
