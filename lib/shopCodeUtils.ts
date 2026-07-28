/**
 * shopCodeUtils.ts — Formate et résout les codes courts de boutique (ex: BTQ-58C54)
 */

/**
 * Formate un UUID long en un code boutique court, chic et mémorisable (ex: BTQ-58C54)
 */
export function formatShortShopCode(shopId: string): string {
  if (!shopId) return 'BTQ-00000'
  if (shopId.startsWith('BTQ-')) return shopId.toUpperCase()
  
  // Extraire les 5 premiers caractères hexadécimaux de l'UUID
  const clean = shopId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()
  return `BTQ-${clean || '00000'}`
}

/**
 * Trouve l'ID réel de la boutique à partir du code saisi (BTQ-58C54 ou UUID complet)
 */
export function matchShopByCode(inputCode: string, shops: Array<{ id: string; name: string }>): string | null {
  const cleanInput = inputCode.trim().toLowerCase()
  if (!cleanInput) return null

  // 1. Recherche par UUID exact
  const exact = shops.find(s => s.id.toLowerCase() === cleanInput)
  if (exact) return exact.id

  // 2. Recherche par Code Court (ex: BTQ-58C54 ou 58C54)
  const cleanShort = cleanInput.replace(/^btq-?/i, '').toUpperCase()
  const shortMatch = shops.find(s => {
    const formatted = formatShortShopCode(s.id).replace(/^BTQ-/, '')
    return formatted.toLowerCase() === cleanShort.toLowerCase()
  })

  return shortMatch ? shortMatch.id : null
}
