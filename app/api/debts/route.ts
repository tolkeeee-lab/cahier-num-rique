import { NextRequest, NextResponse } from 'next/server'
import { supabase, Database } from '@/lib/supabase'
import type { OfflineSale } from '@/lib/offlineDb'
import { randomUUID } from 'crypto'
export const dynamic = 'force-dynamic'
import { getLocalDb, saveLocalDb } from '@/lib/localDb'
import { calculateCash } from '@/lib/sales/cashDrawerCalculator'
import { getDualShopIds } from '@/lib/shopCodeUtils'
import { requireShopAccess, shopAuthorizationErrorResponse } from '@/lib/server/shopAccess'
type SaleRow = Database['public']['Tables']['sales']['Row']
type DebtRow = Database['public']['Tables']['debts']['Row']
type SupplierDebtRow = Database['public']['Tables']['supplier_debts']['Row']
type LocalSaleItem = Partial<OfflineSale> & {
  client_name?: string
  total_amount?: number
  paid_amount?: number
  debt_amount?: number
}

interface DebtHistoryEntry {
  id: string
  date: string
  time: string
  description: string
  amount: number
}

interface NormalizedDebtItem {
  id: string
  client_name: string
  amount_owed: number
  paid_amount: number
  status: 'settled' | 'pending'
  history: DebtHistoryEntry[]
  debt_type: 'client' | 'supplier'
}


const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && !url.includes('placeholder') && key && !key.includes('placeholder')
}

// Calcule le solde du tiroir-caisse avec la logique unifiée
async function getCurrentCash(shopId: string): Promise<number> {
  const salesList = await getAllSales(shopId)
  return calculateCash(salesList)
}

