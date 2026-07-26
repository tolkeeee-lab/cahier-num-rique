/**
 * smartStockAssistant.ts — Assistant de correspondance intelligente basée sur les cartes produits du catalogue
 */

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
  transactionKind: 'sale' | 'stock_addition' | 'client_request' | 'expense'
  matchedProduct?: StockProductCard
  requestedQty: number
  calculatedItemsCount: number // Nombre d'unités de détail impactées (ex: 1 carton = 24 unités)
  packagingUsed?: string       // ex: "carton", "sac", "bouteille"
  unitPrice: number            // Prix unitaire retenu
  totalAmount: number          // Montant total estimé
  stockBefore: number          // Stock avant opération
  stockAfter: number           // Stock après opération (déduction ou ajout)
  isStockAlert: boolean        // Vente supérieure au stock disponible ou alerte de rupture
  confidence: number           // Score de confiance % (0 à 100)
  alternativeVariants: StockProductCard[] // Variantes similaires en cas d'ambiguïté
}

/**
 * Analyse une ligne de saisie manuscrite par rapport au catalogue de cartes produits
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

  // 2. Extraire la quantité et le nom nettoyé
  let qty = 1
  let cleanText = lower

  // Détecter quantité initiale (ex: "2 coca", "10 cartons biere", "stock 5 sacs")
  const qtyMatch = lower.match(/^(?:stock|achat)?\s*(\d+)\s+(.+)/i)
  if (qtyMatch) {
    qty = Math.max(1, parseInt(qtyMatch[1], 10))
    cleanText = qtyMatch[2].trim()
  } else {
    cleanText = lower.replace(/^(?:stock|achat)\s+/i, '').trim()
  }

  // Nettoyer les prix éventuels en fin de ligne (ex: "à 500", "500f", "18000")
  cleanText = cleanText.replace(/\s*(?:à|a|@)\s*\d+.*$/i, '').trim()

  if (!catalog || catalog.length === 0) return null

  // 3. Chercher la carte produit correspondante dans le catalogue
  const matches = catalog.filter(prod => {
    const prodLower = prod.name.toLowerCase().trim()
    return prodLower.includes(cleanText) || cleanText.includes(prodLower)
  }).sort((a, b) => b.name.length - a.name.length)

  if (matches.length === 0) return null

  const targetProd = matches[0]
  const alternativeVariants = matches.slice(1, 4)

  // 4. Déterminer si un conditionnement / lot est mentionné (ex: "carton", "sac", "pack", "caisse")
  let packagingUsed = targetProd.unit || 'unité'
  let multiplier = 1

  if (targetProd.multiplier && targetProd.multiplier > 1) {
    const pkgName = (targetProd.packaging_name || '').toLowerCase().trim()
    if (pkgName && lower.includes(pkgName)) {
      packagingUsed = targetProd.packaging_name || 'lot'
      multiplier = targetProd.multiplier
    } else if (lower.includes('carton') || lower.includes('sac') || lower.includes('pack') || lower.includes('caisse')) {
      packagingUsed = targetProd.packaging_name || 'lot'
      multiplier = targetProd.multiplier
    }
  }

  const calculatedItemsCount = qty * multiplier
  const stockBefore = targetProd.initial_stock || 0

  let stockAfter = stockBefore
  let isStockAlert = false

  if (kind === 'sale') {
    stockAfter = stockBefore - calculatedItemsCount
    if (stockAfter < 0 || stockAfter <= targetProd.alert_threshold) {
      isStockAlert = true
    }
  } else if (kind === 'stock_addition') {
    stockAfter = stockBefore + calculatedItemsCount
  }

  // Calcul du prix
  const unitPrice = kind === 'stock_addition'
    ? (targetProd.unit_cost || targetProd.unit_price || 0)
    : (targetProd.unit_price || 0)

  const totalAmount = calculatedItemsCount * unitPrice
  const confidence = matches[0].name.toLowerCase().trim() === cleanText ? 98 : 85

  return {
    isMatch: true,
    transactionKind: kind,
    matchedProduct: targetProd,
    requestedQty: qty,
    calculatedItemsCount,
    packagingUsed,
    unitPrice,
    totalAmount,
    stockBefore,
    stockAfter,
    isStockAlert,
    confidence,
    alternativeVariants
  }
}
