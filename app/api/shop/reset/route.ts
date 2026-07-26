import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(url && !url.includes('placeholder') && key && !key.includes('placeholder'))
}

export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id')
    if (!shopId) {
      return NextResponse.json({ error: 'Identifiant de boutique (x-shop-id) requis' }, { status: 400 })
    }

    if (isSupabaseConfigured()) {
      // 1. Récupérer les ventes de la boutique pour nettoyer les articles vendus
      const { data: sales } = await supabase
        .from('sales')
        .select('id')
        .eq('shop_id', shopId)

      if (sales && sales.length > 0) {
        const saleIds = sales.map(s => s.id)
        await supabase.from('sold_articles').delete().in('sale_id', saleIds)
        await supabase.from('sales').delete().eq('shop_id', shopId)
      }

      // 2. Supprimer les produits en stock
      await supabase.from('products').delete().eq('shop_id', shopId)

      // 3. Supprimer les dettes clients & fournisseurs
      await supabase.from('debts').delete().eq('shop_id', shopId)
      await supabase.from('supplier_debts').delete().eq('shop_id', shopId)
      await supabase.from('supplier_transactions').delete().eq('shop_id', shopId)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Toutes les données de la boutique ont été réinitialisées avec succès.' 
    })
  } catch (error: any) {
    console.error('Erreur lors de la réinitialisation de la boutique:', error)
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de la réinitialisation de la boutique' 
    }, { status: 500 })
  }
}
