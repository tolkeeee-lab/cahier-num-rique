import { sanitizeProductData } from '../lib/productUtils'

console.log('🧪 ============================================================')
console.log('       TEST LOCAL COMPLET DU FLUX DE STOCK ET DEMI-GROS        ')
console.log('============================================================\n')

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`)
    passedTests++
  } else {
    console.error(`❌ [FAIL] ${message}`)
    failedTests++
  }
}

// ── TEST 1 : Création Produit DÉTAIL ──
console.log('--- 1. TEST CRÉATION PRODUIT DÉTAIL ---')
const retailProduct = sanitizeProductData({
  id: 'prod_1',
  name: 'Savon Fanico',
  unit_price: 500,
  unit_cost: 350,
  initial_stock: 20,
  trade_type: 'retail',
  multiplier: 1,
  packaging_name: '',
  lot_quantity: 0,
  lot_price: 0,
} as any)
assert((retailProduct as any).trade_type === 'retail', 'Le produit détail reste retail')
assert(retailProduct.multiplier === 1, 'Multiplier est 1 pour le détail')
assert(retailProduct.unit_price === 500, 'Prix unitaire est 500 F')

// ── TEST 2 : Création Produit DEMI-GROS (Pack de 6) ──
console.log('\n--- 2. TEST CRÉATION PRODUIT DEMI-GROS (Pack) ---')
const semiWholesaleProduct = sanitizeProductData({
  id: 'prod_2',
  name: 'Lait Peak Pack de 6',
  unit_price: 600,
  unit_cost: 450,
  initial_stock: 60,
  multiplier: 1,
  packaging_name: 'pack',
  lot_quantity: 6,
  lot_price: 3300,
  trade_type: 'semi_wholesale',
} as any)
assert((semiWholesaleProduct as any).trade_type === 'semi_wholesale', 'Le produit est bien identifié comme semi_wholesale')
assert(semiWholesaleProduct.packaging_name === 'pack', 'Le conditionnement est pack')
assert(semiWholesaleProduct.lot_quantity === 6, 'La quantité de lot est 6')
assert(semiWholesaleProduct.lot_price === 3300, 'Le prix de lot est 3300 F')

// ── TEST 3 : MODIFICATION Produit DEMI-GROS (Le bug critique) ──
console.log('\n--- 3. TEST MODIFICATION DU PRODUIT DEMI-GROS (Validation Anti-Régression) ---')
// Simulation de la lecture depuis Supabase (où trade_type est absent de la table SQL)
const supabaseRawProduct = {
  id: 'prod_2',
  name: 'Lait Peak Pack de 6',
  unit_price: 600,
  unit_cost: 450,
  initial_stock: 60,
  multiplier: 1,
  packaging_name: 'pack',
  lot_quantity: 6,
  lot_price: 3300,
  // Note: trade_type est undefined depuis Supabase
}

const rehydratedProduct = sanitizeProductData(supabaseRawProduct as any)
assert((rehydratedProduct as any).trade_type === 'semi_wholesale', 'Supabase sans trade_type est re-déduit en semi_wholesale (PAS grossiste !)')

// Modification du stock à 48 et du prix à 650
const updatedSemiProduct = sanitizeProductData({
  ...rehydratedProduct,
  initial_stock: 48,
  unit_price: 650,
  lot_price: 3600,
} as any)
assert((updatedSemiProduct as any).trade_type === 'semi_wholesale', 'Après modification, le produit reste STRICTEMENT semi_wholesale')
assert(updatedSemiProduct.initial_stock === 48, 'Le stock modifié est 48 unités')
assert(updatedSemiProduct.unit_price === 650, 'Le prix unitaire modifié est 650 F')
assert(updatedSemiProduct.lot_price === 3600, 'Le prix de lot modifié est 3600 F')

// ── TEST 4 : Création Produit GROSSISTE (Carton 24) ──
console.log('\n--- 4. TEST CRÉATION PRODUIT GROSSISTE (Carton) ---')
const wholesaleProduct = sanitizeProductData({
  id: 'prod_3',
  name: 'Carton Canettes Beaufort',
  unit_price: 600,
  unit_cost: 450,
  initial_stock: 240,
  multiplier: 24,
  packaging_name: 'carton',
  trade_type: 'wholesale',
  lot_quantity: 0,
  lot_price: 0,
} as any)
assert((wholesaleProduct as any).trade_type === 'wholesale', 'Le produit est identifié comme wholesale')
assert(wholesaleProduct.multiplier === 24, 'Multiplier est 24')
assert(wholesaleProduct.packaging_name === 'carton', 'Conditionnement est carton')

// ── TEST 5 : Déduction trade_type pour Produit sans lot_quantity mais avec packaging_name = 'pack' ──
console.log('\n--- 5. TEST DEMI-GROS AVEC LOT_QUANTITY = 0 MAIS PACKAGING = PACK ---')
const packWithoutLot = sanitizeProductData({
  id: 'prod_4',
  name: 'Fardeau Eau Minérale',
  unit_price: 400,
  initial_stock: 30,
  multiplier: 6,
  packaging_name: 'pack',
  lot_quantity: 0,
  lot_price: 0,
} as any)
assert((packWithoutLot as any).trade_type === 'semi_wholesale', 'packaging_name = pack donne semi_wholesale même si lot_quantity = 0')

console.log('\n============================================================')
console.log(`📊 RÉSULTAT DES TESTS : ${passedTests} SUCCÈS / ${failedTests} ÉCHECS`)
console.log('============================================================\n')

if (failedTests > 0) {
  process.exit(1)
}
