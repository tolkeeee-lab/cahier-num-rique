import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url.includes('supabase.co') && key.length > 20
}

// ─── GET /api/stock ───────────────────────────────────────────────────────────
// Retourne le catalogue produits + stock calculé depuis les écritures
export async function GET(request: Request) {
  const shopId = request.headers.get('x-shop-id') || 'default-shop'

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ products: [], orphans: [], total: 0, offline: true })
  }

  try {
    // 1. Catalogue des produits
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .order('name')

    if (productsError) throw productsError

    // 2. Toutes les ventes avec leurs articles (non rayées)
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select(`
        id, type, date, notes, status,
        sold_articles ( product_name, quantity, unit_price )
      `)
      .eq('shop_id', shopId)

    if (salesError) throw salesError

    // 3. Calculer les mouvements de stock par nom de produit
    const stockMap: Record<string, {
      total_in: number
      total_out: number
      movements: Array<{ date: string; type: 'in' | 'out'; quantity: number; unit_price: number; notes: string; sale_type: string }>
    }> = {}

    for (const sale of salesData || []) {
      if (sale.status === 'crossed_out') continue
      const isIn = ['purchase_cash', 'purchase_credit'].includes(sale.type)
      const isOut = ['cash_in', 'sale_credit'].includes(sale.type)
      if (!isIn && !isOut) continue

      for (const article of (sale.sold_articles as any[] | null) || []) {
        const key = (article.product_name as string).toLowerCase().trim()
        if (!stockMap[key]) stockMap[key] = { total_in: 0, total_out: 0, movements: [] }

        if (isIn) {
          stockMap[key].total_in += article.quantity
          stockMap[key].movements.push({ date: sale.date, type: 'in', quantity: article.quantity, unit_price: article.unit_price, notes: sale.notes || '', sale_type: sale.type })
        } else {
          stockMap[key].total_out += article.quantity
          stockMap[key].movements.push({ date: sale.date, type: 'out', quantity: article.quantity, unit_price: article.unit_price, notes: sale.notes || '', sale_type: sale.type })
        }
      }
    }

    // 4. Fusionner catalogue + niveaux de stock
    const stockItems = (products || []).map((product: any) => {
      const key = (product.name as string).toLowerCase().trim()
      const data = stockMap[key] || { total_in: 0, total_out: 0, movements: [] }
      const mult = product.multiplier || 1
      const currentStock = ((product.initial_stock || 0) * mult) + data.total_in - data.total_out

      return {
        ...product,
        total_in: data.total_in,
        total_out: data.total_out,
        current_stock: currentStock,
        movements: data.movements
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 20),
      }
    })

    // 5. Articles hors-catalogue (présents dans les écritures mais pas dans le catalogue)
    const catalogNames = new Set((products || []).map((p: any) => (p.name as string).toLowerCase().trim()))
    const orphans = Object.entries(stockMap)
      .filter(([name]) => !catalogNames.has(name))
      .map(([name, data]) => ({
        id: `orphan_${name}`,
        name,
        is_orphan: true,
        total_in: data.total_in,
        total_out: data.total_out,
        current_stock: data.total_in - data.total_out,
        movements: data.movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10),
      }))

    return NextResponse.json({
      products: stockItems,
      orphans,
      total: stockItems.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[API/stock GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── POST /api/stock ──────────────────────────────────────────────────────────
// Crée un nouveau produit dans le catalogue
export async function POST(request: Request) {
  const shopId = request.headers.get('x-shop-id') || 'default-shop'
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Base de données non configurée' }, { status: 503 })
  }
  try {
    const body = await request.json()
    const { name, category, unit, alert_threshold, initial_stock, unit_cost, unit_price, multiplier, packaging_name } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Le nom du produit est obligatoire' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        shop_id: shopId,
        name: name.trim(),
        category: category || 'Général',
        unit: unit || 'unité',
        alert_threshold: alert_threshold ?? 5,
        initial_stock: initial_stock ?? 0,
        unit_cost: unit_cost ?? 0,
        unit_price: unit_price ?? 0,
        multiplier: multiplier ?? 1,
        packaging_name: packaging_name || '',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ product: data }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[API/stock POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── PATCH /api/stock ─────────────────────────────────────────────────────────
// Met à jour un produit existant
export async function PATCH(request: Request) {
  const shopId = request.headers.get('x-shop-id') || 'default-shop'
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Base de données non configurée' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { id, name, category, unit, alert_threshold, initial_stock, unit_cost, unit_price, multiplier, packaging_name } = body

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name.trim()
    if (category !== undefined) updates.category = category
    if (unit !== undefined) updates.unit = unit
    if (alert_threshold !== undefined) updates.alert_threshold = alert_threshold
    if (initial_stock !== undefined) updates.initial_stock = initial_stock
    if (unit_cost !== undefined) updates.unit_cost = unit_cost
    if (unit_price !== undefined) updates.unit_price = unit_price
    if (multiplier !== undefined) updates.multiplier = multiplier
    if (packaging_name !== undefined) updates.packaging_name = packaging_name

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ product: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[API/stock PATCH]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── DELETE /api/stock ────────────────────────────────────────────────────────
// Supprime un produit du catalogue
export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const shopId = request.headers.get('x-shop-id') || url.searchParams.get('shopId') || 'default-shop'

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Base de données non configurée' }, { status: 503 })
  }

  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
  }

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('shop_id', shopId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[API/stock DELETE]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
