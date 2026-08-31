import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'
export const dynamic = 'force-dynamic'
import { getLocalDb, saveLocalDb } from '@/lib/localDb'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && !url.includes('placeholder') && key && !key.includes('placeholder')
}

// Calcule le solde du tiroir-caisse
async function getCurrentCash(shopId: string): Promise<number> {
  const salesList = await getAllSales(shopId)
  let cash = 0
  for (const item of salesList) {
    if (item.status === 'crossed_out') continue
    const type = item.type
    const paid = item.paid_amount ?? 0
    const total = item.total_amount ?? 0

    if (type === 'cash_in' || type === 'payment_client') {
      cash += paid
    } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
      cash -= total
    }
  }
  return cash
}

async function getAllSales(shopId: string): Promise<any[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.from('sales').select('*').eq('shop_id', shopId)
      return data || []
    } catch (e) {
      console.error('Erreur Supabase dans debts API:', e)
    }
  }
  return getLocalDb().filter((s: any) => s.shop_id === shopId)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // client ou supplier
    const shopId = request.headers.get('x-shop-id') || 'default-shop'

    if (type === 'supplier') {
      // Logic for explicit supplier request (maybe used elsewhere, keep it)
      if (isSupabaseConfigured()) {
        try {
          const { data: debts } = await supabase.from('supplier_debts').select('*').eq('shop_id', shopId).order('supplier_name', { ascending: true })
          const { data: sales } = await supabase.from('sales').select('*').eq('shop_id', shopId).in('type', ['purchase_credit', 'payment_supplier'])

          const debtSuppliers = (debts || []).map(d => d.supplier_name)
          const salesSuppliers = (sales || []).filter(s => s.client_name).map(s => s.client_name)
          const supplierNames = Array.from(new Set([...debtSuppliers, ...salesSuppliers]))

          const list = supplierNames.map(name => {
            const supplierDebts = (debts || []).filter(d => d.supplier_name === name)
            const legacyOwed = supplierDebts.reduce((sum, d) => sum + (d.amount_owed || 0), 0)
            const legacyPaid = supplierDebts.reduce((sum, d) => sum + (d.paid_amount || 0), 0)
            
            const history = (sales || [])
              .filter(s => s.client_name === name && s.status !== 'crossed_out')
              .map(s => ({
                id: s.id,
                date: s.date,
                time: s.time,
                description: s.type === 'purchase_credit' ? `Achat à crédit: ${s.notes || 'Articles divers'}` : 'Remboursement fournisseur',
                amount: s.type === 'purchase_credit' ? s.debt_amount : -s.paid_amount
              }))
            
            const salesOwed = history.reduce((sum, h) => sum + (h.amount > 0 ? h.amount : 0), 0)
            const salesPaid = history.reduce((sum, h) => sum + (h.amount < 0 ? Math.abs(h.amount) : 0), 0)
            const totalAmountOwed = (legacyOwed - legacyPaid) + (salesOwed - salesPaid)

            return {
              id: supplierDebts[0]?.id || randomUUID(),
              name,
              amount: totalAmountOwed,
              paid: legacyPaid + salesPaid,
              status: totalAmountOwed <= 0 ? 'paid' : 'pending',
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
    let allDebts: any[] = []
    
    if (isSupabaseConfigured()) {
      try {
        // --- CLIENTS ---
        const { data: cDebts } = await supabase.from('debts').select('*').eq('shop_id', shopId)
        const { data: cSales } = await supabase.from('sales').select('*').eq('shop_id', shopId).in('type', ['sale_credit', 'payment_client'])
        
        const cNames = Array.from(new Set([...(cDebts || []).map(d => d.client_name), ...(cSales || []).filter(s => s.client_name).map(s => s.client_name)]))
        
        const clientList = cNames.map(name => {
          const clientDebts = (cDebts || []).filter(d => d.client_name === name)
          const legacyOwed = clientDebts.reduce((sum, d) => sum + (d.amount_owed || 0), 0)
          const legacyPaid = clientDebts.reduce((sum, d) => sum + (d.paid_amount || 0), 0)
          
          const history = (cSales || []).filter(s => s.client_name === name && s.status !== 'crossed_out').map(s => ({
            id: s.id, date: s.date, time: s.time,
            description: s.type === 'sale_credit' ? `Achat à crédit: ${s.notes || 'Articles divers'}` : 'Remboursement crédit',
            amount: s.type === 'sale_credit' ? s.debt_amount : -s.paid_amount
          }))
          const salesOwed = history.reduce((sum, h) => sum + (h.amount > 0 ? h.amount : 0), 0)
          const salesPaid = history.reduce((sum, h) => sum + (h.amount < 0 ? Math.abs(h.amount) : 0), 0)
          const totalAmountOwed = (legacyOwed - legacyPaid) + (salesOwed - salesPaid)

          return {
            id: clientDebts[0]?.id || randomUUID(),
            client_name: name,
            amount_owed: totalAmountOwed,
            paid_amount: legacyPaid + salesPaid,
            status: totalAmountOwed <= 0 ? 'paid' : 'pending',
            history,
            debt_type: 'client'
          }
        })
        allDebts.push(...clientList)

        // --- SUPPLIERS ---
        const { data: sDebts } = await supabase.from('supplier_debts').select('*').eq('shop_id', shopId)
        const { data: sSales } = await supabase.from('sales').select('*').eq('shop_id', shopId).in('type', ['purchase_credit', 'payment_supplier'])
        
        const sNames = Array.from(new Set([...(sDebts || []).map(d => d.supplier_name), ...(sSales || []).filter(s => s.client_name).map(s => s.client_name)]))
        
        const supplierList = sNames.map(name => {
          const supplierDebts = (sDebts || []).filter(d => d.supplier_name === name)
          const legacyOwed = supplierDebts.reduce((sum, d) => sum + (d.amount_owed || 0), 0)
          const legacyPaid = supplierDebts.reduce((sum, d) => sum + (d.paid_amount || 0), 0)
          
          const history = (sSales || []).filter(s => s.client_name === name && s.status !== 'crossed_out').map(s => ({
            id: s.id, date: s.date, time: s.time,
            description: s.type === 'purchase_credit' ? `Achat à crédit: ${s.notes || 'Articles divers'}` : 'Remboursement fournisseur',
            amount: s.type === 'purchase_credit' ? s.debt_amount : -s.paid_amount
          }))
          const salesOwed = history.reduce((sum, h) => sum + (h.amount > 0 ? h.amount : 0), 0)
          const salesPaid = history.reduce((sum, h) => sum + (h.amount < 0 ? Math.abs(h.amount) : 0), 0)
          const totalAmountOwed = (legacyOwed - legacyPaid) + (salesOwed - salesPaid)

          return {
            id: supplierDebts[0]?.id || randomUUID(),
            client_name: name,
            amount_owed: totalAmountOwed,
            paid_amount: legacyPaid + salesPaid,
            status: totalAmountOwed <= 0 ? 'paid' : 'pending',
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
    const localClients = getLocalClients(shopId).map((c: any) => ({
      id: c.id, client_name: c.name, amount_owed: c.amount, paid_amount: c.paid, status: c.status, history: c.history, debt_type: 'client'
    }))
    const localSuppliers = getLocalSuppliers(shopId).map((c: any) => ({
      id: c.id, client_name: c.name, amount_owed: c.amount, paid_amount: c.paid, status: c.status, history: c.history, debt_type: 'supplier'
    }))
    return NextResponse.json({ debts: [...localClients, ...localSuppliers] })
  } catch (error) {
    console.error('Erreur API GET debts:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, amount, type, action, description } = await request.json()
    const shopId = request.headers.get('x-shop-id') || 'default-shop'

    if (!name || !amount || amount <= 0 || !type || !action) {
      return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 })
    }

    const now = new Date()
    const dateStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' })
    const saleId = randomUUID()

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
      created_at: now.toISOString(),
      articles: []
    }

    // 3. Enregistrer dans la base
    if (isSupabaseConfigured()) {
      try {
        // Insérer dans la table sales
        const { error: sError } = await supabase
          .from('sales')
          .insert([
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
              created_at: now.toISOString()
            }
          ])

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
    console.error('Erreur POST debts:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Helpers locaux en mémoire pour l'extraction dynamique
function getLocalClients(shopId: string) {
  const sales = getLocalDb().filter((s: any) => s.status !== 'crossed_out' && s.shop_id === shopId)
  const clientNames = Array.from(new Set(sales.filter((s: any) => s.type === 'sale_credit' || s.type === 'payment_client').map((s: any) => s.client_name)))
  
  return clientNames.map(name => {
    const clientSales = sales.filter((s: any) => s.client_name === name)
    const credits = clientSales.filter((s: any) => s.type === 'sale_credit').reduce((sum: number, s: any) => sum + (s.debt_amount ?? s.total_amount ?? 0), 0)
    const payments = clientSales.filter((s: any) => s.type === 'payment_client').reduce((sum: number, s: any) => sum + (s.paid_amount ?? s.total_amount ?? 0), 0)
    const balance = Math.max(0, credits - payments)

    const history = clientSales
      .filter((s: any) => s.type === 'sale_credit' || s.type === 'payment_client')
      .map((s: any) => ({
        id: s.id,
        date: s.date,
        time: s.time,
        description: s.notes || (s.type === 'sale_credit' ? 'Achat à crédit' : 'Remboursement crédit'),
        amount: s.type === 'sale_credit' ? (s.debt_amount ?? s.total_amount) : -(s.paid_amount ?? s.total_amount)
      }))

    return {
      id: randomUUID(),
      name,
      amount: balance,
      paid: payments,
      status: balance === 0 ? 'paid' : 'pending',
      history
    }
  })
}

function getLocalSuppliers(shopId: string) {
  const sales = getLocalDb().filter((s: any) => s.status !== 'crossed_out' && s.shop_id === shopId)
  const supplierNames = Array.from(new Set(sales.filter((s: any) => s.type === 'purchase_credit' || s.type === 'payment_supplier').map((s: any) => s.client_name)))

  return supplierNames.map(name => {
    const supplierSales = sales.filter((s: any) => s.client_name === name)
    const credits = supplierSales.filter((s: any) => s.type === 'purchase_credit').reduce((sum: number, s: any) => sum + (s.debt_amount ?? s.total_amount ?? 0), 0)
    const payments = supplierSales.filter((s: any) => s.type === 'payment_supplier').reduce((sum: number, s: any) => sum + (s.paid_amount ?? s.total_amount ?? 0), 0)
    const balance = Math.max(0, credits - payments)

    const history = supplierSales
      .filter((s: any) => s.type === 'purchase_credit' || s.type === 'payment_supplier')
      .map((s: any) => ({
        id: s.id,
        date: s.date,
        time: s.time,
        description: s.notes || (s.type === 'purchase_credit' ? 'Achat à crédit fournisseur' : 'Remboursement fournisseur'),
        amount: s.type === 'purchase_credit' ? (s.debt_amount ?? s.total_amount) : -(s.paid_amount ?? s.total_amount)
      }))

    return {
      id: randomUUID(),
      name,
      amount: balance,
      paid: payments,
      status: balance === 0 ? 'paid' : 'pending',
      history
    }
  })
}
