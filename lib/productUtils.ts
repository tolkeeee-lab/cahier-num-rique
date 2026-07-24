// Utilitaire de normalisation et déduplication intelligente des produits

const CANONICAL_ALIASES: Record<string, string> = {
  'beufort': 'Beaufort',
  'beaufort': 'Beaufort',
  'flag': 'Flag',
  'flag 600': 'Flag',
  'flag 600ml': 'Flag',
  'lb': 'LB',
  'lb 600': 'LB',
  'coca': 'Coca-Cola',
  'coca-cola': 'Coca-Cola',
  'boite de tomate': 'Boîte de Tomate',
  'boite de sardine': 'Boîte de Sardine',
}

/**
 * Normalise un nom de produit en gérant les espaces, majuscules et alias connus.
 */
export function normalizeProductName(name: string): string {
  if (!name) return ''
  const trimmed = name.trim().replace(/\s+/g, ' ')
  const lower = trimmed.toLowerCase()

  if (CANONICAL_ALIASES[lower]) {
    return CANONICAL_ALIASES[lower]
  }

  // Conversion en Title Case avec exceptions (de, du, des, à, etc.)
  const lowercaseWords = new Set(['de', 'du', 'des', 'à', 'au', 'aux', 'le', 'la', 'les', 'en', 'et', 'pour', 'par'])
  
  return trimmed
    .split(' ')
    .map((word, index) => {
      const lowerWord = word.toLowerCase()
      // Conserver les acronymes courts en majuscules (ex: LB, XP)
      if (word.length <= 2 && word === word.toUpperCase() && !lowercaseWords.has(lowerWord)) {
        return word
      }
      if (index > 0 && lowercaseWords.has(lowerWord)) {
        return lowerWord
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes de caractères
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  const lenA = a.length
  const lenB = b.length

  for (let i = 0; i <= lenA; i++) matrix[i] = [i]
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[lenA][lenB]
}

/**
 * Calcule un score de similarité entre 0 et 1 (1 = identiques)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  if (s1 === s2) return 1

  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1

  const distance = levenshteinDistance(s1, s2)
  return 1 - distance / maxLen
}

export interface DuplicatePair {
  item1: { id: string; name: string; category?: string }
  item2: { id: string; name: string; category?: string }
  similarityScore: number
}

/**
 * Détecte les paires de produits doublons potentiels dans une liste
 */
export function findDuplicateCandidates(
  items: Array<{ id: string; name: string; category?: string }>,
  threshold = 0.75
): DuplicatePair[] {
  const duplicates: DuplicatePair[] = []
  const seen = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const item1 = items[i]
      const item2 = items[j]

      // Clé unique pour éviter les paires miroir
      const pairKey = [item1.id, item2.id].sort().join('_')
      if (seen.has(pairKey)) continue

      const sim = calculateSimilarity(item1.name, item2.name)
      if (sim >= threshold) {
        seen.add(pairKey)
        duplicates.push({ item1, item2, similarityScore: sim })
      }
    }
  }

  return duplicates
}
