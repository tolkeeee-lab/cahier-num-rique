/**
 * smartStockAssistant.ts — Assistant de correspondance et de détection des erreurs de frappe (Levenshtein, Prix Suspects, Nouveaux Produits)
 */

import { getCanonicalProductName } from '@/lib/smartProductNormalizer'

export interface StockProductCard {
  id: string
  name: string
  category: string
  unit_price: number       // Prix de revente au détail (ex: 500 FCFA)
  unit_cost?: number       // Prix d'achat grossiste (ex: 400 FCFA)
  initial_stock: number    // Stock actuel
  alert_threshold: number
  unit: string             // Unité (ex: bouteille, sac, unité)
  multiplier?: number      // Contenance par conditionnement (ex: 24 bouteilles par carton, 50kg par sac)
  packaging_name?: string  // Nom du lot/conditionnement (ex: carton, sac, pack)
}

export interface AssistantAnalysisResult {
  isMatch: boolean
  isNewProduct?: boolean       // Est-ce un nouveau produit non encore catalogué ?
  suggestedNewName?: string    // Orthographe suggérée via la base du marché (ex: "Jus Chivita")
  transactionKind: 'sale' | 'stock_addition' | 'client_request' | 'expense'
  matchedProduct?: StockProductCard
  requestedQty: number
  calculatedItemsCount: number // Nombre d'unités de détail impactées (ex: 1 carton = 24 unités)
  packagingUsed?: string       // ex: "carton", "sac", "bouteille"
  unitPrice: number            // Prix unitaire retenu
  totalAmount: number          // Montant total estimé
  suspectPriceAnomaly?: boolean // Présence d'un zéro en trop ou en moins (ex: 2200 F pour un sac de riz)
  suggestedCorrectPrice?: number // Prix corrigé suggéré (ex: 22000 F)
  stockBefore: number          // Stock avant opération
  stockAfter: number           // Stock après opération (déduction ou ajout)
  isStockAlert: boolean        // Vente supérieure au stock disponible ou alerte de rupture
  confidence: number           // Score de confiance % (0 à 100)
  alternativeVariants: StockProductCard[] // Variantes similaires en cas d'ambiguïté
}

/**
 * Calcul de la distance d'édition de Levenshtein entre deux mots
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  const lenA = a.length
  const lenB = b.length

  for (let i = 0; i <= lenA; i++) matrix[i] = [i]
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // Deletion
        matrix[i][j - 1] + 1,       // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      )
    }
  }

  return matrix[lenA][lenB]
}

/**
 * Analyse une ligne de saisie manuscrite avec détection d'erreurs de frappe (orthographe & prix)
 */
