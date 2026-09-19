/**
 * smartProductParser.ts
 * Moteur NLP de saisie intelligente de produits en une seule phrase pour le commerce africain.
 * Permet d'extraire : Nom, Stock, Unité/Conditionnement, Multiplicateur/Lot, Prix d'achat, Prix de vente, Seuil d'alerte, Catégorie et Mode (Détail, Demi-Gros, Grossiste).
 */

import { normalizeProductName } from '@/lib/productUtils'

export type TradeType = 'retail' | 'semi_wholesale' | 'wholesale'

export interface ParsedProductResult {
  name: string
  initial_stock: number
  unit_cost: number
  unit_price: number
  alert_threshold: number
  category: string
  unit: string
  trade_type: TradeType
  multiplier: number
  packaging_name: string
  packages_count?: number
  package_cost?: number
  wholesale_price?: number
  half_package_price?: number
  quarter_package_price?: number
  lot_quantity: number
  lot_price: number
  barcode?: string
  confidence: number // 0 à 100
  rawInput: string
  detectedTokens: {
    name?: string
    stock?: string
    unit?: string
    cost?: string
    price?: string
    wholesalePrice?: string
    halfPrice?: string
    quarterPrice?: string
    lot?: string
    alert?: string
    category?: string
  }
}

// Mots-clés pour auto-catégorisation
const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: 'Boissons & Brasserie',
    keywords: [
      'coca', 'fanta', 'sprite', 'pepsi', 'orangina', 'malt', 'malta', 'guinness',
      'castel', 'beaufort', 'heineken', '33 export', 'mutzig', 'doppel', 'biere', 'bière',
      'vin', 'whisky', 'rhum', 'jus', 'canette', 'chivita', 'ceres', 'eau', 'minérale',
      'fifa', 'possotome', 'possotomè', 'kirene', 'sirop', 'boisson', 'boissons', 'champagne',
      'energy', 'red bull', 'xxl', 'panaché', 'flag', 'sobebra', 'brakina', 'solibra', 'star'
    ],
  },
  {
    category: 'Épicerie & Vivres',
    keywords: [
      'riz', 'brisure', 'huile', 'dinor', 'mayor', 'spaghetti', 'pâtes', 'pates', 'macaroni',
      'sucre', 'sel', 'farine', 'levure', 'tomate', 'salsa', 'gino', 'conserve', 'sardine',
      'thon', 'geisha', 'mayonnaise', 'calvé', 'calve', 'cube', 'maggi', 'jumbo', 'oignon',
      'ail', 'piment', 'couscous', 'atieke', 'attiéké', 'tapioca', 'gari', 'haricot', 'biscuit',
      'chocolat', 'bonbon', 'chicorée', 'café', 'nescafé', 'thé', 'vinaigre', 'moutarde', 'poivre'
    ],
  },
  {
    category: 'Produits Laitiers',
    keywords: [
      'lait', 'nido', 'bonnet rouge', 'peak', 'gloria', 'yaourt', 'fromage', 'beurre',
      'vache qui rit', 'margarine', 'bleu band', 'crème', 'creme', 'tartina'
    ],
  },
  {
    category: 'Hygiène & Entretien',
    keywords: [
      'savon', 'fanico', 'bf', 'omo', 'ariel', 'madar', 'persil', 'javel', 'lacroix',
      'dentifrice', 'colgate', 'close up', 'brosse', 'détergent', 'detergent', 'éponge',
      'eponge', 'couche', 'pampers', 'lingette', 'serviette', 'papier hygiénique',
      'shampooing', 'shampoing', 'pommade', 'vaseline', 'parfum', 'savonnette', 'savon noir',
      'dettol', 'gillette', 'rasoir', 'coton'
    ],
  },
  {
    category: 'Quincaillerie & Énergie',
    keywords: [
      'pile', 'tiger', 'energizer', 'ampoule', 'led', 'allumette', 'torche', 'bougie',
      'câble', 'cable', 'prise', 'cadenas', 'clou', 'ampoules', 'piles', 'gaz', 'bouteille gaz'
    ],
  },
  {
    category: 'Papeterie',
    keywords: [
      'cahier', 'cahiers', 'stylo', 'stylos', 'bic', 'crayon', 'crayons', 'gomme', 'règle',
      'regle', 'taille-crayon', 'ardoise', 'livre', 'rame', 'papier a4', 'registre'
    ],
  },
]

