import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import OpenAI from 'openai'
import { randomUUID } from 'crypto'
import { getLocalDb, saveLocalDb } from '@/lib/localDb'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key-for-build',
})

// Détecte si Supabase est correctement configuré
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && !url.includes('placeholder') && key && !key.includes('placeholder')
}

interface ParsedSale {
  articles: Array<{
    nom: string
    quantite: number
    prix_unitaire: number
    unite_achat?: string
    unite_vente?: string
    quantite_par_boite?: number
    prix_vente_unitaire?: number
    seuil_alerte?: number
  }>
  total_facture: number
  montant_paye: number
  montant_dette: number
  nom_client: string
}


// Calcule le solde actuel du tiroir-caisse (Cash)
async function getCurrentCash(shopId: string): Promise<number> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('type, paid_amount, total_amount, status')
        .eq('shop_id', shopId)

      if (error) throw error
      return calculateCash(data || [])
    } catch (e) {
      console.error('Erreur lecture cash Supabase, repli sur local:', e)
    }
  }
  return calculateCash(getLocalDb().filter(s => s.shop_id === shopId))
}

function calculateCash(list: any[]): number {
  let cash = 0
  for (const item of list) {
    if (item.status === 'crossed_out') continue
    const type = item.type
    const paid = item.paid_amount ?? item.paid ?? 0
    const total = item.total_amount ?? item.total ?? 0

    if (type === 'cash_in' || type === 'payment_client') {
      cash += paid
    } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
      cash -= total
    }
  }
  return cash
}

