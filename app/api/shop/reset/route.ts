import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const shopId = request.headers.get('x-shop-id') || 'default-shop'
  const userRole = (request.headers.get('x-user-role') || '').toLowerCase().trim()

  // Seul le patron (owner) peut réinitialiser une boutique, interdiction formelle pour les employés
  if (userRole === 'employee' || userRole === 'caissier') {
    return NextResponse.json(
      { error: 'Action interdite : Seul le propriétaire peut réinitialiser la boutique.' },
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

      // 1. Nettoyer sold_articles pour les ventes de cette boutique (shopId et altShopId)
      const { data: sales } = await supabase
        .from('sales')
        .select('id')
        .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)

      if (sales && sales.length > 0) {
        const saleIds = sales.map(s => s.id)
        await supabase.from('sold_articles').delete().in('sale_id', saleIds)
      }
      // Nettoyer aussi les éventuels articles orphelins portant directement le shop_id
      await supabase.from('sold_articles').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)

      // 2. Supprimer les ventes
      await supabase.from('sales').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)

      // 3. Supprimer le catalogue de stock
      await supabase.from('products').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)

      // 4. Supprimer les créances clients et dettes grossistes
      await supabase.from('debts').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)
      await supabase.from('supplier_debts').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)

      // 5. Supprimer les clôtures de caisse
      await supabase.from('cash_closings').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)

      // 6. Supprimer les demandes de produits si table présente
      try {
        await supabase.from('requested_products').delete().or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)
      } catch {}
    }

    return NextResponse.json({ success: true, message: 'Boutique réinitialisée avec succès' })
  } catch (err: any) {
    console.error('[API/shop/reset POST]', err)
    return NextResponse.json({ error: err?.message || 'Erreur réinitialisation' }, { status: 500 })
  }
}