/**
 * Détecte la catégorie la plus probable selon le nom du produit
 */
export function detectProductCategory(name: string): string {
  const lower = name.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lower))) {
      return rule.category
    }
  }
  return 'Divers'
}

/**
 * Parseur principal de texte pour création de produit avec gestion multi-paliers
 */
export function parseSmartProductText(input: string): ParsedProductResult {
  const raw = (input || '').trim()
  if (!raw) {
    return {
      name: '',
      initial_stock: 0,
      unit_cost: 0,
      unit_price: 0,
      alert_threshold: 5,
      category: 'Divers',
      unit: 'unité',
      trade_type: 'retail',
      multiplier: 1,
      packaging_name: '',
      packages_count: 0,
      package_cost: 0,
      wholesale_price: 0,
      half_package_price: 0,
      quarter_package_price: 0,
      lot_quantity: 0,
      lot_price: 0,
      confidence: 0,
      rawInput: raw,
      detectedTokens: {},
    }
  }

  let text = raw

  // ── Normalisation des abréviations monétaires k / K (ex: 20k -> 20000, 6.5k -> 6500, 6k5 -> 6500) ──
  text = text.replace(/\b(\d+)[kK](\d+)\b/g, (_, p1, p2) => {
    const dec = p2.length === 1 ? Number(p2) * 100 : Number(p2)
    return String(Number(p1) * 1000 + dec)
  })
  text = text.replace(/\b(\d+(?:[.,]\d+)?)\s*[kK]\b/g, (_, num) => {
    return String(Math.round(parseFloat(num.replace(',', '.')) * 1000))
  })

  // ── Normalisation des séparateurs de milliers (ex: 20 000 -> 20000, 1 500 -> 1500) ──
  text = text.replace(/\b(\d{1,3})[ _](\d{3})\b/g, '$1$2')
  text = text.replace(/\b(\d{1,3})[ _](\d{3})\b/g, '$1$2')

  const detectedTokens: ParsedProductResult['detectedTokens'] = {}

  let multiplier = 1
  let packagesCount = 0
  let packageCost = 0
  let wholesalePrice = 0
  let halfPackagePrice = 0
  let quarterPackagePrice = 0
  let unitCost = 0
  let unitPrice = 0
  let lotQuantity = 0
  let lotPrice = 0
  let initialStock = 0
  let unit = 'unité'
  let packagingName = ''
  let tradeType: TradeType = 'retail'

  // ── 1. EXTRACTION DES CONTENANCES COMPOSÉES (ex: "10 cartons de 24", "10 ctn 25", "5 packs de 6") ──
  const compoundPkgRegex = /\b(\d+(?:[.,]\d+)?)\s*(cartons?|catons?|ctns?|sacs?|casiers?|packs?|fardeaux?|bidons?)(?:\s+(?:de|par|x)\s*|\s+)(\d{1,3})\b/i
  const compoundMatch = text.match(compoundPkgRegex)
  if (compoundMatch) {
    packagesCount = Number(compoundMatch[1].replace(',', '.')) || 0
    const rawPkg = compoundMatch[2].toLowerCase()
    multiplier = Number(compoundMatch[3]) || 1

    if (/^cartons?|catons?|ctns?$/.test(rawPkg)) {
      unit = 'carton'
      packagingName = 'carton'
      tradeType = 'wholesale'
    } else if (/^sacs?$/.test(rawPkg)) {
      unit = 'sac'
      packagingName = 'sac'
      tradeType = 'wholesale'
    } else if (/^casiers?$/.test(rawPkg)) {
      unit = 'casier'
      packagingName = 'casier'
      tradeType = 'wholesale'
    } else if (/^packs?|fardeaux?$/.test(rawPkg)) {
      unit = 'pack'
      packagingName = 'pack'
      tradeType = 'semi_wholesale'
      lotQuantity = multiplier
    } else if (/^bidons?$/.test(rawPkg)) {
      unit = 'bidon'
      packagingName = 'bidon'
      tradeType = 'wholesale'
    }

    detectedTokens.stock = `${packagesCount} ${rawPkg}`
    detectedTokens.lot = `de ${multiplier}`
    text = text.replace(compoundMatch[0], ' ')
  }

  // ── 2. EXTRACTION DU PRIX QUART DE CARTON (ex: "quart 2650", "1/4 carton 2650") ──
  const quarterRegex = /\b(?:quart\s*(?:de\s*)?(?:carton)?|1\/4\s*(?:de\s*)?(?:carton)?)\s*[:=àa@]?\s*(\d+(?:[\s_]\d+)*)\b/i
  const quarterMatch = text.match(quarterRegex)
  if (quarterMatch) {
    quarterPackagePrice = Number(quarterMatch[1].replace(/[\s_]/g, '')) || 0
    detectedTokens.quarterPrice = quarterMatch[0]
    text = text.replace(quarterMatch[0], ' ')
  }

  // ── 3. EXTRACTION DU PRIX DEMI-CARTON (ex: "demi 5200", "1/2 carton 5200", "demi-carton 5200") ──
  const halfRegex = /\b(?:demi\s*(?:de\s*)?(?:carton)?|demi-carton|1\/2\s*(?:de\s*)?(?:carton)?)\s*[:=àa@]?\s*(\d+(?:[\s_]\d+)*)\b/i
  const halfMatch = text.match(halfRegex)
  if (halfMatch) {
    halfPackagePrice = Number(halfMatch[1].replace(/[\s_]/g, '')) || 0
    detectedTokens.halfPrice = halfMatch[0]
    text = text.replace(halfMatch[0], ' ')
  }

  // ── 4. EXTRACTION DU SEUIL DÉGRESSIF / PAR LOT (ex: "a partir de 6 a 450", "par 6 a 450", "3 pour 1000", "lot de 3 a 1400", "lot 3 1400") ──
  const thresholdRegex = /\b(?:(?:[àa]\s*partir\s*de|lot\s*(?:de)?|par)\s+(\d+)\s*(?:[àa@:]\s*(\d+(?:[\s_]\d+)*)|\s+pour\s+(\d+(?:[\s_]\d+)*)|\s+(\d{3,}(?:[\s_]\d+)*))|(\d+)\s+pour\s+(\d+(?:[\s_]\d+)*))\b/i
  const thresholdMatch = text.match(thresholdRegex)
  if (thresholdMatch) {
    if (thresholdMatch[1]) {
      lotQuantity = Number(thresholdMatch[1]) || 0
      if (thresholdMatch[2]) {
        // Prix unitaire dégressif par pièce (ex: à partir de 6 à 450)
        const unitLotPrice = Number(thresholdMatch[2].replace(/[\s_]/g, '')) || 0
        lotPrice = unitLotPrice * lotQuantity
      } else if (thresholdMatch[3]) {
        // Prix global du lot (ex: lot de 3 pour 1400)
        lotPrice = Number(thresholdMatch[3].replace(/[\s_]/g, '')) || 0
      } else if (thresholdMatch[4]) {
        // Prix direct sans mot de liaison (ex: lot 3 1400)
        lotPrice = Number(thresholdMatch[4].replace(/[\s_]/g, '')) || 0
      }
    } else if (thresholdMatch[5]) {
      // Formule directe "3 pour 1000"
      lotQuantity = Number(thresholdMatch[5]) || 0
      lotPrice = Number(thresholdMatch[6].replace(/[\s_]/g, '')) || 0
    }
    detectedTokens.lot = thresholdMatch[0]
    text = text.replace(thresholdMatch[0], ' ')
  }

  // ── 5. EXTRACTION DU PRIX CARTON COMPLET DE VENTE (ex: "carton 10000", "vente carton 10000", "pack 3200", "gros 10000") ──
  const wholesalePriceRegex = /\b(?:vente\s*carton|pv\s*carton|carton|vente\s*pack|pv\s*pack|pack|vente\s*sac|pv\s*sac|sac|vente\s*casier|pv\s*casier|casier|vente\s*gros|pv\s*gros|gros)\s*[:=àa@]?\s*(\d+(?:[\s_]\d+)*)\b/i
  const wholesaleMatch = text.match(wholesalePriceRegex)
  if (wholesaleMatch) {
    wholesalePrice = Number(wholesaleMatch[1].replace(/[\s_]/g, '')) || 0
    detectedTokens.wholesalePrice = wholesaleMatch[0]
    text = text.replace(wholesaleMatch[0], ' ')
  }

  // ── 5.5 EXTRACTION CONTENANCE EN PIÈCES / LOT (ex: "25 piece", "24 pcs", "12 morceaux", "24 btls") ──
  if (multiplier === 1) {
    const capacityRegex = /\b(\d{1,3})\s*(?:pi[eè]ces?|pcs?|morceaux?|sachets?|unit[eé]s?|bouteilles?|btls?)\b/i
    const capMatch = text.match(capacityRegex)
    if (capMatch) {
      const extractedCap = Number(capMatch[1]) || 0
      if (extractedCap > 1) {
        multiplier = extractedCap
        if (lotQuantity === 0) lotQuantity = extractedCap
        detectedTokens.lot = capMatch[0]
        text = text.replace(capMatch[0], ' ')
      }
    }
  }

  // ── 6. EXTRACTION DU PRIX DE REVENTE À LA PIÈCE / DÉTAIL (ex: "piece 500", "détail 500", "bouteille 600") ──
  const piecePriceRegex = /\b(?:pi[eè]ces?|pcs?|unit[eé]s?|d[eé]tails?|bouteilles?|bo[iî]tes?)\s*[:=àa@]?\s*(\d+(?:[\s_]\d+)*)\b/i
  const piecePriceMatch = text.match(piecePriceRegex)
  if (piecePriceMatch) {
    unitPrice = Number(piecePriceMatch[1].replace(/[\s_]/g, '')) || 0
    detectedTokens.price = piecePriceMatch[0]
    text = text.replace(piecePriceMatch[0], ' ')
  }

  // ── 7. EXTRACTION DU PRIX D'ACHAT (Coût / PA) ──
  const costRegex = /\b(?:prix\s*d['’]?\s*achat|prix\s*achat|achat\s*carton|pa\s*carton|co[uû]t|achat|pa|p\.a|revient)\s*[:=]?\s*(\d+(?:[\s_]\d+)*)\b/i
  const costMatch = text.match(costRegex)
  if (costMatch) {
    const rawVal = costMatch[1].replace(/[\s_]/g, '')
    const costVal = Number(rawVal) || 0
    detectedTokens.cost = costMatch[0]

    if (multiplier > 1) {
      packageCost = costVal
      unitCost = Math.round((costVal / multiplier) * 100) / 100
    } else {
      unitCost = costVal
      packageCost = costVal
    }
    text = text.replace(costMatch[0], ' ')
  }

  // ── 8. EXTRACTION DU PRIX DE VENTE GÉNÉRIQUE (si non extrait via les paliers spécifiques) ──
  if (unitPrice === 0) {
    const priceRegex = /\b(?:prix\s*de\s*vente|prix\s*vente|vente|pv|p\.v|prix)\s*[:=]?\s*(\d+(?:[\s_]\d+)*)\b/i
    const priceMatch = text.match(priceRegex)
    if (priceMatch) {
      const rawVal = priceMatch[1].replace(/[\s_]/g, '')
      unitPrice = Number(rawVal) || 0
      detectedTokens.price = priceMatch[0]
      text = text.replace(priceMatch[0], ' ')
    } else {
      // Essayer "à 900" ou "@ 900"
      const aPriceRegex = /(?:^|\s)(?:[àa@])\s*(\d+(?:[\s_]\d+)*)(?:\s|$)/i
      const aPriceMatch = text.match(aPriceRegex)
      if (aPriceMatch) {
        const rawVal = aPriceMatch[1].replace(/[\s_]/g, '')
        unitPrice = Number(rawVal) || 0
        detectedTokens.price = aPriceMatch[0].trim()
        text = text.replace(aPriceMatch[0], ' ')
      }
    }
  }

  // ── 9. EXTRACTION DU SEUIL D'ALERTE ──
  let alertThreshold = 5
  const alertRegex = /\b(?:seuil|alerte|min|minimum)\s*[:=]?\s*(\d+)\b/i
  const alertMatch = text.match(alertRegex)
  if (alertMatch) {
    alertThreshold = Number(alertMatch[1]) || 5
    detectedTokens.alert = alertMatch[0]
    text = text.replace(alertMatch[0], ' ')
  }

  // ── 10. MULTIPLICATEUR ISOLÉ SI PAS ENCORE DÉTECTÉ (ex: "de 24", "par 6", "25 piece", "24 pcs") ──
  if (multiplier === 1) {
    const lotRegex = /\b(?:de|par|x)\s*(\d+)\b/i
    const lotMatch = text.match(lotRegex)
    if (lotMatch) {
      const extractedLot = Number(lotMatch[1]) || 0
      if (extractedLot > 1) {
        multiplier = extractedLot
        if (lotQuantity === 0) lotQuantity = extractedLot
        detectedTokens.lot = lotMatch[0]
        text = text.replace(lotMatch[0], ' ')
      }
    } else {
      const capacityRegex = /\b(\d{1,3})\s*(?:pi[eè]ces?|pcs?|morceaux?|sachets?|unit[eé]s?|bouteilles?|btls?)\b/i
      const capMatch = text.match(capacityRegex)
      if (capMatch) {
        const extractedCap = Number(capMatch[1]) || 0
        if (extractedCap > 1) {
          multiplier = extractedCap
          if (lotQuantity === 0) lotQuantity = extractedCap
          detectedTokens.lot = capMatch[0]
          text = text.replace(capMatch[0], ' ')
        }
      }
    }
  }

  // ── 11. EXTRACTION QUANTITÉ / UNITÉ SIMPLE (si pas compound) ──
  if (packagesCount === 0) {
    const qtyUnitRegex = /\b(\d+(?:[.,]\d+)?)\s*(cartons?|catons?|ctns?|sacs?|casiers?|ballots?|bidons?|packs?|fardeaux?|fardeau|bouteilles?|btls?|paquets?|pqts?|bo[iî]tes?|pots?|sachets?|pi[eè]ces?|pcs?|unit[eé]s?)\b/i
    const qtyUnitMatch = text.match(qtyUnitRegex)
    if (qtyUnitMatch) {
      const parsedQty = Number(qtyUnitMatch[1].replace(',', '.')) || 0
      const rawUnit = qtyUnitMatch[2].toLowerCase()
      detectedTokens.stock = qtyUnitMatch[1]
      detectedTokens.unit = rawUnit

      if (/^cartons?|catons?|ctns?$/.test(rawUnit)) {
        unit = 'carton'
        packagingName = 'carton'
        tradeType = 'wholesale'
        packagesCount = parsedQty
      } else if (/^sacs?$/.test(rawUnit)) {
        unit = 'sac'
        packagingName = 'sac'
        tradeType = 'wholesale'
        packagesCount = parsedQty
      } else if (/^casiers?$/.test(rawUnit)) {
        unit = 'casier'
        packagingName = 'casier'
        tradeType = 'wholesale'
        packagesCount = parsedQty
      } else if (/^ballots?$/.test(rawUnit)) {
        unit = 'ballot'
        packagingName = 'ballot'
        tradeType = 'wholesale'
        packagesCount = parsedQty
      } else if (/^packs?|fardeaux?|fardeau$/.test(rawUnit)) {
        unit = 'pack'
        packagingName = 'pack'
        tradeType = 'semi_wholesale'
        packagesCount = parsedQty
        if (lotQuantity === 0) lotQuantity = multiplier > 1 ? multiplier : 6
      } else if (/^bidons?$/.test(rawUnit)) {
        unit = 'bidon'
        packagingName = 'bidon'
        packagesCount = parsedQty
        tradeType = parsedQty >= 10 ? 'wholesale' : 'retail'
      } else if (/^bouteilles?|btls?$/.test(rawUnit)) {
        unit = 'bouteille'
        tradeType = 'retail'
        initialStock = parsedQty
      } else if (/^paquets?|pqts?$/.test(rawUnit)) {
        unit = 'paquet'
        tradeType = 'retail'
        initialStock = parsedQty
      } else if (/^bo[iî]tes?$/.test(rawUnit)) {
        unit = 'boîte'
        tradeType = 'retail'
        initialStock = parsedQty
      } else if (/^pots?$/.test(rawUnit)) {
        unit = 'pot'
        tradeType = 'retail'
        initialStock = parsedQty
      } else if (/^sachets?$/.test(rawUnit)) {
        unit = 'sachet'
        tradeType = 'retail'
        initialStock = parsedQty
      } else {
        unit = 'unité'
        tradeType = 'retail'
        initialStock = parsedQty
      }
      text = text.replace(qtyUnitMatch[0], ' ')
    } else {
      // Nombre en tête de phrase (ex: "100 cahiers à 250")
      const leadingQtyRegex = /^\s*(\d+(?:[.,]\d+)?)\s+/
      const leadingQtyMatch = text.match(leadingQtyRegex)
      if (leadingQtyMatch) {
        initialStock = Number(leadingQtyMatch[1].replace(',', '.')) || 0
        detectedTokens.stock = leadingQtyMatch[1]
        text = text.replace(leadingQtyMatch[0], ' ')
      } else {
        const loneQtyRegex = /\b(\d+)\b/
        const loneQtyMatch = text.match(loneQtyRegex)
        if (loneQtyMatch) {
          const val = Number(loneQtyMatch[1])
          if (val < 1000 || (unitPrice > 0 && val !== unitPrice)) {
            initialStock = val
            detectedTokens.stock = loneQtyMatch[1]
            text = text.replace(loneQtyMatch[0], ' ')
          }
        }
      }
    }
  }

  // ── 12. CALCUL DU STOCK TOTAL EN UNITÉS (Déconditionnement direct) ──
  if (packagesCount > 0) {
    if (multiplier > 1) {
      initialStock = packagesCount * multiplier
    } else {
      initialStock = packagesCount
    }
  }

  // ── 13. DÉTECTION DES NOMBRES RESTANTS (PRIX NON BALISÉS) ──
  const remainingNumbers = Array.from(text.matchAll(/\b(\d+)\b/g))
    .map(m => Number(m[1]))
    .filter(n => n >= 25)

  if (remainingNumbers.length >= 1) {
    if (unitPrice === 0 && remainingNumbers.length === 1) {
      unitPrice = remainingNumbers[0]
      detectedTokens.price = String(remainingNumbers[0])
      text = text.replace(String(remainingNumbers[0]), ' ')
    } else if (unitCost === 0 && remainingNumbers.length === 1) {
      const single = remainingNumbers[0]
      if ((multiplier > 1 || packagesCount > 0) && single >= 1000 && packageCost === 0) {
        packageCost = single
        unitCost = multiplier > 1 ? Math.round(packageCost / multiplier) : packageCost
        detectedTokens.cost = String(packageCost)
      } else {
        unitCost = single
        detectedTokens.cost = String(single)
      }
      text = text.replace(String(single), ' ')
    } else if (remainingNumbers.length >= 2) {
      const [n1, n2] = [remainingNumbers[0], remainingNumbers[1]]
      if (unitCost === 0 && unitPrice === 0) {
        if ((multiplier > 1 || packagesCount > 0) && Math.max(n1, n2) >= 1000 && Math.min(n1, n2) < Math.max(n1, n2) / 2) {
          // Exemple : 20000 et 500 avec carton (ex: 10 ctn bf 20k 500)
          // Le grand nombre est le coût du carton, le petit est le prix détail de la pièce
          packageCost = Math.max(n1, n2)
          unitCost = multiplier > 1 ? Math.round(packageCost / multiplier) : packageCost
          unitPrice = Math.min(n1, n2)
          detectedTokens.cost = String(packageCost)
          detectedTokens.price = String(unitPrice)
        } else {
          unitCost = Math.min(n1, n2)
          unitPrice = Math.max(n1, n2)
          detectedTokens.cost = String(unitCost)
          detectedTokens.price = String(unitPrice)
        }
      } else if (unitCost === 0) {
        if ((multiplier > 1 || packagesCount > 0) && n1 >= 1000 && packageCost === 0) {
          packageCost = n1
          unitCost = multiplier > 1 ? Math.round(packageCost / multiplier) : packageCost
          detectedTokens.cost = String(packageCost)
        } else {
          unitCost = n1
          detectedTokens.cost = String(n1)
        }
      } else if (unitPrice === 0) {
        unitPrice = n2
        detectedTokens.price = String(n2)
      }
      text = text.replace(String(n1), ' ').replace(String(n2), ' ')
    }
  }

  // ── 14. HARMONISATION AUTOMATIQUE DES PALIERS SI NON EXPLICITES ──
  // Si on a un carton (ex: multiplier = 24)
  if (multiplier > 1) {
    // Si wholesalePrice a été tapé mais pas unitPrice
    if (wholesalePrice > 0 && unitPrice === 0) {
      unitPrice = Math.round(wholesalePrice / multiplier)
    }
    // Si unitPrice a été tapé mais pas wholesalePrice
    if (wholesalePrice === 0 && unitPrice > 0) {
      wholesalePrice = unitPrice * multiplier
    }
    // Si demi carton pas spécifié et carton présent
    if (halfPackagePrice === 0 && wholesalePrice > 0) {
      // Déduction suggérée du demi-carton (légèrement supérieur à la moitié du gros)
      halfPackagePrice = Math.round((wholesalePrice / 2) * 1.04 / 50) * 50
    }
    // Si quart carton pas spécifié et carton présent
    if (quarterPackagePrice === 0 && wholesalePrice > 0 && multiplier >= 8) {
      quarterPackagePrice = Math.round((wholesalePrice / 4) * 1.06 / 25) * 25
    }
    // Si lot dégressif (ex: lot de 3) pas spécifié et conditionnement présent
    if (lotQuantity === 0 && multiplier >= 4 && unitPrice > 0) {
      lotQuantity = 3
      lotPrice = Math.round((unitPrice * 3 * 0.95) / 25) * 25
    }
  }

  // ── 15. NETTOYAGE DU NOM DU PRODUIT ──
  let cleanName = text
    .replace(/[;,\-_:]/g, ' ')
    .replace(/(?:^|\s)(?:[àa@]|prix|vente|achat|pa|pv|cout|coût|seuil|alerte|min|demi|quart|carton|caton|ctn|pack|casier|sac)(?:\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  cleanName = cleanName.replace(/^(?:à|a|de|du|des|le|la|les|en|pour)\s+/i, '').trim()

  const normalizedName = normalizeProductName(cleanName)
  detectedTokens.name = normalizedName

  // Catégorie
  const category = detectProductCategory(normalizedName)
  detectedTokens.category = category

  // Ajustement tradeType
  if (tradeType === 'semi_wholesale') {
    if (lotQuantity === 0) lotQuantity = multiplier > 1 ? multiplier : 6
    if (lotPrice === 0 && wholesalePrice > 0) {
      lotPrice = wholesalePrice
    }
  }

  let confidence = 20
  if (normalizedName.length >= 2) confidence += 30
  if (initialStock > 0) confidence += 20
  if (unitPrice > 0 || wholesalePrice > 0) confidence += 20
  if (unitCost > 0 || packageCost > 0) confidence += 10

  return {
    name: normalizedName,
    initial_stock: initialStock,
    unit_cost: unitCost,
    unit_price: unitPrice,
    alert_threshold: alertThreshold,
    category,
    unit,
    trade_type: tradeType,
    multiplier,
    packaging_name: packagingName,
    packages_count: packagesCount,
    package_cost: packageCost,
    wholesale_price: wholesalePrice,
    half_package_price: halfPackagePrice,
    quarter_package_price: quarterPackagePrice,
    lot_quantity: lotQuantity,
    lot_price: lotPrice,
    confidence: Math.min(100, confidence),
    rawInput: raw,
    detectedTokens,
  }
}

