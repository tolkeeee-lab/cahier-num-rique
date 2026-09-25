import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getDualShopIds } from '@/lib/shopCodeUtils'
import { requireShopOwner, shopAuthorizationErrorResponse } from '@/lib/server/shopAccess'

export async function POST(request: Request) {
  const requestedShopId = request.headers.get('x-shop-id')
  if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
  let shopId: string
  try { shopId = (await requireShopOwner(request, requestedShopId)).shop.id } catch (err) { return shopAuthorizationErrorResponse(err) }
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    return url.includes('supabase.co') && key.length > 20
  }

  // Vérification de sécurité centralisée ci-dessus.
  /* Ancien contrôle conservé temporairement pour compatibilité de réponse.
  if (isSupabaseConfigured() && token) {
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !user) {
      return NextResponse.json({ error: 'Session invalide ou expirée.' }, { status: 401 })
    }

    const email = (user.email || '').toLowerCase().trim()
    const { data: empRecord } = await supabase
      .from('employees')
      .select('role')
      .eq('shop_id', shopId)
      .eq('email', email)
      .single()

    if (empRecord && (empRecord.role === 'employee' || empRecord.role === 'caissier')) {
      return NextResponse.json(
        { error: 'Action interdite : Seul le propriétaire peut réinitialiser la boutique.' },
        { status: 403 }
      )
    }
  } else if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Authentification requise pour réinitialiser la boutique.' },
      { status: 401 }
    )
  }

  */
  try {
    if (isSupabaseConfigured()) {
      const targetShopIds = getDualShopIds(shopId)

      // 1. Nettoyer sold_articles pour les ventes de cette boutique (tous alias inclus)
      const { data: sales } = await supabase
        .from('sales')
        .select('id')
        .in('shop_id', targetShopIds)

      if (sales && sales.length > 0) {
        const saleIds = sales.map(s => s.id)
        await supabase.from('sold_articles').delete().in('sale_id', saleIds)
      }
      // Nettoyer aussi les éventuels articles orphelins portant directement le shop_id
      await supabase.from('sold_articles').delete().in('shop_id', targetShopIds)

      // 2. Supprimer les ventes
      await supabase.from('sales').delete().in('shop_id', targetShopIds)

      // 3. Supprimer le catalogue de stock
      await supabase.from('products').delete().in('shop_id', targetShopIds)

      // 4. Supprimer les créances clients et dettes grossistes
      await supabase.from('debts').delete().in('shop_id', targetShopIds)
      await supabase.from('supplier_debts').delete().in('shop_id', targetShopIds)

      // 5. Supprimer les clôtures de caisse
      await supabase.from('cash_closings').delete().in('shop_id', targetShopIds)

      // 6. Supprimer les demandes de produits si table présente
      try {
        await supabase.from('requested_products').delete().in('shop_id', targetShopIds)
      } catch {}
    }

    return NextResponse.json({ success: true, message: 'Boutique réinitialisée avec succès' })
  } catch (err: any) {
    console.error('[API/shop/reset POST]', err)
    return NextResponse.json({ error: err?.message || 'Erreur réinitialisation' }, { status: 500 })
  }
}
