import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('shop_id', shopId)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const requestedShopId = request.headers.get('x-shop-id') || body.shop_id
    if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })

    let shopId: string
    let authUser: any
    try {
      const authResult = await requireShopAccess(request, requestedShopId)
      shopId = authResult.shop.id
      authUser = authResult.user
    } catch (err) {
      return shopAuthorizationErrorResponse(err)
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, offline: true })
    }

    const { action, target_id, details, created_at, user_email } = body

    const { error } = await supabase.from('audit_logs').insert({
      shop_id: shopId,
      user_id: authUser?.id || null,
      user_email: user_email || authUser?.email || null,
      action,
      target_id: target_id || null,
      details: details || {},
      created_at: created_at || new Date().toISOString(),
    })

    if (error) {
      console.warn('[API audit-logs] Erreur INSERT:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API audit-logs] Exception POST:', err)
    return NextResponse.json({ error: err?.message || 'Erreur serveur' }, { status: 500 })
  }
}
