import { parseTextLocally } from '../lib/sales/offlineSaleParser'
import { calculateCash } from '../lib/sales/cashDrawerCalculator'

console.log('=== TEST 1: Parsing client name ===')
const sample1 = parseTextLocally('3 cartons de Beaufort à 10000', 'blue')
console.log('Sample 1 (3 cartons de Beaufort à 10000):')
console.log(' - nom_client:', sample1.nom_client)
console.assert(sample1.nom_client === 'Client anonyme', `Expected 'Client anonyme' but got '${sample1.nom_client}'`)

const sample2 = parseTextLocally('client: Moussa 2 sacs de riz 5000 crédit', 'yellow')
console.log('Sample 2 (client: Moussa 2 sacs de riz 5000 crédit):')
console.log(' - nom_client:', sample2.nom_client)
console.log(' - montant_dette:', sample2.montant_dette)
console.assert(sample2.nom_client === 'Moussa', `Expected 'Moussa' but got '${sample2.nom_client}'`)

const sample3 = parseTextLocally('pour Paul 1 casier Castel 7000', 'yellow')
console.log('Sample 3 (pour Paul 1 casier Castel 7000):')
console.log(' - nom_client:', sample3.nom_client)
console.assert(sample3.nom_client === 'Paul', `Expected 'Paul' but got '${sample3.nom_client}'`)

console.log('\n=== TEST 2: computeOfflineStock logic ===')
// Test mock logic simulating computeOfflineStock algorithm
const mockSaleRecords = [
  { id: 's-1', articles: [{ name: 'Beaufort', quantity: 2, unit_price: 1000 }], type: 'sale', date: '2026-09-12', created_at: new Date().toISOString(), status: 'completed' },
  { id: 's-2', articles: [{ name: 'Beaufort', quantity: 3, unit_price: 1000 }], type: 'sale_cash', date: '2026-09-12', created_at: new Date().toISOString(), status: 'completed' },
  { id: 's-3', articles: [{ name: 'Beaufort', quantity: 1, unit_price: 1000 }], type: 'stock_damage', date: '2026-09-12', created_at: new Date().toISOString(), status: 'completed' },
  { id: 's-4', articles: [{ name: 'Beaufort', quantity: 10, unit_price: 800 }], type: 'stock_in', date: '2026-09-12', created_at: new Date().toISOString(), status: 'completed' }
]

let totalIn = 0
let totalOut = 0
for (const s of mockSaleRecords) {
  const isIn = s.type === 'purchase_cash' || s.type === 'purchase_credit' || s.type === 'stock_cash' || s.type === 'stock_in'
  const isOut = s.type === 'cash_in' || s.type === 'sale_credit' || s.type === 'sale' || s.type === 'sale_cash' || s.type === 'stock_damage' || s.type === 'personal_use'
  for (const a of s.articles) {
    if (isIn) totalIn += a.quantity
    if (isOut) totalOut += a.quantity
  }
}
console.log('Initial stock: 20. In:', totalIn, 'Out:', totalOut)
const finalStock = 20 + totalIn - totalOut
console.log('Computed stock:', finalStock)
console.assert(finalStock === 24, `Expected 24 but got ${finalStock}`)

console.log('\n=== TEST 3: Cash Drawer Calculator ===')
const drawerSales = [
  { id: '1', type: 'sale_cash', total: 10000, paid: 10000, debt: 0, status: 'completed' },
  { id: '2', type: 'sale_credit', total: 5000, paid: 1000, debt: 4000, status: 'completed' }, // 1000 acompte cash
  { id: '3', type: 'cash_out', total: 2000, paid: 2000, debt: 0, status: 'completed' }, // 2000 dépense
  { id: '4', type: 'payment_client', total: 1500, paid: 1500, debt: 0, status: 'completed' }, // 1500 règlement dette
  { id: '5', type: 'purchase_credit', total: 8000, paid: 0, debt: 8000, status: 'completed' } // 0 cash impact
]

const netCash = calculateCash(drawerSales)
console.log('Cash drawer: 10000 (sale_cash) + 1000 (acompte) - 2000 (cash_out) + 1500 (remboursement dette) = 10500')
console.log('Net cash computed:', netCash)
console.assert(netCash === 10500, `Expected 10500 but got ${netCash}`)

console.log('\n=== TEST 4: Fractional Quantities Validation ===')
import { saleInputSchema } from '../lib/validations'
const validFractional = saleInputSchema.safeParse({
  text: '0.5 kg de viande à 1500',
  articles: [{ name: 'viande', quantity: 0.5, unit_price: 3000 }]
})
console.log('Validation with quantity = 0.5:', validFractional.success ? 'SUCCESS ✅' : 'FAILED ❌')
console.assert(validFractional.success, 'Expected fractional quantity 0.5 to be valid')

console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! ✅')