export async function POST(request: NextRequest) {
  try {
    const { text, penColor, overrideData } = await request.json()
    const shopId = request.headers.get('x-shop-id') || 'default-shop'

    if ((!text || typeof text !== 'string' || text.trim().length === 0) && !overrideData) {
      return NextResponse.json(
        { error: 'Texte de transaction invalide' },
        { status: 400 }
      )
    }

    const color = penColor || 'blue'

    // 1. Parser le texte ou utiliser les données pré-calculées
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
        nom_client: overrideData.client_name || overrideData.nom_client || "Client anonyme"
      }
    } else {
      const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'mock-key-for-build'
      // Nettoyer les espaces, points et virgules entre les chiffres (ex: "12 000" -> "12000")
      const sanitizedText = text.trim().replace(/(\d)[.,\s]+(?=\d)/g, "$1")

      if (hasApiKey) {
        parsedData = await parseTextWithOpenAI(sanitizedText, color)
      }

      // Fallback sur le parseur Regex local si pas de clé ou si l'IA échoue
      if (!parsedData) {
        parsedData = parseTextLocally(sanitizedText, color)
      }
    }

    // 2. Déterminer le type de transaction
    // blue=Vente, red=Dépense, green=Achat Stock, purple=Dette Grossiste, yellow=Crédit Client
    let type = 'cash_in'
    if (color === 'red') type = 'cash_out'
    else if (color === 'green') type = 'purchase_cash'
    else if (color === 'purple') type = 'purchase_credit'
    else if (color === 'yellow') type = 'sale_credit'

    // Forcer en Achat Stock (purchase_cash / purchase_credit) si le texte commence par "stock" ou "achat"
    const lowercaseText = text.trim().toLowerCase()
    if (lowercaseText.startsWith('stock') || lowercaseText.startsWith('achat')) {
      if (type === 'cash_in' || type === 'sale_credit') {
        type = 'purchase_cash'
      }
    }

    // ─── RÉCUPÉRATION DU PRIX DANS LE CATALOGUE SI MANQUANT ───
    if (isSupabaseConfigured() && parsedData) {
      try {
        const { data: dbProducts } = await supabase
          .from('products')
          .select('*')
          .eq('shop_id', shopId)

        if (dbProducts && dbProducts.length > 0) {
          let hasPriceUpdated = false

          // Cas 1 : Des articles ont été parsés mais leur prix est 0 ou manquant
          for (const article of parsedData.articles) {
            if (!article.prix_unitaire || article.prix_unitaire === 0) {
              const matchedProd = dbProducts.find(p => p.name.toLowerCase().trim() === article.nom.toLowerCase().trim())
              if (matchedProd) {
                const isPurchase = ['purchase_cash', 'purchase_credit'].includes(type)
                const defaultPrice = isPurchase ? (matchedProd.unit_cost || matchedProd.unit_price) : matchedProd.unit_price
                if (defaultPrice) {
                  article.prix_unitaire = defaultPrice
                  hasPriceUpdated = true
                }
              }
            }
          }

          // Cas 2 : Aucun article n'a pu être parsé ou total à 0 car pas de prix dans le texte (ex: "farine de blé")
          if (parsedData.articles.length === 0 || parsedData.total_facture === 0) {
            const sortedProds = [...dbProducts].sort((a, b) => b.name.length - a.name.length)
            for (const prod of sortedProds) {
              const prodNameLower = prod.name.toLowerCase().trim()
              if (lowercaseText.includes(prodNameLower)) {
                // Trouver la quantité précédant le nom, ex: "5 farine de blé"
                const qtyMatch = lowercaseText.match(new RegExp(`(\\d+)\\s*${prodNameLower}`))
                const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1

                const isPurchase = ['purchase_cash', 'purchase_credit'].includes(type)
                const price = isPurchase ? (prod.unit_cost || prod.unit_price) : prod.unit_price

                if (price) {
                  parsedData.articles = [{
                    nom: prod.name,
                    quantite: qty,
                    prix_unitaire: price,
                    unite_vente: prod.unit
                  }]
                  hasPriceUpdated = true
                  break
                }
              }
            }
          }

          // Si un prix par défaut a été appliqué, recalculer le total
          if (hasPriceUpdated) {
            let total = 0
            for (const a of parsedData.articles) {
              total += (a.quantite || 1) * (a.prix_unitaire || 0)
            }
            parsedData.total_facture = total

            const isCredit = ['purchase_credit', 'sale_credit'].includes(type)
            if (isCredit) {
              parsedData.montant_paye = 0
              parsedData.montant_dette = total
            } else {
              parsedData.montant_paye = total
              parsedData.montant_dette = 0
            }
          }
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des prix par défaut du catalogue:', err)
      }
    }

    // 3. Vérification des règles de solvabilité (Anti-solde négatif)
    const currentCash = await getCurrentCash(shopId)
    const isExpense = type === 'cash_out' || type === 'purchase_cash'
    const expenseAmount = parsedData.total_facture

    if (isExpense && currentCash < expenseAmount) {
      return NextResponse.json(
        { 
          error: `Opération bloquée : Solde insuffisant dans le tiroir-caisse. Il vous manque ${expenseAmount - currentCash} FCFA.`,
          isSafeguardTriggered: true 
        },
        { status: 400 }
      )
    }

    // 4. Préparer l'objet transaction
    const saleId = randomUUID()
    const now = new Date()
    const dateStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    const timeStr = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Porto-Novo'
    })

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
      articles: parsedData.articles.map((a) => ({
        name: a.nom,
        quantity: a.quantite,
        unit_price: a.prix_unitaire,
      })),
      created_at: now.toISOString(),
    }

    // 5. Enregistrer dans la base (Supabase ou mock en mémoire)
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
              created_at: now.toISOString(),
            },
          ])

        if (saleError) throw saleError

        // Insérer les articles si existants
        if (parsedData.articles.length > 0) {
          const articlesData = parsedData.articles.map((article) => ({
            id: randomUUID(),
            sale_id: saleId,
            product_name: article.nom,
            quantity: article.quantite,
            unit_price: article.prix_unitaire,
            subtotal: article.quantite * article.prix_unitaire,
            created_at: now.toISOString(),
          }))

          const { error: articlesError } = await supabase
            .from('sold_articles')
            .insert(articlesData)

          if (articlesError) console.error('Erreur Supabase sold_articles:', articlesError)
        }

        // Si crédit client, insérer dans debts
        if (type === 'sale_credit' && parsedData.montant_dette > 0) {
          const { error: debtError } = await supabase
            .from('debts')
            .insert([
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
          if (debtError) console.error('Erreur Supabase debts:', debtError)
        }

        // Si crédit grossiste, insérer dans supplier_debts et supplier_transactions
        if (type === 'purchase_credit' && parsedData.montant_dette > 0) {
          // Insérer transaction
          await supabase
            .from('supplier_transactions')
            .insert([
              {
                id: randomUUID(),
                shop_id: shopId,
                supplier_name: parsedData.nom_client, // Utilise le nom extrait du grossiste
                amount: parsedData.montant_dette,
                description: `Achat à crédit: ${text}`,
                created_at: now.toISOString(),
              }
            ])

          // Mettre à jour solde global
          const { data: currentDebt } = await supabase
            .from('supplier_debts')
            .select('amount_owed')
            .eq('supplier_name', parsedData.nom_client)
            .eq('shop_id', shopId)
            .single()

          if (currentDebt) {
            await supabase
              .from('supplier_debts')
              .update({ amount_owed: currentDebt.amount_owed + parsedData.montant_dette })
              .eq('supplier_name', parsedData.nom_client)
              .eq('shop_id', shopId)
          } else {
            await supabase
              .from('supplier_debts')
              .insert([
                {
                  id: randomUUID(),
                  shop_id: shopId,
                  supplier_name: parsedData.nom_client,
                  amount_owed: parsedData.montant_dette,
                  paid_amount: 0,
                  status: 'pending'
                }
              ])
          }
        }

        // ─── CRÉATION/MISE À JOUR DYNAMIQUE DANS LE CATALOGUE STOCK ───
        const isStockOp = ['purchase_cash', 'purchase_credit', 'cash_in', 'sale_credit'].includes(type)
        if (isStockOp && parsedData.articles.length > 0) {
          for (const article of parsedData.articles) {
            const prodName = article.nom.trim()
            if (!prodName) continue

            // 1. Chercher si le produit existe déjà
            const { data: existingProd } = await supabase
              .from('products')
              .select('*')
              .eq('shop_id', shopId)
              .ilike('name', prodName)
              .maybeSingle()

            const isPurchase = ['purchase_cash', 'purchase_credit'].includes(type)
            const isSale = ['cash_in', 'sale_credit'].includes(type)
            const unit = article.unite_vente || 'unité'
            
            const unitCost = isPurchase ? article.prix_unitaire : undefined
            const unitPrice = article.prix_vente_unitaire || (isSale ? article.prix_unitaire : undefined)

            if (existingProd) {
              const updates: Record<string, any> = {
                updated_at: new Date().toISOString()
              }
              if (unitCost !== undefined && unitCost > 0) updates.unit_cost = unitCost
              if (unitPrice !== undefined && unitPrice > 0) updates.unit_price = unitPrice
              if (article.unite_vente) updates.unit = article.unite_vente
              if (article.seuil_alerte !== undefined) updates.alert_threshold = article.seuil_alerte

              await supabase
                .from('products')
                .update(updates)
                .eq('id', existingProd.id)
                .eq('shop_id', shopId)
            } else {
              await supabase
                .from('products')
                .insert([
                  {
                    id: randomUUID(),
                    shop_id: shopId,
                    name: prodName,
                    category: 'Général',
                    unit: unit,
                    alert_threshold: article.seuil_alerte ?? 5,
                    initial_stock: 0,
                    unit_cost: unitCost ?? 0,
                    unit_price: unitPrice ?? 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }
                ])
            }
          }
        }

        savedInSupabase = true
      } catch (e) {
        console.error('Erreur insertion Supabase, repli sur local:', e)
      }
    }

    // Toujours pousser sur le mock local en cas de repli ou pour tests locaux rapides
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

  } catch (error) {
    console.error('Erreur API POST:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur inconnue' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const shopId = request.headers.get('x-shop-id') || 'default-shop'

    let sales = []

    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('sales')
          .select(`
            id,
            date,
            time,
            client_name,
            total_amount,
            paid_amount,
            debt_amount,
            status,
            type,
            pen_color,
            notes,
            sold_articles:sold_articles(
              product_name,
              quantity,
              unit_price
            )
          `)
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false })

        if (dateParam === 'today') {
          const today = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
          query = query.eq('date', today)
        }

        const { data, error } = await query
        if (error) throw error

        sales = (data || []).map((sale: any) => ({
          id: sale.id,
          date: sale.date,
          time: sale.time,
          client: sale.client_name,
          articles: (sale.sold_articles || []).map((art: any) => ({
            name: art.product_name,
            quantity: art.quantity,
            unit_price: art.unit_price,
          })),
          total: sale.total_amount,
          paid: sale.paid_amount,
          debt: sale.debt_amount,
          status: sale.status,
          type: sale.type,
          pen_color: sale.pen_color,
          notes: sale.notes
        }))
      } catch (e) {
        console.error('Erreur lecture Supabase GET, repli sur local:', e)
        sales = getLocalSales(dateParam, shopId)
      }
    } else {
      sales = getLocalSales(dateParam, shopId)
    }

    return NextResponse.json({ sales })
  } catch (error) {
    console.error('Erreur API GET:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur inconnue' },
      { status: 500 }
    )
  }
}

