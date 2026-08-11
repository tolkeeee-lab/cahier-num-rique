/**
 * smartProductNormalizer.ts — Moteur de Normalisation Canonique, Association par Genre + Prix et Sécurité Anti-Déduction Hasard
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
  candidateProducts: CatalogItem[]
  confidenceScore: number // 0.0 à 1.0
  shouldDecrementStock: boolean
}

// Dictionnaire de mots-clés génériques vers catégories de produits
const GENERIC_CATEGORY_KEYWORDS: Record<string, string[]> = {
  'dentifrice': ['oral-b', 'colgate', 'close-up', 'signal', 'sensodyne', 'pate dentifrice', 'dentifrice'],
  'savon': ['savon omo', 'savon lux', 'savon fanico', 'savon palmolive', 'savon dove', 'savon de marseille', 'savon'],
  'biscuit': ['biscuit prince', 'biscuit oreo', 'biscuit Coq', 'biscuit maryland', 'biscuit'],
  'brosse': ['brosse colgate', 'brosse oral-b', 'brosse a dents', 'brosse'],
  'biere': ['flag', 'lb', 'beaufort', 'castel', 'doppel', 'chill', 'heineken', 'guinness', 'biere'],
  'eau': ['possotomè', 'possotome', 'fifadji', 'kirène', 'kirene', 'eau mineral', 'eau'],
  'boisson': ['coca-cola', 'coca', 'fanta', 'sprite', 'youki', 'schweppes', 'vimto', 'boisson'],
  'huile': ['huile 1l', 'huile 2l', 'huile 5l', 'dinor', 'aya', 'mayor', 'huile']
}

// Dictionnaire de mapping canonique direct
const CANONICAL_DICTIONARY: Record<string, string> = {
  // Bières & Alcools
  'flag': 'Flag',
  'flag 600': 'Flag',
  'flag 600ml': 'Flag',
  'flaag': 'Flag',
  'lb': 'LB',
  'lb 600': 'LB',
  'beaufort': 'Beaufort',
  'beufort': 'Beaufort',
  'castel': 'Castel',
  'doppel': 'Doppel',
  'chill': 'Chill',
  'guinness': 'Guinness',
  'heineken': 'Heineken',

  // Sucreries & Softs
  'coca': 'Coca-Cola',
  'coca cola': 'Coca-Cola',
  'coca-cola': 'Coca-Cola',
  'fanta': 'Fanta',
  'sprite': 'Sprite',
  'youki': 'Youki',
  'schweppes': 'Schweppes',

  // Eaux
  'possotome': 'Eau Possotomè',
  'possotomè': 'Eau Possotomè',
  'eau possotome': 'Eau Possotomè',
  'eau possotomè': 'Eau Possotomè',

  // Hygiène & Alimentation
  'colgate': 'Colgate',
  'close-up': 'Close-Up',
  'oral-b': 'Oral-B',
  'omo': 'Savon Omo',
  'lux': 'Savon Lux'
}

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
 * Normalise un nom brut vers son équivalent canonique.
 */
export function getCanonicalProductName(rawName: string): string {
  const clean = rawName.toLowerCase().trim()
  if (CANONICAL_DICTIONARY[clean]) return CANONICAL_DICTIONARY[clean]

  for (const key of Object.keys(CANONICAL_DICTIONARY)) {
    if (clean === key || clean.startsWith(key + ' ') || clean.endsWith(' ' + key)) {
      return CANONICAL_DICTIONARY[key]
    }
  }

  return rawName.trim().split(/\s+/)
    .map(w => w.length <= 2 && w.toUpperCase() === w ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Résout le produit canonique avec désambiguïsation par le Prix Saisi + Genre.
 */
export function resolveCanonicalProductMatch(
  rawName: string,
  unitPrice: number | undefined,
  catalogProducts: CatalogItem[]
): MatchResult {
  const canonicalName = getCanonicalProductName(rawName)
  const canonicalLower = canonicalName.toLowerCase().trim()
  const rawLower = rawName.toLowerCase().trim()

  // 1. Recherche par Correspondance Nom + Prix Exact (ex: "Coca" à 400F vs "Coca" à 300F)
  if (unitPrice && unitPrice > 0) {
    const exactNameAndPrice = catalogProducts.find(p => {
      const pLower = p.name.toLowerCase().trim()
      const isNameMatch = pLower === canonicalLower || pLower === rawLower || calculateSimilarity(pLower, rawLower) >= 0.85
      return isNameMatch && p.unit_price === unitPrice
    })

    if (exactNameAndPrice) {
      return {
        rawName,
        canonicalName: exactNameAndPrice.name,
        matchedProduct: exactNameAndPrice,
        candidateProducts: [exactNameAndPrice],
        confidenceScore: 1.0,
        shouldDecrementStock: true
      }
    }
  }

  // 2. Recherche par Genre Générique + Prix (ex: "Dentifrice" à 500F -> "Oral-B 500F")
  if (unitPrice && unitPrice > 0) {
    for (const [genre, keywords] of Object.entries(GENERIC_CATEGORY_KEYWORDS)) {
      if (rawLower.includes(genre)) {
        const genreCandidates = catalogProducts.filter(p => {
          const pLower = p.name.toLowerCase().trim()
          return keywords.some(k => pLower.includes(k)) && p.unit_price === unitPrice
        })

        if (genreCandidates.length === 1) {
          return {
            rawName,
            canonicalName: genreCandidates[0].name,
            matchedProduct: genreCandidates[0],
            candidateProducts: genreCandidates,
            confidenceScore: 0.95,
            shouldDecrementStock: true
          }
        } else if (genreCandidates.length > 1) {
          return {
            rawName,
            canonicalName,
            matchedProduct: null,
            candidateProducts: genreCandidates,
            confidenceScore: 0.70,
            shouldDecrementStock: false
          }
        }
      }
    }
  }

  // 3. Match de Nom Seul (Exact)
  const exactMatch = catalogProducts.find(
    p => p.name.toLowerCase().trim() === canonicalLower || p.name.toLowerCase().trim() === rawLower
  )

  if (exactMatch) {
    return {
      rawName,
      canonicalName: exactMatch.name,
      matchedProduct: exactMatch,
      candidateProducts: [exactMatch],
      confidenceScore: 0.90,
      shouldDecrementStock: true
    }
  }

  // 4. Match par similarité tolérante
  let bestMatch: CatalogItem | null = null
  let bestScore = 0
  const candidates: CatalogItem[] = []

  for (const product of catalogProducts) {
    const prodLower = product.name.toLowerCase().trim()
    const scoreCanonical = calculateSimilarity(canonicalLower, prodLower)
    const scoreRaw = calculateSimilarity(rawLower, prodLower)
    const maxScore = Math.max(scoreCanonical, scoreRaw)

    if (maxScore >= 0.65) {
      candidates.push(product)
    }

    if (maxScore > bestScore) {
      bestScore = maxScore
      bestMatch = product
    }
  }

  const shouldDecrement = bestScore >= 0.85 && bestMatch !== null

  return {
    rawName,
    canonicalName: bestMatch && shouldDecrement ? bestMatch.name : canonicalName,
    matchedProduct: shouldDecrement ? bestMatch : null,
    candidateProducts: candidates,
    confidenceScore: bestScore,
    shouldDecrementStock: shouldDecrement
  }
}
