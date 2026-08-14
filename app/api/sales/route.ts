import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { getLocalDb, saveLocalDb } from '@/lib/localDb'
import { isSupabaseConfigured, getCurrentCash } from '@/lib/sales/cashDrawerCalculator'
import { parseTextWithOpenAI, ParsedSale } from '@/lib/sales/openAiSaleParser'
import { parseTextLocally } from '@/lib/sales/offlineSaleParser'
import { fetchSalesHistory } from '@/lib/sales/salesRepository'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = body.text || body.raw_text || ''
    const penColor = body.penColor || body.pen_color || 'blue'
    const overrideData = body.overrideData

    const shopId = request.headers.get('x-shop-id') || body.shop_id || 'default-shop'

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
      created_at: now.toISOString(),
      date: dateStr,
      time: timeStr,
      type,
      raw_text: text,
      notes: text,
      articles: parsedData?.articles || [],
      total_amount: parsedData?.total_facture || 0,
      paid_amount: parsedData?.montant_paye || 0,
      debt_amount: parsedData?.montant_dette || 0,
      client_name: parsedData?.nom_client || 'Client',
      status: parsedData?.montant_dette && parsedData.montant_dette > 0 ? 'debt' : 'paid',
      category: parsedData?.categorie || 'Général',
      pen_color: color,
      synced: true,
    }

    // Sauvegarde Supabase ou DB Locale
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('sales').insert([newSale])
      if (error) {
        console.error('Erreur Supabase, bascule locale :', error)
        const localSales = getLocalDb()
        localSales.unshift(newSale)
        saveLocalDb(localSales)
      }
    } else {
      const localSales = getLocalDb()
      localSales.unshift(newSale)
      saveLocalDb(localSales)
    }

    return NextResponse.json({ success: true, sale: newSale })
  } catch (err: any) {
    console.error('Erreur dans POST /api/sales :', err)
    return NextResponse.json({ error: err?.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || 'default-shop'
    const sales = await fetchSalesHistory(null, shopId)
    const cashDrawer = await getCurrentCash(shopId)
    return NextResponse.json({ sales, cashDrawer })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erreur d\'extraction' }, { status: 500 })
  }
}
