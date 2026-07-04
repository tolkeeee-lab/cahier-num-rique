import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'

// Import de la base de données en mémoire pour le fallback
// Note: On peut interroger l'API sales ou utiliser des variables partagées.
// Pour partager proprement l'état en mémoire en Node.js, on peut utiliser un cache global
const globalRef = global as any
if (!globalRef.salesDatabase) {
  globalRef.salesDatabase = []
}

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
  return globalRef.salesDatabase.filter((s: any) => s.shop_id === shopId)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // client ou supplier
    const shopId = request.headers.get('x-shop-id') || 'default-shop'

    if (type === 'supplier') {
      // 1. Liste des grossistes (fournisseurs)
      if (isSupabaseConfigured()) {
        try {
          const { data: debts, error: dError } = await supabase
            .from('supplier_debts')
            .select('*')
            .eq('shop_id', shopId)
            .order('supplier_name', { ascending: true })

          if (dError) throw dError

          // Récupérer l'historique des engagements
          const { data: txs } = await supabase
            .from('supplier_transactions')
            .select('*')
            .eq('shop_id', shopId)
            .order('created_at', { ascending: false })

          const list = (debts || []).map((d: any) => ({
            id: d.id,
            name: d.supplier_name,
            amount: d.amount_owed,
            paid: d.paid_amount,
            status: d.status,
            history: (txs || [])
              .filter((t: any) => t.supplier_name === d.supplier_name)
              .map((t: any) => ({
                id: t.id,
                date: new Date(t.created_at).toISOString().split('T')[0],
                time: new Date(t.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                description: t.description,
                amount: t.amount
              }))
          }))

          return NextResponse.json({ suppliers: list })
        } catch (e) {
          console.error('Erreur Supabase Grossistes, repli local:', e)
        }
      }

      // Repli Local en mémoire
      const list = getLocalSuppliers(shopId)
      return NextResponse.json({ suppliers: list })

    } else {
      // 2. Liste des clients débiteurs
      if (isSupabaseConfigured()) {
        try {
          // Récupérer toutes les dettes clients
          const { data: debts, error: dError } = await supabase
            .from('debts')
            .select('*')
            .eq('shop_id', shopId)
            .order('client_name', { ascending: true })

          if (dError) throw dError

          // Récupérer toutes les ventes à crédit et remboursements associés à ces clients
          const { data: sales } = await supabase
            .from('sales')
            .select('*')
            .eq('shop_id', shopId)
            .in('type', ['sale_credit', 'payment_client'])
            .neq('status', 'crossed_out')

          // Regrouper par client
          const clientNames = Array.from(new Set((debts || []).map(d => d.client_name)))
          const list = clientNames.map(name => {
            const clientDebts = (debts || []).filter(d => d.client_name === name)
            const totalOwed = clientDebts.reduce((sum, d) => sum + d.amount_owed, 0)
            const totalPaid = clientDebts.reduce((sum, d) => sum + d.paid_amount, 0)
            
            const history = (sales || [])
              .filter(s => s.client_name === name)
              .map(s => ({
                id: s.id,
                date: s.date,
                time: s.time,
                description: s.type === 'sale_credit' ? `Achat à crédit: ${s.notes || 'Articles divers'}` : 'Remboursement crédit',
                amount: s.type === 'sale_credit' ? s.debt_amount : -s.paid_amount
              }))

            return {
              id: clientDebts[0]?.id || randomUUID(),
              name,
              amount: totalOwed - totalPaid,
              paid: totalPaid,
              status: (totalOwed - totalPaid) === 0 ? 'paid' : 'pending',
              history
            }
          })

          return NextResponse.json({ clients: list })
        } catch (e) {
          console.error('Erreur Supabase Clients, repli local:', e)
        }
      }

      // Repli Local en mémoire
      const list = getLocalClients(shopId)
      return NextResponse.json({ clients: list })
    }
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
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
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
          if (action === 'pay') {
            // Mettre à jour les dettes existantes (rembourser)
            // Trouver les dettes non payées pour ce client
            const { data: debts } = await supabase
              .from('debts')
              .select('*')
              .eq('client_name', name)
              .eq('shop_id', shopId)
              .eq('status', 'pending')

            let remainingPayment = amount
            for (const debt of (debts || [])) {
              if (remainingPayment <= 0) break
              const debtRemaining = debt.amount_owed - debt.paid_amount
              const paymentToApply = Math.min(remainingPayment, debtRemaining)
              const newPaidAmount = debt.paid_amount + paymentToApply
              const newStatus = newPaidAmount >= debt.amount_owed ? 'paid' : 'pending'

              await supabase
                .from('debts')
                .update({ paid_amount: newPaidAmount, status: newStatus })
                .eq('id', debt.id)
                .eq('shop_id', shopId)

              remainingPayment -= paymentToApply
            }
          } else {
            // Ajouter une nouvelle dette
            await supabase
              .from('debts')
              .insert([
                {
                  id: randomUUID(),
                  sale_id: saleId,
                  shop_id: shopId,
                  client_name: name,
                  amount_owed: amount,
                  status: 'pending',
                  created_at: now.toISOString()
                }
              ])
          }
        } else if (type === 'supplier') {
          // Insérer la transaction grossiste
          await supabase
            .from('supplier_transactions')
            .insert([
              {
                id: randomUUID(),
                shop_id: shopId,
                supplier_name: name,
                amount: action === 'credit' ? amount : -amount,
                description: text,
                created_at: now.toISOString()
              }
            ])

          // Mettre à jour le solde global grossiste
          const { data: sDebt } = await supabase
            .from('supplier_debts')
            .select('*')
            .eq('supplier_name', name)
            .eq('shop_id', shopId)
            .single()

          if (sDebt) {
            const diff = action === 'credit' ? amount : -amount
            const newOwed = sDebt.amount_owed + diff
            const newPaid = sDebt.paid_amount + (action === 'pay' ? amount : 0)
            await supabase
              .from('supplier_debts')
              .update({
                amount_owed: Math.max(0, newOwed),
                paid_amount: newPaid,
                status: newOwed <= 0 ? 'paid' : 'pending'
              })
              .eq('supplier_name', name)
              .eq('shop_id', shopId)
          } else {
            await supabase
              .from('supplier_debts')
              .insert([
                {
                  id: randomUUID(),
                  shop_id: shopId,
                  supplier_name: name,
                  amount_owed: action === 'credit' ? amount : 0,
                  paid_amount: action === 'pay' ? amount : 0,
                  status: action === 'credit' ? 'pending' : 'paid'
                }
              ])
          }
        }

      } catch (e) {
        console.error('Erreur Supabase insertion debts POST:', e)
      }
    }

    // Toujours pousser sur le cache en mémoire local pour la synchronisation
    globalRef.salesDatabase.push(newSale)

    return NextResponse.json({ success: true, sale: newSale })
  } catch (error) {
    console.error('Erreur POST debts:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Helpers locaux en mémoire pour l'extraction dynamique
function getLocalClients(shopId: string) {
  const sales = globalRef.salesDatabase.filter((s: any) => s.status !== 'crossed_out' && s.shop_id === shopId)
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
  const sales = globalRef.salesDatabase.filter((s: any) => s.status !== 'crossed_out' && s.shop_id === shopId)
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