// Action de Rayer (Cross out) ou d'Ajouter des articles à une transaction
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action } = body
    const shopId = request.headers.get('x-shop-id') || 'default-shop'

    // ─── ACTION : add_article ───────────────────────────────────────────────
    if (action === 'add_article') {
      const { text, penColor } = body as { text: string; penColor: string }

      // 1. Récupérer la transaction existante
      let transaction: any = null
      if (isSupabaseConfigured()) {
        const { data } = await supabase.from('sales').select('*').eq('id', id).eq('shop_id', shopId).single()
        transaction = data
      } else {
        transaction = getLocalDb().find((s: any) => s.id === id && s.shop_id === shopId)
      }

      if (!transaction) {
        return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
      }
      if (transaction.status === 'crossed_out') {
        return NextResponse.json({ error: 'Impossible de modifier une transaction rayée' }, { status: 400 })
      }

      // 2. Parser les nouveaux articles
      const parsed = parseTextLocally(text, penColor || transaction.pen_color || 'blue')
      if (!parsed || !parsed.articles || parsed.articles.length === 0) {
        return NextResponse.json({ error: 'Aucun article reconnu dans la saisie' }, { status: 400 })
      }

      const addedAmount = parsed.total_facture
      const oldTotal = transaction.total_amount ?? 0
      const oldPaid = transaction.paid_amount ?? 0
      const newTotal = oldTotal + addedAmount
      const newPaid = transaction.type === 'cash_in' ? newTotal : oldPaid
      const newDebt = Math.max(0, newTotal - newPaid)

      // Notes mises à jour
      const newNotes = transaction.notes
        ? `${transaction.notes}, ${text}`
        : text

      // 3. Mettre à jour dans Supabase
      if (isSupabaseConfigured()) {
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            total_amount: newTotal,
            paid_amount: newPaid,
            debt_amount: newDebt,
            status: newDebt > 0 ? 'debt' : 'paid',
            notes: newNotes,
          })
          .eq('id', id)
          .eq('shop_id', shopId)

        if (updateError) throw updateError

        // Insérer les nouveaux articles dans sold_articles
        const now = new Date()
        const articlesData = parsed.articles.map((a: any) => ({
          id: randomUUID(),
          sale_id: id,
          product_name: a.nom,
          quantity: a.quantite,
          unit_price: a.prix_unitaire,
          subtotal: a.quantite * a.prix_unitaire,
          created_at: now.toISOString(),
        }))
        await supabase.from('sold_articles').insert(articlesData)
      }

      // 4. Mettre à jour le cache local
      const db = getLocalDb()
      const idx = db.findIndex((s: any) => s.id === id && s.shop_id === shopId)
      if (idx !== -1) {
        const existingArticles = db[idx].articles || []
        const newArticles = parsed.articles.map((a: any) => ({
          name: a.nom,
          quantity: a.quantite,
          unit_price: a.prix_unitaire,
        }))
        db[idx].total_amount = newTotal
        db[idx].paid_amount = newPaid
        db[idx].debt_amount = newDebt
        db[idx].status = newDebt > 0 ? 'debt' : 'paid'
        db[idx].notes = newNotes
        db[idx].articles = [...existingArticles, ...newArticles]
        saveLocalDb(db)
      }

      return NextResponse.json({
        success: true,
        newTotal,
        newPaid,
        newDebt,
        addedArticles: parsed.articles,
      })
    }

    // ─── ACTION : cross_out ─────────────────────────────────────────────────
    if (action !== 'cross_out') {
      return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }

    // 1. Récupérer la transaction
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

    // Si elle est déjà rayée, on ne fait rien
    if (transaction.status === 'crossed_out') {
      return NextResponse.json({ error: 'Transaction déjà rayée' }, { status: 400 })
    }

    // 2. Vérifier si rayer cette vente viole la règle du solde positif du tiroir-caisse
    const currentCash = await getCurrentCash(shopId)
    const cashImpact = calculateSingleTransactionCashImpact(transaction)

    // Si on raye un cash-in (vente), on "retire" du cash. Si le solde devient négatif, on bloque.
    if (cashImpact > 0 && currentCash - cashImpact < 0) {
      return NextResponse.json(
        { 
          error: `Impossible de rayer cette transaction : le solde de votre tiroir-caisse deviendrait négatif (${currentCash - cashImpact} FCFA).`,
          isSafeguardTriggered: true 
        },
        { status: 400 }
      )
    }

    // 3. Effectuer la modification
    if (isSupabaseConfigured()) {
      // Mettre à jour Supabase
      const { error } = await supabase
        .from('sales')
        .update({ status: 'crossed_out' })
        .eq('id', id)
        .eq('shop_id', shopId)

      if (error) throw error

      // Si c'est un crédit client rayé, mettre à jour la table debts
      if (transaction.type === 'sale_credit') {
        await supabase
          .from('debts')
          .update({ status: 'paid', notes: 'Annulé/Rayé' })
          .eq('sale_id', id)
          .eq('shop_id', shopId)
      }
    }

    // Mettre à jour le cache local/mock
    const db = getLocalDb()
    const idx = db.findIndex(s => s.id === id && s.shop_id === shopId)
    if (idx !== -1) {
      db[idx].status = 'crossed_out'
      saveLocalDb(db)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur API PATCH:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur inconnue' },
      { status: 500 }
    )
  }
}


