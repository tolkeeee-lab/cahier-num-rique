import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import OpenAI from 'openai'
import { randomUUID } from 'crypto'
import { getLocalDb, saveLocalDb } from '@/lib/localDb'
import { normalizeProductName, adjustLotRoundingArtifact } from '@/lib/productUtils'

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
    categorie?: string
  }>
  total_facture: number
  montant_paye: number
  montant_dette: number
  nom_client: string
  categorie?: string
}

function cleanProductName(name: string): string {
  return normalizeProductName(name)
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

// ─── ALIMENTATION DE LA BASE DE CONNAISSANCE COLLECTIVE (anonymisée) ───
// Appelée après chaque transaction réussie. Ne bloque jamais la réponse utilisateur.
async function feedMarketKnowledge(
  articles: Array<{ nom: string; prix_unitaire: number; [key: string]: any }>,
  transactionType: string,
  _shopId: string,
  country: string = 'CI',
  city: string | null = null
) {
  if (!isSupabaseConfigured()) return

  const isPurchase = ['purchase_cash', 'purchase_credit'].includes(transactionType)
  const isSale = ['cash_in', 'sale_credit'].includes(transactionType)
  if (!isPurchase && !isSale) return

  for (const article of articles) {
    const name = article.nom?.trim()
    const price = article.prix_unitaire || 0
    if (!name || price <= 0) continue

    await supabase.rpc('update_market_knowledge', {
      p_product_name: name.toLowerCase(),
      p_unit_price: isSale ? price : 0,
      p_unit_cost: isPurchase ? price : 0,
      p_country: country || 'CI',
      p_city: city || null
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, penColor, overrideData } = await request.json()
    const shopId = request.headers.get('x-shop-id') || 'default-shop'
    const shopActivity = request.headers.get('x-shop-activity') || 'boutique'
    const shopCountry = request.headers.get('x-shop-country') || 'CI'
    const shopCity = request.headers.get('x-shop-city') || null

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
        nom_client: overrideData.client_name || overrideData.nom_client || "Client anonyme",
        categorie: overrideData.category || overrideData.categorie || 'Divers'
      }
    } else {
      const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'mock-key-for-build'
      // Nettoyer les espaces, points et virgules uniquement pour les séparateurs de milliers (ex: "12 000" ou "12.000" -> "12000")
      let sanitizedText = text.trim()
      let prevSanitized = ""
      while (sanitizedText !== prevSanitized) {
        prevSanitized = sanitizedText
        sanitizedText = sanitizedText.replace(/(\d)[.,\s]+(\d{3})(?!\d)/g, "$1$2")
      }

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
                let price = isPurchase ? (prod.unit_cost || prod.unit_price) : prod.unit_price
                let calculatedTotal = 0

                if (!isPurchase && prod.lot_quantity > 1 && prod.lot_price > 0 && qty >= prod.lot_quantity) {
                  const numLots = Math.floor(qty / prod.lot_quantity)
                  const remainder = qty % prod.lot_quantity
                  calculatedTotal = (numLots * prod.lot_price) + (remainder * (prod.unit_price || 0))
                  price = prod.unit_price || Math.round(calculatedTotal / qty)
                } else if (price) {
                  calculatedTotal = qty * price
                }

                if (calculatedTotal > 0 || price > 0) {
                  parsedData.articles = [{
                    nom: prod.name,
                    quantite: qty,
                    prix_unitaire: price,
                    unite_vente: prod.unit
                  }]
                  parsedData.total_facture = calculatedTotal
                  hasPriceUpdated = true
                  break
                }
              }
            }
          }

          // Si un prix par défaut a été appliqué, s'assurer que total_facture est exact
          if (hasPriceUpdated) {
            if (!parsedData.total_facture || parsedData.total_facture === 0) {
              let total = 0
              for (const a of parsedData.articles) {
                total += (a.quantite || 1) * (a.prix_unitaire || 0)
              }
              parsedData.total_facture = Math.round(total)
            } else {
              parsedData.total_facture = Math.round(parsedData.total_facture)
            }

            const total = parsedData.total_facture
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

    // 3.b Vérification du stock disponible (Anti-vente en rupture de stock)
    const isSaleOp = type === 'cash_in' || type === 'sale_credit'
    if (isSaleOp && parsedData && parsedData.articles && parsedData.articles.length > 0) {
      if (isSupabaseConfigured()) {
        try {
          const { data: dbProducts } = await supabase
            .from('products')
            .select('*')
            .eq('shop_id', shopId)

          if (dbProducts && dbProducts.length > 0) {
            const { data: salesData } = await supabase
              .from('sales')
              .select(`
                id, type, status,
                sold_articles ( product_name, quantity )
              `)
              .eq('shop_id', shopId)

            const stockMap: Record<string, { total_in: number; total_out: number }> = {}
            for (const sale of salesData || []) {
              if (sale.status === 'crossed_out') continue
              const isIn = ['purchase_cash', 'purchase_credit'].includes(sale.type)
              const isOut = ['cash_in', 'sale_credit'].includes(sale.type)
              if (!isIn && !isOut) continue

              for (const art of (sale.sold_articles as any[] | null) || []) {
                const rawName = (art.product_name as string) || ''
                if (!rawName.trim()) continue
                const cleanNameKey = normalizeProductName(rawName).toLowerCase().trim()
                if (!stockMap[cleanNameKey]) stockMap[cleanNameKey] = { total_in: 0, total_out: 0 }
                if (isIn) stockMap[cleanNameKey].total_in += art.quantity
                else stockMap[cleanNameKey].total_out += art.quantity
              }
            }

            for (const article of parsedData.articles) {
              const cleanArtName = normalizeProductName(article.nom)
              const key = cleanArtName.toLowerCase().trim()

              const matchedProd = dbProducts.find(
                p => normalizeProductName(p.name).toLowerCase().trim() === key ||
                     p.name.toLowerCase().trim().includes(key) ||
                     key.includes(p.name.toLowerCase().trim())
              )

              if (matchedProd) {
                const hasInitialStock = (matchedProd.initial_stock || 0) > 0
                const hasPurchases = (stockMap[key]?.total_in || 0) > 0
                const stockTracked = matchedProd.stock_tracked ?? (hasInitialStock || hasPurchases)
                const isUnlimited = matchedProd.is_service || matchedProd.category === 'Cuisine'

                if (stockTracked && !isUnlimited) {
                  const data = stockMap[key] || { total_in: 0, total_out: 0 }
                  const currentStock = (matchedProd.initial_stock || 0) + data.total_in - data.total_out
                  const requestedQty = article.quantite || 1

                  if (currentStock <= 0 || currentStock < requestedQty) {
                    return NextResponse.json(
                      {
                        error: `Opération bloquée : Le produit "${matchedProd.name}" est en rupture de stock (Stock disponible : ${Math.max(0, currentStock)}, Quantité demandée : ${requestedQty}). Veuillez réapprovisionner le stock avant d'effectuer cette vente.`,
                        isSafeguardTriggered: true
                      },
                      { status: 400 }
                    )
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('Erreur lors de la vérification du stock Supabase:', err)
        }
      }
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
      category: parsedData.categorie || 'Divers',
      articles: parsedData.articles.map((a) => ({
        name: a.nom,
        quantity: a.quantite,
        unit_price: a.prix_unitaire,
        category: a.categorie || 'Divers',
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
              category: parsedData.categorie || 'Divers',
              created_at: now.toISOString(),
            },
          ])

        if (saleError) throw saleError

        // Insérer les articles si existants avec résolution de catalogue intelligente
        if (parsedData.articles.length > 0) {
          // Charger le catalogue produits existant
          const { data: dbProducts } = await supabase
            .from('products')
            .select('*')
            .eq('shop_id', shopId)

          const productsList = dbProducts || []
          const articlesData = []

          for (const article of parsedData.articles) {
            const cleanName = cleanProductName(article.nom)
            if (!cleanName) continue

            let productId: string | null = null
            let canonicalName = normalizeProductName(cleanName)

            // 1. Recherche de correspondance exacte (insensible à la casse)
            let matchedProd = productsList.find(
              p => p.name.toLowerCase().trim() === cleanName.toLowerCase().trim()
            )

            // 2. Recherche par fuzzy matching ou synonymes
            if (!matchedProd) {
              matchedProd = productsList.find(p => {
                const prodNameLower = p.name.toLowerCase().trim()
                const cleanLower = cleanName.toLowerCase().trim()
                return prodNameLower.includes(cleanLower) || cleanLower.includes(prodNameLower)
              })
            }

            const isPurchaseOp = ['purchase_cash', 'purchase_credit'].includes(type)

            if (matchedProd) {
              productId = matchedProd.id
              canonicalName = matchedProd.name
              // Mettre à jour le coût d'achat unitaire si c'est une opération d'achat
              if (isPurchaseOp && article.prix_unitaire > 0) {
                await supabase
                  .from('products')
                  .update({ unit_cost: article.prix_unitaire })
                  .eq('id', matchedProd.id)
              }
            } else {
              // 3. Si c'est une boutique et que c'est une opération d'achat/stockage, on l'ajoute au catalogue products
              if (shopActivity === 'boutique' && isPurchaseOp) {
                const newProdId = randomUUID()
                const dbCategory = article.categorie || 'Divers'
                const unitCostVal = article.prix_unitaire || 0
                const unitPriceVal = article.prix_vente_unitaire || 0
                const { error: insertProdErr } = await supabase
                  .from('products')
                  .insert([
                    {
                      id: newProdId,
                      shop_id: shopId,
                      name: cleanName,
                      unit_price: unitPriceVal,
                      unit_cost: unitCostVal,
                      initial_stock: 0,
                      alert_threshold: 5,
                      category: dbCategory,
                      created_at: now.toISOString(),
                    }
                  ])
                if (!insertProdErr) {
                  productId = newProdId
                  // L'ajouter localement à la liste pour les prochains articles de la même boucle
                  productsList.push({
                    id: newProdId,
                    shop_id: shopId,
                    name: cleanName,
                    unit_price: unitPriceVal,
                    unit_cost: unitCostVal,
                    category: dbCategory
                  } as any)
                }
              }
            }

            articlesData.push({
              id: randomUUID(),
              sale_id: saleId,
              product_id: productId,
              product_name: canonicalName,
              product_name_raw: article.nom,
              product_name_canonical: canonicalName,
              quantity: article.quantite,
              unit_price: article.prix_unitaire,
              subtotal: parsedData.articles.length === 1 && parsedData.total_facture > 0
                ? Math.round(parsedData.total_facture)
                : Math.round((article.quantite || 1) * (article.prix_unitaire || 0)),
              category: article.categorie || 'Divers',
              created_at: now.toISOString(),
            })
          }

          if (articlesData.length > 0) {
            const { error: articlesError } = await supabase
              .from('sold_articles')
              .insert(articlesData)

            if (articlesError) console.error('Erreur Supabase sold_articles:', articlesError)
          }
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
            
            const unitCost = isPurchase ? article.prix_unitaire : undefined
            const unitPrice = article.prix_vente_unitaire || (isSale && (!existingProd.unit_price || existingProd.unit_price === 0) ? article.prix_unitaire : undefined)

            if (existingProd) {
              const updates: Record<string, any> = {
                updated_at: new Date().toISOString()
              }
              if (unitCost !== undefined && unitCost > 0) updates.unit_cost = unitCost
              if (unitPrice !== undefined && unitPrice > 0 && (article.prix_vente_unitaire || !existingProd.unit_price)) {
                updates.unit_price = unitPrice
              }
              if (article.unite_vente && !existingProd.unit) updates.unit = article.unite_vente
              if (article.seuil_alerte !== undefined) updates.alert_threshold = article.seuil_alerte

              if (Object.keys(updates).length > 1) {
                await supabase
                  .from('products')
                  .update(updates)
                  .eq('id', existingProd.id)
                  .eq('shop_id', shopId)
              }
            }
          }
        }

        // ─── ALIMENTATION DE LA BASE DE CONNAISSANCE COLLECTIVE ───
        // Chaque transaction valide nourrit silencieusement la connaissance de marché (anonymisée)
        if (parsedData.articles.length > 0) {
          feedMarketKnowledge(parsedData.articles, type, shopId, shopCountry, shopCity).catch(err =>
            console.warn('[market_knowledge] Erreur non bloquante:', err)
          )
        }

        savedInSupabase = true
      } catch (e: any) {
        console.error('Erreur insertion Supabase:', e)
        const isNetworkError = e.message?.includes('fetch failed') || e.message?.includes('ENOTFOUND') || e.details?.includes('ENOTFOUND')
        if (!isNetworkError) {
          throw new Error(e.message || e.details || (typeof e === 'string' ? e : JSON.stringify(e)))
        }
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

  } catch (error: any) {
    console.error('Erreur API POST:', error)
    const msg = error instanceof Error ? error.message : (error && typeof error === 'object' && ('message' in error || 'details' in error) ? (error.message || error.details) : String(error))
    return NextResponse.json(
      { error: msg },
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
            category,
            sold_articles:sold_articles(
              product_name,
              quantity,
              unit_price,
              category
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
            category: art.category || 'Divers'
          })),
          total: sale.total_amount,
          paid: sale.paid_amount,
          debt: sale.debt_amount,
          status: sale.status,
          type: sale.type,
          pen_color: sale.pen_color,
          notes: sale.notes,
          category: sale.category || 'Divers'
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

    // ─── ACTION : update_sale (remplacement complet d'articles/quantités) ─────
    if (action === 'update_sale') {
      const { articles: newArticlesInput, clientName: newClientName } = body as {
        articles: Array<{ name: string; quantity: number; unit_price: number }>
        clientName?: string
      }

      if (!newArticlesInput || !Array.isArray(newArticlesInput) || newArticlesInput.length === 0) {
        return NextResponse.json({ error: 'La vente doit contenir au moins un article' }, { status: 400 })
      }

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

      // 2. Calculer le nouveau total
      let newTotal = 0
      const formattedArticles = newArticlesInput.map(a => {
        const q = Math.max(1, Number(a.quantity) || 1)
        const p = Math.max(0, Number(a.unit_price) || 0)
        newTotal += q * p
        return {
          name: a.name.trim(),
          quantity: q,
          unit_price: p
        }
      })

      const isCashIn = transaction.type === 'cash_in'
      const isSaleCredit = transaction.type === 'sale_credit'
      let newPaid = isCashIn ? newTotal : (transaction.paid_amount ?? 0)
      if (newPaid > newTotal) newPaid = newTotal
      const newDebt = isSaleCredit ? Math.max(0, newTotal - newPaid) : 0
      const newStatus = (newDebt > 0 && isSaleCredit) ? 'debt' : 'paid'

      const newNotes = formattedArticles.map(a => a.unit_price > 0 ? `${a.quantity} ${a.name} à ${a.unit_price}` : `${a.quantity} ${a.name}`).join(', ')
      const newClient = newClientName ? newClientName.trim() : (transaction.client_name || 'Client anonyme')

      // 3. Mettre à jour dans Supabase
      if (isSupabaseConfigured()) {
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            total_amount: newTotal,
            paid_amount: newPaid,
            debt_amount: newDebt,
            status: newStatus,
            notes: newNotes,
            client_name: newClient
          })
          .eq('id', id)
          .eq('shop_id', shopId)

        if (updateError) throw updateError

        // Remplacer les articles dans sold_articles
        await supabase.from('sold_articles').delete().eq('sale_id', id)
        const now = new Date()
        const articlesData = formattedArticles.map((a: any) => ({
          id: randomUUID(),
          sale_id: id,
          product_name: a.name,
          quantity: a.quantity,
          unit_price: a.unit_price,
          subtotal: a.quantity * a.unit_price,
          created_at: now.toISOString(),
        }))
        await supabase.from('sold_articles').insert(articlesData)
      }

      // 4. Mettre à jour le cache local
      const db = getLocalDb()
      const idx = db.findIndex((s: any) => s.id === id && s.shop_id === shopId)
      if (idx !== -1) {
        db[idx].total_amount = newTotal
        db[idx].paid_amount = newPaid
        db[idx].debt_amount = newDebt
        db[idx].status = newStatus
        db[idx].notes = newNotes
        db[idx].client_name = newClient
        db[idx].articles = formattedArticles
        saveLocalDb(db)
      }

      return NextResponse.json({
        success: true,
        sale: {
          id,
          total: newTotal,
          paid: newPaid,
          debt: newDebt,
          status: newStatus,
          notes: newNotes,
          client: newClient,
          articles: formattedArticles
        }
      })
    }

    // ─── ACTION : update_category ───────────────────────────────────────────
    if (action === 'update_category') {
      const { category } = body as { category: string }
      if (!category) {
        return NextResponse.json({ error: 'La catégorie est obligatoire' }, { status: 400 })
      }

      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('sales')
          .update({ category })
          .eq('id', id)
          .eq('shop_id', shopId)

        if (error) throw error
      }

      // Mettre à jour le cache local/mock
      const db = getLocalDb()
      const idx = db.findIndex(s => s.id === id && s.shop_id === shopId)
      if (idx !== -1) {
        db[idx].category = category
        saveLocalDb(db)
      }

      return NextResponse.json({ success: true })
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
  
  // Nettoyage des virgules, points et points-virgules de fin de chaîne
  const rawCleaned = text.replace(/[,;\.\s]+$/, '').trim()

  // Découper si plusieurs articles sont séparés par des virgules ou retours à la ligne (ex: "2 Beaufort à 360, 3 oeufs à 275")
  const segments = rawCleaned.includes('\n') 
    ? rawCleaned.split('\n')
    : (/,/g.test(rawCleaned) && /\d/.test(rawCleaned) ? rawCleaned.split(',') : [rawCleaned])

  for (const seg of segments) {
    const cleanedText = seg.replace(/[,;\.\s]+$/, '').trim()
    if (!cleanedText) continue

    // ─── REGEX PATTERNS UNIFIÉS : PETITS PRIX & VENTES PAR LOT ───
    // 1. Détection "3 pour 250 oeufs"
    const lotPourRegex = /^(\d+)\s+(?:pour|a|à)?\s*(\d{2,6})\s*(?:f|fcfa|cfa|francs)?\s+(.+)$/i
    
    // 2. Détection "3 oeufs 275", "3 oeufs 250", "3 oeufs à 275", "3 oeufs 275F", "1 kopiko 25"
    const qtyItemPriceRegex = /^(\d+)\s+([A-Za-zÀ-ÿ0-9\s'-]+?)\s+(?:à|a|@|pour)?\s*(\d{1,6})\s*(?:f|fcfa|cfa|francs)?$/i

    // 3. Détection sans quantité "kopiko 25", "super mint 50F", "Beaufort 360,"
    const singleItemNoQtyRegex = /^([A-Za-zÀ-ÿ0-9\s'-]+?)\s*(?:à|a|@|pour)?\s*(\d{1,6})\s*(?:f|fcfa|cfa|francs)?$/i

    const hasExplicitSeparator = /(?:^|\s)(?:à|a|@)(?:\s|$)/i.test(cleanedText)

    let segmentMatched = false

    // TEST 1 : Format "3 pour 250F oeufs"
    const matchLotPour = cleanedText.match(lotPourRegex)
    if (matchLotPour) {
      const qty = parseInt(matchLotPour[1], 10)
      const lotPrice = parseInt(matchLotPour[2], 10)
      const prodName = matchLotPour[3].trim()

      if (qty >= 1 && !isNaN(lotPrice) && lotPrice > 0) {
        const unitPrice = Math.round(lotPrice / qty)
        articles.push({
          nom: normalizeProductName(prodName),
          quantite: qty,
          prix_unitaire: unitPrice
        })
        totalFacture += lotPrice
        segmentMatched = true
      }
    }

    // TEST 2 : Format "3 oeufs 275", "3 oeufs 250", "3 oeufs à 275", "1 kopiko 25"
    if (!segmentMatched) {
      const matchQtyItemPrice = cleanedText.match(qtyItemPriceRegex)
      if (matchQtyItemPrice) {
        const qty = parseInt(matchQtyItemPrice[1], 10)
        const prodName = matchQtyItemPrice[2].trim()
        const givenPrice = parseInt(matchQtyItemPrice[3], 10)

        if (prodName && isNaN(Number(prodName)) && !['demande', 'stock', 'achat', 'recette'].includes(prodName.toLowerCase())) {
          const hasPourOrLot = /(?:^|\s)(?:pour|lot)(?:\s|$)/i.test(cleanedText)
          const isLotPrice = hasPourOrLot
          let lotTotal = isLotPrice ? givenPrice : (qty * givenPrice)
          lotTotal = adjustLotRoundingArtifact(qty, givenPrice, lotTotal)
          const unitPrice = isLotPrice ? Math.round(givenPrice / qty) : givenPrice

          articles.push({
            nom: normalizeProductName(prodName),
            quantite: qty,
            prix_unitaire: unitPrice
          })
          totalFacture += lotTotal
          segmentMatched = true
        }
      }
    }

    // TEST 3 : Saisie directe sans quantité (ex: "kopiko 25", "super mint 50F", "Beaufort 360,")
    if (!segmentMatched) {
      const matchSingleNoQty = cleanedText.match(singleItemNoQtyRegex)
      if (matchSingleNoQty) {
        const prodName = matchSingleNoQty[1].trim()
        const price = parseInt(matchSingleNoQty[2], 10)

        if (prodName && isNaN(Number(prodName)) && !['demande', 'stock', 'achat', 'recette'].includes(prodName.toLowerCase())) {
          articles.push({
            nom: normalizeProductName(prodName),
            quantite: 1,
            prix_unitaire: price
          })
          totalFacture += price
          segmentMatched = true
        }
      }
    }

    // TEST 4 : Traitement Regex standard pour articles multiples ou saisies classiques
    if (!segmentMatched) {
      const articleRegex = hasExplicitSeparator
        ? /(\d+)\s*(.*?)\s*(?:à|a|@)\s*(\d+)/gi
        : /(\d+)\s+(.+?)\s+(\d+)/gi
      const packRegex = /de\s+(\d+)\s+([A-Za-zÀ-ÿ]+)/i
      const salePriceRegex = /(?:prix de vente|vente|prix de vente a l'unite|prix de vente a l'unité)\s+(?:de\s+|a\s+|à\s+|@\s+|l'unite\s+|l'unité\s+)*(\d+)/i

      let match: RegExpExecArray | null
      while ((match = articleRegex.exec(cleanedText)) !== null) {
        const qty = parseInt(match[1], 10)
        const name = match[2].trim() || "Article(s)"
        const price = parseInt(match[3], 10)

        const hasPourOrLot = /(?:^|\s)(?:pour|lot)(?:\s|$)/i.test(cleanedText)
        const isLotSale = hasPourOrLot

        const packMatch = name.match(packRegex)
        const salePriceMatch = cleanedText.match(salePriceRegex)

        let finalQty = qty
        let finalUnitPrice = isLotSale ? Math.round(price / qty) : price
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
        const segmentTotal = isLotSale ? price : (qty * price)
        totalFacture += adjustLotRoundingArtifact(finalQty, finalUnitPrice, segmentTotal)
      }
    }
  }
  
  // Si aucun article détecté, chercher un montant global brut (ex: "depense 5000 transport" ou "50F")
  if (articles.length === 0) {
    const amountRegex = /(?:total|montant|somme|de)?\s*(\d{2,7})(?:\s*f|\s*fcfa|\s*cfa|\s*francs)?/i
    const amountMatch = rawCleaned.match(amountRegex)
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

  let category = 'Divers'
  if (penColor === 'red') {
    const textLower = text.toLowerCase()
    if (textLower.includes('loyer') || textLower.includes('boutique') || textLower.includes('emplacement') || textLower.includes('magasin')) {
      category = 'Loyer'
    } else if (
      textLower.includes('cie') || 
      textLower.includes('sodeci') || 
      textLower.includes('courant') || 
      textLower.includes('lumiere') || 
      textLower.includes('internet') || 
      textLower.includes('wifi') || 
      textLower.includes('electricite') || 
      textLower.includes('eau') || 
      textLower.includes('credit') || 
      textLower.includes('abonnement') || 
      textLower.includes('recharge')
    ) {
      category = 'Factures'
    } else if (
      textLower.includes('carburant') || 
      textLower.includes('essence') || 
      textLower.includes('taxi') || 
      textLower.includes('transport') || 
      textLower.includes('livraison') || 
      textLower.includes('voyage') || 
      textLower.includes('deplacement') || 
      textLower.includes('gbaka')
    ) {
      category = 'Transport'
    } else if (
      textLower.includes('salaire') || 
      textLower.includes('ration') || 
      textLower.includes('bonus') || 
      textLower.includes('paie') || 
      textLower.includes('employe') || 
      textLower.includes('travailleur') || 
      textLower.includes('manoeuvre')
    ) {
      category = 'Salaires'
    } else if (
      textLower.includes('emballage') || 
      textLower.includes('sac') || 
      textLower.includes('sachet') || 
      textLower.includes('plastique') || 
      textLower.includes('nettoyage') || 
      textLower.includes('balai') || 
      textLower.includes('fourniture') || 
      textLower.includes('cahier') || 
      textLower.includes('stylo')
    ) {
      category = 'Fournitures'
    } else if (
      textLower.includes('manger') || 
      textLower.includes('repas') || 
      textLower.includes('nourriture') || 
      textLower.includes('midi') || 
      textLower.includes('dejeuner') || 
      textLower.includes('cafe') || 
      textLower.includes('the') || 
      textLower.includes('pain')
    ) {
      category = 'Repas'
    }
  }

  return {
    articles,
    total_facture: totalFacture,
    montant_paye: Math.max(0, montantPaye),
    montant_dette: Math.max(0, montantDette),
    nom_client: nomClient,
    categorie: category
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
      "seuil_alerte": nombre_optionnel,
      "categorie": "nom_categorie_produit"
    }
  ],
  "total_facture": nombre,
  "montant_paye": nombre,
  "montant_dette": nombre,
  "nom_client": "nom",
  "categorie": "nom_categorie_depense_globale"
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
   - Si la vente mentionne des quantités fractionnées ou des poids/volumes partiels (ex: "250g de riz", "500g", "0.5L", "demi litre d'huile", "quart d'huile") :
     * Convertis "quantite" en décimal par rapport à l'unité principale (ex: "250g" -> quantite=0.25, unite_vente="kg" | "500g" -> quantite=0.5, unite_vente="kg" | "demi litre" -> quantite=0.5, unite_vente="litre" | "quart" -> quantite=0.25, unite_vente="litre").

3. RÈGLE IMPÉRATIVE PRIX SANS QUANTITÉ ET VENTES PAR LOT :
   - Si la quantité n'est pas écrite explicitement (ex: "super mint 50F", "super mint à 50", "super mint 50", "eau fifa 100f") :
     * Considère "quantite" = 1 et "prix_unitaire" = 50 (ou 100).
     * Ne renvoie JAMAIS total_facture = 0 pour ces saisies !
   - Si la transaction est une Vente par Lot (ex: "3 super mint 50F", "3 super mint pour 50F", "3 pour 50F super mint") :
     * Le prix indiqué (ex: 50 FCFA) est le PRIX TOTAL DU LOT (total_facture = 50 F), et NON un prix unitaire à multiplier !
     * "quantite" = 3, "prix_unitaire" = 17 (soit 50 / 3).
   - Si et seulement si la transaction écrit explicitement "à" ou "@" (ex: "3 super mint à 50F" ou "3 x super mint à 50"), alors total_facture = 3 × 50 = 150 F.

4. En fonction de la couleur du Bic sélectionné (${penColor}) :
   - bleu: Vente Cash (montant_paye=total_facture, montant_dette=0)
   - rouge: Dépense (montant_paye=total_facture, montant_dette=0)
   - vert: Achat Stock Cash (montant_paye=total_facture, montant_dette=0)
   - violet: Crédit Grossiste (montant_paye=0, montant_dette=total_facture par défaut sauf si paiement partiel écrit)
   - jaune: Crédit Client (montant_paye=0, montant_dette=total_facture par défaut sauf si paiement partiel écrit)

4. Extrais le nom de la personne si mentionné (ex: "Koffi", "Chantal"). Si absent, mets "Client anonyme".
5. Si le Bic est rouge ('red'), choisis la 'categorie' de la dépense globale (Loyer, Factures, Transport, Salaires, Fournitures, Repas, ou Divers). Sinon, mets "Divers".
6. Pour CHAQUE article dans le tableau "articles", tu dois lui associer une "categorie" de produit uniquement parmi : "Alimentation" (riz, spaghetti, sucre, farine, biscuits, huile...), "Boissons" (bière, soda, eau, jus, coca, fanta, castel...), "Hygiène & Cosmétique" (savon, omo, shampoing, parfum, dentifrice...), "Électronique" (téléphone, crédit mobile, chargeur, piles...), "Habillement" (vêtement, pagne, chaussures...), ou "Divers" (autre chose).
7. Ne RETOURNE que du JSON valide. Pas de texte supplémentaire ni de balises Markdown.`

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
