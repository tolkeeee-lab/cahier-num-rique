import { NextRequest, NextResponse } from 'next/server'
import { supabase, isBackendSupabaseConfigured } from '@/lib/supabase'
import { requireShopAccess, shopAuthorizationErrorResponse } from '@/lib/server/shopAccess'
import type { Database } from '@/lib/types/database.types'

type CashClosingRow = Database['public']['Tables']['cash_closings']['Row']
type CashClosingInsert = Database['public']['Tables']['cash_closings']['Insert']

// Utilise la configuration backend officielle importée de @/lib/supabase
const isSupabaseConfigured = isBackendSupabaseConfigured

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestedShopId = request.headers.get('x-shop-id') || searchParams.get('shop_id')
  if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
  let shopId: string
  let targetClient: any = supabase
  try {
    const auth = await requireShopAccess(request, requestedShopId)
    shopId = auth.shop.id
    targetClient = auth.client || supabase
  } catch (err) {
    return shopAuthorizationErrorResponse(err)
  }

  if (!isSupabaseConfigured() || !targetClient) {
    return NextResponse.json({ closings: [], offline: true })
  }

  try {
    const { data, error } = await (targetClient as any)
      .from('cash_closings')
      .select('*')
      .eq('shop_id', shopId)
      .order('date', { ascending: false })
      .limit(60)

    if (error) {
      console.warn('[API cash-closings] Erreur SELECT:', error.message)
      return NextResponse.json({ closings: [], error: error.message }, { status: 200 })
    }

    const typedClosings: CashClosingRow[] = data || []
    return NextResponse.json({ closings: typedClosings })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 401 || status === 403) return shopAuthorizationErrorResponse(err)
    const message = err instanceof Error ? err.message : String(err)
    console.error('[API cash-closings] Exception GET:', message)
    return NextResponse.json({ closings: [], error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const requestedShopId = request.headers.get('x-shop-id') || (typeof body.shop_id === 'string' ? body.shop_id : null)
    if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
    const { shop, client: dbClient } = await requireShopAccess(request, requestedShopId)
    const shopId = shop.id
    const targetClient = dbClient || supabase

    if (!body.date || typeof body.date !== 'string') {
      return NextResponse.json({ error: 'La date est requise pour la clôture de caisse' }, { status: 400 })
    }

    const payload: CashClosingInsert = {
      id: typeof body.id === 'string' ? body.id : undefined,
      shop_id: shopId,
      date: body.date,
      closing_time: typeof body.closing_time === 'string' ? body.closing_time : new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Porto-Novo', hour: '2-digit', minute: '2-digit' }).format(new Date()),
      opening_cash: Number(body.opening_cash) || 0,
      theoretical_cash: Number(body.theoretical_cash) || 0,
      actual_cash: Number(body.actual_cash) || 0,
      difference: Number(body.difference) || 0,
      cash_receipts: Number(body.cash_receipts) || 0,
      expenses: Number(body.expenses) || 0,
      credit_sales: Number(body.credit_sales) || 0,
      notes: typeof body.notes === 'string' ? body.notes : '',
      updated_at: new Date().toISOString()
    }

    if (!isSupabaseConfigured() || !targetClient) {
      return NextResponse.json({ closing: payload, offline: true })
    }

    // Upsert sur la clé unique (shop_id, date)
    const { data, error } = await (targetClient as any)
      .from('cash_closings')
      .upsert(payload, { onConflict: 'shop_id,date' })
      .select()
      .single()

    if (error) {
      console.error('[API cash-closings] Erreur UPSERT:', error)
      return NextResponse.json({ error: error.message, closing: payload }, { status: 200 })
    }

    const typedClosing: CashClosingRow = data
    return NextResponse.json({ closing: typedClosing, success: true })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 401 || status === 403) return shopAuthorizationErrorResponse(err)
    const message = err instanceof Error ? err.message : String(err)
    console.error('[API cash-closings] Exception POST:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
