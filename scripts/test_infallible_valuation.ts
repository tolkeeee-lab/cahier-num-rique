/**
 * test_infallible_valuation.ts
 *
 * Vérification des calculs stricts de valorisation et des arrondis FCFA.
 */

import {
  calculateInfallibleValuation,
  generateInfalliblePriceTiers,
  roundToCfaCurrency,
} from '../lib/stock/infallibleValuation'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`)
    process.exit(1)
  }
  console.log(`✅ [PASS] ${message}`)
}

console.log('\n🧪 ============================================================')
console.log('       TEST DU MOTEUR DE VALORISATION INFAILLIBLE FCFA        ')
console.log('============================================================\n')

// --- 1. TEST DU CAS RÉEL CITÉ PAR L'UTILISATEUR (50 BOÎTES À 20 000 F) ---
console.log('--- 1. CAS CLIENT : SARDINES 50 BOÎTES À 20 000 F, VENTE 500 F, 52 BOÎTES (1 CARTON + 2 PIÈCES) ---')
const valuation50 = calculateInfallibleValuation(20000, 50, 500, 52)

assert(valuation50.unitCost === 400, `Coût unitaire 400 F attendu (obtenu: ${valuation50.unitCost} F)`)
assert(valuation50.unitMargin === 100, `Marge unitaire 100 F attendue (obtenue: ${valuation50.unitMargin} F)`)
assert(valuation50.unitMarginPercent === 20, `Marge unitaire 20% attendue (obtenue: ${valuation50.unitMarginPercent}%)`)
assert(valuation50.fullCartons === 1, `1 carton plein attendu (obtenu: ${valuation50.fullCartons})`)
assert(valuation50.loosePieces === 2, `2 pièces en rayon attendues (obtenues: ${valuation50.loosePieces})`)

// Valeur d'achat réelle : (1 x 20 000) + (2 x 400) = 20 800 F (PAS 20 834 F !)
assert(valuation50.immobilizedPurchaseValue === 20800, `Valeur d'achat réelle 20 800 F attendue (obtenue: ${valuation50.immobilizedPurchaseValue} F)`)
assert(valuation50.immobilizedPurchaseValue % 25 === 0, `Valeur d'achat multiple de 25 F attendue (obtenue: ${valuation50.immobilizedPurchaseValue} F)`)

// Chiffre d'affaires potentiel : 52 x 500 = 26 000 F
assert(valuation50.potentialRevenue === 26000, `CA potentiel 26 000 F attendu (obtenu: ${valuation50.potentialRevenue} F)`)

// Bénéfice net potentiel : 26 000 - 20 800 = 5 200 F (PAS 4 166 F !)
assert(valuation50.potentialNetProfit === 5200, `Bénéfice net 5 200 F attendu (obtenu: ${valuation50.potentialNetProfit} F)`)

// Rentabilité par carton : (50 x 500) - 20 000 = 5 000 F
assert(valuation50.cartonNetProfitDetail === 5000, `Bénéfice par carton plein 5 000 F attendu (obtenu: ${valuation50.cartonNetProfitDetail} F)`)

// --- 2. TEST DE LA GRILLE DES PALIERS DÉGRESSIFS ---
console.log('\n--- 2. PALIERS DÉGRESSIFS SARDINES 50 BOÎTES ---')
const tiers50 = generateInfalliblePriceTiers(20000, 50, 500)

const detailTier = tiers50.find(t => t.id === 'detail')
const lot3Tier = tiers50.find(t => t.id === 'lot3')
const lot6Tier = tiers50.find(t => t.id === 'lot6')
const quarterTier = tiers50.find(t => t.id === 'quarter')
const halfTier = tiers50.find(t => t.id === 'half')
const cartonTier = tiers50.find(t => t.id === 'carton')

assert(detailTier?.suggestedPrice === 500, `Détail attendu 500 F (obtenu: ${detailTier?.suggestedPrice} F)`)
assert(detailTier?.netProfit === 100, `Bénéfice détail attendu 100 F (obtenu: ${detailTier?.netProfit} F)`)

assert((lot3Tier?.suggestedPrice ?? 0) % 25 === 0, `Prix lot de 3 multiple de 25 F attendu (${lot3Tier?.suggestedPrice} F)`)
assert((lot6Tier?.suggestedPrice ?? 0) % 25 === 0, `Prix lot de 6 multiple de 25 F attendu (${lot6Tier?.suggestedPrice} F)`)
assert((quarterTier?.suggestedPrice ?? 0) % 25 === 0, `Prix 1/4 multiple de 25 F attendu (${quarterTier?.suggestedPrice} F)`)
assert((halfTier?.suggestedPrice ?? 0) % 50 === 0, `Prix 1/2 multiple de 50 F attendu (${halfTier?.suggestedPrice} F)`)
assert((cartonTier?.suggestedPrice ?? 0) % 100 === 0, `Prix carton multiple de 100 F attendu (${cartonTier?.suggestedPrice} F)`)

// Vérifier que tous les paliers sont rentables (aucune vente à perte)
tiers50.forEach(t => {
  assert(!t.isLoss, `Le palier ${t.label} ne doit pas être à perte (${t.suggestedPrice} F > ${t.realCost} F)`)
  assert(!t.isInconsistent, `Le palier ${t.label} doit être cohérent par rapport au détail`)
})

// --- 3. TEST D'UN CARTON DE 24 ARTICLES (SAVON BF 24 PCS À 8 000 F, VENTE 500 F) ---
console.log('\n--- 3. CARTON DE 24 SAVONS À 8 000 F ---')
const valuation24 = calculateInfallibleValuation(8000, 24, 500, 26) // 1 carton + 2 savons

assert(valuation24.unitCost % 5 === 0, `Coût unitaire savon multiple de 5 F attendu (obtenu: ${valuation24.unitCost} F)`)
assert(valuation24.immobilizedPurchaseValue % 25 === 0 || valuation24.immobilizedPurchaseValue % 10 === 0, `Valeur stock savon propre (obtenu: ${valuation24.immobilizedPurchaseValue} F)`)
assert(valuation24.potentialNetProfit > 0, `Bénéfice positif attendu (obtenu: ${valuation24.potentialNetProfit} F)`)

// --- 4. TEST DE LA FONCTION D'ARRONDI STRICT FCFA ---
console.log('\n--- 4. TEST DE L ARRONDI STRICT FCFA ---')
assert(roundToCfaCurrency(416.66, 25) === 425, `416.66 arrondi à 25 F = 425 (obtenu: ${roundToCfaCurrency(416.66, 25)})`)
assert(roundToCfaCurrency(20834, 50) === 20850, `20834 arrondi à 50 F = 20850 (obtenu: ${roundToCfaCurrency(20834, 50)})`)
assert(roundToCfaCurrency(4166, 25) === 4175, `4166 arrondi à 25 F = 4175 (obtenu: ${roundToCfaCurrency(4166, 25)})`)

console.log('\n============================================================')
console.log('🎉 TOUS LES TESTS DE VALORISATION INFAILLIBLE SONT VALIDÉS !')
console.log('============================================================\n')
