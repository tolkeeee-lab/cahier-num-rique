import { reconcileDebts, Sale } from '../hooks/useJournalData'
import { normalizeProductName } from '../lib/productUtils'

console.log('🧪 ============================================================')
console.log('       SUITE DE TESTS UNITAIRES CRITIQUES (NON-RÉGRESSION)     ')
console.log('============================================================\n')

let passes = 0
let failures = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`)
    passes++
  } else {
    console.error(`❌ [FAIL] ${message}`)
    failures++
  }
}

// ── TEST 1 : Normalisation des noms de produits (Stock) ──
console.log('--- 1. TEST NORMALISATION NOMS DE PRODUITS ---')
assert(normalizeProductName('Riz 25kg') === 'Riz 25kg', 'Nom standard préservé')
assert(normalizeProductName('  riz   25kg  ') === 'Riz 25kg', 'Espaces et minuscules normalisés')
assert(normalizeProductName('COCA COLA 33CL') === 'Coca Cola 33cl', 'Majuscules excessives formatées')
assert(normalizeProductName('') === '', 'Chaîne vide gérée')

// ── TEST 2 : Réconciliation FIFO des Dettes Clients ──
console.log('\n--- 2. TEST RÉCONCILIATION FIFO DES DETTES CLIENTS ---')
const testSales: Sale[] = [
  {
    id: 's1',
    date: '2026-10-01',
    time: '08:00',
    client: 'Moussa',
    articles: [{ name: 'Riz', quantity: 1, unit_price: 3000 }],
    total: 3000,
    paid: 0,
    debt: 3000,
    status: 'debt',
    type: 'sale_credit',
    pen_color: 'yellow',
    notes: 'Vente crédit',
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 's2',
    date: '2026-10-02',
    time: '10:00',
    client: 'Moussa',
    articles: [{ name: 'Sucre', quantity: 1, unit_price: 2000 }],
    total: 2000,
    paid: 0,
    debt: 2000,
    status: 'debt',
    type: 'sale_credit',
    pen_color: 'yellow',
    notes: 'Deuxième crédit',
    created_at: '2026-10-02T10:00:00Z',
  },
  {
    id: 'p1',
    date: '2026-10-03',
    time: '12:00',
    client: 'Moussa',
    articles: [],
    total: 3500,
    paid: 3500,
    debt: 0,
    status: 'paid',
    type: 'payment_client',
    pen_color: 'blue',
    notes: 'Remboursement partiel Moussa',
    created_at: '2026-10-03T12:00:00Z',
  },
]

const reconciled = reconcileDebts(testSales)
const s1 = reconciled.find(s => s.id === 's1')
const s2 = reconciled.find(s => s.id === 's2')

assert(s1?.status === 'paid', 'La première dette (s1 - 3000 F) est totalement apurée')
assert(s1?.debt === 0, 'Le solde restant de s1 est de 0 F')
assert(s2?.status === 'debt', 'La deuxième dette (s2 - 2000 F) reste partiellement impayée')
assert(s2?.debt === 1500, 'Le solde restant de s2 est de 1500 F (2000 - 500 F d\'excédent)')

// ── TEST 3 : Réconciliation Fournisseurs ──
console.log('\n--- 3. TEST RÉCONCILIATION FOURNISSEURS ---')
const supplierSales: Sale[] = [
  {
    id: 'sup1',
    date: '2026-10-01',
    time: '08:00',
    client: 'Grossiste A',
    articles: [{ name: 'Carton Savon', quantity: 1, unit_price: 10000 }],
    total: 10000,
    paid: 0,
    debt: 10000,
    status: 'debt',
    type: 'purchase_credit',
    pen_color: 'purple',
    notes: 'Achat à crédit',
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'suppay1',
    date: '2026-10-02',
    time: '09:00',
    client: 'Grossiste A',
    articles: [],
    total: 10000,
    paid: 10000,
    debt: 0,
    status: 'paid',
    type: 'payment_supplier',
    pen_color: 'red',
    notes: 'Paiement fournisseur',
    created_at: '2026-10-02T09:00:00Z',
  },
]

const reconciledSupp = reconcileDebts(supplierSales)
const sup1 = reconciledSupp.find(s => s.id === 'sup1')

assert(sup1?.status === 'paid', 'La dette fournisseur (sup1 - 10000 F) est totalement apurée')
assert(sup1?.debt === 0, 'Le solde fournisseur restant est de 0 F')

// ── BILAN ──
console.log('\n============================================================')
console.log(`RÉSULTAT : ${passes} réussi(s), ${failures} échec(s)`)
console.log('============================================================')

if (failures > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
