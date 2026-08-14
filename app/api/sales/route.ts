import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { getLocalDb, saveLocalDb } from '@/lib/localDb'
import { normalizeProductName } from '@/lib/productUtils'
import { isSupabaseConfigured, getCurrentCash } from '@/lib/sales/cashDrawerCalculator'
import { parseTextWithOpenAI, ParsedSale } from '@/lib/sales/openAiSaleParser'
import { parseTextLocally } from '@/lib/sales/offlineSaleParser'
import { fetchSalesHistory, feedMarketKnowledge } from '@/lib/sales/salesRepository'

function calculateSingleTransactionCashImpact(item: any): number {
  const type = item.type
  const paid = item.paid_amount ?? item.paid ?? 0
  const total = item.total_amount ?? item.total ?? 0

  if (type === 'cash_in' || type === 'payment_client') {
    return paid
  } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
    return -total
  }
  return 0
}

export async function POST(request: NextRequest) {
  try {
    const { text, penColor, overrideData } = await request.json()
    const shopId = request.headers.get('x-shop-id') || 'default-shop'
    const shopCountry = request.headers.get('x-shop-country') || 'CI'
    const shopCity = request.headers.get('x-shop-city') || null

    if ((!text || typeof text !== 'string' || text.trim().length === 0) && !overrideData) {
      return NextResponse.json({ error: 'Texte de transaction invalide' }, { status: 400 })
    }

    const color = penColor || 'blue'
    let parsedData: ParsedSale | null = null

    if (overrideData) {
      parsedData = {
        articles: (overrideData.articles || []).map((a: any) => ({
          nom: a.name || a.nom,
          quantite: a.quantity || a.quantite,
          prix_unitaire: a.unit_price || a.prix_unitaire
        })),
        total_facture: overrideData.total_amount,
        montant_paye: overrideData.paid_amount,
        montant_dette: overrideData.debt_amount,
        nom_client: overrideData.client_name || overrideData.nom_client || "Client anonyme",
        categorie: overrideData.category || overrideData.categorie || 'Divers'
      }
    } else {
      const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'mock-key-for-build'
      let sanitizedText = text.trim()
      let prevSanitized = ""
      while (sanitizedText !== prevSanitized) {
        prevSanitized = sanitizedText
        sanitizedText = sanitizedText.replace(/(\d)[.,\s]+(\d{3})(?!\d)/g, "$1$2")
      }

      if (hasApiKey) {
        parsedData = await parseTextWithOpenAI(sanitizedText, color)
      }

      if (!parsedData) {
        parsedData = parseTextLocally(sanitizedText, color)
      }
    }

    let type = 'cash_in'
    if (color === 'red') type = 'cash_out'
    else if (color === 'green') type = 'purchase_cash'
    else if (color === 'purple') type = 'purchase_credit'
    else if (color === 'yellow') type = 'sale_credit'

    const lowercaseText = text.trim().toLowerCase()
    const isDemandeClient = /^(demande|client demande|demande client|manque|besoin|réclamation|reclamation)\b/i.test(lowercaseText)

    if (isDemandeClient) {
      type = 'client_request'
      if (parsedData) {
        parsedData.total_facture = 0
        parsedData.montant_paye = 0
        parsedData.montant_dette = 0
        parsedData.nom_client = "Demande Client"
        parsedData.categorie = "Demande Client"
      }
    } else if (lowercaseText.startsWith('stock') || lowercaseText.startsWith('achat')) {
      if (type === 'cash_in' || type === 'sale_credit') {
        type = 'purchase_cash'
      }
    }

    const now = new Date()
    const dateStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const timeStr = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Porto-Novo', hour: '2-digit', minute: '2-digit' }).format(now)
    const saleId = randomUUID()

    const newSale = {
      id: saleId,
      shop_id: shopId,
      date: dateStr,
      time: timeStr,
      client_name: parsedData.nom_client,
      total_amount: parsedData.total_facture,
      paid_amount: parsedData.montant_paye,
      debt_amount: parsedData.montant_dette,
      status: parsedData.montant_dette > 0 ? 'debt' : 'paid',
      type: type,
      pen_color: color,
      notes: text,
      category: parsedData.categorie || 'Divers',
      articles: parsedData.articles.map((a) => ({
        name: a.nom,
        quantity: a.quantite,
        unit_price: a.prix_unitaire,
        category: a.categorie || 'Divers',
      })),
      created_at: now.toISOString(),
    }

    let savedInSupabase = false

    if (isSupabaseConfigured()) {
      try {
        const { error: saleError } = await supabase
          .from('sales')
          .insert([
            {
              id: saleId,
              shop_id: shopId,
              date: dateStr,
              time: timeStr,
              client_name: parsedData.nom_client,
              total_amount: parsedData.total_facture,
              paid_amount: parsedData.montant_paye,
              debt_amount: parsedData.montant_dette,
              status: parsedData.montant_dette > 0 ? 'debt' : 'paid',
              type: type,
              pen_color: color,
              notes: text,
              category: parsedData.categorie || 'Divers',
              created_at: now.toISOString(),
            },
          ])

        if (saleError) throw saleError

        if (parsedData.articles.length > 0) {
          const articlesData = parsedData.articles.map(a => ({
            id: randomUUID(),
            sale_id: saleId,
            product_name: a.nom,
            product_name_raw: a.nom,
            product_name_canonical: normalizeProductName(a.nom),
            quantity: a.quantite,
            unit_price: a.prix_unitaire,
            subtotal: a.quantite * a.prix_unitaire,
            category: a.categorie || 'Divers',
            created_at: now.toISOString(),
          }))

          await supabase.from('sold_articles').insert(articlesData)
        }

        if (type === 'sale_credit' && parsedData.montant_dette > 0) {
          await supabase.from('debts').insert([
            {
              id: randomUUID(),
              sale_id: saleId,
              shop_id: shopId,
              client_name: parsedData.nom_client,
              amount_owed: parsedData.montant_dette,
              status: 'pending',
              created_at: now.toISOString(),
            },
          ])
        }

        if (parsedData.articles.length > 0) {
          feedMarketKnowledge(parsedData.articles, type, shopId, shopCountry, shopCity).catch(err =>
            console.warn('[market_knowledge] Erreur non bloquante:', err)
          )
        }

        savedInSupabase = true
      } catch (e: any) {
        console.error('Erreur insertion Supabase:', e)
      }
    }

    const db = getLocalDb()
    db.push(newSale)
    saveLocalDb(db)

    return NextResponse.json({ 
      sale: {
        id: newSale.id,
        date: newSale.date,
        time: newSale.time,
        client: newSale.client_name,
        articles: newSale.articles,
        total: newSale.total_amount,
        paid: newSale.paid_amount,
        debt: newSale.debt_amount,
        status: newSale.status,
        type: newSale.type,
        pen_color: newSale.pen_color,
        notes: newSale.notes
      },
      savedInSupabase 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Erreur API POST:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const shopId = request.headers.get('x-shop-id') || 'default-shop'

    const sales = await fetchSalesHistory(dateParam, shopId)
    return NextResponse.json({ sales })
  } catch (error) {
    console.error('Erreur API GET:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur inconnue' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action } = body
    const shopId = request.headers.get('x-shop-id') || 'default-shop'

    if (action === 'cross_out') {
      let transaction: any = null
      if (isSupabaseConfigured()) {
        const { data } = await supabase.from('sales').select('*').eq('id', id).eq('shop_id', shopId).single()
        transaction = data
      } else {
        transaction = getLocalDb().find(s => s.id === id && s.shop_id === shopId)
      }

      if (!transaction) {
        return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
      }

      if (transaction.status === 'crossed_out') {
        return NextResponse.json({ error: 'Transaction déjà rayée' }, { status: 400 })
      }

      const currentCash = await getCurrentCash(shopId)
      const cashImpact = calculateSingleTransactionCashImpact(transaction)

      if (cashImpact > 0 && currentCash - cashImpact < 0) {
        return NextResponse.json(
          { 
            error: `Impossible de rayer cette transaction : le solde de votre tiroir-caisse deviendrait négatif (${currentCash - cashImpact} FCFA).`,
            isSafeguardTriggered: true 
          },
          { status: 400 }
        )
      }

      if (isSupabaseConfigured()) {
        await supabase.from('sales').update({ status: 'crossed_out' }).eq('id', id).eq('shop_id', shopId)
      }

      const db = getLocalDb()
      const idx = db.findIndex(s => s.id === id && s.shop_id === shopId)
      if (idx !== -1) {
        db[idx].status = 'crossed_out'
        saveLocalDb(db)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (error) {
    console.error('Erreur API PATCH:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur inconnue' },
      { status: 500 }
    )
  }
}