export function analyzeNotebookInputWithMasterCatalog(
  input: string,
  penColor: string,
  catalog: StockProductCard[]
): AssistantAnalysisResult | null {
  const text = input.trim()
  if (!text || text.length < 2) return null

  const lower = text.toLowerCase()

  // 1. Déterminer la nature de la saisie
  let kind: 'sale' | 'stock_addition' | 'client_request' | 'expense' = 'sale'
  if (/^(demande|client demande|demande client|manque|besoin|réclamation|reclamation)\b/i.test(lower)) {
    kind = 'client_request'
  } else if (penColor === 'red') {
    kind = 'expense'
  } else if (penColor === 'green' || penColor === 'purple' || lower.startsWith('stock') || lower.startsWith('achat')) {
    kind = 'stock_addition'
  } else if (penColor === 'yellow') {
    kind = 'sale' // Crédit Client
  }

  if (kind === 'expense' || kind === 'client_request') return null

  // 2. Extraire la quantité, le prix explicite et le nom nettoyé
  let qty = 1
  let cleanText = lower
  let typedPrice: number | undefined = undefined

  // Détecter un prix explicite (ex: "à 500", "500f", "2200")
  const explicitPriceMatch = lower.match(/(?:à|a|@)\s*(\d+)|(\d+)\s*(?:f|fcfa)$/i)
  if (explicitPriceMatch) {
    typedPrice = parseInt(explicitPriceMatch[1] || explicitPriceMatch[2], 10)
    cleanText = cleanText.replace(explicitPriceMatch[0], '').trim()
  }

  // Détecter la quantité initiale (ex: "2 coca", "10 cartons biere", "stock 5 sacs")
  const qtyMatch = cleanText.match(/^(?:stock|achat)?\s*(\d+)\s+(.+)/i)
  if (qtyMatch) {
    qty = Math.max(1, parseInt(qtyMatch[1], 10))
    cleanText = qtyMatch[2].trim()
  } else {
    cleanText = cleanText.replace(/^(?:stock|achat)\s+/i, '').trim()
  }

  // 3. Chercher la carte produit correspondante dans le catalogue (avec tolérance aux fautes Levenshtein)
  let bestMatch: StockProductCard | undefined = undefined
  let bestScore = Infinity
  const alternativeVariants: StockProductCard[] = []

  if (catalog && catalog.length > 0) {
    for (const prod of catalog) {
      const prodLower = prod.name.toLowerCase().trim()
      
      // Correspondance exacte ou partielle
      if (prodLower === cleanText || prodLower.includes(cleanText) || cleanText.includes(prodLower)) {
        bestMatch = prod
        bestScore = 0
        break
      }

      // Distance de Levenshtein pour fautes de frappe
      const dist = calculateLevenshteinDistance(cleanText, prodLower)
      if (dist <= 2 && dist < bestScore) {
        bestScore = dist
        bestMatch = prod
      }
    }
  }

  // 4. Si le produit n'est pas dans le catalogue personalisé de la boutique
  if (!bestMatch) {
    // Tenter de corriger l'orthographe via le dictionnaire général du marché béninois
    const canonicalMarketName = getCanonicalProductName(cleanText)
    const isNameCorrected = canonicalMarketName.toLowerCase().trim() !== cleanText.toLowerCase().trim()

    return {
      isMatch: false,
      isNewProduct: true,
      suggestedNewName: isNameCorrected ? canonicalMarketName : undefined,
      transactionKind: kind,
      requestedQty: qty,
      calculatedItemsCount: qty,
      unitPrice: typedPrice || 0,
      totalAmount: qty * (typedPrice || 0),
      stockBefore: 0,
      stockAfter: kind === 'stock_addition' ? qty : 0,
      isStockAlert: false,
      confidence: isNameCorrected ? 88 : 70,
      alternativeVariants: []
    }
  }

  // 5. Produit reconnu dans le catalogue : Déterminer le conditionnement
  let packagingUsed = bestMatch.unit || 'unité'
  let multiplier = 1

  if (bestMatch.multiplier && bestMatch.multiplier > 1) {
    const pkgName = (bestMatch.packaging_name || '').toLowerCase().trim()
    if (pkgName && lower.includes(pkgName)) {
      packagingUsed = bestMatch.packaging_name || 'lot'
      multiplier = bestMatch.multiplier
    } else if (lower.includes('carton') || lower.includes('sac') || lower.includes('pack') || lower.includes('caisse')) {
      packagingUsed = bestMatch.packaging_name || 'lot'
      multiplier = bestMatch.multiplier
    }
  }

  const calculatedItemsCount = qty * multiplier
  const stockBefore = bestMatch.initial_stock || 0

  let stockAfter = stockBefore
  let isStockAlert = false

  if (kind === 'sale') {
    stockAfter = stockBefore - calculatedItemsCount
    if (stockAfter < 0 || stockAfter <= bestMatch.alert_threshold) {
      isStockAlert = true
    }
  } else if (kind === 'stock_addition') {
    stockAfter = stockBefore + calculatedItemsCount
  }

  // Calcul du prix unitaire et détection d'anomalies de zéros (ex: 2200 au lieu de 22000)
  const referencePrice = kind === 'stock_addition'
    ? (bestMatch.unit_cost || bestMatch.unit_price || 0)
    : (bestMatch.unit_price || 0)

  let finalUnitPrice = referencePrice
  let suspectPriceAnomaly = false
  let suggestedCorrectPrice: number | undefined = undefined

  if (typedPrice && referencePrice > 0) {
    // Détecter si le prix tapé est 10x plus bas (zéro manquant) ou 10x plus haut (zéro en trop)
    const ratio = referencePrice / typedPrice
    if (ratio >= 8 && ratio <= 12) {
      // Zéro manquant (ex: 2200 au lieu de 22000)
      suspectPriceAnomaly = true
      suggestedCorrectPrice = referencePrice
      finalUnitPrice = typedPrice
    } else if (ratio >= 0.08 && ratio <= 0.12) {
      // Zéro en trop (ex: 4000 au lieu de 400)
      suspectPriceAnomaly = true
      suggestedCorrectPrice = referencePrice
      finalUnitPrice = typedPrice
    } else {
      finalUnitPrice = typedPrice
    }
  }

  const totalAmount = calculatedItemsCount * finalUnitPrice
  const confidence = bestScore === 0 ? 98 : 88

  return {
    isMatch: true,
    isNewProduct: false,
    transactionKind: kind,
    matchedProduct: bestMatch,
    requestedQty: qty,
    calculatedItemsCount,
    packagingUsed,
    unitPrice: finalUnitPrice,
    totalAmount,
    suspectPriceAnomaly,
    suggestedCorrectPrice,
    stockBefore,
    stockAfter,
    isStockAlert,
    confidence,
    alternativeVariants
  }
}
