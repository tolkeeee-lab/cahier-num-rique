import { calculateCash } from '../lib/sales/cashDrawerCalculator'
import { getItemPurchaseValue, getBarWidth } from '../components/stock/stockUtils'
import { analyzeNotebookInputWithMasterCatalog } from '../lib/smartStockAssistant'

console.log('🧪 ============================================================')
console.log('       TEST DE RÉSILIENCE PROFONDE & PRÉCISION CALCULS       ')
console.log('============================================================')

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`)
    passed++
  } else {
    console.error(`❌ [FAIL] ${msg}`)
    failed++
  }
}

// ─── 1. TEST TIROIR-CAISSE & CALCULATE_CASH ──────────────────────────────────
console.log('\n--- 1. TEST TIROIR-CAISSE & ÉLIMINATION FLOTTANTE ---')

const salesList = [
  { id: '1', type: 'sale_cash', paid: 15000, total: 15000, status: 'completed' },
  { id: '2', type: 'sale_credit', paid: 2500, total: 10000, debt: 7500, status: 'debt' }, // Acompte 2500 F
  { id: '3', type: 'cash_out', paid: 3500, total: 3500, status: 'completed' }, // Dépense 3500 F
  { id: '4', type: 'payment_client', paid: 4000, total: 4000, status: 'completed' }, // Remboursement dette 4000 F
  { id: '5', type: 'payment_supplier', paid: 5000, total: 5000, status: 'completed' }, // Décaissement fournisseur 5000 F
  { id: '6', type: 'cash_in', paid: 'invalid', total: null, status: 'completed' }, // Valeur corrompue
  { id: '7', type: 'sale_cash', paid: 1000, total: 1000, status: 'crossed_out' }, // Rayé -> 0
]

const netCash = calculateCash(salesList)
// 15000 + 2500 - 3500 + 4000 - 5000 + 0 + 0 = 13000
assert(netCash === 13000, `Net cash attendu 13000 F, obtenu: ${netCash} F`)
assert(Number.isFinite(netCash), `Net cash doit être strictement fini`)

// ─── 2. TEST BILLETAGE ET ÉCART DE CLÔTURE ──────────────────────────────────
console.log('\n--- 2. TEST BILLETAGE ET ÉCART DE CLÔTURE ---')

const bills: Record<number, number> = {
  10000: 1, // 10000
  5000: 2,  // 10000
  2000: 1,  // 2000
  1000: 1,  // 1000
  500: 1,   // 500
  200: 2,   // 400
  100: 1,   // 100
  50: 0,
}

const totalBilletage = Object.entries(bills).reduce((sum, [denom, count]) => {
  const d = Number(denom)
  const c = Number(count || 0)
  return sum + (Number.isFinite(d) && Number.isFinite(c) ? d * c : 0)
}, 0)

assert(totalBilletage === 24000, `Total billetage attendu 24000 F, obtenu: ${totalBilletage} F`)

const theoreticalCash = 25000
const diffManquant = Math.round((totalBilletage - theoreticalCash) * 100) / 100
assert(diffManquant === -1000, `Écart manquant attendu -1000 F, obtenu: ${diffManquant} F`)

const diffExcedent = Math.round((26500 - theoreticalCash) * 100) / 100
assert(diffExcedent === 1500, `Écart excédentaire attendu 1500 F, obtenu: ${diffExcedent} F`)

// ─── 3. TEST VALEUR D'ACHAT STOCK ET CONDITIONNEMENT MULTIPLE ────────────────
console.log('\n--- 3. TEST VALEUR D\'ACHAT & CONDITIONNEMENT ---')

const mockItemSingle: any = {
  id: 'prod-1',
  name: 'Savon Fanico',
  unit_cost: 250,
  unit_price: 350,
  initial_stock: 10,
  current_stock: 10,
  multiplier: 1,
}

assert(getItemPurchaseValue(mockItemSingle) === 2500, `Valeur d'achat 10x250 attendue 2500 F, obtenu: ${getItemPurchaseValue(mockItemSingle)} F`)

// Produit en carton avec division reconstituée (ex: 24 bouteilles à 10000F le carton -> 416.67F unitaire)
const mockItemCarton: any = {
  id: 'prod-2',
  name: 'Bière Beaufort',
  unit_cost: 417,
  unit_price: 600,
  initial_stock: 24,
  current_stock: 24,
  multiplier: 24,
}

