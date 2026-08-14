import { supabase } from '@/lib/supabase'
import { getLocalDb } from '@/lib/localDb'

export const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(url && !url.includes('placeholder') && key && !key.includes('placeholder'))
}

export function calculateCash(list: any[]): number {
  let cash = 0
  for (const item of list) {
    if (item.status === 'crossed_out') continue
    const type = item.type
    const paid = item.paid_amount ?? item.paid ?? 0
    const total = item.total_amount ?? item.total ?? 0

    if (type === 'cash_in' || type === 'payment_client') {
      cash += paid
    } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
      cash -= total
    } else if (type === 'cash_adjustment') {
      const textSources: string[] = []
      if (item.notes) textSources.push(item.notes)
      if (item.client) textSources.push(item.client)
      if (item.articles && Array.isArray(item.articles)) {
        item.articles.forEach((a: any) => {
          if (a.name) textSources.push(a.name)
          if (a.nom) textSources.push(a.nom)
        })
      }
      const combinedText = textSources.join(' ').toLowerCase()

      const isRetrait = combinedText.includes('retrait') || combinedText.includes('sortie') || combinedText.includes('ecart: -') || combinedText.includes('écart: -')
      const isApport = combinedText.includes('apport') || combinedText.includes('fond de caisse') || combinedText.includes('depot') || combinedText.includes('dépôt') || combinedText.includes('ecart: +') || combinedText.includes('écart: +')

      let isPositive = true
      if (isRetrait) isPositive = false
      else if (isApport) isPositive = true
      else isPositive = item.pen_color !== 'red'

      if (isPositive) cash += (paid || total)
      else cash -= (paid || total)
    }
  }
  return cash
}

export async function getCurrentCash(shopId: string): Promise<number> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('type, paid_amount, total_amount, status, notes, client_name, pen_color')
        .eq('shop_id', shopId)

      if (error) throw error
      return calculateCash(data || [])
    } catch (e) {
      console.error('Erreur lecture cash Supabase, repli sur local:', e)
    }
  }
  return calculateCash(getLocalDb().filter(s => s.shop_id === shopId))
}
