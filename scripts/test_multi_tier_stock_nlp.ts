import { parseSmartProductText } from '../lib/stock/smartProductParser'
import { analyzeNotebookInputWithMasterCatalog, StockProductCard } from '../lib/smartStockAssistant'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`)
    process.exit(1)
  }
  console.log(`✅ [PASS] ${message}`)
}

console.log('\n🧪 ============================================================')
console.log('    TEST MULTI-PALIERS : ACHAT CARTONS & VENTE DÉGRESSIVE     ')
console.log('============================================================\n')

// ── 1. TEST PARSER DU CARTON AVEC MULTI-TARIFS ──
console.log('--- 1. PARSER PHRASE COMPLÈTE COMMERÇANT ---')
const rawPhrase = 'Savon BF 10 cartons de 24 achat 8000 vente piece 500 carton 10000 demi 5200 quart 2650'
const parsed = parseSmartProductText(rawPhrase)

assert(parsed.name === 'Savon BF', `Nom attendu Savon BF (obtenu: ${parsed.name})`)
assert(parsed.packages_count === 10, `Cartons reçus attendu 10 (obtenu: ${parsed.packages_count})`)
assert(parsed.multiplier === 24, `Contenance carton attendue 24 (obtenu: ${parsed.multiplier})`)
assert(parsed.initial_stock === 240, `Stock pièces en rayon attendu 240 (obtenu: ${parsed.initial_stock})`)
assert(parsed.package_cost === 8000, `Prix achat carton attendu 8000 (obtenu: ${parsed.package_cost})`)
assert(Math.round(parsed.unit_cost) === 333, `Coût unitaire pièce attendu 333 (obtenu: ${Math.round(parsed.unit_cost)})`)
assert(parsed.unit_price === 500, `Prix pièce détail attendu 500 (obtenu: ${parsed.unit_price})`)
assert(parsed.quarter_package_price === 2650, `Prix 1/4 carton attendu 2650 (obtenu: ${parsed.quarter_package_price})`)
assert(parsed.half_package_price === 5200, `Prix 1/2 carton attendu 5200 (obtenu: ${parsed.half_package_price})`)
assert(parsed.wholesale_price === 10000, `Prix carton complet attendu 10000 (obtenu: ${parsed.wholesale_price})`)

// ── 2. CATALOGUE SIMULÉ ──
const catalogProduct: StockProductCard = {
  id: 'prod_bf_01',
  name: parsed.name,
  category: parsed.category,
  unit_price: parsed.unit_price,
  unit_cost: parsed.unit_cost,
  initial_stock: parsed.initial_stock,
  current_stock: parsed.initial_stock, // 240 pièces
  alert_threshold: 12,
  unit: 'unité',
  multiplier: parsed.multiplier, // 24
  packaging_name: 'carton',
  wholesale_price: parsed.wholesale_price, // 10000
  half_package_price: parsed.half_package_price, // 5200
  quarter_package_price: parsed.quarter_package_price, // 2650
}

// ── 3. TEST VENTE AU DÉTAIL (1 PIÈCE) ──
console.log('\n--- 2. SIMULATION VENTE DÉTAIL (1 SAVON BF) ---')
const saleDetail = analyzeNotebookInputWithMasterCatalog('1 Savon BF', 'blue', [catalogProduct])
assert(saleDetail !== null, 'Vente détail doit être reconnue')
if (saleDetail) {
  assert(saleDetail.calculatedItemsCount === 1, `1 pièce doit être décomptée (obtenu: ${saleDetail.calculatedItemsCount})`)
  assert(saleDetail.totalAmount === 500, `Montant 500 F attendu (obtenu: ${saleDetail.totalAmount})`)
  assert(saleDetail.stockAfter === 239, `Stock restant 239 attendu (obtenu: ${saleDetail.stockAfter})`)
}

// ── 4. TEST VENTE QUART DE CARTON (1/4 CARTON) ──
console.log('\n--- 3. SIMULATION VENTE QUART DE CARTON (1/4 CARTON) ---')
const saleQuarter = analyzeNotebookInputWithMasterCatalog('1/4 carton Savon BF', 'blue', [catalogProduct])
assert(saleQuarter !== null, 'Vente quart de carton doit être reconnue')
if (saleQuarter) {
  // 24 / 4 = 6 pièces
  assert(saleQuarter.calculatedItemsCount === 6, `6 pièces doivent être décomptées (obtenu: ${saleQuarter.calculatedItemsCount})`)
  assert(saleQuarter.totalAmount === 2650, `Montant 2650 F attendu (obtenu: ${saleQuarter.totalAmount})`)
  assert(saleQuarter.stockAfter === 234, `Stock restant 234 attendu (obtenu: ${saleQuarter.stockAfter})`)
}

// ── 5. TEST VENTE DEMI-CARTON (DEMI CARTON) ──
console.log('\n--- 4. SIMULATION VENTE DEMI-CARTON (DEMI CARTON) ---')
const saleHalf = analyzeNotebookInputWithMasterCatalog('demi carton Savon BF', 'blue', [catalogProduct])
assert(saleHalf !== null, 'Vente demi-carton doit être reconnue')
if (saleHalf) {
  // 24 / 2 = 12 pièces
  assert(saleHalf.calculatedItemsCount === 12, `12 pièces doivent être décomptées (obtenu: ${saleHalf.calculatedItemsCount})`)
  assert(saleHalf.totalAmount === 5200, `Montant 5200 F attendu (obtenu: ${saleHalf.totalAmount})`)
  assert(saleHalf.stockAfter === 228, `Stock restant 228 attendu (obtenu: ${saleHalf.stockAfter})`)
}

// ── 6. TEST VENTE CARTON COMPLET (1 CARTON) ──
console.log('\n--- 5. SIMULATION VENTE CARTON ENTIER (1 CARTON) ---')
const saleCarton = analyzeNotebookInputWithMasterCatalog('1 carton Savon BF', 'blue', [catalogProduct])
assert(saleCarton !== null, 'Vente carton complet doit être reconnue')
if (saleCarton) {
  // 1 carton = 24 pièces
  assert(saleCarton.calculatedItemsCount === 24, `24 pièces doivent être décomptées (obtenu: ${saleCarton.calculatedItemsCount})`)
  assert(saleCarton.totalAmount === 10000, `Montant 10000 F attendu (obtenu: ${saleCarton.totalAmount})`)
  assert(saleCarton.stockAfter === 216, `Stock restant 216 attendu (obtenu: ${saleCarton.stockAfter})`)
}

// ── 7. TEST SEUIL DÉGRESSIF PAR LOT (ex: pack ou lot de 6) ──
console.log('\n--- 6. SIMULATION VENTE AVEC SEUIL DÉGRESSIF PAR LOT ---')
const productWithLot: StockProductCard = {
  ...catalogProduct,
  lot_quantity: 6,
  lot_price: 2700, // 450 F / pièce au lieu de 500 F
}
const saleLot = analyzeNotebookInputWithMasterCatalog('6 Savon BF', 'blue', [productWithLot])
assert(saleLot !== null, 'Vente lot doit être reconnue')
if (saleLot) {
  assert(saleLot.calculatedItemsCount === 6, `6 pièces décomptées (obtenu: ${saleLot.calculatedItemsCount})`)
  assert(saleLot.totalAmount === 2700, `Tarif dégressif 2700 F appliqué (obtenu: ${saleLot.totalAmount})`)
  assert(saleLot.stockAfter === 234, `Stock restant 234 (obtenu: ${saleLot.stockAfter})`)
}

// ── 8. TEST PARSE_TEXT_LOCALLY AVEC CONDITIONNEMENTS ──
console.log('\n--- 7. TEST PARSE_TEXT_LOCALLY SUR CONDITIONNEMENTS ---')
import { parseTextLocally } from '../lib/sales/offlineSaleParser'
import { resolveTransactionPricesFromCatalog } from '../hooks/useInputPipeline'

const localCatalog = [
  {
    id: 'prod_bf_01',
    name: 'Savon BF',
    unit_price: 500,
    unit_cost: 333,
    multiplier: 24,
    packaging_name: 'carton',
    wholesale_price: 10000,
    half_package_price: 5200,
    quarter_package_price: 2650,
    lot_quantity: 3,
    lot_price: 1400,
  }
]

const localHalfSale = parseTextLocally('1/2 carton de Savon BF 5200', 'blue', localCatalog)
assert(localHalfSale.articles.length === 1, '1 article extrait')
assert(localHalfSale.articles[0].canonical_name === 'Savon BF', `Nom canonique Savon BF attendu (obtenu: ${localHalfSale.articles[0].canonical_name})`)
assert(localHalfSale.articles[0].packaging_type === 'half', 'Type packaging half attendu')
assert(localHalfSale.articles[0].pieces_count === 12, `12 pièces décomptées pour demi-carton (obtenu: ${localHalfSale.articles[0].pieces_count})`)
assert(localHalfSale.articles[0].prix_unitaire === 5200, 'Prix 5200 F attendu')

const localQuarterSale = parseTextLocally('1/4 carton de Savon BF 2650', 'blue', localCatalog)
assert(localQuarterSale.articles[0].pieces_count === 6, `6 pièces décomptées pour quart de carton (obtenu: ${localQuarterSale.articles[0].pieces_count})`)

const localCartonSale = parseTextLocally('1 carton de Savon BF 10000', 'blue', localCatalog)
assert(localCartonSale.articles[0].pieces_count === 24, `24 pièces décomptées pour carton entier (obtenu: ${localCartonSale.articles[0].pieces_count})`)

// ── 9. TEST RESOLUTION AUTO DE PRIX SANS PRIX EXPLICITE ──
console.log('\n--- 8. TEST RESOLUTION AUTO DE PRIX DU CATALOGUE ---')
// En créant un faux environnement localStorage pour getOfflineProducts
if (typeof global !== 'undefined') {
  (global as any).localStorage = {
    getItem: (key: string) => {
      if (key.includes('cahier_offline_products_shop_test')) {
        return JSON.stringify(localCatalog)
      }
      return null
    },
    setItem: () => {},
  }
}

const resolvedHalf = resolveTransactionPricesFromCatalog('demi carton de Savon BF', 'blue', 'shop_test', [])
assert(resolvedHalf !== null, 'Résolution demi carton réussie')
if (resolvedHalf) {
  assert(resolvedHalf.resolvedText.includes('5200'), `Prix résolu 5200 F attendu (obtenu: ${resolvedHalf.resolvedText})`)
}

const resolvedQuarter = resolveTransactionPricesFromCatalog('1/4 carton de Savon BF', 'blue', 'shop_test', [])
assert(resolvedQuarter !== null, 'Résolution quart carton réussie')
if (resolvedQuarter) {
  assert(resolvedQuarter.resolvedText.includes('2650'), `Prix résolu 2650 F attendu (obtenu: ${resolvedQuarter.resolvedText})`)
}

console.log('\n============================================================')
console.log('🎉 TOUS LES TESTS MULTI-PALIERS, PARSER ET CATALOGUE ONT RÉUSSI !')
console.log('============================================================\n')