async function getAllSales(shopId: string): Promise<SaleRow[] | LocalSaleItem[]> {
  const targetShopIds = getDualShopIds(shopId)
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.from('sales').select('*').in('shop_id', targetShopIds)
      return data || []
    } catch (e) {
      console.error('Erreur Supabase dans debts API:', e)
    }
  }
  return (getLocalDb() as LocalSaleItem[]).filter(s => targetShopIds.includes(s.shop_id || ''))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // client ou supplier
    const requestedShopId = request.headers.get('x-shop-id')
    if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
    const { shop } = await requireShopAccess(request, requestedShopId)
    const shopId = shop.id
    const targetShopIds = getDualShopIds(shopId)

    if (type === 'supplier') {
      // Logic for explicit supplier request (maybe used elsewhere, keep it)
      if (isSupabaseConfigured()) {
        try {
          const { data: debts } = await supabase.from('supplier_debts').select('*').in('shop_id', targetShopIds).order('supplier_name', { ascending: true }) as { data: SupplierDebtRow[] | null }
          const { data: sales } = await supabase.from('sales').select('*').in('shop_id', targetShopIds).in('type', ['purchase_credit', 'payment_supplier'])

          const suppMap = new Map<string, string>()
          ;[...(debts || []).map(d => d.supplier_name), ...(sales || []).filter(s => s.client_name).map(s => s.client_name)]
            .filter(Boolean)
            .forEach(rawName => {
              const trimmed = String(rawName).trim()
              const lower = trimmed.toLowerCase()
              if (!suppMap.has(lower)) {
                suppMap.set(lower, trimmed)
              }
            })

          const list = Array.from(suppMap.values()).map(name => {
            const lowerName = name.toLowerCase().trim()
            const supplierDebts = (debts || []).filter(d => (d.supplier_name || '').toLowerCase().trim() === lowerName)
            const legacyOwed = supplierDebts.reduce((sum, d) => sum + (d.amount_owed || 0), 0)
            const legacyPaid = supplierDebts.reduce((sum, d) => sum + (d.paid_amount || 0), 0)
            
            const history = (sales || [])
              .filter(s => (s.client_name || '').toLowerCase().trim() === lowerName && s.status !== 'crossed_out')
              .map(s => ({
                id: s.id || randomUUID(),
                date: s.date || '',
                time: s.time || '',
                description: s.type === 'purchase_credit' ? `Achat à crédit: ${s.notes || 'Articles divers'}` : 'Remboursement fournisseur',
                amount: s.type === 'purchase_credit' ? s.debt_amount : -s.paid_amount
              }))
            
            const salesOwed = history.reduce((sum, h) => sum + (h.amount > 0 ? h.amount : 0), 0)
            const initialDownPayments = (sales || []).filter(s => (s.client_name || '').toLowerCase().trim() === lowerName && s.status !== 'crossed_out' && s.type === 'purchase_credit').reduce((sum, s) => sum + (s.paid_amount || 0), 0)
            const salesPaid = history.reduce((sum, h) => sum + (h.amount < 0 ? Math.abs(h.amount) : 0), 0) + initialDownPayments
            const totalAmountOwed = (legacyOwed - legacyPaid) + (salesOwed - salesPaid + initialDownPayments)

            return {
              id: supplierDebts[0]?.id || randomUUID(),
              name,
              amount: totalAmountOwed,
              paid: legacyPaid + salesPaid,
              status: totalAmountOwed <= 0 ? 'settled' : 'pending',
              history
            }
          })
          return NextResponse.json({ suppliers: list })
        } catch (e) {
          console.error('Erreur Supabase Grossistes:', e)
        }
      }
      return NextResponse.json({ suppliers: getLocalSuppliers(shopId) })
    }

    // Default: return BOTH clients and suppliers for DebtsBook.tsx
    let allDebts: NormalizedDebtItem[] = []
    
    if (isSupabaseConfigured()) {
      try {
        // --- CLIENTS ---
        const { data: cDebts } = await supabase.from('debts').select('*').in('shop_id', targetShopIds) as { data: DebtRow[] | null }
        const { data: cSales } = await supabase.from('sales').select('*').in('shop_id', targetShopIds).in('type', ['sale_credit', 'payment_client'])
        
        // Regroupement insensible à la casse et sans espaces résiduels
        const clientNameMap = new Map<string, string>()
        ;[...(cDebts || []).map(d => d.client_name), ...(cSales || []).filter(s => s.client_name).map(s => s.client_name)]
          .filter(Boolean)
          .forEach(rawName => {
            const trimmed = String(rawName).trim()
            const lower = trimmed.toLowerCase()
            if (!clientNameMap.has(lower)) {
              clientNameMap.set(lower, trimmed)
            }
          })

        const clientList: NormalizedDebtItem[] = Array.from(clientNameMap.values()).map(name => {
          const lowerName = name.toLowerCase().trim()
          const clientDebts = (cDebts || []).filter(d => (d.client_name || '').toLowerCase().trim() === lowerName)
          const legacyOwed = clientDebts.reduce((sum, d) => sum + (d.amount_owed || 0), 0)
          const legacyPaid = clientDebts.reduce((sum, d) => sum + (d.paid_amount || 0), 0)
          
          const history = (cSales || []).filter(s => (s.client_name || '').toLowerCase().trim() === lowerName && s.status !== 'crossed_out').map(s => ({
            id: s.id || randomUUID(), date: s.date || '', time: s.time || '',
            description: s.type === 'sale_credit' ? `Achat à crédit: ${s.notes || 'Articles divers'}` : 'Remboursement crédit',
            amount: s.type === 'sale_credit' ? s.debt_amount : -s.paid_amount
          }))
          const salesOwed = history.reduce((sum, h) => sum + (h.amount > 0 ? h.amount : 0), 0)
          const initialDownPayments = (cSales || []).filter(s => (s.client_name || '').toLowerCase().trim() === lowerName && s.status !== 'crossed_out' && s.type === 'sale_credit').reduce((sum, s) => sum + (s.paid_amount || 0), 0)
          const salesPaid = history.reduce((sum, h) => sum + (h.amount < 0 ? Math.abs(h.amount) : 0), 0) + initialDownPayments
          const totalAmountOwed = (legacyOwed - legacyPaid) + (salesOwed - salesPaid + initialDownPayments)

          return {
            id: clientDebts[0]?.id || randomUUID(),
            client_name: name,
            amount_owed: totalAmountOwed,
            paid_amount: legacyPaid + salesPaid,
            status: totalAmountOwed <= 0 ? 'settled' : 'pending',
            history,
            debt_type: 'client'
          }
        })
        allDebts.push(...clientList)

        // --- SUPPLIERS ---
        const { data: sDebts } = await supabase.from('supplier_debts').select('*').in('shop_id', targetShopIds)
        const { data: sSales } = await supabase.from('sales').select('*').in('shop_id', targetShopIds).in('type', ['purchase_credit', 'payment_supplier'])
        
        const suppNameMap = new Map<string, string>()
        ;[...(sDebts || []).map(d => d.supplier_name), ...(sSales || []).filter(s => s.client_name).map(s => s.client_name)]
          .filter(Boolean)
          .forEach(rawName => {
            const trimmed = String(rawName).trim()
            const lower = trimmed.toLowerCase()
            if (!suppNameMap.has(lower)) {
              suppNameMap.set(lower, trimmed)
            }
          })

        const supplierList: NormalizedDebtItem[] = Array.from(suppNameMap.values()).map(name => {
          const lowerName = name.toLowerCase().trim()
          const supplierDebts = (sDebts || []).filter(d => (d.supplier_name || '').toLowerCase().trim() === lowerName)
          const legacyOwed = supplierDebts.reduce((sum, d) => sum + (d.amount_owed || 0), 0)
          const legacyPaid = supplierDebts.reduce((sum, d) => sum + (d.paid_amount || 0), 0)
          
          const history = (sSales || []).filter(s => (s.client_name || '').toLowerCase().trim() === lowerName && s.status !== 'crossed_out').map(s => ({
            id: s.id, date: s.date, time: s.time,
            description: s.type === 'purchase_credit' ? `Achat à crédit: ${s.notes || 'Articles divers'}` : 'Remboursement fournisseur',
            amount: s.type === 'purchase_credit' ? s.debt_amount : -s.paid_amount
          }))
          const salesOwed = history.reduce((sum, h) => sum + (h.amount > 0 ? h.amount : 0), 0)
          const suppInitialDownPayments = (sSales || []).filter(s => (s.client_name || '').toLowerCase().trim() === lowerName && s.status !== 'crossed_out' && s.type === 'purchase_credit').reduce((sum, s) => sum + (s.paid_amount || 0), 0)
          const salesPaid = history.reduce((sum, h) => sum + (h.amount < 0 ? Math.abs(h.amount) : 0), 0) + suppInitialDownPayments
          const totalAmountOwed = (legacyOwed - legacyPaid) + (salesOwed - salesPaid + suppInitialDownPayments)

          return {
            id: supplierDebts[0]?.id || randomUUID(),
            client_name: name,
            amount_owed: totalAmountOwed,
            paid_amount: legacyPaid + salesPaid,
            status: totalAmountOwed <= 0 ? 'settled' : 'pending',
            history,
            debt_type: 'supplier'
          }
        })
        allDebts.push(...supplierList)

        return NextResponse.json({ debts: allDebts })
      } catch (e) {
        console.error('Erreur Supabase ALL Debts:', e)
      }
    }

    // Local fallback
    const localClients: NormalizedDebtItem[] = getLocalClients(shopId).map(c => ({
      id: c.id, client_name: c.name, amount_owed: c.amount, paid_amount: c.paid, status: c.status, history: c.history, debt_type: 'client'
    }))
    const localSuppliers: NormalizedDebtItem[] = getLocalSuppliers(shopId).map(c => ({
      id: c.id, client_name: c.name, amount_owed: c.amount, paid_amount: c.paid, status: c.status, history: c.history, debt_type: 'supplier'
    }))
    return NextResponse.json({ debts: [...localClients, ...localSuppliers] })
  } catch (error) {
    if ((error as { status?: number })?.status === 401 || (error as { status?: number })?.status === 403) return shopAuthorizationErrorResponse(error)
    console.error('Erreur API GET debts:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, date, time, created_at, name, amount, type, action, description } = body
    const requestedShopId = request.headers.get('x-shop-id')
    if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
    const { shop } = await requireShopAccess(request, requestedShopId)
    const shopId = shop.id

    if (!name || !amount || amount <= 0 || !type || !action) {
      return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 })
    }

    const now = new Date()
    const dateStr = date || new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const timeStr = time || now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' })
    const saleId = id || randomUUID()
    const createdAtStr = created_at || now.toISOString()

    // 1. Vérification solvabilité si remboursement de dette fournisseur (retrait du tiroir)
    if (type === 'supplier' && action === 'pay') {
      const currentCash = await getCurrentCash(shopId)
      if (currentCash < amount) {
        return NextResponse.json({
          error: `Opération refusée : solde insuffisant dans le tiroir-caisse (${currentCash} FCFA dispo, besoin de ${amount} FCFA).`,
          isSafeguardTriggered: true
        }, { status: 400 })
      }
    }

    // 2. Préparer l'objet de transaction
    let salesType = 'payment_client'
    let penColor = 'blue' // Encre bleue par défaut pour le cash-in

    if (type === 'supplier') {
      if (action === 'pay') {
        salesType = 'payment_supplier'
        penColor = 'red' // Encre rouge pour le remboursement fournisseur (retrait cash)
      } else {
        salesType = 'purchase_credit'
        penColor = 'purple' // Encre violette pour le crédit grossiste
      }
    } else {
      if (action === 'pay') {
        salesType = 'payment_client'
        penColor = 'blue' // Encre bleue pour remboursement client (entrée cash)
      } else {
        salesType = 'sale_credit'
        penColor = 'yellow' // Encre jaune pour crédit accordé
      }
    }

    const text = description || `${action === 'pay' ? 'Remboursement' : 'Crédit'} - ${name}`

    const newSale = {
      id: saleId,
      shop_id: shopId,
      date: dateStr,
      time: timeStr,
      client_name: name,
      total_amount: amount,
      paid_amount: action === 'pay' ? amount : 0,
      debt_amount: action === 'credit' ? amount : 0,
      status: action === 'credit' ? 'debt' : 'paid',
      type: salesType,
      pen_color: penColor,
      notes: text,
      created_at: createdAtStr,
      articles: []
    }

    // 3. Enregistrer dans la base (idempotent via upsert)
    if (isSupabaseConfigured()) {
      try {
        const { error: sError } = await supabase
          .from('sales')
          .upsert([
            {
              id: saleId,
              shop_id: shopId,
              date: dateStr,
              time: timeStr,
              client_name: name,
              total_amount: amount,
              paid_amount: action === 'pay' ? amount : 0,
              debt_amount: action === 'credit' ? amount : 0,
              status: action === 'credit' ? 'debt' : 'paid',
              type: salesType,
              pen_color: penColor,
              notes: text,
              created_at: createdAtStr
            }
          ], { onConflict: 'id' })

        if (sError) throw sError

        if (type === 'client') {
          // Les opérations clients sont désormais uniquement gérées via la table 'sales'
          // L'endpoint GET aggrège automatiquement les anciennes dettes et les nouvelles ventes.
        } else if (type === 'supplier') {
          // Les opérations fournisseurs sont désormais uniquement gérées via la table 'sales'
          // L'endpoint GET aggrège automatiquement les anciennes dettes et les nouvelles ventes.
        }

      } catch (e) {
        console.error('Erreur Supabase insertion debts POST:', e)
      }
    }

    // Toujours pousser sur le cache local pour la synchronisation
    const db = getLocalDb()
    db.push(newSale)
    saveLocalDb(db)

    return NextResponse.json({ success: true, sale: newSale })
  } catch (error) {
    if ((error as { status?: number })?.status === 401 || (error as { status?: number })?.status === 403) return shopAuthorizationErrorResponse(error)
    console.error('Erreur POST debts:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Helpers locaux en mémoire pour l'extraction dynamique
function getLocalClients(shopId: string) {
  const targetShopIds = getDualShopIds(shopId)
  const sales = (getLocalDb() as LocalSaleItem[]).filter(s => s.status !== 'crossed_out' && targetShopIds.includes(s.shop_id || ''))
  const clientNameMap = new Map<string, string>()
  sales
    .filter(s => (s.type === 'sale_credit' || s.type === 'payment_client') && (s.client || s.client_name))
    .forEach(s => {
      const trimmed = String(s.client_name).trim()
      const lower = trimmed.toLowerCase()
      if (!clientNameMap.has(lower)) {
        clientNameMap.set(lower, trimmed)
      }
    })
  
  return Array.from(clientNameMap.values()).map(name => {
    const lower = name.toLowerCase().trim()
    const clientSales = sales.filter(s => ((s.client || s.client_name) || '').toLowerCase().trim() === lower)
    const credits = clientSales.filter(s => s.type === 'sale_credit').reduce((sum: number, s) => sum + (s.debt ?? s.debt_amount ?? s.total ?? s.total_amount ?? 0), 0)
    const downPayments = clientSales.filter(s => s.type === 'sale_credit').reduce((sum: number, s) => sum + (s.paid ?? s.paid_amount ?? 0), 0)
    const payments = clientSales.filter(s => s.type === 'payment_client').reduce((sum: number, s) => sum + (s.paid ?? s.paid_amount ?? s.total ?? s.total_amount ?? 0), 0)
    const balance = Math.max(0, credits - payments)

    const history: DebtHistoryEntry[] = clientSales
      .filter(s => s.type === 'sale_credit' || s.type === 'payment_client')
      .map(s => ({
        id: s.id || randomUUID(),
        date: s.date || '',
        time: s.time || '',
        description: s.notes || (s.type === 'sale_credit' ? 'Achat à crédit' : 'Remboursement crédit'),
        amount: Number(s.type === 'sale_credit' ? (s.debt ?? s.debt_amount ?? s.total ?? s.total_amount ?? 0) : -Number(s.paid ?? s.paid_amount ?? s.total ?? s.total_amount ?? 0))
      }))

    return {
      id: randomUUID(),
      name,
      amount: balance,
      paid: payments + downPayments,
      status: (balance === 0 ? 'settled' : 'pending') as 'settled' | 'pending',
      history
    }
  })
}

function getLocalSuppliers(shopId: string) {
  const targetShopIds = getDualShopIds(shopId)
  const sales = (getLocalDb() as LocalSaleItem[]).filter(s => s.status !== 'crossed_out' && targetShopIds.includes(s.shop_id || ''))
  const suppNameMap = new Map<string, string>()
  sales
    .filter(s => (s.type === 'purchase_credit' || s.type === 'payment_supplier') && (s.client || s.client_name))
    .forEach(s => {
      const trimmed = String(s.client_name).trim()
      const lower = trimmed.toLowerCase()
      if (!suppNameMap.has(lower)) {
        suppNameMap.set(lower, trimmed)
      }
    })

  return Array.from(suppNameMap.values()).map(name => {
    const lower = name.toLowerCase().trim()
    const supplierSales = sales.filter(s => ((s.client || s.client_name) || '').toLowerCase().trim() === lower)
    const credits = supplierSales.filter(s => s.type === 'purchase_credit').reduce((sum: number, s) => sum + (s.debt ?? s.debt_amount ?? s.total ?? s.total_amount ?? 0), 0)
    const downPayments = supplierSales.filter(s => s.type === 'purchase_credit').reduce((sum: number, s) => sum + (s.paid ?? s.paid_amount ?? 0), 0)
    const payments = supplierSales.filter(s => s.type === 'payment_supplier').reduce((sum: number, s) => sum + (s.paid ?? s.paid_amount ?? s.total ?? s.total_amount ?? 0), 0)
    const balance = Math.max(0, credits - payments)

    const history: DebtHistoryEntry[] = supplierSales
      .filter(s => s.type === 'purchase_credit' || s.type === 'payment_supplier')
      .map(s => ({
        id: s.id || randomUUID(),
        date: s.date || '',
        time: s.time || '',
        description: s.notes || (s.type === 'purchase_credit' ? 'Achat à crédit fournisseur' : 'Remboursement fournisseur'),
        amount: Number(s.type === 'purchase_credit' ? (s.debt ?? s.debt_amount ?? s.total ?? s.total_amount ?? 0) : -Number(s.paid ?? s.paid_amount ?? s.total ?? s.total_amount ?? 0))
      }))

    return {
      id: randomUUID(),
      name,
      amount: balance,
      paid: payments + downPayments,
      status: (balance === 0 ? 'settled' : 'pending') as 'settled' | 'pending',
      history
    }
  })
}
