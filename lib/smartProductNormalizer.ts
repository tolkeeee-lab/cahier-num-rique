/**
 * smartProductNormalizer.ts — Moteur de Normalisation Canonique & Sécurité Anti-Déduction au Hasard
 */

export interface CatalogItem {
  id: string
  name: string
  category?: string
  unit_price?: number
  unit_cost?: number
  initial_stock?: number
}

export interface MatchResult {
  rawName: string
  canonicalName: string
  matchedProduct: CatalogItem | null
  confidenceScore: number // 0.0 à 1.0
  shouldDecrementStock: boolean
}

// Dictionnaire de mapping canonique des produits courants du marché
const CANONICAL_DICTIONARY: Record<string, string> = {
  // Bières & Boissons alcoolisées
  'flag': 'Flag',
  'flag 600': 'Flag',
  'flag 600ml': 'Flag',
  'flag 6002 lb': 'Flag',
  'flaag': 'Flag',
  'lb': 'LB',
  'lb 600': 'LB',
  'lb 600ml': 'LB',
  'beufort': 'Beaufort',
  'beaufort': 'Beaufort',
  'beaufort lager': 'Beaufort',
  'castel': 'Castel',
  'castel beer': 'Castel',
  'doppel': 'Doppel',
  'chill': 'Chill',
  'guinness': 'Guinness',
  'heiniken': 'Heineken',
  'heineken': 'Heineken',
  'desperados': 'Desperados',

  // Sucreries & Soft Drinks
  'coca': 'Coca-Cola',
  'coca cola': 'Coca-Cola',
  'coca-cola': 'Coca-Cola',
  'coca 50cl': 'Coca-Cola',
  'fanta': 'Fanta',
  'fanta orange': 'Fanta',
  'sprite': 'Sprite',
  'youki': 'Youki',
  'schweppes': 'Schweppes',
  'vimto': 'Vimto',

  // Eaux
  'possotome': 'Eau Possotomè',
  'possotomè': 'Eau Possotomè',
  'eau possotome': 'Eau Possotomè',
  'eau possotomè': 'Eau Possotomè',
  'fifadji': 'Eau Fifadji',
  'kirène': 'Eau Kirène',
  'kirene': 'Eau Kirène',

  // Alimentation & Conserves
  'boite de tomate': 'Boîte de Tomate',
  'tomate boite': 'Boîte de Tomate',
  'boites de tomates': 'Boîte de Tomate',
  'boite de sardine': 'Boîte de Sardines',
  'sardine': 'Boîte de Sardines',
  'sardine boite': 'Boîte de Sardines',
  'riz 25kg': 'Riz 25kg',
  'sac de riz 25kg': 'Riz 25kg',
  'riz 50kg': 'Riz 50kg',
  'sac de riz 50kg': 'Riz 50kg',
  'sucre blanc': 'Sucre Blanc',
  'sucre roux': 'Sucre Roux',
  'huile': 'Huile de Cuisine',
  'huile 2l': 'Huile 2L',
  'huile 5l': 'Huile 5L',
  'biscuit prince': 'Biscuit Prince',
  'biscuit': 'Biscuit',

  // Hygiène & Divers
  'colgate': 'Colgate',
  'brosse colgate': 'Colgate',
  'savon omo': 'Savon Omo',
  'omo': 'Savon Omo',
}

/**
 * Calcul de la distance de Levenshtein entre deux chaînes.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Score de similarité entre deux chaînes (0.0 à 1.0).
 */
export function calculateSimilarity(s1: string, s2: string): number {
  const str1 = s1.toLowerCase().trim()
  const str2 = s2.toLowerCase().trim()

  if (str1 === str2) return 1.0
  if (str1.length === 0 || str2.length === 0) return 0.0

  const dist = levenshteinDistance(str1, str2)
  const maxLen = Math.max(str1.length, str2.length)
  return 1.0 - dist / maxLen
}

/**
 * Normalise un nom de produit brut vers son équivalent canonique.
 */
export function getCanonicalProductName(rawName: string): string {
  const clean = rawName.toLowerCase().trim()

  // 1. Recherche directe dans le dictionnaire
  if (CANONICAL_DICTIONARY[clean]) {
    return CANONICAL_DICTIONARY[clean]
  }

  // 2. Recherche par sous-chaîne ou préfixe (ex: "flag 600ml" contient "flag")
  for (const key of Object.keys(CANONICAL_DICTIONARY)) {
    if (clean === key || clean.startsWith(key + ' ') || clean.endsWith(' ' + key)) {
      return CANONICAL_DICTIONARY[key]
    }
  }

  // 3. Fallback : Capitalisation propre
  return rawName.trim().split(/\s+/)
    .map(w => w.length <= 2 && w.toUpperCase() === w ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Résout le produit canonique en BDD avec contrôle strict anti-déduction au hasard.
 */
export function resolveCanonicalProductMatch(
  rawName: string,
  catalogProducts: CatalogItem[]
): MatchResult {
  const canonicalName = getCanonicalProductName(rawName)
  const canonicalLower = canonicalName.toLowerCase().trim()
  const rawLower = rawName.toLowerCase().trim()

  // 1. Correspondance exacte sur nom canonique
  let exactMatch = catalogProducts.find(
    p => p.name.toLowerCase().trim() === canonicalLower || p.name.toLowerCase().trim() === rawLower
  )

  if (exactMatch) {
    return {
      rawName,
      canonicalName: exactMatch.name,
      matchedProduct: exactMatch,
      confidenceScore: 1.0,
      shouldDecrementStock: true
    }
  }

  // 2. Recherche du produit le plus proche avec score de similarité
  let bestMatch: CatalogItem | null = null
  let bestScore = 0

  for (const product of catalogProducts) {
    const prodLower = product.name.toLowerCase().trim()
    const scoreCanonical = calculateSimilarity(canonicalLower, prodLower)
    const scoreRaw = calculateSimilarity(rawLower, prodLower)
    const maxScore = Math.max(scoreCanonical, scoreRaw)

    if (maxScore > bestScore) {
      bestScore = maxScore
      bestMatch = product
    }
  }

  // SÉCURITÉ ANTI-DÉDUCTION AU HASARD :
  // Le stock est déduit UNIQUEMENT si le score de confiance est >= 0.85 (85%)
  const shouldDecrement = bestScore >= 0.85 && bestMatch !== null

  return {
    rawName,
    canonicalName: bestMatch && shouldDecrement ? bestMatch.name : canonicalName,
    matchedProduct: shouldDecrement ? bestMatch : null,
    confidenceScore: bestScore,
    shouldDecrementStock: shouldDecrement
  }
}
