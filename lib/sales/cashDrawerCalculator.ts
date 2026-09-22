export const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(url && !url.includes('placeholder') && key && !key.includes('placeholder'))
}

export function getItemCashDelta(item: any): number {
  if (!item || item.status === 'crossed_out') return 0
  const type = item.type
  const rawPaid = Number(item.paid_amount ?? item.paid ?? 0)
  const rawTotal = Number(item.total_amount ?? item.total ?? 0)
  const paid = Number.isFinite(rawPaid) ? rawPaid : 0
  const total = Number.isFinite(rawTotal) ? rawTotal : 0

  if (type === 'cash_in' || type === 'payment_client' || type === 'sale' || type === 'sale_cash' || type === 'purchase_return') {
    return paid > 0 ? paid : (type === 'cash_in' || type === 'sale' || type === 'purchase_return' ? total : 0)
  }
  if (type === 'sale_credit') {
    return paid > 0 ? paid : 0
  }
  if (type === 'cash_out' || type === 'purchase_cash' || type === 'sale_return') {
    return -(total > 0 ? total : paid)
  }
  if (type === 'payment_supplier') {
    return -(paid > 0 ? paid : total)
  }
  if (type === 'purchase_credit') {
    return -(paid > 0 ? paid : 0)
  }
  if (type === 'cash_adjustment') {
    const textSources: string[] = []
    if (item.notes) textSources.push(item.notes)
    if (item.client || item.client_name) textSources.push(item.client || item.client_name)
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

    const amount = (paid > 0 ? paid : total)
    return isPositive ? amount : -amount
  }

  // Fallback par stylo si le type n'est pas standard
  if (item.pen_color === 'blue') {
    return paid > 0 ? paid : total
  }
  if (item.pen_color === 'red' || item.pen_color === 'green') {
    return -(total > 0 ? total : paid)
  }
  if (item.pen_color === 'purple') {
    return -(paid > 0 ? paid : 0)
  }
  if (item.pen_color === 'yellow') {
    return paid > 0 ? paid : 0
  }

  return 0
}

export function calculateCash(list: any[]): number {
  const sum = (list || []).reduce((acc, item) => {
    const delta = getItemCashDelta(item)
    return acc + (Number.isFinite(delta) ? delta : 0)
  }, 0)
  return Math.round(sum * 100) / 100
}

export async function getCurrentCash(shopId: string): Promise<number> {
  const { getDualShopIds } = await import('@/lib/shopCodeUtils')
  const targetShopIds = getDualShopIds(shopId)
  const orFilter = targetShopIds.length > 1
    ? targetShopIds.map(id => `shop_id.eq.${id}`).join(',')
    : `shop_id.eq.${shopId}`

  if (isSupabaseConfigured()) {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data, error } = await supabase
        .from('sales')
        .select('type, paid_amount, total_amount, status, notes, client_name, pen_color')
        .or(orFilter)

      if (error) throw error
      return calculateCash(data || [])
    } catch (e) {
      console.error('Erreur lecture cash Supabase, repli sur local:', e)
    }
  }
  if (typeof window !== 'undefined') {
    try {
      const { getOfflineSales } = await import('@/lib/offlineDb')
      const mergedMap = new Map()
      for (const id of targetShopIds) {
        for (const s of getOfflineSales(id)) {
          if (s?.id) mergedMap.set(s.id, s)
        }
      }
      return calculateCash(Array.from(mergedMap.values()))
    } catch {
      return 0
    }
  } else {
    try {
      const { getLocalDb } = await import('@/lib/localDb')
      const validSet = new Set(targetShopIds)
      return calculateCash(getLocalDb().filter(s => validSet.has(s.shop_id)))
    } catch {
      return 0
    }
  }
}

