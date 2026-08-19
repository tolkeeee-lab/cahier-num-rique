import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const shopId = request.headers.get('x-shop-id') || 'default-shop'

  try {
    const isSupabaseConfigured = () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      return url.includes('supabase.co') && key.length > 20
    }

    if (isSupabaseConfigured()) {
      // Supprimer uniquement le catalogue des produits pour cette boutique
      const { error } = await supabase.from('products').delete().eq('shop_id', shopId)
      if (error) throw error
    }

    return NextResponse.json({ success: true, message: 'Stock produits vidé avec succès' })
  } catch (err: any) {
    console.error('[API/stock/reset POST]', err)
    return NextResponse.json({ error: err?.message || 'Erreur vidage stock' }, { status: 500 })
  }
}
