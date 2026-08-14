'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTodayDateString } from '@/lib/dateUtils'
import {
  getOfflineSales,
  saveOfflineSale,
  replaceOfflineSales,
  OfflineSale,
} from '@/lib/offlineDb'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'

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
              date: item.date,
              time: item.time || '00:00',
              client: item.client_name || 'Client anonyme',
              articles: (item.sold_articles || []).map((art: any) => ({
                name: art.product_name,
                quantity: art.quantity,
                unit_price: art.unit_price,
              })),
              total: item.total_amount || 0,
              paid: item.paid_amount || 0,
              debt: item.debt_amount || 0,
              status: item.status || 'paid',
              type: item.type || 'sale',
              pen_color: item.pen_color || 'blue',
              notes: item.notes || '',
              category: item.category,
              created_at: item.created_at || new Date().toISOString(),
              is_synced: true,
            }))

            setAllSales(mappedSales)
            const todays = mappedSales.filter(s => s.date === today)
            setSales(todays)

            calculateSummary(mappedSales, todays)
            const offlineItems: OfflineSale[] = mappedSales.map(s => ({
              ...s,
              shop_id: s.shop_id || shopId,
              created_at: s.created_at || new Date().toISOString(),
              is_synced: true,
            }))
            replaceOfflineSales(shopId, offlineItems)
            setIsLoading(false)
            return
          }
        }
      } catch (err) {
        console.warn('Erreur chargement Supabase, repli offline:', err)
      }

      if (isMounted) {
        const offlineSales = getOfflineSales(shopId)
        setAllSales(offlineSales)
        const todays = offlineSales.filter(s => s.date === today)
        setSales(todays)
        calculateSummary(offlineSales, todays)
        setIsLoading(false)
      }
    }

    loadJournal()

    return () => {
      isMounted = false
    }
  }, [shopId, isOnline, refreshTrigger])

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
  }
}
