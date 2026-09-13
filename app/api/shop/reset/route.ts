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
      // 1. Nettoyer sold_articles pour les ventes de cette boutique
      const { data: sales } = await supabase.from('sales').select('id').eq('shop_id', shopId)
      if (sales && sales.length > 0) {
        const saleIds = sales.map(s => s.id)
        await supabase.from('sold_articles').delete().in('sale_id', saleIds)
      }

      // 2. Supprimer les ventes
      await supabase.from('sales').delete().eq('shop_id', shopId)

      // 3. Supprimer le catalogue de stock
      await supabase.from('products').delete().eq('shop_id', shopId)

      // 4. Supprimer les créances clients et dettes grossistes
      await supabase.from('debts').delete().eq('shop_id', shopId)
      await supabase.from('supplier_debts').delete().eq('shop_id', shopId)

      // 5. Supprimer les clôtures de caisse
      await supabase.from('cash_closings').delete().eq('shop_id', shopId)
    }

    return NextResponse.json({ success: true, message: 'Boutique réinitialisée avec succès' })
  } catch (err: any) {
    console.error('[API/shop/reset POST]', err)
    return NextResponse.json({ error: err?.message || 'Erreur réinitialisation' }, { status: 500 })
  }
}
