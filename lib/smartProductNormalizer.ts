/**
 * smartProductNormalizer.ts — Moteur de Normalisation Canonique, Association par Genre + Prix et Sécurité Anti-Déduction Hasard
 */

import { normalizeProductName, calculateSimilarity, levenshteinDistance } from '@/lib/productUtils'
export { calculateSimilarity, levenshteinDistance }

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

// Dictionnaire canonique unifié dans lib/productUtils.ts (CANONICAL_ALIASES)

// Levenshtein & similarité unifiés depuis lib/productUtils.ts

/**
 * Normalise un nom brut vers son équivalent canonique.
 */
export function getCanonicalProductName(rawName: string): string {
  if (!rawName) return ''
  return normalizeProductName(rawName)
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