const valCarton = getItemPurchaseValue(mockItemCarton)
assert(valCarton > 0, `Valeur d'achat du carton doit être positive`)

// Test stock négatif ou zéro
const mockItemZero: any = {
  id: 'prod-3',
  name: 'Article Épuisé',
  unit_cost: 500,
  current_stock: 0,
}
assert(getItemPurchaseValue(mockItemZero) === 0, `Valeur d'achat pour stock 0 doit valoir 0 F`)

// ─── 4. TEST JAUGE DE STOCK ET BORNES LIMITES ────────────────────────────────
console.log('\n--- 4. TEST JAUGE DE STOCK ---')

assert(getBarWidth(mockItemZero) === 0, `Largeur jauge pour stock 0 doit valoir 0%`)

const mockItemFull: any = {
  current_stock: 50,
  initial_stock: 50,
  total_in: 0,
  alert_threshold: 5,
}
const width = getBarWidth(mockItemFull)
assert(width > 0 && width <= 100, `Largeur jauge doit être comprise entre 0 et 100% (obtenu: ${width}%)`)

// ─── 5. TEST UNITÉS DIVISIBLES FRACTIONNÉES (KG, LITRES) ─────────────────────
console.log('\n--- 5. TEST QUANTITÉS FRACTIONNÉES (VRAC) ---')

const catalogVrac: any[] = [
  {
    id: 'riz-1',
    name: 'Riz Blanc',
    category: 'Alimentation',
    unit: 'kg',
    unit_price: 600,
    unit_cost: 450,
    initial_stock: 50,
    current_stock: 50,
    alert_threshold: 5,
  }
]

const analysisFraction = analyzeNotebookInputWithMasterCatalog('0.5 riz blanc', 'blue', catalogVrac)
assert(analysisFraction !== null, `L'analyse du vrac doit réussir`)
if (analysisFraction) {
  assert(analysisFraction.requestedQty === 0.5, `Quantité demandée doit être 0.5 (obtenu: ${analysisFraction.requestedQty})`)
  assert(analysisFraction.calculatedItemsCount === 0.5, `calculatedItemsCount doit rester 0.5 kg (pas arrondi à 1 kg !)`)
  assert(analysisFraction.stockAfter === 49.5, `Stock après vente doit être 49.5 kg (obtenu: ${analysisFraction.stockAfter})`)
  assert(analysisFraction.totalAmount === 300, `Montant total attendu 300 F (0.5 x 600), obtenu: ${analysisFraction.totalAmount} F`)
}

// ─── 6. TEST RÉSILIENCE DEMANDES CLIENTS & CALCULS FOYER ─────────────────────
console.log('\n--- 6. TEST RÉSILIENCE DEMANDES CLIENTS & FOYER ---')

import { parseRequestedProductFromNotebookText } from '../lib/requestedProductsUtils'

const parsedReq = parseRequestedProductFromNotebookText('demande client beufort 600f')
assert(parsedReq !== null, `La demande client doit être détectée`)
if (parsedReq) {
  assert(parsedReq.cleanName === 'Beaufort', `Le nom doit être canoniquement normalisé en 'Beaufort' (obtenu: ${parsedReq.cleanName})`)
  assert(parsedReq.price === 600, `Le prix extrait doit être 600 F`)
}

// Vérification de la non-apparition de NaN sur des écritures incomplètes
const incompleteSales: any[] = [
  { id: '1', status: 'normal', pen_color: 'red', type: 'cash_out', notes: 'marché légume', total: undefined },
  { id: '2', status: 'crossed_out', pen_color: 'red', type: 'cash_out', notes: 'marché viande', total: 5000 },
  { id: '3', status: 'normal', pen_color: 'red', type: 'cash_out', notes: 'facture cie', total: null },
]

const safeMarche = incompleteSales
  .filter(s => s.status !== 'crossed_out' && (s.pen_color === 'red' || s.type === 'cash_out') && (s.notes || '').toLowerCase().includes('marché'))
  .reduce((sum, s) => sum + (Number(s.total) || 0), 0)

assert(Number.isFinite(safeMarche), `Le total marché doit être un nombre fini (pas NaN)`)
assert(safeMarche === 0, `Le total marché doit ignorer les undefined et lignes rayées (obtenu: ${safeMarche})`)

console.log('\n============================================================')
console.log(`📊 RÉSULTAT DU CONTRÔLE DE RÉSILIENCE : ${passed} SUCCÈS / ${failed} ÉCHECS`)
console.log('============================================================\n')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