function calculateSingleTransactionCashImpact(item: any): number {
  const type = item.type
  const paid = item.paid_amount ?? item.paid ?? 0
  const total = item.total_amount ?? item.total ?? 0

  if (type === 'cash_in' || type === 'payment_client') {
    return paid // Ajoutait du cash, donc rayer retire ce montant
  } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
    return -total // Retirait du cash, donc rayer remet ce montant (toujours sûr pour le tiroir-caisse)
  }
  return 0
}

function getLocalSales(dateParam: string | null, shopId: string): any[] {
  const salesDatabase = getLocalDb()
  let filtered = salesDatabase.filter(s => s.shop_id === shopId)
  if (dateParam === 'today') {
    const today = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    filtered = filtered.filter(s => s.date === today)
  }
  return filtered.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// Parseur Regex intelligent local
function parseTextLocally(text: string, penColor: string): ParsedSale {
  const articles: any[] = []
  let totalFacture = 0
  
  // Format: [quantité] [nom] à [prix] (ex: "10 mèches à 2000" ou "3 sacs de riz à 12000")
  const hasExplicitSeparator = /(?:^|\s)(?:à|a|@)(?:\s|$)/i.test(text)
  const articleRegex = hasExplicitSeparator
    ? /(\d+)\s*(.*?)\s*(?:à|a|@)\s*(\d+)/gi
    : /(\d+)\s+(.+?)\s+(\d+)/gi
  let match
  
  const packRegex = /de\s+(\d+)\s+([A-Za-zÀ-ÿ]+)/i
  const salePriceRegex = /(?:prix de vente|vente|prix de vente a l'unite|prix de vente a l'unité)\s+(?:de\s+|a\s+|à\s+|@\s+|l'unite\s+|l'unité\s+)*(\d+)/i

  while ((match = articleRegex.exec(text)) !== null) {
    const qty = parseInt(match[1], 10)
    const name = match[2].trim() || "Article(s)"
    const price = parseInt(match[3], 10)

    // Ignorer si c'est un faux positif (ex: la quantité est supérieure ou égale au prix unitaire)
    if (qty > 1 && qty >= price) {
      continue
    }

    const packMatch = name.match(packRegex)
    const salePriceMatch = text.match(salePriceRegex)

    let finalQty = qty
    let finalUnitPrice = price
    let uniteAchat = undefined
    let uniteVente = undefined
    let quantiteParBoite = undefined
    let prixVenteUnitaire = salePriceMatch ? parseInt(salePriceMatch[1], 10) : undefined
    let simplifiedName = name

    if (packMatch) {
      const multiplier = parseInt(packMatch[1], 10)
      uniteVente = packMatch[2].trim()
      quantiteParBoite = multiplier
      
      const firstWord = name.split(/\s+/)[0]
      if (['caissier', 'carton', 'sac', 'boite', 'boîte', 'paquet'].includes(firstWord.toLowerCase())) {
        uniteAchat = firstWord
        simplifiedName = name.replace(new RegExp(`^${firstWord}\\s+(?:de\\s+)?`, 'i'), '')
      }
      
      simplifiedName = simplifiedName.replace(packRegex, '').replace(/\s+de\s*$/, '').trim()
      
      finalQty = qty * multiplier
      finalUnitPrice = Math.round(price / multiplier)
    }

    articles.push({
      nom: simplifiedName,
      quantite: finalQty,
      prix_unitaire: finalUnitPrice,
      unite_achat: uniteAchat,
      unite_vente: uniteVente,
      quantite_par_boite: quantiteParBoite,
      prix_vente_unitaire: prixVenteUnitaire
    })
    totalFacture += qty * price
  }
  
  // Si aucun article détecté, chercher un montant global brut (ex: "depense 5000 transport")
  if (articles.length === 0) {
    const amountRegex = /(?:total|montant|somme|de)?\s*(\d{3,7})(?:\s*f|\s*fcfa|\s*cfa|\s*francs)?/i
    const amountMatch = text.match(amountRegex)
    if (amountMatch) {
      const amount = parseInt(amountMatch[1], 10)
      totalFacture = amount
      articles.push({
        nom: "Transaction générale",
        quantite: 1,
        prix_unitaire: amount
      })
    }
  }

  // Détection du client ou fournisseur
  let nomClient = "Client anonyme"
  const clientRegex = /(?:pour|de|client|grossiste|fournisseur|a)\s+([A-Za-z]+)/i
  const clientMatch = text.match(clientRegex)
  if (clientMatch) {
    nomClient = clientMatch[1].trim()
    // Capitaliser la première lettre
    nomClient = nomClient.charAt(0).toUpperCase() + nomClient.slice(1)
  }

  let montantPaye = totalFacture
  let montantDette = 0

  const payeRegex = /(?:payé|paye|recu|donne)\s+(\d+)/i
  const payeMatch = text.match(payeRegex)
  if (payeMatch) {
    montantPaye = parseInt(payeMatch[1], 10)
  }

  const resteRegex = /(?:reste|dette|credit|dû|du)\s+(\d+)/i
  const resteMatch = text.match(resteRegex)
  if (resteMatch) {
    montantDette = parseInt(resteMatch[1], 10)
    if (penColor === 'yellow' || penColor === 'purple') {
      montantPaye = totalFacture - montantDette
    }
  }

  // Ajustement par défaut en fonction de la couleur du Bic
  if (penColor === 'yellow' || penColor === 'purple') {
    if (!payeMatch && !resteMatch) {
      montantPaye = 0
      montantDette = totalFacture
    } else {
      montantDette = Math.max(0, totalFacture - montantPaye)
    }
  } else {
    montantPaye = totalFacture
    montantDette = 0
  }

  return {
    articles,
    total_facture: totalFacture,
    montant_paye: Math.max(0, montantPaye),
    montant_dette: Math.max(0, montantDette),
    nom_client: nomClient
  }
}

async function parseTextWithOpenAI(text: string, penColor: string): Promise<ParsedSale | null> {
  const systemPrompt = `Tu es un analyseur de transactions de boutique en Afrique de l'Ouest.
Ta mission: convertir du texte libre en JSON structuré.

Règles STRICTES:
1. Le JSON doit TOUJOURS avoir cette EXACTE structure:
{
  "articles": [
    { 
      "nom": "nom_simplifie_du_produit", 
      "quantite": nombre, 
      "prix_unitaire": nombre,
      "unite_achat": "nom_unite_optionnel", 
      "unite_vente": "nom_unite_optionnel", 
      "quantite_par_boite": nombre_optionnel, 
      "prix_vente_unitaire": nombre_optionnel, 
      "seuil_alerte": nombre_optionnel
    }
  ],
  "total_facture": nombre,
  "montant_paye": nombre,
  "montant_dette": nombre,
  "nom_client": "nom"
}

2. Extraction simplifiée et conversion pour le stock :
   - "nom" doit être le nom simplifié du produit sans les contenants ni les multiplicateurs (ex: "Flag" au lieu de "caissier de flag" ou "flag de 12 bouteilles").
   - Si la transaction mentionne un conditionnement multiple (ex: "1 caissier de flag de 12 bouteille", "2 cartons de spaghetti de 20 paquets") :
     * "quantite" doit être converti en unités de vente finales (ex: 1 caissier × 12 bouteilles = 12. 2 cartons × 20 paquets = 40).
     * "prix_unitaire" doit être converti par rapport à l'unité de vente finale (ex: prix d'achat 5900 pour 12 bouteilles = 5900/12 ≈ 492 F).
     * "unite_achat" doit extraire l'unité de gros (ex: "caissier", "carton").
     * "unite_vente" doit extraire l'unité de détail (ex: "bouteille", "paquet").
     * "quantite_par_boite" doit contenir le multiplicateur (ex: 12, 20).
     * "prix_vente_unitaire" doit être extrait si mentionné (ex: "prix de vente a l'unite 600" ou "vente à 600" -> 600).
   - S'il n'y a pas de conditionnement multiple ou de sous-unité mentionné, conserve la quantité et le prix unitaire d'origine, et mets "unite_vente" = "unité".

3. En fonction de la couleur du Bic sélectionné (${penColor}) :
   - bleu: Vente Cash (montant_paye=total_facture, montant_dette=0)
   - rouge: Dépense (montant_paye=total_facture, montant_dette=0)
   - vert: Achat Stock Cash (montant_paye=total_facture, montant_dette=0)
   - violet: Crédit Grossiste (montant_paye=0, montant_dette=total_facture par défaut sauf si paiement partiel écrit)
   - jaune: Crédit Client (montant_paye=0, montant_dette=total_facture par défaut sauf si paiement partiel écrit)

4. Extrais le nom de la personne si mentionné (ex: "Koffi", "Chantal"). Si absent, mets "Client anonyme".
5. Ne RETOURNE que du JSON valide. Pas de texte supplémentaire ni de balises Markdown.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0,
      max_tokens: 500,
    })

    const content = response.choices[0].message.content
    if (!content) return null

    const parsed = JSON.parse(content)
    if (
      !parsed.articles ||
      !Array.isArray(parsed.articles) ||
      typeof parsed.total_facture !== 'number'
    ) {
      return null
    }

    return parsed as ParsedSale
  } catch (error) {
    console.error('Erreur OpenAI, fallback local:', error)
    return null
  }
}
