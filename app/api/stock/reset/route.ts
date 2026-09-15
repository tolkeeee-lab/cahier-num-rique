import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const shopId = request.headers.get('x-shop-id') || 'default-shop'
  const userRole = (request.headers.get('x-user-role') || '').toLowerCase().trim()

  // Seul le patron (owner) peut vider le catalogue de stock
  if (userRole === 'employee' || userRole === 'caissier') {
    return NextResponse.json(
      { error: 'Action interdite : Seul le propriétaire peut réinitialiser le stock.' },
      { status: 403 }
    )
  }

  try {
    const isSupabaseConfigured = () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      return url.includes('supabase.co') && key.length > 20
    }

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
