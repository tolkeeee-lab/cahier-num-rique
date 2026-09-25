import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireShopOwner, shopAuthorizationErrorResponse } from '@/lib/server/shopAccess'

export async function POST(request: Request) {
  const requestedShopId = request.headers.get('x-shop-id')
  if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
  let shopId: string
  try { shopId = (await requireShopOwner(request, requestedShopId)).shop.id } catch (err) { return shopAuthorizationErrorResponse(err) }

  const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    return url.includes('supabase.co') && key.length > 20
  }

  try {
    if (isSupabaseConfigured()) {
      const altShopId = shopId.startsWith('SHOP-')
        ? shopId.replace(/^SHOP-/i, '')
        : `SHOP-${shopId}`

      // Supprimer uniquement le catalogue des produits pour cette boutique (shopId et altShopId)
      const { error } = await supabase
        .from('products')
        .delete()
        .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)

      if (error) throw error
    }

    return NextResponse.json({ success: true, message: 'Stock produits vidé avec succès' })
  } catch (err: any) {
    console.error('[API/stock/reset POST]', err)
    return NextResponse.json({ error: err?.message || 'Erreur vidage stock' }, { status: 500 })
  }
}
