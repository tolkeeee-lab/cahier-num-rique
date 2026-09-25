import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { stockMergeSchema, validatePayload } from '@/lib/validations'
import { requireShopOwner, shopAuthorizationErrorResponse } from '@/lib/server/shopAccess'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && !url.includes('placeholder') && key && !key.includes('placeholder')
}

export async function POST(request: Request) {
  const requestedShopId = request.headers.get('x-shop-id')
  if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
  let shopId: string
  try { shopId = (await requireShopOwner(request, requestedShopId)).shop.id } catch (err) { return shopAuthorizationErrorResponse(err) }

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
      : shopId.startsWith('BTQ-')
        ? shopId.replace(/^BTQ-/i, 'SHOP-')
        : `SHOP-${shopId}`

    // 1. Récupérer les 2 produits (support shopId et altShopId)
    const { data: sourceProduct, error: err1 } = await supabase
      .from('products')
      .select('*')
      .eq('id', sourceProductId)
      .eq('shop_id', shopId)
      .single()

    const { data: targetProduct, error: err2 } = await supabase
      .from('products')
      .select('*')
      .eq('id', targetProductId)
      .eq('shop_id', shopId)
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
      .eq('shop_id', shopId)

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
        .eq('product_id', sourceProduct.id)

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
    const combinedInitialStock = Number(targetProduct.initial_stock || 0) + Number(sourceProduct.initial_stock || 0)
    const isTracked = targetProduct.stock_tracked || sourceProduct.stock_tracked || combinedInitialStock > 0
    const { data: updatedTarget, error: updateTargetErr } = await supabase
      .from('products')
      .update({
        initial_stock: combinedInitialStock,
        stock_tracked: isTracked,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetProduct.id)
      .eq('shop_id', shopId)
      .select()
      .single()

    if (updateTargetErr) throw updateTargetErr

    // 4. Supprimer le produit doublon source
    const { error: deleteSourceErr } = await supabase
      .from('products')
      .delete()
      .eq('id', sourceProduct.id)
      .eq('shop_id', shopId)

    if (deleteSourceErr) throw deleteSourceErr

    return NextResponse.json({
      success: true,
      message: `Produit « ${sourceProduct.name} » fusionné avec succès dans « ${targetProduct.name } ».`,
      product: updatedTarget,
    })
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return shopAuthorizationErrorResponse(err)
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API/stock/merge POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
