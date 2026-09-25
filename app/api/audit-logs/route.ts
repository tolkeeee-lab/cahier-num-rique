import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getDualShopIds } from '@/lib/shopCodeUtils'
import { requireShopAccess, shopAuthorizationErrorResponse } from '@/lib/server/shopAccess'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url.includes('supabase.co') && key.length > 20
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestedShopId = request.headers.get('x-shop-id') || searchParams.get('shop_id')
  if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
  let shopId: string
  try { shopId = (await requireShopAccess(request, requestedShopId)).shop.id } catch (err) { return shopAuthorizationErrorResponse(err) }
  const actionFilter = searchParams.get('action')
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 200)

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ logs: [], offline: true })
  }

  try {
    const ids = getDualShopIds(shopId)
    const orFilter = ids.length > 1 ? ids.map(id => `shop_id.eq.${id}`).join(',') : `shop_id.eq.${shopId}`

    let query = supabase
      .from('audit_logs')
      .select('*')
      .or(orFilter)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (actionFilter && actionFilter !== 'all') {
      query = query.eq('action', actionFilter)
    }

    const { data, error } = await query

    if (error) {
      console.warn('[API audit-logs] Erreur SELECT:', error.message)
      return NextResponse.json({ logs: [], error: error.message }, { status: 200 })
    }

    return NextResponse.json({ logs: data || [] })
  } catch (err: any) {
    console.error('[API audit-logs] Exception GET:', err)
    return NextResponse.json({ logs: [], error: err.message }, { status: 500 })
  }
}
