import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const shopId = request.headers.get('x-shop-id') || 'default-shop'
  try {
    const { sourceProductId, targetProductId } = await request.json()

    if (!sourceProductId || !targetProductId) {
      return NextResponse.json({ error: 'IDs de produit source et cible obligatoires' }, { status: 400 })
    }

    if (sourceProductId === targetProductId) {
      return NextResponse.json({ error: 'Impossible de fusionner un produit avec lui-même' }, { status: 400 })
    }

    // 1. Récupérer les 2 produits
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

    // 2. Mettre à jour les articles vendus (sold_articles) associés au nom ou à l'ID source
    const { error: updateArticlesErr } = await supabase
      .from('sold_articles')
      .update({
        product_id: targetProduct.id,
        product_name: targetProduct.name,
        product_name_canonical: targetProduct.name,
      })
      .or(`product_id.eq.${sourceProduct.id},product_name.ilike.${sourceProduct.name}`)

    if (updateArticlesErr) {
      console.warn('[Merge] Remarque lors de la màj des sold_articles:', updateArticlesErr.message)
    }

    // 3. Consolider le stock initial du produit cible (si le produit source avait du stock)
    const combinedInitialStock = (targetProduct.initial_stock || 0) + (sourceProduct.initial_stock || 0)
    const { data: updatedTarget, error: updateTargetErr } = await supabase
      .from('products')
      .update({
        initial_stock: combinedInitialStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetProduct.id)
      .select()
      .single()

    if (updateTargetErr) throw updateTargetErr

    // 4. Supprimer le produit doublon source
    const { error: deleteSourceErr } = await supabase
      .from('products')
      .delete()
      .eq('id', sourceProduct.id)

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
