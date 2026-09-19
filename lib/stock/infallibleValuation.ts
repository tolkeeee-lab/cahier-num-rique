/**
 * infallibleValuation.ts
 *
 * Moteur mathématique infaillible de valorisation de stock et tarification multi-paliers.
 * Adapté aux réalités du commerce en Francs CFA :
 * - Aucun centime ni montant non circulant (pas de 20 834 F ni 4 166 F).
 * - Arrondis marchands stricts aux pièces réelles (multiples de 25 F, 50 F ou 100 F).
 * - Intégrité comptable : le total d'un carton complet = coût d'achat réel.
 * - Garde-fous : anti-vente à perte et anti-incohérence dégressive.
 */

export interface InfallibleValuationResult {
  // Coûts et marges unitaires
  unitCost: number
  unitSalePrice: number
  unitMargin: number
  unitMarginPercent: number

  // Stock physique
  totalPieces: number
  fullCartons: number
  loosePieces: number

  // Valorisation du magasin
  immobilizedPurchaseValue: number // Ce que le commerçant a déboursé pour ce stock
  potentialRevenue: number         // Argent qui rentrera si tout est vendu au détail
  potentialNetProfit: number       // Bénéfice net potentiel restant dans ces pièces

  // Rentabilité par carton complet
  cartonCost: number
  cartonRevenueDetail: number
  cartonNetProfitDetail: number
  cartonNetProfitPercent: number
}

export interface InfallibleTier {
  id: 'detail' | 'lot3' | 'lot6' | 'quarter' | 'half' | 'carton'
  label: string
  pieces: number
  suggestedPrice: number
  realCost: number
  netProfit: number
  marginPercent: number
  unitEquivalentPrice: number
  isLoss: boolean
  isInconsistent: boolean
}

/**
 * Arrondi monétaire commercial strict en FCFA.
 * Élimine les centimes et les unités non circulantes (1 F, 2 F, 4 F, 6 F, etc.).
 */
export function roundToCfaCurrency(amount: number, step: number = 25): number {
  if (isNaN(amount) || amount <= 0) return 0
  const safeStep = Math.max(5, step)
  return Math.round(amount / safeStep) * safeStep
}

/**
 * Calcule la valorisation infaillible du stock à partir des 4 données physiques du commerçant :
 * 1. Coût d'achat du carton
 * 2. Nombre de pièces dans le carton
 * 3. Prix de vente au détail
 * 4. Nombre de pièces restantes en rayon
 */
export function calculateInfallibleValuation(
  cartonCost: number,
  multiplier: number,
  unitSalePrice: number,
  currentStock: number
): InfallibleValuationResult {
  const safeCartonCost = Math.max(0, Math.round(cartonCost))
  const safeMult = Math.max(1, Math.round(multiplier))
  const safeSalePrice = Math.max(0, Math.round(unitSalePrice))
  const safeStock = Math.max(0, Math.round(currentStock))

  // 1. Coût de revient unitaire
  const rawUnitCost = safeCartonCost / safeMult
  // Arrondi monétaire propre du coût unitaire (si coût >= 200, par 25 F, sinon par 5 F)
  const unitCost = safeMult === 1
    ? safeCartonCost
    : roundToCfaCurrency(rawUnitCost, rawUnitCost >= 200 ? 25 : 5)

  // 2. Marge unitaire au détail
  const unitMargin = safeSalePrice - unitCost
  const unitMarginPercent = safeSalePrice > 0
    ? Math.round((unitMargin / safeSalePrice) * 100)
    : 0

  // 3. Décomposition du stock physique restant
  const fullCartons = Math.floor(safeStock / safeMult)
  const loosePieces = safeStock % safeMult

  // 4. Valeur d'achat réelle immobilisée en magasin
  // Règle d'or comptable : les cartons pleins valent exactement le prix d'achat carton déboursé,
  // et les pièces en vrac sont valorisées au coût unitaire propre.
  const immobilizedPurchaseValue = (fullCartons * safeCartonCost) + (loosePieces * unitCost)

  // 5. Chiffre d'affaires et bénéfice potentiel au détail
  const potentialRevenue = safeStock * safeSalePrice
  const potentialNetProfit = Math.max(0, potentialRevenue - immobilizedPurchaseValue)

  // 6. Rentabilité d'un carton complet vendu au détail
  const cartonRevenueDetail = safeMult * safeSalePrice
  const cartonNetProfitDetail = Math.max(0, cartonRevenueDetail - safeCartonCost)
  const cartonNetProfitPercent = cartonRevenueDetail > 0
    ? Math.round((cartonNetProfitDetail / cartonRevenueDetail) * 100)
    : 0

  return {
    unitCost,
    unitSalePrice: safeSalePrice,
    unitMargin,
    unitMarginPercent,
    totalPieces: safeStock,
    fullCartons,
    loosePieces,
    immobilizedPurchaseValue,
    potentialRevenue,
    potentialNetProfit,
    cartonCost: safeCartonCost,
    cartonRevenueDetail,
    cartonNetProfitDetail,
    cartonNetProfitPercent,
  }
}

/**
 * Génère la grille complète des 6 paliers infaillibles avec arrondis marchands stricts
 * et contrôle de cohérence anti-perte.
 */
