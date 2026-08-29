'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTodayDateString } from '@/lib/dateUtils'
import {
  getOfflineSales,
  saveOfflineSale,
  replaceOfflineSales,
  markAsSynced,
  OfflineSale,
} from '@/lib/offlineDb'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'

import { parseTextLocally } from '@/lib/sales/offlineSaleParser'

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
        if (isSupabaseClientConfigured() && isOnline) {
          const { data, error } = await supabaseClient
            .from('sales')
            .select('*, sold_articles(*)')
            .eq('shop_id', shopId)
            .order('created_at', { ascending: false })

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

            // 1. Tenter de pousser les ventes locales en attente (is_synced === false) vers Supabase
            try {
              const offlineSales = getOfflineSales(shopId)
              const unsynced = offlineSales.filter(s => s.is_synced === false)
              if (unsynced.length > 0) {
                for (const uSale of unsynced) {
                  const saleRecord = {
                    id: uSale.id,
                    shop_id: shopId,
                    created_at: uSale.created_at || new Date().toISOString(),
                    date: (uSale.date || '').split('T')[0] || today,
                    time: uSale.time || '00:00',
                    type: uSale.type || 'cash_in',
                    notes: uSale.notes || '',
                    total_amount: Number(uSale.total) || 0,
                    paid_amount: Number(uSale.paid) || 0,
                    debt_amount: Number(uSale.debt) || 0,
                    client_name: uSale.client || 'Client',
                    status: uSale.status || 'paid',
                    category: uSale.category || 'Général',
                    pen_color: uSale.pen_color || 'blue',
                  }
                  const { error: sErr } = await supabaseClient.from('sales').upsert([saleRecord], { onConflict: 'id' })
                  if (!sErr) {
                    if (uSale.articles && uSale.articles.length > 0) {
                      const arts = uSale.articles.map(a => ({
                        sale_id: uSale.id,
                        product_name: a.name,
                        quantity: a.quantity,
                        unit_price: a.unit_price,
                        subtotal: a.quantity * a.unit_price,
                      }))
                      await supabaseClient.from('sold_articles').upsert(arts)
                    }
                    // ✅ Marquer proprement comme synchronisé dans localStorage
                    markAsSynced(shopId, uSale.id)
                    // Ajouter aux ventes mappées si elle manquait dans le résultat Supabase
                    if (!mappedSales.some(ms => ms.id === uSale.id)) {
                      mappedSales.push({
                        ...uSale,
                        date: (uSale.date || '').split('T')[0] || today,
                        is_synced: true,
                      } as any)
                    }
                  }
                }
              }
            } catch (syncErr) {
              console.warn('Erreur sync ventes en attente:', syncErr)
            }

            // 2. Fusion sécurisée : Supabase est la vérité pour les ventes connues,
            // mais on inclut TOUJOURS les ventes locales dont l'ID n'est pas encore arrivé dans Supabase
            // (race condition entre la sauvegarde et la prochaine requête Supabase)
            const supabaseIds = new Set(mappedSales.map(s => s.id))
            const offlineNotYetInCloud = getOfflineSales(shopId).filter(s => s.id && !supabaseIds.has(s.id))
            const rawCombined = [...mappedSales, ...offlineNotYetInCloud]

            const seenIds = new Set<string>()
            const combinedSales: Sale[] = []

            for (const s of rawCombined) {
              if (s.id && seenIds.has(s.id)) continue
              if (s.id) seenIds.add(s.id)

              const cleanArticles = (s.articles || []).map((art: any) => ({
                name: art.name || art.nom || art.product_name || 'Produit',
                quantity: Number(art.quantity || art.quantite) || 1,
                unit_price: Number(art.unit_price || art.prix_unitaire) || 0,
              }))

              const saleDate = (s.date || '').split('T')[0] || today

              const cleanSale: Sale = {
                id: s.id,
                shop_id: s.shop_id || shopId,
                date: saleDate,
                time: s.time || '00:00',
                client: s.client || (s as any).client_name || 'Client anonyme',
                articles: cleanArticles,
                total: Number(s.total ?? (s as any).total_amount) || 0,
                paid: Number(s.paid ?? (s as any).paid_amount) || 0,
                debt: Number(s.debt ?? (s as any).debt_amount) || 0,
                status: s.status || 'paid',
                type: s.type || 'sale',
                pen_color: s.pen_color || 'blue',
                notes: s.notes || '',
                category: s.category,
                created_at: s.created_at || new Date().toISOString(),
                is_synced: s.is_synced ?? true,
              }

              combinedSales.push(cleanSale)
            }


            combinedSales.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())

            // Mettre à jour le cache local avec la vérité du Cloud Supabase
            try {
              const offlineFormatted: OfflineSale[] = combinedSales.map(cs => ({
                id: cs.id,
                shop_id: cs.shop_id || shopId,
                date: cs.date,
                time: cs.time,
                client: cs.client,
                articles: cs.articles.map(a => ({
                  name: a.name,
                  quantity: a.quantity,
                  unit_price: a.unit_price,
                })),
                total: cs.total,
                paid: cs.paid,
                debt: cs.debt,
                status: cs.status as any,
                type: cs.type,
                pen_color: cs.pen_color,
                notes: cs.notes,
                category: cs.category,
                created_at: cs.created_at || new Date().toISOString(),
                is_synced: cs.is_synced ?? true,
              }))
              replaceOfflineSales(shopId, offlineFormatted)
            } catch {}

            setAllSales(combinedSales)
            const todays = combinedSales.filter(s => s.date === today)
            setSales(todays)
            calculateSummary(combinedSales, todays)
            setIsLoading(false)
            return
          }
        }
      } catch (err) {
        console.warn('Erreur chargement Supabase, repli offline:', err)
      }


      if (isMounted) {
        const offlineSales = getOfflineSales(shopId)
        const seenKeys = new Set<string>()
        const cleanOffline: Sale[] = []

        for (const s of offlineSales) {
          const cleanArticles = (s.articles || []).map((art: any) => ({
            name: art.name || art.nom || art.product_name || 'Produit',
            quantity: Number(art.quantity || art.quantite) || 1,
            unit_price: Number(art.unit_price || art.prix_unitaire) || 0,
          }))

          const cleanSale: Sale = {
            id: s.id,
            shop_id: s.shop_id || shopId,
            date: s.date,
            time: s.time || '00:00',
            client: s.client || 'Client anonyme',
            articles: cleanArticles,
            total: Number(s.total) || 0,
            paid: Number(s.paid) || 0,
            debt: Number(s.debt) || 0,
            status: s.status || 'paid',
            type: s.type || 'sale',
            pen_color: s.pen_color || 'blue',
            notes: s.notes || '',
            category: s.category,
            created_at: s.created_at || new Date().toISOString(),
            is_synced: s.is_synced ?? true,
          }

          const dedupKey = `${cleanSale.date}_${cleanSale.time}_${cleanSale.total}_${(cleanSale.notes || '').trim().toLowerCase()}`
          if (seenKeys.has(dedupKey)) continue
          seenKeys.add(dedupKey)
          cleanOffline.push(cleanSale)
        }

        cleanOffline.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
        setAllSales(cleanOffline)
        const todays = cleanOffline.filter(s => s.date === today)
        setSales(todays)
        calculateSummary(cleanOffline, todays)
        setIsLoading(false)
      }
    }

    loadJournal()

    // ── Supabase Realtime Channel pour synchronisation multi-appareils instantanée ──
    let channel: any = null
    if (isSupabaseClientConfigured() && isOnline && shopId) {
      try {
        channel = supabaseClient
          .channel(`realtime_sales_${shopId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'sales', filter: `shop_id=eq.${shopId}` },
            () => {
              if (isMounted) reloadData()
            }
          )
          .subscribe()
      } catch {}
    }

    // Polling doux de sécurité toutes les 10 secondes (sync employé ↔ propriétaire)
    const pollInterval = setInterval(() => {
      if (isOnline && isMounted) {
        reloadData()
      }
    }, 10000)

    return () => {
      isMounted = false
      if (channel) {
        try { supabaseClient.removeChannel(channel) } catch {}
      }
      clearInterval(pollInterval)
    }
  }, [shopId, isOnline, refreshTrigger, reloadData])

  const calculateSummary = (all: Sale[], todays: Sale[]) => {
    let cash = 0
    let clientDebts = 0
    let supplierDebts = 0
    let todayBalance = 0

    all.forEach(s => {
      if (s.status === 'crossed_out') return
      const type = s.type

      if (type === 'cash_in' || type === 'payment_client' || type === 'sale') {
        cash += s.paid
      } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
        cash -= s.total
      } else if (type === 'cash_adjustment') {
        const isRetrait = (s.notes || '').toLowerCase().includes('retrait') || s.pen_color === 'red'
        if (isRetrait) cash -= s.paid || s.total
        else cash += s.paid || s.total
      }

      if (s.debt > 0) {
        if (type === 'purchase_credit' || s.pen_color === 'purple') {
          supplierDebts += s.debt
        } else {
          clientDebts += s.debt
        }
      }
    })

    todays.forEach(s => {
      if (s.status === 'crossed_out') return
      if (s.pen_color === 'blue' || s.type === 'sale') {
        todayBalance += s.paid
      } else if (s.pen_color === 'red' || s.type === 'cash_out') {
        todayBalance -= s.total
      }
    })

    setTiroirCaisse(cash)
    setArgentDehors(clientDebts)
    setNosDettes(supplierDebts)
    setSoldeDuJour(todayBalance)
  }

  const crossOutSale = async (saleId: string) => {
    const updated = allSales.map(s => (s.id === saleId ? { ...s, status: 'crossed_out' as const } : s))
    setAllSales(updated)
    const today = getTodayDateString()
    const todays = updated.filter(s => s.date === today)
    setSales(todays)
    calculateSummary(updated, todays)

    const target = updated.find(s => s.id === saleId)
    if (target) {
      const offlineTarget: OfflineSale = {
        ...target,
        shop_id: target.shop_id || shopId,
        created_at: target.created_at || new Date().toISOString(),
        is_synced: false,
      }
      saveOfflineSale(shopId, offlineTarget)
    }

    if (isSupabaseClientConfigured() && isOnline) {
      try {
        await supabaseClient.from('sales').update({ status: 'crossed_out' }).eq('id', saleId)
      } catch (e) {
        console.warn('Erreur mise à jour status Supabase:', e)
      }
    }
  }

  const addArticleToSale = async (saleId: string, text: string, penColor?: string) => {
    const activePen = penColor || 'blue'
    const parsed = parseTextLocally(text, activePen)

    if (!parsed || !parsed.articles || parsed.articles.length === 0) {
      throw new Error("Saisie d'article non reconnue")
    }

    const offlineSales = getOfflineSales(shopId)
    const idx = offlineSales.findIndex(s => s.id === saleId)

    if (idx !== -1) {
      const sale = offlineSales[idx]
      const addedAmount = parsed.total_facture || 0
      const newTotal = (sale.total || 0) + addedAmount
      const newPaid = sale.type === 'cash_in' ? newTotal : (sale.paid || 0)
      const newDebt = sale.type === 'sale_credit' ? Math.max(0, newTotal - newPaid) : (sale.debt || 0)

      sale.total = newTotal
      sale.paid = newPaid
      sale.debt = newDebt
      sale.status = newDebt > 0 && sale.type === 'sale_credit' ? 'debt' : 'paid'
      sale.notes = sale.notes ? `${sale.notes}, ${text}` : text
      sale.articles = [
        ...(sale.articles || []),
        ...parsed.articles.map(a => ({
          name: a.nom,
          quantity: a.quantite,
          unit_price: a.prix_unitaire,
        }))
      ]
      sale.is_synced = false
      replaceOfflineSales(shopId, offlineSales)
      reloadData()
    }

    if (isSupabaseClientConfigured() && isOnline) {
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
  }

  const updateSale = async (
    saleId: string,
    updatedArticles: Array<{ name: string; quantity: number; unit_price: number }>,
    clientName?: string
  ) => {
    const newTotal = updatedArticles.reduce((acc, a) => acc + (a.quantity * a.unit_price), 0)
    const newNotes = updatedArticles.map(a => `${a.quantity} ${a.name} à ${a.unit_price}`).join(', ')

    const offlineSales = getOfflineSales(shopId)
    const idx = offlineSales.findIndex(s => s.id === saleId)

    if (idx !== -1) {
      const sale = offlineSales[idx]
      const isCashIn = sale.type === 'cash_in'
      const newPaid = isCashIn ? newTotal : (sale.paid || 0)
      const newDebt = sale.type === 'sale_credit' ? Math.max(0, newTotal - newPaid) : 0

      sale.total = newTotal
      sale.paid = newPaid
      sale.debt = newDebt
      sale.status = (newDebt > 0 && sale.type === 'sale_credit') ? 'debt' : 'paid'
      sale.notes = newNotes
      if (clientName) sale.client = clientName
      sale.articles = updatedArticles
      sale.is_synced = false
      replaceOfflineSales(shopId, offlineSales)
      reloadData()
    }

    if (isSupabaseClientConfigured() && isOnline) {
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
  }

  const updateCategory = async (saleId: string, category: string) => {
    const offlineSales = getOfflineSales(shopId)
    const idx = offlineSales.findIndex(s => s.id === saleId)
    if (idx !== -1) {
      offlineSales[idx].category = category
      offlineSales[idx].is_synced = false
      replaceOfflineSales(shopId, offlineSales)
      reloadData()
    }

    if (isSupabaseClientConfigured() && isOnline) {
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
  }

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
    addArticleToSale,
    updateSale,
    updateCategory,
  }
}
