import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { stockMergeSchema, validatePayload } from '@/lib/validations'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && !url.includes('placeholder') && key && !key.includes('placeholder')
}

export async function POST(request: Request) {
  const shopId = request.headers.get('x-shop-id') || 'default-shop'
  const userRole = (request.headers.get('x-user-role') || '').toLowerCase().trim()

  if (userRole === 'employee' || userRole === 'caissier') {
    return NextResponse.json(
      { error: 'Action interdite : Seul le propriétaire peut fusionner des produits du catalogue.' },
      { status: 403 }
    )
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Base de données distante non configurée' }, { status: 503 })
  }
  try {
    const rawBody = await request.json()
    const validation = validatePayload(stockMergeSchema, rawBody)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { sourceProductId, targetProductId } = validation.data

    if (sourceProductId === targetProductId) {
      return NextResponse.json({ error: 'Impossible de fusionner un produit avec lui-même' }, { status: 400 })
    }

    const altShopId = shopId.startsWith('SHOP-')
      ? shopId.replace(/^SHOP-/i, '')
      : `SHOP-${shopId}`

    // 1. Récupérer les 2 produits (support shopId et altShopId)
    const { data: sourceProduct, error: err1 } = await supabase
      .from('products')
      .select('*')
      .eq('id', sourceProductId)
      .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)
      .single()

    const { data: targetProduct, error: err2 } = await supabase
      .from('products')
      .select('*')
      .eq('id', targetProductId)
      .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)
      .single()

    if (err1 || !sourceProduct) {
      return NextResponse.json({ error: 'Produit source introuvable' }, { status: 404 })
    }
    if (err2 || !targetProduct) {
      return NextResponse.json({ error: 'Produit cible introuvable' }, { status: 404 })
    }

    // 2. Mettre à jour les articles vendus (sold_articles) associés pour cette boutique
    const { data: shopSales } = await supabase
      .from('sales')
      .select('id')
      .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)

    const saleIds = (shopSales || []).map(s => s.id)
    if (saleIds.length > 0) {
      const { error: updateArticlesErr } = await supabase
        .from('sold_articles')
        .update({
          product_id: targetProduct.id,
          product_name: targetProduct.name,
          product_name_canonical: targetProduct.name,
        })
        .in('sale_id', saleIds)
        .or(`product_id.eq.${sourceProduct.id},product_name.ilike.${sourceProduct.name}`)

      if (updateArticlesErr) {
        console.warn('[Merge] Remarque lors de la màj des sold_articles:', updateArticlesErr.message)
      }
    }

    try {
      await supabase
        .from('sold_articles')
        .update({
          product_id: targetProduct.id,
          product_name: targetProduct.name,
          product_name_canonical: targetProduct.name,
        })
        .eq('product_id', sourceProduct.id)
    } catch {}

    // 3. Consolider le stock initial du produit cible (si le produit source avait du stock)
    const combinedInitialStock = (targetProduct.initial_stock || 0) + (sourceProduct.initial_stock || 0)
    const { data: updatedTarget, error: updateTargetErr } = await supabase
      .from('products')
      .update({
        initial_stock: combinedInitialStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetProduct.id)
      .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)
      .select()
      .single()

    if (updateTargetErr) throw updateTargetErr

    // 4. Supprimer le produit doublon source
    const { error: deleteSourceErr } = await supabase
      .from('products')
      .delete()
      .eq('id', sourceProduct.id)
      .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)

    if (deleteSourceErr) throw deleteSourceErr

    return NextResponse.json({
      success: true,
      message: `Produit « ${sourceProduct.name} » fusionné avec succès dans « ${targetProduct.name} ».`,
      product: updatedTarget,
    })
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API/stock/merge POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
