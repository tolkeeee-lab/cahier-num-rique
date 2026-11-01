import { NextRequest, NextResponse } from 'next/server'
import { supabase, Database, isBackendSupabaseConfigured } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { getCurrentCash } from '@/lib/sales/cashDrawerCalculator'
import { parseTextWithOpenAI, ParsedSale } from '@/lib/sales/openAiSaleParser'
import { parseTextLocally } from '@/lib/sales/offlineSaleParser'
import { fetchSalesHistory, feedMarketKnowledge } from '@/lib/sales/salesRepository'
import { requireShopAccess, shopAuthorizationErrorResponse } from '@/lib/server/shopAccess'

const isSupabaseConfigured = isBackendSupabaseConfigured

type SaleInsert = Database['public']['Tables']['sales']['Insert']
type SaleUpdate = Database['public']['Tables']['sales']['Update']
type SoldArticleInsert = Database['public']['Tables']['sold_articles']['Insert']

interface RawSaleArticleInput {
  nom?: string
  name?: string
  quantite?: number
  quantity?: number
  prix_unitaire?: number
  unit_price?: number
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = body.text || body.raw_text || ''
    const penColor = body.penColor || body.pen_color || 'blue'
    const overrideData = body.overrideData

    const requestedShopId = request.headers.get('x-shop-id') || body.shop_id
    if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
    const { shop } = await requireShopAccess(request, requestedShopId)
    const shopId = shop.id

    if ((!text || typeof text !== 'string' || text.trim().length === 0) && !overrideData) {
      return NextResponse.json({ error: 'Texte de transaction invalide' }, { status: 400 })
    }

    const color = penColor || 'blue'
    let parsedData: ParsedSale | null = null