export function generateInfalliblePriceTiers(
  cartonCost: number,
  multiplier: number,
  unitSalePrice: number
): InfallibleTier[] {
  const safeCartonCost = Math.max(0, Math.round(cartonCost))
  const safeMult = Math.max(1, Math.round(multiplier))
  const safeSalePrice = Math.max(0, Math.round(unitSalePrice))

  const valuation = calculateInfallibleValuation(safeCartonCost, safeMult, safeSalePrice, safeMult)
  const unitCost = valuation.unitCost

  const tiers: InfallibleTier[] = []

  // 1. Palier Détail (1 pièce)
  tiers.push({
    id: 'detail',
    label: 'Détail (1 pièce)',
    pieces: 1,
    suggestedPrice: safeSalePrice,
    realCost: unitCost,
    netProfit: safeSalePrice - unitCost,
    marginPercent: safeSalePrice > 0 ? Math.round(((safeSalePrice - unitCost) / safeSalePrice) * 100) : 0,
    unitEquivalentPrice: safeSalePrice,
    isLoss: safeSalePrice < unitCost,
    isInconsistent: false,
  })

  // 2. Palier Lot de 3 (si carton >= 3)
  if (safeMult >= 3) {
    const rawPrice = safeSalePrice * 3 * 0.96 // ~4% remise
    const price = roundToCfaCurrency(rawPrice, 25)
    const cost = unitCost * 3
    const profit = price - cost
    const unitEq = Math.round(price / 3)

    tiers.push({
      id: 'lot3',
      label: 'Lot de 3 pièces',
      pieces: 3,
      suggestedPrice: price,
      realCost: cost,
      netProfit: profit,
      marginPercent: price > 0 ? Math.round((profit / price) * 100) : 0,
      unitEquivalentPrice: unitEq,
      isLoss: price < cost,
      isInconsistent: unitEq > safeSalePrice,
    })
  }

  // 3. Palier Lot de 6 / Huitième (si carton >= 6)
  if (safeMult >= 6) {
    const pieces = safeMult >= 48 ? Math.round(safeMult / 8) : 6
    const label = safeMult >= 48 ? `1/8 Carton (${pieces} pcs)` : `Lot de 6 pièces`
    const rawPrice = safeSalePrice * pieces * 0.94 // ~6% remise
    const price = roundToCfaCurrency(rawPrice, pieces >= 10 ? 50 : 25)
    const cost = unitCost * pieces
    const profit = price - cost
    const unitEq = Math.round(price / pieces)

    tiers.push({
      id: 'lot6',
      label,
      pieces,
      suggestedPrice: price,
      realCost: cost,
      netProfit: profit,
      marginPercent: price > 0 ? Math.round((profit / price) * 100) : 0,
      unitEquivalentPrice: unitEq,
      isLoss: price < cost,
      isInconsistent: unitEq > safeSalePrice,
    })
  }

  // 4. Palier 1/4 Carton (si carton >= 4)
  if (safeMult >= 4) {
    const pieces = Math.round(safeMult * 0.25)
    const rawPrice = safeSalePrice * pieces * 0.92 // ~8% remise
    const price = roundToCfaCurrency(rawPrice, 50)
    const cost = unitCost * pieces
    const profit = price - cost
    const unitEq = Math.round(price / pieces)

    tiers.push({
      id: 'quarter',
      label: `1/4 Carton (${pieces} pcs)`,
      pieces,
      suggestedPrice: price,
      realCost: cost,
      netProfit: profit,
      marginPercent: price > 0 ? Math.round((profit / price) * 100) : 0,
      unitEquivalentPrice: unitEq,
      isLoss: price < cost,
      isInconsistent: unitEq > safeSalePrice,
    })
  }

  // 5. Palier 1/2 Carton (si carton >= 2)
  if (safeMult >= 2) {
    const pieces = Math.round(safeMult * 0.5)
    const rawPrice = safeSalePrice * pieces * 0.90 // ~10% remise
    const price = roundToCfaCurrency(rawPrice, 50)
    const cost = Math.round(safeCartonCost / 2)
    const profit = price - cost
    const unitEq = Math.round(price / pieces)

    tiers.push({
      id: 'half',
      label: `1/2 Carton (${pieces} pcs)`,
      pieces,
      suggestedPrice: price,
      realCost: cost,
      netProfit: profit,
      marginPercent: price > 0 ? Math.round((profit / price) * 100) : 0,
      unitEquivalentPrice: unitEq,
      isLoss: price < cost,
      isInconsistent: unitEq > safeSalePrice,
    })
  }

  // 6. Palier Carton Plein (si carton > 1)
  if (safeMult > 1) {
    const pieces = safeMult
    const rawPrice = safeSalePrice * pieces * 0.85 // ~15% remise
    const price = roundToCfaCurrency(rawPrice, 100)
    const cost = safeCartonCost
    const profit = price - cost
    const unitEq = Math.round(price / pieces)

    tiers.push({
      id: 'carton',
      label: `Carton Complet (${pieces} pcs)`,
      pieces,
      suggestedPrice: price,
      realCost: cost,
      netProfit: profit,
      marginPercent: price > 0 ? Math.round((profit / price) * 100) : 0,
      unitEquivalentPrice: unitEq,
      isLoss: price < cost,
      isInconsistent: unitEq > safeSalePrice,
    })
  }

  return tiers
}
