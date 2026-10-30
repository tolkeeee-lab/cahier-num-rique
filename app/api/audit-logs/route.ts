import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireShopAccess, shopAuthorizationErrorResponse } from '@/lib/server/shopAccess'
import type { Database, Json } from '@/lib/types/database.types'

type AuditLogRow = Database['public']['Tables']['audit_logs']['Row']
type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']

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

    const typedLogs: AuditLogRow[] = data || []
    return NextResponse.json({ logs: typedLogs })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 401 || status === 403) return shopAuthorizationErrorResponse(err)
    const message = err instanceof Error ? err.message : String(err)
    console.error('[API audit-logs] Exception GET:', message)
    return NextResponse.json({ logs: [], error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const requestedShopId = request.headers.get('x-shop-id') || (typeof body.shop_id === 'string' ? body.shop_id : null)
    if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })

    let shopId: string
    let authUserId: string | null = null
    let authUserEmail: string | null = null
    try {
      const authResult = await requireShopAccess(request, requestedShopId)
      shopId = authResult.shop.id
      authUserId = authResult.user.id
      authUserEmail = authResult.user.email || null
    } catch (err) {
      return shopAuthorizationErrorResponse(err)
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, offline: true })
    }

    const action = typeof body.action === 'string' ? body.action : 'unknown'
    const targetId = typeof body.target_id === 'string' ? body.target_id : null
    const details = (body.details && typeof body.details === 'object' ? body.details : {}) as Json
    const createdAt = typeof body.created_at === 'string' ? body.created_at : new Date().toISOString()
    const userEmail = typeof body.user_email === 'string' ? body.user_email : authUserEmail

    const payload: AuditLogInsert = {
      shop_id: shopId,
      user_id: authUserId,
      user_email: userEmail,
      action,
      target_id: targetId,
      details,
      created_at: createdAt,
    }

    const { error } = await supabase.from('audit_logs').insert(payload)

    if (error) {
      console.warn('[API audit-logs] Erreur INSERT:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 401 || status === 403) return shopAuthorizationErrorResponse(err)
    const message = err instanceof Error ? err.message : String(err)
    console.error('[API audit-logs] Exception POST:', message)
    return NextResponse.json({ error: message || 'Erreur serveur' }, { status: 500 })
  }
}
