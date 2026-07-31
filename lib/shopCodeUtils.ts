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

