import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import OpenAI from 'openai'
import { randomUUID } from 'crypto'

// Mock database en mémoire en cas d'absence de Supabase
let salesDatabase: any[] = []

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
  }>
  total_facture: number
  montant_paye: number
  montant_dette: number
  nom_client: string
}

// Calcule le solde actuel du tiroir-caisse (Cash)
async function getCurrentCash(): Promise<number> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('type, paid_amount, total_amount, status')
        .neq('status', 'crossed_out')

      if (error) throw error
      return calculateCash(data || [])
    } catch (e) {
      console.error('Erreur lecture cash Supabase, repli sur local:', e)
    }
  }
  return calculateCash(salesDatabase)
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
    const { text, penColor } = await request.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Texte de transaction invalide' },
        { status: 400 }
      )
    }

    const color = penColor || 'blue'

    // 1. Parser le texte (IA ou Regex local)
    let parsedData: ParsedSale | null = null
    const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'mock-key-for-build'

    if (hasApiKey) {
      parsedData = await parseTextWithOpenAI(text, color)
    }

    // Fallback sur le parseur Regex local si pas de clé ou si l'IA échoue
    if (!parsedData) {
      parsedData = parseTextLocally(text, color)
    }

    // 2. Déterminer le type de transaction
    // blue=Vente, red=Dépense, green=Achat Stock, purple=Dette Grossiste, yellow=Crédit Client
    let type = 'cash_in'
    if (color === 'red') type = 'cash_out'
    else if (color === 'green') type = 'purchase_cash'
    else if (color === 'purple') type = 'purchase_credit'
    else if (color === 'yellow') type = 'sale_credit'

    // 3. Vérification des règles de solvabilité (Anti-solde négatif)
    const currentCash = await getCurrentCash()
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
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const newSale = {
      id: saleId,
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
            .single()

          if (currentDebt) {
            await supabase
              .from('supplier_debts')
              .update({ amount_owed: currentDebt.amount_owed + parsedData.montant_dette })
              .eq('supplier_name', parsedData.nom_client)
          } else {
            await supabase
              .from('supplier_debts')
              .insert([
                {
                  id: randomUUID(),
                  supplier_name: parsedData.nom_client,
                  amount_owed: parsedData.montant_dette,
                  paid_amount: 0,
                  status: 'pending'
                }
              ])
          }
        }

        savedInSupabase = true
      } catch (e) {
        console.error('Erreur insertion Supabase, repli sur local:', e)
      }
    }

    // Toujours pousser sur le mock local en cas de repli ou pour tests locaux rapides
    salesDatabase.push(newSale)

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
          .order('created_at', { ascending: false })

        if (dateParam === 'today') {
          const today = new Date().toISOString().split('T')[0]
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
        sales = getLocalSales(dateParam)
      }
    } else {
      sales = getLocalSales(dateParam)
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

// Action de Rayer (Cross out) une transaction
export async function PATCH(request: NextRequest) {
  try {
    const { id, action } = await request.json()

    if (action !== 'cross_out') {
      return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }

    // 1. Récupérer la transaction
    let transaction: any = null
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('sales').select('*').eq('id', id).single()
      transaction = data
    } else {
      transaction = salesDatabase.find(s => s.id === id)
    }

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
    }

    // Si elle est déjà rayée, on ne fait rien
    if (transaction.status === 'crossed_out') {
      return NextResponse.json({ error: 'Transaction déjà rayée' }, { status: 400 })
    }

    // 2. Vérifier si rayer cette vente viole la règle du solde positif du tiroir-caisse
    const currentCash = await getCurrentCash()
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

      if (error) throw error

      // Si c'est un crédit client rayé, mettre à jour la table debts
      if (transaction.type === 'sale_credit') {
        await supabase
          .from('debts')
          .update({ status: 'paid', notes: 'Annulé/Rayé' })
          .eq('sale_id', id)
      }
    }

    // Mettre à jour le cache local/mock
    const idx = salesDatabase.findIndex(s => s.id === id)
    if (idx !== -1) {
      salesDatabase[idx].status = 'crossed_out'
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

function getLocalSales(dateParam: string | null): any[] {
  let filtered = [...salesDatabase]
  if (dateParam === 'today') {
    const today = new Date().toISOString().split('T')[0]
    filtered = filtered.filter(s => s.date === today)
  }
  return filtered.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// Parseur Regex intelligent local
function parseTextLocally(text: string, penColor: string): ParsedSale {
  const articles: any[] = []
  let totalFacture = 0
  
  // Format: [quantité] [nom] à [prix] (ex: "10 mèches à 2000" ou "3 sacs de riz à 12000")
  const articleRegex = /(\d+)\s+([^0-9àa@\s][^0-9àa@]*?)\s+(?:à|a|@)\s+(\d+)/gi
  let match
  
  while ((match = articleRegex.exec(text)) !== null) {
    const qty = parseInt(match[1], 10)
    const name = match[2].trim()
    const price = parseInt(match[3], 10)
    articles.push({
      nom: name,
      quantite: qty,
      prix_unitaire: price
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
    { "nom": "nom_produit", "quantite": nombre, "prix_unitaire": nombre }
  ],
  "total_facture": nombre,
  "montant_paye": nombre,
  "montant_dette": nombre,
  "nom_client": "nom"
}

2. En fonction de la couleur du Bic sélectionné (${penColor}) :
   - bleu: Vente Cash (montant_paye=total_facture, montant_dette=0)
   - rouge: Dépense (montant_paye=total_facture, montant_dette=0)
   - vert: Achat Stock Cash (montant_paye=total_facture, montant_dette=0)
   - violet: Crédit Grossiste (montant_paye=0, montant_dette=total_facture par défaut sauf si paiement partiel écrit)
   - jaune: Crédit Client (montant_paye=0, montant_dette=total_facture par défaut sauf si paiement partiel écrit)

3. Extrais le nom de la personne si mentionné (ex: "Koffi", "Chantal"). Si absent, mets "Client anonyme".
4. Ne RETOURNE que du JSON valide. Pas de texte supplémentaire.`

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
