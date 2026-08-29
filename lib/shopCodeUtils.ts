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
 * Vérifie si un identifiant de boutique est un vrai UUID Supabase long
 */
export function isRealUuid(str?: string | null): boolean {
  if (!str) return false
  const clean = str.trim()
  return clean.length >= 30 && clean.includes('-') && !clean.toUpperCase().startsWith('BTQ-') && !clean.toUpperCase().startsWith('SHOP-')
}

/**
 * Recherche l'ID réel d'une boutique dans Supabase à partir d'un code court (ex: BTQ-58C54 ou 58C54)
 */
export async function findShopIdByCode(inputCode: string): Promise<string> {
  const raw = inputCode.trim()
  if (!raw) return 'default-shop'

  // Si c'est déjà un vrai UUID, le retourner directement
  if (isRealUuid(raw)) return raw

  const clean = normalizeShopCode(raw).toLowerCase()
  const formattedUpper = `BTQ-${clean.toUpperCase()}`

  try {
    // 1. Chercher dans `employees` par `shop_code` ou `shop_id`
    const { data: empMatches } = await supabaseClient
      .from('employees')
      .select('shop_id, shop_code, role')
      .or(`shop_code.ilike.${formattedUpper},shop_code.ilike.%${clean}%,shop_id.ilike.${clean}%,shop_id.ilike.%${clean}%`)
      .limit(20)

    if (empMatches && empMatches.length > 0) {
      // Priorité 1 : Trouver une entrée avec un VRAI UUID (ex: 58c54b4a-4d32-4686-971e-b5f87985...)
      const realUuidMatch = empMatches.find(e => isRealUuid(e.shop_id))
      if (realUuidMatch?.shop_id) {
        return realUuidMatch.shop_id
      }

      // Priorité 2 : Trouver la ligne d'un Propriétaire
      const ownerMatch = empMatches.find(e => e.role === 'owner' && e.shop_id)
      if (ownerMatch?.shop_id && isRealUuid(ownerMatch.shop_id)) {
        return ownerMatch.shop_id
      }
    }

    // 2. Chercher dans `products` par shop_id (ex: 58c54b4a-4d32...)
    const { data: prodMatch } = await supabaseClient
      .from('products')
      .select('shop_id')
      .ilike('shop_id', `${clean}%`)
      .limit(10)

    if (prodMatch && prodMatch.length > 0) {
      const realProd = prodMatch.find(p => isRealUuid(p.shop_id)) || prodMatch[0]
      if (realProd?.shop_id) return realProd.shop_id
    }

    // 3. Chercher dans `sales` par shop_id
    const { data: salesMatch } = await supabaseClient
      .from('sales')
      .select('shop_id')
      .ilike('shop_id', `${clean}%`)
      .limit(10)

    if (salesMatch && salesMatch.length > 0) {
      const realSale = salesMatch.find(s => isRealUuid(s.shop_id)) || salesMatch[0]
      if (realSale?.shop_id) return realSale.shop_id
    }
  } catch (err) {
    console.warn('Erreur recherche shop_id par code:', err)
  }

  // Fallback propre
  return formattedUpper
}



