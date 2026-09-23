import { supabaseClient } from './supabaseClient'

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

/**
 * Vérifie si un identifiant de boutique est un vrai UUID Supabase long
 */
/**
 * Vérifie si un identifiant de boutique est un vrai UUID v4 standard
 */
export function isRealUuid(str?: string | null): boolean {
  if (!str) return false
  const clean = str.trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean)
}

/**
 * Recherche l'ID réel d'une boutique dans Supabase à partir d'un code court (ex: BTQ-58C54 ou 58C54)
 */
export async function findShopIdByCode(inputCode: string): Promise<string> {
  const raw = inputCode.trim()
  if (!raw) return 'default-shop'

  // Si c'est déjà un vrai UUID, le retourner directement
  if (isRealUuid(raw)) return raw

  const clean = normalizeShopCode(raw).toUpperCase()
  const formattedUpper = `BTQ-${clean}`

  try {
    // 0. Priorité 0 : Recherche par shop_code exact dans la table `shops`
    const { data: codeMatches } = await supabaseClient
      .from('shops')
      .select('id')
      .or(`shop_code.eq.${formattedUpper},shop_code.eq.${clean}`)
      .limit(1)

    if (codeMatches && codeMatches.length > 0 && isRealUuid(codeMatches[0].id)) {
      return codeMatches[0].id
    }

    // 1. Chercher dans `employees` par `shop_id` exact
    const { data: empMatches } = await supabaseClient
      .from('employees')
      .select('shop_id, role')
      .or(`shop_id.eq.${formattedUpper},shop_id.eq.${clean}`)
      .limit(10)

    if (empMatches && empMatches.length > 0) {
      const realUuidMatch = empMatches.find(e => isRealUuid(e.shop_id))
      if (realUuidMatch?.shop_id) return realUuidMatch.shop_id
    }

    // 2. Recherche par préfixe sur la clé primaire `shops.id` uniquement si aucun match par code
    const { data: idMatches } = await supabaseClient
      .from('shops')
      .select('id')
      .ilike('id', `${clean.toLowerCase()}%`)
      .limit(1)

    if (idMatches && idMatches.length > 0 && isRealUuid(idMatches[0].id)) {
      return idMatches[0].id
    }

    // 3. Recherche dans le cache local du navigateur
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('cahier_user_shops_')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(k) || '[]')
            if (Array.isArray(parsed)) {
              for (const s of parsed) {
                if (s?.id && isRealUuid(s.id)) {
                  const sClean = normalizeShopCode(s.id)
                  if (sClean === clean || formatShortShopCode(s.id) === formattedUpper) {
                    return s.id
                  }
                }
              }
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn('Erreur recherche shop_id par code:', err)
  }

  // Ne jamais retourner un code court comme ID de base
  return ''
}

/**
 * Retourne la liste des identifiants équivalents (ex: ['58C54', 'SHOP-58C54', 'BTQ-58C54'])
 */
export function getDualShopIds(shopId: string): string[] {
  if (!shopId) return []
  const clean = normalizeShopCode(shopId)
  const ids = new Set<string>()
  ids.add(shopId)
  if (clean) {
    ids.add(clean)
    ids.add(`SHOP-${clean}`)
    ids.add(`BTQ-${clean}`)
  }

  // Si c'est un UUID complet, inclure aussi les représentations en code court 5 chars
  if (isRealUuid(shopId)) {
    const short = formatShortShopCode(shopId)
    ids.add(short)
    const shortClean = normalizeShopCode(short)
    if (shortClean) {
      ids.add(shortClean)
      ids.add(`SHOP-${shortClean}`)
      ids.add(`BTQ-${shortClean}`)
    }
  }

  return Array.from(ids)
}



