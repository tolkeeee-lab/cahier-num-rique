import { supabase } from '@/lib/supabase'
import { isSupabaseConfigured } from './cashDrawerCalculator'
import { getLocalDb } from '@/lib/localDb'

export async function feedMarketKnowledge(
  articles: Array<{ nom: string; prix_unitaire: number; [key: string]: any }>,
  transactionType: string,
  _shopId: string,
  country: string = 'BJ',
  city: string | null = null
) {
  if (!isSupabaseConfigured()) return

  const isPurchase = ['purchase_cash', 'purchase_credit'].includes(transactionType)
  const isSale = ['cash_in', 'sale_credit'].includes(transactionType)
  if (!isPurchase && !isSale) return

  for (const article of articles) {
    const name = article.nom?.trim()
    const price = article.prix_unitaire || 0
    if (!name || price <= 0) continue

    await supabase.rpc('update_market_knowledge', {
      p_product_name: name.toLowerCase(),
      p_unit_price: isSale ? price : 0,
      p_unit_cost: isPurchase ? price : 0,
      p_country: country || 'BJ',
      p_city: city || null
    })
  }
}


export function getLocalSales(dateParam: string | null, shopId: string): any[] {
  const salesDatabase = getLocalDb()
  let filtered = salesDatabase.filter(s => s.shop_id === shopId)
  if (dateParam === 'today') {
    const today = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    filtered = filtered.filter(s => s.date === today)
  }
  return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function fetchSalesHistory(dateParam: string | null, shopId: string) {
  if (!isSupabaseConfigured()) {
    return getLocalSales(dateParam, shopId)
  }

  try {
    let query = supabase
      .from('sales')
      .select(`
        id,
        date,
        time,
        client_name,
        total_amount,
        paid_amount,
        debt_amount,
        status,
        type,
        pen_color,
        notes,
        category,
        sold_articles:sold_articles(
          product_name,
          quantity,
          unit_price,
          category
        )
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })

    if (dateParam === 'today') {
      const today = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
      query = query.eq('date', today)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((sale: any) => ({
      id: sale.id,
      date: sale.date,
      time: sale.time,
      client: sale.client_name,
      articles: (sale.sold_articles || []).map((art: any) => ({
        name: art.product_name,
        quantity: art.quantity,
        unit_price: art.unit_price,
        category: art.category || 'Divers'
      })),
      total: sale.total_amount,
      paid: sale.paid_amount,
      debt: sale.debt_amount,
      status: sale.status,
      type: sale.type,
      pen_color: sale.pen_color,
      notes: sale.notes,
      category: sale.category || 'Divers'
    }))
  } catch (e) {
    console.error('Erreur lecture Supabase GET, repli sur local:', e)
    return getLocalSales(dateParam, shopId)
  }
}