    if (overrideData) {
      parsedData = {
        articles: (((overrideData.articles as RawSaleArticleInput[] | undefined) || []).map(a => ({
          nom: a.name || a.nom || 'Article',
          quantite: Number(a.quantity ?? a.quantite ?? 1),
          prix_unitaire: Number(a.unit_price ?? a.prix_unitaire ?? 0)
        }))),
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

    let type = body.type || overrideData?.type || ''
    if (!type) {
      type = 'cash_in'
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
    }

    const now = new Date()
    const dateStr = body.date || new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const timeStr = body.time || new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Porto-Novo', hour: '2-digit', minute: '2-digit' }).format(now)
    const saleId = body.id || randomUUID()
    const createdAtStr = body.created_at || now.toISOString()

    const finalTotal = overrideData?.total ?? overrideData?.total_amount ?? parsedData?.total_facture ?? 0
    const finalPaid = overrideData?.paid ?? overrideData?.paid_amount ?? parsedData?.montant_paye ?? 0
    const calculatedDebt = overrideData?.debt ?? overrideData?.debt_amount ?? parsedData?.montant_dette ?? 0
    const finalClient = overrideData?.client ?? overrideData?.client_name ?? parsedData?.nom_client ?? 'Client'
    const finalNotes = overrideData?.notes ?? text ?? ''
    const resolvedStatus = body.status || overrideData?.status || ((calculatedDebt > 0 && (type === 'sale_credit' || type === 'purchase_credit')) ? 'debt' : 'paid')

    const saleRecord: SaleInsert = {
      id: saleId,
      shop_id: shopId,
      created_at: createdAtStr,
      date: dateStr,
      time: timeStr,
      type,
      raw_text: overrideData?.raw_text ?? text ?? finalNotes,
      notes: finalNotes,
      total_amount: finalTotal,
      paid_amount: finalPaid,
      debt_amount: calculatedDebt,
      client_name: finalClient,
      status: resolvedStatus,
      category: body.category || overrideData?.category || parsedData?.categorie || 'Général',
      pen_color: color,
    }

    const newSale = {
      ...saleRecord,
      articles: overrideData?.articles || parsedData?.articles || [],
      synced: true,
    }

    // Persistance Supabase (Seule source d'autorité Cloud)
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ error: 'Supabase n\'est pas configuré sur le serveur' }, { status: 503 })
    }

    const { error: saleErr } = await supabase.from('sales').upsert([saleRecord], { onConflict: 'id' })
    if (saleErr) {
      console.error('Erreur Supabase lors de la sauvegarde vente:', saleErr)
      return NextResponse.json({ error: 'Erreur Supabase: ' + saleErr.message }, { status: 500 })
    }

    if (parsedData?.articles && parsedData.articles.length > 0) {
      // Idempotence : Nettoyer les éventuels anciens articles pour cette vente en cas de retry
      await supabase.from('sold_articles').delete().eq('sale_id', saleId)

      const soldArticlesRecords: SoldArticleInsert[] = parsedData.articles.map(a => {
        const qty = a.quantite || 1;
        const price = a.prix_unitaire || 0;
        return {
          sale_id: saleId,
          shop_id: shopId,
          product_name: a.nom,
          quantity: qty,
          unit_price: price,
          subtotal: qty * price
        };
      })
      const { error: artErr } = await supabase.from('sold_articles').insert(soldArticlesRecords)
      if (artErr) console.warn('Erreur insertion sold_articles:', artErr)

      const reqCountry = request.headers.get('x-shop-country') || body.country || 'BJ'
      const reqCity = request.headers.get('x-shop-city') || body.city || null
      await feedMarketKnowledge(parsedData.articles, type, shopId, reqCountry, reqCity)
    }

    return NextResponse.json({ success: true, sale: newSale })
  } catch (err: unknown) {
    if ((err as { status?: number })?.status === 401 || (err as { status?: number })?.status === 403) return shopAuthorizationErrorResponse(err)
    console.error('Erreur dans POST /api/sales :', err)
    return NextResponse.json({ error: (err as Error)?.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

export async function GET(request: NextRequest) {
  try {
    const requestedShopId = request.headers.get('x-shop-id')
    if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
    const { shop } = await requireShopAccess(request, requestedShopId)
    const shopId = shop.id
    const dateParam = request.nextUrl.searchParams.get('date')
    const sales = await fetchSalesHistory(dateParam === 'all' ? null : dateParam, shopId)
    const cashDrawer = await getCurrentCash(shopId)
    return NextResponse.json({ sales, cashDrawer })
  } catch (err: unknown) {
    if ((err as { status?: number })?.status === 401 || (err as { status?: number })?.status === 403) return shopAuthorizationErrorResponse(err)
    return NextResponse.json({ error: (err as Error)?.message || 'Erreur d\'extraction' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const requestedShopId = request.headers.get('x-shop-id') || body.shop_id
    if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
    const { shop } = await requireShopAccess(request, requestedShopId)
    const shopId = shop.id
    const { id, action, text, penColor, articles, clientName, category } = body

    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })
    }

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

      const { data: currentSale, error: fetchErr } = await supabase
        .from('sales')
        .select('*, sold_articles(*)')
        .eq('id', id)
        .eq('shop_id', shopId)
        .single()

      if (fetchErr || !currentSale) {
        return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
      }

      const addedAmount = parsed.total_facture || 0
      const newTotal = (currentSale.total_amount || 0) + addedAmount
      const newPaid = currentSale.type === 'cash_in' ? newTotal : (currentSale.paid_amount || 0)
      const newDebt = currentSale.type === 'sale_credit' ? Math.max(0, newTotal - newPaid) : (currentSale.debt_amount || 0)
      const newNotes = currentSale.notes ? `${currentSale.notes}, ${text}` : text

      const patchObj: SaleUpdate = {
        total_amount: newTotal,
        paid_amount: newPaid,
        debt_amount: newDebt,
        notes: newNotes,
        status: newDebt > 0 && currentSale.type === 'sale_credit' ? 'debt' : 'paid',
      }

      const { error: updateErr } = await supabase.from('sales').update(patchObj).eq('id', id).eq('shop_id', shopId)
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }

      const newArticles = parsed.articles.map(a => ({
        sale_id: id,
        shop_id: currentSale.shop_id || shopId,
        product_name: a.nom,
        quantity: a.quantite,
        unit_price: a.prix_unitaire,
      }))
      const { error: artErr } = await supabase.from('sold_articles').insert(newArticles)
      if (artErr) console.warn('Erreur insertion sold_articles:', artErr)

      return NextResponse.json({ success: true })
    }

    if (action === 'update_sale') {
      const updatedArticles: RawSaleArticleInput[] = articles || []
      const newTotal = updatedArticles.reduce((acc: number, a) => acc + ((a.quantity || a.quantite || 0) * (a.unit_price || a.prix_unitaire || 0)), 0)
      const newNotes = updatedArticles.map(a => `${a.quantity || a.quantite || 1} ${a.name || a.nom || ''} à ${a.unit_price || a.prix_unitaire || 0}`).join(', ')

      const { data: currentSale } = await supabase
        .from('sales')
        .select('*')
        .eq('id', id)
        .eq('shop_id', shopId)
        .single()
      if (!currentSale) {
        return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
      }

      const isCashIn = currentSale.type === 'cash_in'
      const newPaid = isCashIn ? newTotal : (currentSale.paid_amount || 0)
      const newDebt = currentSale.type === 'sale_credit' ? Math.max(0, newTotal - newPaid) : 0
      const patchObj: SaleUpdate = {
        total_amount: newTotal,
        paid_amount: newPaid,
        debt_amount: newDebt,
        notes: newNotes,
        status: newDebt > 0 && currentSale.type === 'sale_credit' ? 'debt' : 'paid',
      }
      if (clientName) patchObj.client_name = clientName
      await supabase.from('sales').update(patchObj).eq('id', id).eq('shop_id', shopId)

      await supabase.from('sold_articles').delete().eq('sale_id', id)
      if (updatedArticles.length > 0) {
        await supabase.from('sold_articles').insert(
          updatedArticles.map(a => ({
            sale_id: id,
            shop_id: currentSale.shop_id || shopId,
            product_name: a.name || a.nom,
            quantity: a.quantity || a.quantite,
            unit_price: a.unit_price || a.prix_unitaire,
          }))
        )
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'update_category') {
      const { error: catErr } = await supabase.from('sales').update({ category }).eq('id', id).eq('shop_id', shopId)
      if (catErr) {
        return NextResponse.json({ error: catErr.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'settle_debt') {
      const { debt_amount, paid_amount, status: newStatus } = body
      const { error: debtErr } = await supabase.from('sales').update({
        debt_amount: Number(debt_amount || 0),
        paid_amount: Number(paid_amount || 0),
        status: newStatus || (Number(debt_amount || 0) <= 0 ? 'paid' : 'debt'),
      }).eq('id', id).eq('shop_id', shopId)
      if (debtErr) {
        return NextResponse.json({ error: debtErr.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err: unknown) {
    if ((err as { status?: number })?.status === 401 || (err as { status?: number })?.status === 403) return shopAuthorizationErrorResponse(err)
    console.error('Erreur dans PATCH /api/sales :', err)
    return NextResponse.json({ error: (err as Error)?.message || 'Erreur serveur' }, { status: 500 })
  }
}
