// Utilitaire de normalisation et déduplication intelligente des produits

const CANONICAL_ALIASES: Record<string, string> = {
  'beufort': 'Beaufort',
  'beaufort': 'Beaufort',
  'flag': 'Flag',
  'flag 600': 'Flag',
  'flag 600ml': 'Flag',
  'flag 6002 lb': 'Flag',
  'flag 600 2 lb': 'Flag',
  'lb': 'LB',
  'lb 600': 'LB',
  'fifa': 'Fifa',
  'eau fifa': 'Fifa',
  'coca': 'Coca-Cola',
  'coca-cola': 'Coca-Cola',
  'boite de tomate': 'Boîte de Tomate',
  'boite de sardine': 'Boîte de Sardine',
  'colgate': 'Colgate',
  'possotome': 'Eau Possotomè',
  'possotomè': 'Eau Possotomè',
  'eau possotome': 'Eau Possotomè',
  'eau possotomè': 'Eau Possotomè',
}

/**
 * Normalise un nom de produit en gérant les espaces, majuscules et alias connus.
 */
export function normalizeProductName(name: string): string {
  if (!name) return ''
  let trimmed = name.trim().replace(/\s+/g, ' ')
  let lower = trimmed.toLowerCase()

  // Nettoyage des bruits de frappe courants (ex: flag 6002 lb -> flag)
  lower = lower
    .replace(/^flag(\s*6002?\s*lb|\s*600ml?|\s*600)?$/i, 'flag')
    .replace(/^lb(\s*600)?$/i, 'lb')
    .replace(/^beufort$/i, 'beaufort')
    .replace(/^coca(-cola)?$/i, 'coca-cola')

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
  return (maxLen - distance) / maxLen
}

/**
 * Corrige les artefacts d'arrondi à 1 FCFA sur les ventes par lot.
 * Exemple: 3 Kopiko à 17 F (17 = 50 / 3 arrondi). 3 x 17 = 51 F -> Doit valoir 50 F !
 * Exemple: 3 Oeufs à 92 F (92 = 275 / 3 arrondi). 3 x 92 = 276 F -> Doit valoir 275 F !
 * Exemple: 3 Biscuits à 33 F (33 = 100 / 3 arrondi). 3 x 33 = 99 F -> Doit valoir 100 F !
 */
export function adjustLotRoundingArtifact(qty: number, givenUnitPrice: number, currentTotal: number): number {
  if (qty > 1 && givenUnitPrice > 0 && currentTotal > 0) {
    // Chercher parmi les voisins ±2 si un candidat correspond au même prix unitaire arrondi
    const candidates: number[] = []
    for (let diff = -2; diff <= 2; diff++) {
      if (diff === 0) continue
      const candidateTarget = currentTotal + diff
      if (candidateTarget > 0 && Math.round(candidateTarget / qty) === givenUnitPrice) {
        candidates.push(candidateTarget)
      }
    }

    if (candidates.length > 0) {
      // Parmi les candidats valides, préférer un multiple de 5 (vrai lot FCFA)
      const roundCandidates = candidates.filter(c => c % 5 === 0)

      if (roundCandidates.length > 0) {
        // Si currentTotal est déjà multiple de 5, garder le plus proche multiple de 5
        // Sinon, passer au candidat multiple de 5 le plus proche
        const bestRound = roundCandidates.reduce((best, c) =>
          Math.abs(c - currentTotal) < Math.abs(best - currentTotal) ? c : best
        )
        // Préférer le candidat round SAUF si currentTotal est lui-même déjà multiple de 5
        // et que la différence avec le meilleur candidat est > 1 (cas exotique)
        if (currentTotal % 5 !== 0 || Math.abs(bestRound - currentTotal) <= 2) {
          return bestRound
        }
      }
      // Aucun candidat multiple de 5 : si currentTotal est déjà exact et rond, le garder
      if (currentTotal % 5 === 0) {
        return currentTotal
      }
    } else {
      // Aucun candidat trouvé : rien à corriger
      return currentTotal
    }
  }
  return currentTotal
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

export interface CleanableProduct {
  id?: string
  name: string
  category?: string
  unit?: string
  initial_stock?: number
  unit_cost?: number
  unit_price?: number
  multiplier?: number
  packaging_name?: string
  lot_quantity?: number
  lot_price?: number
  [key: string]: any
}

/**
 * Assainit et normalise automatiquement les données d'un produit (catalogue & stock).
 * Résout les 5 anomalies classiques :
 * 1. unit_cost enregistré avec le prix du carton au lieu du prix unitaire.
 * 2. unit marquée 'carton'/'sac' au lieu de 'unité' quand multiplier > 1.
 * 3. Prix et seuils négatifs ou décimaux bizarres.
 * 4. lot_price invalide ou supérieur au prix normal.
 * 5. Multiplicateurs invalides (< 1).
 */
export function sanitizeProductData<T extends CleanableProduct>(product: T): T {
  if (!product) return product

  const copy = { ...product }

  if (copy.name) {
    copy.name = normalizeProductName(copy.name)
  }

  const mult = Math.max(1, Math.round(Number(copy.multiplier) || 1))
  copy.multiplier = mult

  let price = Math.max(0, Number(copy.unit_price) || 0)
  let cost = Math.max(0, Number(copy.unit_cost) || 0)

  if (mult > 1 && price > 0 && cost > price) {
    cost = cost / mult
  }

  const isFakeCost = Math.round(cost) === Math.round(price * 0.6) || Math.round(cost) === Math.round(price * 0.7)
  if (isFakeCost && (!copy.total_in || copy.total_in === 0)) {
    cost = 0
  }

  // Précision décimale pour garantir les prix cartons exacts (ex: 10 000 F / 24 sans arrondi 9996 F)
  copy.unit_price = Math.round(price * 10000) / 10000
  copy.unit_cost = Math.round(cost * 10000) / 10000

  let unitName = (copy.unit || 'unité').trim().toLowerCase()
  const pkgName = (copy.packaging_name || 'carton').trim().toLowerCase()
  const isDetailUnit = ['kg', 'g', 'litre', 'cl', 'bouteille', 'pièce', 'sachet', 'mètre', 'verre', 'portion'].includes(unitName)
  if (mult > 1 && !isDetailUnit && (unitName === 'carton' || unitName === 'sac' || unitName === 'colis' || unitName === pkgName)) {
    unitName = 'unité'
  }
  copy.unit = unitName

  let lotQty = Math.max(0, Math.round(Number(copy.lot_quantity) || 0))
  let lotPr = Math.max(0, Math.round(Number(copy.lot_price) || 0))
  copy.lot_quantity = lotQty
  copy.lot_price = lotPr

  const explicitTradeType = (copy as any).trade_type
  if (explicitTradeType) {
    (copy as any).trade_type = explicitTradeType
  } else if (lotQty > 1 || pkgName === 'pack' || pkgName === 'fardeau') {
    (copy as any).trade_type = 'semi_wholesale'
  } else if (mult > 1 || unitName === 'carton' || unitName === 'sac' || pkgName === 'carton' || pkgName === 'sac') {
    (copy as any).trade_type = 'wholesale'
  } else {
    (copy as any).trade_type = 'retail'
  }

  return copy
}
