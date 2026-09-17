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
 * Parseur principal de texte pour création de produit
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
      lot_quantity: 0,
      lot_price: 0,
      confidence: 0,
      rawInput: raw,
      detectedTokens: {},
    }
  }

  let text = raw
  const detectedTokens: ParsedProductResult['detectedTokens'] = {}

  // ── 1. EXTRACTION DU PRIX D'ACHAT (Coût / PA) ──
  let unitCost = 0
  const costRegex = /\b(?:prix\s*d['’]?\s*achat|prix\s*achat|co[uû]t|achat|pa|p\.a|revient)\s*[:=]?\s*(\d+(?:[\s_]\d+)*)\b/i
  const costMatch = text.match(costRegex)
  if (costMatch) {
    const rawVal = costMatch[1].replace(/[\s_]/g, '')
    unitCost = Number(rawVal) || 0
    detectedTokens.cost = costMatch[0]
    text = text.replace(costMatch[0], ' ')
  }

  // ── 2. EXTRACTION DU PRIX DE VENTE (PV / Vente / à X) ──
  let unitPrice = 0
  const priceRegex = /\b(?:prix\s*de\s*vente|prix\s*vente|vente|pv|p\.v|prix)\s*[:=]?\s*(\d+(?:[\s_]\d+)*)\b/i
  const priceMatch = text.match(priceRegex)
  if (priceMatch) {
    const rawVal = priceMatch[1].replace(/[\s_]/g, '')
    unitPrice = Number(rawVal) || 0
    detectedTokens.price = priceMatch[0]
    text = text.replace(priceMatch[0], ' ')
  } else {
    // Essayer "à 900" ou "@ 900" (attention au caractère unicode 'à')
    const aPriceRegex = /(?:^|\s)(?:[àa@])\s*(\d+(?:[\s_]\d+)*)(?:\s|$)/i
    const aPriceMatch = text.match(aPriceRegex)
    if (aPriceMatch) {
      const rawVal = aPriceMatch[1].replace(/[\s_]/g, '')
      unitPrice = Number(rawVal) || 0
      detectedTokens.price = aPriceMatch[0].trim()
      text = text.replace(aPriceMatch[0], ' ')
    }
  }

  // ── 3. EXTRACTION DU SEUIL D'ALERTE ──
  let alertThreshold = 5
  const alertRegex = /\b(?:seuil|alerte|min|minimum)\s*[:=]?\s*(\d+)\b/i
  const alertMatch = text.match(alertRegex)
  if (alertMatch) {
    alertThreshold = Number(alertMatch[1]) || 5
    detectedTokens.alert = alertMatch[0]
    text = text.replace(alertMatch[0], ' ')
  }

  // ── 4. EXTRACTION DU MULTIPLICATEUR / PACKAGING LOT (ex: "de 24", "par 6", "x12") ──
  let multiplier = 1
  let lotQuantity = 0
  let lotPrice = 0
  const lotRegex = /\b(?:de|par|x)\s*(\d+)\b/i
  const lotMatch = text.match(lotRegex)
  if (lotMatch) {
    const extractedLot = Number(lotMatch[1]) || 0
    if (extractedLot > 1) {
      multiplier = extractedLot
      lotQuantity = extractedLot
      detectedTokens.lot = lotMatch[0]
      text = text.replace(lotMatch[0], ' ')
    }
  }

  // ── 5. EXTRACTION DE LA QUANTITÉ ET DE L'UNITÉ / CONDITIONNEMENT ──
  let initialStock = 0
  let unit = 'unité'
  let packagingName = ''
  let tradeType: TradeType = 'retail'

  // Regex pour quantité + unité combinée (ex: "50 cartons", "25 sacs", "10 packs", "30 paquets")
  const qtyUnitRegex = /\b(\d+(?:[.,]\d+)?)\s*(cartons?|ctns?|sacs?|casiers?|ballots?|bidons?|packs?|fardeaux?|fardeau|bouteilles?|btls?|paquets?|pqts?|bo[iî]tes?|pots?|sachets?|pi[eè]ces?|pcs?|unit[eé]s?)\b/i
  const qtyUnitMatch = text.match(qtyUnitRegex)

  if (qtyUnitMatch) {
    initialStock = Number(qtyUnitMatch[1].replace(',', '.')) || 0
    const rawUnit = qtyUnitMatch[2].toLowerCase()
    detectedTokens.stock = qtyUnitMatch[1]
    detectedTokens.unit = rawUnit

    if (/^cartons?|ctns?$/.test(rawUnit)) {
      unit = 'carton'
      packagingName = 'carton'
      tradeType = 'wholesale'
      if (multiplier === 1) multiplier = 24
    } else if (/^sacs?$/.test(rawUnit)) {
      unit = 'sac'
      packagingName = 'sac'
      tradeType = 'wholesale'
      if (multiplier === 1) multiplier = 1
    } else if (/^casiers?$/.test(rawUnit)) {
      unit = 'casier'
      packagingName = 'casier'
      tradeType = 'wholesale'
      if (multiplier === 1) multiplier = 24
    } else if (/^ballots?$/.test(rawUnit)) {
      unit = 'ballot'
      packagingName = 'ballot'
      tradeType = 'wholesale'
    } else if (/^packs?|fardeaux?|fardeau$/.test(rawUnit)) {
      unit = 'pack'
      packagingName = 'pack'
      tradeType = 'semi_wholesale'
      if (lotQuantity === 0) lotQuantity = multiplier > 1 ? multiplier : 6
    } else if (/^bidons?$/.test(rawUnit)) {
      unit = 'bidon'
      packagingName = 'bidon'
      tradeType = initialStock >= 10 ? 'wholesale' : 'retail'
    } else if (/^bouteilles?|btls?$/.test(rawUnit)) {
      unit = 'bouteille'
      tradeType = 'retail'
    } else if (/^paquets?|pqts?$/.test(rawUnit)) {
      unit = 'paquet'
      tradeType = 'retail'
    } else if (/^bo[iî]tes?$/.test(rawUnit)) {
      unit = 'boîte'
      tradeType = 'retail'
    } else if (/^pots?$/.test(rawUnit)) {
      unit = 'pot'
      tradeType = 'retail'
    } else if (/^sachets?$/.test(rawUnit)) {
      unit = 'sachet'
      tradeType = 'retail'
    } else {
      unit = 'unité'
      tradeType = 'retail'
    }

    text = text.replace(qtyUnitMatch[0], ' ')
  } else {
    // Si pas d'unité explicite, chercher un nombre en tête de phrase (ex: "100 cahiers à 250")
    const leadingQtyRegex = /^\s*(\d+(?:[.,]\d+)?)\s+/
    const leadingQtyMatch = text.match(leadingQtyRegex)
    if (leadingQtyMatch) {
      initialStock = Number(leadingQtyMatch[1].replace(',', '.')) || 0
      detectedTokens.stock = leadingQtyMatch[1]
      text = text.replace(leadingQtyMatch[0], ' ')
    } else {
      // Ou un nombre isolé pour la quantité
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

  // ── 6. DÉTECTION DES NOMBRES RESTANTS (PRIX NON BALISÉS) ──
  // Si le prix de vente ou d'achat n'a pas été trouvé mais qu'il reste 1 ou 2 nombres dans le texte
  const remainingNumbers = Array.from(text.matchAll(/\b(\d+(?:[\s_]\d+)*)\b/g))
    .map(m => Number(m[1].replace(/[\s_]/g, '')))
    .filter(n => n >= 25) // Éviter de prendre des petits chiffres comme des prix en FCFA

  if (unitPrice === 0 && remainingNumbers.length >= 1) {
    if (remainingNumbers.length === 1) {
      unitPrice = remainingNumbers[0]
      detectedTokens.price = String(remainingNumbers[0])
      text = text.replace(String(remainingNumbers[0]), ' ')
    } else if (remainingNumbers.length >= 2) {
      // Deux nombres : le plus petit est souvent le coût d'achat, le plus grand est le prix de vente
      const [n1, n2] = [remainingNumbers[0], remainingNumbers[1]]
      if (unitCost === 0) {
        unitCost = Math.min(n1, n2)
        unitPrice = Math.max(n1, n2)
        detectedTokens.cost = String(unitCost)
        detectedTokens.price = String(unitPrice)
      } else {
        unitPrice = n2
        detectedTokens.price = String(n2)
      }
      text = text.replace(String(n1), ' ').replace(String(n2), ' ')
    }
  }

  // ── 7. NETTOYAGE FINAL DU NOM DU PRODUIT ──
  let cleanName = text
    .replace(/[;,\-_:]/g, ' ')
    .replace(/(?:^|\s)(?:[àa@]|prix|vente|achat|pa|pv|cout|coût|seuil|alerte|min)(?:\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Supprimer les mots de liaison en début
  cleanName = cleanName.replace(/^(?:à|a|de|du|des|le|la|les|en|pour)\s+/i, '').trim()

  const normalizedName = normalizeProductName(cleanName)
  detectedTokens.name = normalizedName

  // ── 8. DÉTECTION DE LA CATÉGORIE ──
  const category = detectProductCategory(normalizedName)
  detectedTokens.category = category

  // ── 9. AJUSTEMENTS DEMI-GROS / GROSSISTE ──
  if (tradeType === 'semi_wholesale') {
    if (lotQuantity === 0) lotQuantity = 6
    if (lotPrice === 0 && unitPrice > 0) {
      lotPrice = unitPrice // Le prix saisi pour un pack est le prix du pack
    }
  }

  // Calcul du score de confiance
  let confidence = 20
  if (normalizedName.length >= 2) confidence += 30
  if (initialStock > 0) confidence += 20
  if (unitPrice > 0) confidence += 20
  if (unitCost > 0) confidence += 10

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
    lot_quantity: lotQuantity,
    lot_price: lotPrice,
    confidence: Math.min(100, confidence),
    rawInput: raw,
    detectedTokens,
  }
}
