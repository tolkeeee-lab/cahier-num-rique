import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

interface SaleResponse {
  id: string
  date: string
  time: string
  client: string
  articles: Array<{
    name: string
    quantity: number
    unit_price: number
  }>
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt'
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Texte de vente invalide' },
        { status: 400 }
      )
    }

    // Utiliser OpenAI pour parser le texte
    const parsedData = await parseTextWithOpenAI(text)

    if (!parsedData) {
      return NextResponse.json(
        { error: 'Impossible de traiter cette vente. Vérifiez le format.' },
        { status: 400 }
      )
    }

    // Préparer les données
    const saleId = randomUUID()
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    // Insérer la vente
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
          created_at: now.toISOString(),
        },
      ])

    if (saleError) {
      console.error('Erreur Supabase (sales):', saleError)
      throw new Error("Erreur lors de l'enregistrement de la vente")
    }

    // Insérer les articles
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

    if (articlesError) {
      console.error('Erreur Supabase (sold_articles):', articlesError)
      throw new Error("Erreur lors de l'enregistrement des articles")
    }

    // Si il y a une dette, insérer dans la table debts
    if (parsedData.montant_dette > 0) {
      await supabase
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
    }

    const response: SaleResponse = {
      id: saleId,
      date: dateStr,
      time: timeStr,
      client: parsedData.nom_client,
      articles: parsedData.articles.map((a) => ({
        name: a.nom,
        quantity: a.quantite,
        unit_price: a.prix_unitaire,
      })),
      total: parsedData.total_facture,
      paid: parsedData.montant_paye,
      debt: parsedData.montant_dette,
      status: parsedData.montant_dette > 0 ? 'debt' : 'paid',
    }

    return NextResponse.json({ sale: response }, { status: 201 })
  } catch (error) {
    console.error('Erreur API POST:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erreur serveur inconnue',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const clientParam = searchParams.get('client')

    let query = supabase
      .from('sales')
      .select(
        `
        id,
        date,
        time,
        client_name,
        total_amount,
        paid_amount,
        debt_amount,
        status,
        sold_articles:sold_articles(
          product_name,
          quantity,
          unit_price
        )
      `
      )
      .order('created_at', { ascending: false })

    if (dateParam === 'today') {
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('date', today)
    } else if (dateParam) {
      query = query.eq('date', dateParam)
    }

    if (clientParam) {
      query = query.ilike('client_name', `%${clientParam}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erreur Supabase:', error)
      throw new Error('Erreur lors de la lecture des ventes')
    }

    const sales = (data || []).map((sale: any) => ({
      id: sale.id,
      date: sale.date,
      time: sale.time,
      client: sale.client_name,
      articles: (sale.sold_articles || []).map((article: any) => ({
        name: article.product_name,
        quantity: article.quantity,
        unit_price: article.unit_price,
      })),
      total: sale.total_amount,
      paid: sale.paid_amount,
      debt: sale.debt_amount,
      status: sale.status,
    }))

    return NextResponse.json({ sales })
  } catch (error) {
    console.error('Erreur API GET:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erreur serveur inconnue',
      },
      { status: 500 }
    )
  }
}

async function parseTextWithOpenAI(text: string): Promise<ParsedSale | null> {
  const systemPrompt = `Tu es un analyseur de transactions de boutique.
Ta mission: convertir du texte libre en JSON structuré.

Règles STRICTES:
1. Le JSON doit TOUJOURS avoir cette EXACTE structure:
{
  "articles": [
    { "nom": "nom_produit", "quantite": nombre, "prix_unitaire": nombre },
    ...
  ],
  "total_facture": nombre,
  "montant_paye": nombre,
  "montant_dette": nombre,
  "nom_client": "nom"
}

2. Extraction des articles: identifie "quantité × produit × prix unitaire"
3. Calcul du total: somme(quantite × prix_unitaire) pour chaque article
4. Paiement: extrait le montant payé du texte
5. Dette: total_facture - montant_paye (DOIT être >= 0)
6. Client: extrait le nom du client, ou "Client anonyme" par défaut
7. Tous les prix sont des nombres entiers positifs

Ne RETOURNE que du JSON valide. Pas d'explications, pas de texte supplémentaire.
Si impossible de parser, retourne: {"error": "raison"}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0,
      max_tokens: 500,
    })

    const content = response.choices[0].message.content

    if (!content) {
      console.error('Pas de contenu OpenAI')
      return null
    }

    const parsed = JSON.parse(content)

    if (
      !parsed.articles ||
      !Array.isArray(parsed.articles) ||
      typeof parsed.total_facture !== 'number' ||
      typeof parsed.montant_paye !== 'number' ||
      typeof parsed.montant_dette !== 'number' ||
      typeof parsed.nom_client !== 'string'
    ) {
      console.error('Structure JSON invalide:', parsed)
      return null
    }

    return parsed as ParsedSale
  } catch (error) {
    console.error('Erreur OpenAI:', error)
    return null
  }
}
