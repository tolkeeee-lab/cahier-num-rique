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

    const saleRecord = {
      id: saleId,
      shop_id: shopId,
      created_at: now.toISOString(),
      date: dateStr,
      time: timeStr,
      type,
      raw_text: text,
      notes: text,
      total_amount: parsedData?.total_facture || 0,
      paid_amount: parsedData?.montant_paye || 0,
      debt_amount: parsedData?.montant_dette || 0,
      client_name: parsedData?.nom_client || 'Client',
      status: parsedData?.montant_dette && parsedData.montant_dette > 0 ? 'debt' : 'paid',
      category: parsedData?.categorie || 'Général',
      pen_color: color,
    }

    const newSale = {
      ...saleRecord,
      articles: parsedData?.articles || [],
      synced: true,
    }

    // Sauvegarde Supabase ou DB Locale
    if (isSupabaseConfigured() && supabase) {
      const { error: saleErr } = await supabase.from('sales').insert([saleRecord])
      if (saleErr) {
        console.error('Erreur Supabase, bascule locale :', saleErr)
        const localSales = getLocalDb()
        localSales.unshift(newSale)
        saveLocalDb(localSales)
      } else {
        if (parsedData?.articles && parsedData.articles.length > 0) {
          const soldArticlesRecords = parsedData.articles.map((a: any) => ({
            sale_id: saleId,
            product_name: a.nom || a.name,
            quantity: a.quantite || a.quantity,
            unit_price: a.prix_unitaire || a.unit_price,
          }))
          const { error: artErr } = await supabase.from('sold_articles').insert(soldArticlesRecords)
          if (artErr) console.warn('Erreur insertion sold_articles:', artErr)
        }
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action, text, penColor, articles, clientName, category } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de vente manquant' }, { status: 400 })
    }

    if (action === 'add_article') {
      if (!text || typeof text !== 'string') {
        return NextResponse.json({ error: 'Texte d\'article manquant' }, { status: 400 })
      }
      const color = penColor || 'blue'
      const parsed = parseTextLocally(text, color)
      if (!parsed || !parsed.articles || parsed.articles.length === 0) {
        return NextResponse.json({ error: 'Saisie d\'article non reconnue' }, { status: 400 })
      }

      if (isSupabaseConfigured() && supabase) {
        const { data: currentSale, error: fetchErr } = await supabase
          .from('sales')
          .select('*, sold_articles(*)')
          .eq('id', id)
          .single()

        if (currentSale && !fetchErr) {
          const addedAmount = parsed.total_facture || 0
          const newTotal = (currentSale.total_amount || 0) + addedAmount
          const newPaid = currentSale.type === 'cash_in' ? newTotal : (currentSale.paid_amount || 0)
          const newDebt = currentSale.type === 'sale_credit' ? Math.max(0, newTotal - newPaid) : (currentSale.debt_amount || 0)
          const newNotes = currentSale.notes ? `${currentSale.notes}, ${text}` : text
          const newStatus = newDebt > 0 && currentSale.type === 'sale_credit' ? 'debt' : 'paid'

          await supabase.from('sales').update({
            total_amount: newTotal,
            paid_amount: newPaid,
            debt_amount: newDebt,
            notes: newNotes,
            status: newStatus,
          }).eq('id', id)

          const newSoldArticles = parsed.articles.map(a => ({
            sale_id: id,
            product_name: a.nom,
            quantity: a.quantite,
            unit_price: a.prix_unitaire,
          }))
          await supabase.from('sold_articles').insert(newSoldArticles)

          return NextResponse.json({ success: true })
        }
      }

      const localSales = getLocalDb()
      const idx = localSales.findIndex((s: any) => s.id === id)
      if (idx !== -1) {
        const sale = localSales[idx]
        const addedAmount = parsed.total_facture || 0
        const newTotal = (sale.total_amount || 0) + addedAmount
        const newPaid = sale.type === 'cash_in' ? newTotal : (sale.paid_amount || 0)
        const newDebt = sale.type === 'sale_credit' ? Math.max(0, newTotal - newPaid) : (sale.debt_amount || 0)
        sale.total_amount = newTotal
        sale.paid_amount = newPaid
        sale.debt_amount = newDebt
        sale.notes = sale.notes ? `${sale.notes}, ${text}` : text
        sale.status = newDebt > 0 && sale.type === 'sale_credit' ? 'debt' : 'paid'
        sale.articles = [
          ...(sale.articles || []),
          ...parsed.articles.map(a => ({
            name: a.nom,
            quantity: a.quantite,
            unit_price: a.prix_unitaire,
          }))
        ]
        saveLocalDb(localSales)
        return NextResponse.json({ success: true, sale })
      }
      return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
    }

    if (action === 'update_sale') {
      const updatedArticles = articles || []
      const newTotal = updatedArticles.reduce((acc: number, a: any) => acc + ((a.quantity || a.quantite || 0) * (a.unit_price || a.prix_unitaire || 0)), 0)
      const newNotes = updatedArticles.map((a: any) => `${a.quantity} ${a.name} à ${a.unit_price}`).join(', ')

      if (isSupabaseConfigured() && supabase) {
        const { data: currentSale } = await supabase.from('sales').select('*').eq('id', id).single()
        if (currentSale) {
          const isCashIn = currentSale.type === 'cash_in'
          const newPaid = isCashIn ? newTotal : (currentSale.paid_amount || 0)
          const newDebt = currentSale.type === 'sale_credit' ? Math.max(0, newTotal - newPaid) : 0
          const patchObj: any = {
            total_amount: newTotal,
            paid_amount: newPaid,
            debt_amount: newDebt,
            notes: newNotes,
            status: newDebt > 0 && currentSale.type === 'sale_credit' ? 'debt' : 'paid',
          }
          if (clientName) patchObj.client_name = clientName
          await supabase.from('sales').update(patchObj).eq('id', id)

          await supabase.from('sold_articles').delete().eq('sale_id', id)
          if (updatedArticles.length > 0) {
            await supabase.from('sold_articles').insert(
              updatedArticles.map((a: any) => ({
                sale_id: id,
                product_name: a.name || a.nom,
                quantity: a.quantity || a.quantite,
                unit_price: a.unit_price || a.prix_unitaire,
              }))
            )
          }
          return NextResponse.json({ success: true })
        }
      }

      const localSales = getLocalDb()
      const idx = localSales.findIndex((s: any) => s.id === id)
      if (idx !== -1) {
        const sale = localSales[idx]
        const isCashIn = sale.type === 'cash_in'
        const newPaid = isCashIn ? newTotal : (sale.paid_amount || 0)
        const newDebt = sale.type === 'sale_credit' ? Math.max(0, newTotal - newPaid) : 0
        sale.total_amount = newTotal
        sale.paid_amount = newPaid
        sale.debt_amount = newDebt
        sale.notes = newNotes
        if (clientName) sale.client_name = clientName
        sale.articles = updatedArticles.map((a: any) => ({
          name: a.name || a.nom,
          quantity: a.quantity || a.quantite,
          unit_price: a.unit_price || a.prix_unitaire,
        }))
        saveLocalDb(localSales)
        return NextResponse.json({ success: true, sale })
      }
      return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
    }

    if (action === 'update_category') {
      if (isSupabaseConfigured() && supabase) {
        await supabase.from('sales').update({ category }).eq('id', id)
        return NextResponse.json({ success: true })
      }
      const localSales = getLocalDb()
      const idx = localSales.findIndex((s: any) => s.id === id)
      if (idx !== -1) {
        localSales[idx].category = category
        saveLocalDb(localSales)
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err: any) {
    console.error('Erreur dans PATCH /api/sales :', err)
    return NextResponse.json({ error: err?.message || 'Erreur serveur' }, { status: 500 })
  }
}
