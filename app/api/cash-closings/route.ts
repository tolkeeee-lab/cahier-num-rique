import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getDualShopIds } from '@/lib/shopCodeUtils'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url.includes('supabase.co') && key.length > 20
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shopId = request.headers.get('x-shop-id') || searchParams.get('shop_id') || 'default-shop'

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ closings: [], offline: true })
  }

  try {
    const ids = getDualShopIds(shopId)
    const orFilter = ids.length > 1 ? ids.map(id => `shop_id.eq.${id}`).join(',') : `shop_id.eq.${shopId}`

    const { data, error } = await supabase
      .from('cash_closings')
      .select('*')
      .or(orFilter)
      .order('date', { ascending: false })
      .limit(60)

    if (error) {
      console.warn('[API cash-closings] Erreur SELECT:', error.message)
      return NextResponse.json({ closings: [], error: error.message }, { status: 200 })
    }

    return NextResponse.json({ closings: data || [] })
  } catch (err: any) {
    console.error('[API cash-closings] Exception GET:', err)
    return NextResponse.json({ closings: [], error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const shopId = request.headers.get('x-shop-id') || body.shop_id || 'default-shop'

    if (!body.date) {
      return NextResponse.json({ error: 'La date est requise pour la clôture de caisse' }, { status: 400 })
    }

    const payload = {
      id: body.id || undefined,
      shop_id: shopId,
      date: body.date,
      closing_time: body.closing_time || new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Porto-Novo', hour: '2-digit', minute: '2-digit' }).format(new Date()),
      opening_cash: Number(body.opening_cash) || 0,
      theoretical_cash: Number(body.theoretical_cash) || 0,
      actual_cash: Number(body.actual_cash) || 0,
      difference: Number(body.difference) || 0,
      cash_receipts: Number(body.cash_receipts) || 0,
      expenses: Number(body.expenses) || 0,
      credit_sales: Number(body.credit_sales) || 0,
      notes: body.notes || '',
      updated_at: new Date().toISOString()
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ closing: payload, offline: true })
    }

    // Upsert sur la clé unique (shop_id, date)
    const { data, error } = await supabase
      .from('cash_closings')
      .upsert(payload, { onConflict: 'shop_id,date' })
      .select()
      .single()

    if (error) {
      console.error('[API cash-closings] Erreur UPSERT:', error)
      return NextResponse.json({ error: error.message, closing: payload }, { status: 200 })
    }

    return NextResponse.json({ closing: data, success: true })
  } catch (err: any) {
    console.error('[API cash-closings] Exception POST:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
