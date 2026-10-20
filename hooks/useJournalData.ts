'use client'

import React, { useState, useCallback } from 'react'
import { getTodayDateString } from '@/lib/dateUtils'
// bypass
// bypass 2
import { useQuery, usePowerSync } from '@powersync/react'
import { logAuditEvent } from '@/lib/auditLogger'

import { parseTextLocally } from '@/lib/sales/offlineSaleParser'
import { getItemCashDelta } from '@/lib/sales/cashDrawerCalculator'
// bypass 5

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

export function useJournalData(shopId: string, _isOnline: boolean) {
  const [tiroirCaisse, setTiroirCaisse] = useState(0)
  const [argentDehors, setArgentDehors] = useState(0)
  const [nosDettes, setNosDettes] = useState(0)
  const [soldeDuJour, setSoldeDuJour] = useState(0)

  // V2: Query sales from PowerSync local SQLite
  // PowerSync natively keeps this reactive and automatically subscribes to updates
  const { data: rawSales, isLoading } = useQuery(`
    SELECT
      s.*,
      CASE
        WHEN count(a.sale_id) = 0 THEN '[]'
        ELSE json_group_array(
          json_object(
            'name', a.product_name,
            'quantity', a.quantity,
            'unit_price', a.unit_price
          )
        )
      END as articles
    FROM sales s
    LEFT JOIN sold_articles a ON s.id = a.sale_id
    WHERE s.shop_id = ?
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `, [shopId])

  const reloadData = useCallback(() => {
    // V2: No-op. PowerSync is fully reactive.
    // This is kept strictly to satisfy existing component dependencies without breaking them.
  }, [])

  // Derived state from PowerSync SQLite reactive query
  const [legacySales, setLegacySales] = useState<any[]>([])

  React.useEffect(() => {
    // Listen to legacy update events
    const loadLegacy = () => {
      import('@/lib/offlineDb').then(m => {
        setLegacySales(m.getOfflineSales(shopId))
      })
    }
    loadLegacy()

    if (typeof window !== 'undefined') {
      window.addEventListener('cahier_sale_created', loadLegacy)
      window.addEventListener('cahier_sales_updated', loadLegacy)
      return () => {
        window.removeEventListener('cahier_sale_created', loadLegacy)
        window.removeEventListener('cahier_sales_updated', loadLegacy)
      }
    }
  }, [shopId])

  const allSales = React.useMemo(() => {
    // Hybrid mode: Use PowerSync if available, fallback and merge with local changes for instant UI feedback
    const psMapped = (rawSales || []).map((item: any) => ({
      ...item,
      articles: typeof item.articles === 'string' ? JSON.parse(item.articles) : (item.articles || [])
    }));

    // Merge Strategy: Prefer PowerSync data (source of truth), append missing legacy data (recent drafts)
    const psIds = new Set(psMapped.map(s => s.id));
    const pendingLegacy = legacySales.filter(s => !psIds.has(s.id));

    return reconcileDebts([...psMapped, ...pendingLegacy].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, [rawSales, legacySales]);

  const sales = React.useMemo(() => {
    const today = getTodayDateString();
    return allSales.filter(s => s.date === today);
  }, [allSales]);

  React.useEffect(() => {
    let cash = 0
    let todayBalance = 0
    let totalClientDebts = 0
    let totalSupplierDebts = 0

    allSales.forEach(s => {
      if (s.status === 'crossed_out') return
      const type = s.type
      cash += getItemCashDelta(s)
      const d = Number(s.debt || 0)
      if (type === 'purchase_credit' || s.pen_color === 'purple') {
        totalSupplierDebts += d
      } else if (type === 'sale_credit' || s.pen_color === 'yellow' || (d > 0 && type !== 'payment_client' && type !== 'payment_supplier')) {
        totalClientDebts += d
      }
    })

    sales.forEach(s => {
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
  }, [allSales, sales]);

  const db = usePowerSync();

  const crossOutSale = useCallback(async (saleId: string) => {
    try {
      await db.execute('UPDATE sales SET status = ? WHERE id = ?', ['crossed_out', saleId]);
      logAuditEvent({
        shopId,
        action: 'sale_crossed_out',
        targetId: saleId,
      });
    } catch (e) {
      console.warn('Erreur mise à jour status locale:', e);
    }
  }, [db, shopId]);

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

    try {
      await db.execute(
        'INSERT INTO sales (id, shop_id, date, time, type, status, category, notes, pen_color, total_amount, paid_amount, debt_amount, client_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          returnSaleItem.id,
          returnSaleItem.shop_id,
          returnSaleItem.date,
          returnSaleItem.time,
          returnSaleItem.type,
          returnSaleItem.status,
          returnSaleItem.category,
          returnSaleItem.notes,
          returnSaleItem.pen_color,
          returnSaleItem.total,
          returnSaleItem.paid,
          returnSaleItem.debt,
          returnSaleItem.client,
          returnSaleItem.created_at
        ]
      );

      for (const article of returnedArticles) {
        await db.execute(
          'INSERT INTO sold_articles (sale_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [returnSaleId, article.name, article.quantity, article.unit_price]
        );
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
      });
    } catch (e) {
      console.warn('Erreur creation retour marchandise local:', e);
    }
  }, [allSales, db, shopId]);

  const addArticleToSale = useCallback(async (saleId: string, text: string, penColor?: string) => {
    const activePen = penColor || 'blue'
    const parsed = parseTextLocally(text, activePen)

    if (!parsed || !parsed.articles || parsed.articles.length === 0) {
      throw new Error("Saisie d'article non reconnue")
    }

    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;

    try {
      const addedAmount = parsed.total_facture || 0
      const newTotal = (sale.total || 0) + addedAmount
      const newPaid = sale.type === 'cash_in' ? newTotal : (sale.paid || 0)
      const newDebt = sale.type === 'sale_credit' ? Math.max(0, newTotal - newPaid) : (sale.debt || 0)
      const newStatus = newDebt > 0 && sale.type === 'sale_credit' ? 'debt' : 'paid'
      const newNotes = sale.notes ? `${sale.notes}, ${text}` : text

      await db.execute(
        'UPDATE sales SET total_amount = ?, paid_amount = ?, debt_amount = ?, status = ?, notes = ? WHERE id = ?',
        [newTotal, newPaid, newDebt, newStatus, newNotes, saleId]
      );

      for (const article of parsed.articles) {
        await db.execute(
          'INSERT INTO sold_articles (sale_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [saleId, article.nom, article.quantite, article.prix_unitaire]
        );
      }
    } catch (e) {
      console.warn('Erreur ajout article local:', e);
    }
  }, [allSales, db]);

  const updateSale = useCallback(async (
    saleId: string,
    updatedArticles: Array<{ name: string; quantity: number; unit_price: number }>,
    clientName?: string
  ) => {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;

    try {
      const newTotal = updatedArticles.reduce((acc, a) => acc + (a.quantity * a.unit_price), 0)
      const newNotes = updatedArticles.map(a => `${a.quantity} ${a.name} à ${a.unit_price}`).join(', ')
      const isCashIn = sale.type === 'cash_in'
      const newPaid = isCashIn ? newTotal : (sale.paid || 0)
      const newDebt = sale.type === 'sale_credit' ? Math.max(0, newTotal - newPaid) : 0
      const newStatus = (newDebt > 0 && sale.type === 'sale_credit') ? 'debt' : 'paid'

      await db.execute(
        'UPDATE sales SET total_amount = ?, paid_amount = ?, debt_amount = ?, status = ?, notes = ?, client_name = ? WHERE id = ?',
        [newTotal, newPaid, newDebt, newStatus, newNotes, clientName || sale.client, saleId]
      );

      await db.execute('DELETE FROM sold_articles WHERE sale_id = ?', [saleId]);

      for (const article of updatedArticles) {
        await db.execute(
          'INSERT INTO sold_articles (sale_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [saleId, article.name, article.quantity, article.unit_price]
        );
      }
    } catch (e) {
      console.warn('Erreur update_sale local:', e);
    }
  }, [allSales, db]);

  const updateCategory = useCallback(async (saleId: string, category: string) => {
    try {
      await db.execute('UPDATE sales SET category = ? WHERE id = ?', [category, saleId]);
    } catch (e) {
      console.warn('Erreur update_category local:', e);
    }
  }, [db]);

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

    const repaymentType = isSupplier ? 'payment_supplier' : 'payment_client';
    const repaymentPen = isSupplier ? 'red' : 'blue';
    const repaymentNotes = customNotes || (isSupplier
      ? `Remboursement dette fournisseur (${trimmedName})`
      : `Règlement dette client (${trimmedName})`);

    try {
      await db.execute(
        'INSERT INTO sales (id, shop_id, date, time, type, status, category, notes, pen_color, total_amount, paid_amount, debt_amount, client_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          repaymentSaleId,
          shopId,
          today,
          timeStr,
          repaymentType,
          'paid',
          'Règlement Dette',
          repaymentNotes,
          repaymentPen,
          amount,
          amount,
          0,
          trimmedName,
          now.toISOString()
        ]
      );
    } catch (e) {
      console.warn('Erreur settleDebt local:', e);
    }
  }, [db, shopId]);


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
