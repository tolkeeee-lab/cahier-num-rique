import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { normalizeProductName, sanitizeProductData } from '@/lib/productUtils'

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
        id, type, date, notes, status, created_at,
        sold_articles ( product_name, quantity, unit_price )
      `)
      .eq('shop_id', shopId)

    if (salesError) throw salesError

    // 3. Calculer les mouvements de stock par nom de produit
    const stockMap: Record<string, {
      total_in: number
      total_out: number
      movements: Array<{ date: string; created_at: string; type: 'in' | 'out'; quantity: number; unit_price: number; notes: string; sale_type: string }>
    }> = {}

    for (const sale of salesData || []) {
      if (sale.status === 'crossed_out') continue
      const isIn = ['purchase_cash', 'purchase_credit'].includes(sale.type)
      const isOut = ['cash_in', 'sale_credit'].includes(sale.type)
      if (!isIn && !isOut) continue

      for (const article of (sale.sold_articles as any[] | null) || []) {
        const rawName = (article.product_name as string) || ''
        if (!rawName.trim()) continue
        const cleanName = normalizeProductName(rawName)
        const key = cleanName.toLowerCase().trim()
        if (!stockMap[key]) stockMap[key] = { total_in: 0, total_out: 0, movements: [] }

        if (isIn) {
          stockMap[key].total_in += article.quantity
          stockMap[key].movements.push({ 
            date: sale.date, 
            created_at: sale.created_at, 
            type: 'in', 
            quantity: article.quantity, 
            unit_price: article.unit_price, 
            notes: `${article.quantity} ${cleanName} à ${article.unit_price} F`, 
            sale_type: sale.type 
          })
        } else {
          stockMap[key].total_out += article.quantity
          stockMap[key].movements.push({ 
            date: sale.date, 
            created_at: sale.created_at, 
            type: 'out', 
            quantity: article.quantity, 
            unit_price: article.unit_price, 
            notes: `${article.quantity} ${cleanName} à ${article.unit_price} F`, 
            sale_type: sale.type 
          })
        }
      }
    }

    // 4. Fusionner catalogue + niveaux de stock (avec normalisation canonique)
    const stockItems = (products || []).map((product: any) => {
      const cleanName = normalizeProductName(product.name)
      const key = cleanName.toLowerCase().trim()
      const data = stockMap[key] || { total_in: 0, total_out: 0, movements: [] }
      
      const hasInitialStock = (product.initial_stock || 0) > 0
      const hasPurchases = data.movements.some((m: any) => m.type === 'in')
      const stockTracked = product.stock_tracked || hasInitialStock || hasPurchases

      // Déterminer le timestamp à partir duquel le suivi est actif
      let trackingStart = 0
      if (product.tracking_started_at) {
        trackingStart = new Date(product.tracking_started_at).getTime()
      } else if (hasInitialStock && product.created_at) {
        trackingStart = new Date(product.created_at).getTime()
      }

      // Si le stock N'EST PAS suivi, les anciennes ventes ne réduisent pas le stock
      const filteredMovements = data.movements.filter((m: any) => {
        if (!stockTracked) return false
        if (trackingStart === 0) return true
        const mTime = m.created_at ? new Date(m.created_at).getTime() : new Date(m.date).getTime()
        // Conserver les mouvements postérieurs à la date d'activation du suivi (moins 1 minute de marge)
        return mTime >= trackingStart - 60000
      })

      // Recalculer les totaux d'entrées et de sorties après filtrage
      const totalIn = filteredMovements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.quantity, 0)
      const totalOut = filteredMovements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.quantity, 0)

      const mult = product.multiplier || 1
      const isUnlimited = product.is_service || product.category === 'Cuisine'
      
      const rawStock = ((product.initial_stock || 0) + totalIn - totalOut)
      
      const currentStock = isUnlimited 
        ? 0 
        : stockTracked
          ? Math.max(0, rawStock)
          : 0

      // Auto-correction : Si unit_cost a été accidentellement enregistré avec le prix du carton complet (ex: 10000 F au lieu de 333 F)
      let cleanUnitCost = product.unit_cost || 0
      if (mult > 1 && cleanUnitCost > (product.unit_price || 0) && (product.unit_price || 0) > 0) {
        cleanUnitCost = Math.round(cleanUnitCost / mult)
      }
      const isFakeCost = cleanUnitCost === Math.round((product.unit_price || 0) * 0.6) || cleanUnitCost === Math.round((product.unit_price || 0) * 0.7)
      if (!stockTracked || (isFakeCost && !hasPurchases)) {
        cleanUnitCost = 0
      }

      return sanitizeProductData({
        ...product,
        name: cleanName,
        unit_cost: cleanUnitCost,
        total_in: totalIn,
        total_out: stockTracked ? totalOut : 0,
        current_stock: currentStock,
        is_unlimited: isUnlimited,
        stock_tracked: stockTracked,
        movements: data.movements
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 20),
      })
    })

    // 5. Articles hors-catalogue (présents dans les écritures mais pas dans le catalogue)
    const catalogKeys = new Set((products || []).map((p: any) => normalizeProductName(p.name).toLowerCase().trim()))
    const orphans = Object.entries(stockMap)
      .filter(([key]) => !catalogKeys.has(key))
      .map(([key, data]) => {
        const cleanName = normalizeProductName(key)
        return {
          id: `orphan_${key}`,
          name: cleanName,
          is_orphan: true,
          total_in: data.total_in,
          total_out: data.total_out,
          current_stock: data.total_in - data.total_out,
          movements: data.movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10),
        }
      })

    return NextResponse.json({
      products: stockItems,
      orphans,
      total: stockItems.length,
    })
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : (err && typeof err === 'object' && ('message' in err || 'details' in err) ? (err.message || err.details) : String(err))
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
    const { name, category, unit, alert_threshold, initial_stock, unit_cost, unit_price, multiplier, packaging_name, is_service, lot_quantity, lot_price, created_at } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Le nom du produit est obligatoire' }, { status: 400 })
    }

    const canonicalName = normalizeProductName(name)

    const insertData: Record<string, any> = sanitizeProductData({
      shop_id: shopId,
      name: canonicalName,
      category: category || 'Général',
      unit: unit || 'unité',
      alert_threshold: alert_threshold ?? 5,
      initial_stock: initial_stock ?? 0,
      unit_cost: unit_cost ?? 0,
      unit_price: unit_price ?? 0,
      multiplier: multiplier ?? 1,
      packaging_name: packaging_name || '',
      is_service: is_service ?? false,
      lot_quantity: lot_quantity ?? 0,
      lot_price: lot_price ?? 0,
    })

    if (created_at) {
      insertData.created_at = created_at
    }

    const { data, error } = await supabase
      .from('products')
      .insert(insertData)
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
    const { id, name, category, unit, alert_threshold, initial_stock, unit_cost, unit_price, multiplier, packaging_name, is_service, lot_quantity, lot_price } = body

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    let updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name.trim()
    if (category !== undefined) updates.category = category
    if (unit !== undefined) updates.unit = unit
    if (alert_threshold !== undefined) updates.alert_threshold = alert_threshold
    if (initial_stock !== undefined) {
      updates.initial_stock = initial_stock
      if (initial_stock > 0) {
        updates.stock_tracked = true
        updates.tracking_started_at = new Date().toISOString()
      }
    }
    if (body.stock_tracked !== undefined) {
      updates.stock_tracked = body.stock_tracked
      if (body.stock_tracked) {
        updates.tracking_started_at = new Date().toISOString()
      }
    }
    if (unit_cost !== undefined) updates.unit_cost = unit_cost
    if (unit_price !== undefined) updates.unit_price = unit_price
    if (multiplier !== undefined) updates.multiplier = multiplier
    if (packaging_name !== undefined) updates.packaging_name = packaging_name
    if (is_service !== undefined) updates.is_service = is_service
    if (lot_quantity !== undefined) updates.lot_quantity = lot_quantity
    if (lot_price !== undefined) updates.lot_price = lot_price

    updates = sanitizeProductData(updates as any)

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
