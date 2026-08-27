/**
 * shopCodeUtils.ts — Formate et résout les codes courts de boutique (ex: BTQ-58C54)
 */

/**
 * Normalise un code boutique (ex: "SHOP-58C54" -> "58C54", "BTQ-58C54" -> "58C54")
 */
export function normalizeShopCode(shopId: string): string {
  if (!shopId) return ''
  return shopId.trim().toUpperCase().replace(/^(BTQ-|SHOP-)/i, '')
}

/**
 * Formate un UUID long ou un code SHOP- en un code boutique court, chic et mémorisable (ex: BTQ-58C54)
 */
export function formatShortShopCode(shopId: string): string {
  if (!shopId) return 'BTQ-00000'
  if (shopId.startsWith('BTQ-')) return shopId.toUpperCase()
  if (shopId.startsWith('SHOP-')) return shopId.replace(/^SHOP-/i, 'BTQ-').toUpperCase()
  
  // Extraire les 5 premiers caractères hexadécimaux de l'UUID
  const clean = shopId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()
  return `BTQ-${clean || '00000'}`
}

/**
 * Trouve l'ID réel de la boutique à partir du code saisi (BTQ-58C54, SHOP-58C54 ou UUID complet)
 */
export function matchShopByCode(inputCode: string, shops: Array<{ id: string; name: string }>): string | null {
  const cleanInput = normalizeShopCode(inputCode)
  if (!cleanInput) return null

  // 1. Recherche par UUID ou ID exact
  const exact = shops.find(s => s.id.toLowerCase() === inputCode.trim().toLowerCase())
  if (exact) return exact.id

  // 2. Recherche par Code Court normalisé (ex: BTQ-58C54 ou 58C54)
  const shortMatch = shops.find(s => {
    const sClean = normalizeShopCode(s.id)
    return sClean === cleanInput
  })

  return shortMatch ? shortMatch.id : null
}

import { supabaseClient } from './supabaseClient'

/**
 * Recherche l'ID réel d'une boutique dans Supabase à partir d'un code court (ex: BTQ-58C54 ou 58C54)
 */
export async function findShopIdByCode(inputCode: string): Promise<string> {
  const raw = inputCode.trim()
  if (!raw) return 'default-shop'
  const clean = normalizeShopCode(raw)
  const formatted = raw.toUpperCase().startsWith('BTQ-') ? raw.toUpperCase() : `BTQ-${clean}`

  try {
    // 1. Chercher dans `employees` par `shop_code` ou `shop_id`
    const { data: empMatch } = await supabaseClient
      .from('employees')
      .select('shop_id, shop_code')
      .or(`shop_code.eq.${formatted},shop_code.ilike.%${clean}%,shop_id.eq.${raw},shop_id.ilike.%${clean}%`)
      .limit(5)

    if (empMatch && empMatch.length > 0) {
      const match = empMatch.find(e => e.shop_id) || empMatch[0]
      if (match?.shop_id) return match.shop_id
    }

    // 2. Chercher dans `products` par shop_id
    const { data: prodMatch } = await supabaseClient
      .from('products')
      .select('shop_id')
      .or(`shop_id.eq.${raw},shop_id.ilike.%${clean}%`)
      .limit(1)

    if (prodMatch && prodMatch.length > 0 && prodMatch[0].shop_id) {
      return prodMatch[0].shop_id
    }

    // 3. Chercher dans `sales` par shop_id
    const { data: salesMatch } = await supabaseClient
      .from('sales')
      .select('shop_id')
      .or(`shop_id.eq.${raw},shop_id.ilike.%${clean}%`)
      .limit(1)

    if (salesMatch && salesMatch.length > 0 && salesMatch[0].shop_id) {
      return salesMatch[0].shop_id
    }
  } catch (err) {
    console.warn('Erreur recherche shop_id par code:', err)
  }

  // Fallback si non trouvé
  return raw.startsWith('BTQ-') ? raw.replace(/^BTQ-/i, 'SHOP-') : raw
}


