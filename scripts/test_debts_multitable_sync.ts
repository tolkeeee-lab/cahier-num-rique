import { getItemCashDelta } from '../lib/sales/cashDrawerCalculator'

console.log('🧪 ============================================================')
console.log('       TEST SYNCHRONISATION MULTI-TABLEAUX DES DETTES         ')
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

// 1. Simuler des ventes avec dettes et règlements
const saleCreditClient = {
  id: 'sale-credit-1',
  client: 'Moussa',
  type: 'sale_credit',
  total: 5000,
  paid: 0,
  debt: 5000,
  status: 'debt',
  pen_color: 'yellow',
  notes: '5 paquets de sucre à crédit',
}

const repaymentClient = {
  id: 'sale-repay-1',
  client: 'Moussa',
  type: 'payment_client',
  total: 5000,
  paid: 5000,
  debt: 0,
  status: 'paid',
  pen_color: 'blue',
  notes: 'Règlement dette client (Moussa)',
}

console.log('--- 1. TEST TIROIR-CAISSE LORS DU RÈGLEMENT CLIENT ---')
const cashBeforeRepayment = getItemCashDelta(saleCreditClient)
const cashFromRepayment = getItemCashDelta(repaymentClient)

assert(cashBeforeRepayment === 0, 'Une vente à crédit pur n\'augmente pas le tiroir-caisse (delta = 0)')
assert(cashFromRepayment === 5000, 'Le règlement client apporte +5000 FCFA au tiroir-caisse')

console.log('\n--- 2. TEST SYNCHRO AGGREGATION DE DETTE PAR CLIENT (USEJOURNALDATA / DEBTSBOOK) ---')
function computeClientDebt(sales: any[], clientName: string): number {
  const map = new Map<string, number>()
  sales.forEach(s => {
    if (s.status === 'crossed_out') return
    const name = (s.client || '').trim().toLowerCase()
    if (!name) return
    const current = map.get(name) || 0
    if (s.type === 'sale_credit' || (s.debt || 0) > 0) {
      map.set(name, current + Number(s.debt || s.total || 0))
    } else if (s.type === 'payment_client') {
      map.set(name, Math.max(0, current - Number(s.paid || s.total || 0)))
    }
  })
  return map.get(clientName.trim().toLowerCase()) || 0
}

const debtBefore = computeClientDebt([saleCreditClient], 'Moussa')
assert(debtBefore === 5000, `Dette de Moussa avant règlement doit être 5000 F (obtenu: ${debtBefore})`)

const debtAfter = computeClientDebt([saleCreditClient, repaymentClient], 'Moussa')
assert(debtAfter === 0, `Dette de Moussa après règlement complet doit être 0 F (obtenu: ${debtAfter})`)

console.log('\n--- 3. TEST RÈGLEMENT PARTIEL ---')
const partialRepayment = {
  id: 'sale-repay-partial',
  client: 'Moussa',
  type: 'payment_client',
  total: 2000,
  paid: 2000,
  debt: 0,
  status: 'paid',
  pen_color: 'blue',
  notes: 'Acompte dette client (Moussa)',
}

const debtAfterPartial = computeClientDebt([saleCreditClient, partialRepayment], 'Moussa')
assert(debtAfterPartial === 3000, `Dette de Moussa après règlement partiel de 2000 F doit valoir 3000 F (obtenu: ${debtAfterPartial})`)

console.log('\n--- 4. TEST DETTE FOURNISSEUR ET DÉCAISSEMENT ---')
const purchaseCredit = {
  id: 'purch-credit-1',
  client: 'Grossiste SODIBE',
  type: 'purchase_credit',
  total: 10000,
  paid: 0,
  debt: 10000,
  status: 'debt',
  pen_color: 'purple',
  notes: 'Achat crédit 2 cartons d\'huile',
}

const paymentSupplier = {
  id: 'purch-pay-1',
  client: 'Grossiste SODIBE',
  type: 'payment_supplier',
  total: 10000,
  paid: 10000,
  debt: 0,
  status: 'paid',
  pen_color: 'red',
  notes: 'Règlement dette fournisseur (Grossiste SODIBE)',
}

const cashFromSupplierPay = getItemCashDelta(paymentSupplier)
assert(cashFromSupplierPay === -10000, 'Le remboursement fournisseur retire -10000 FCFA du tiroir-caisse')

function computeSupplierDebt(sales: any[], suppName: string): number {
  const map = new Map<string, number>()
  sales.forEach(s => {
    if (s.status === 'crossed_out') return
    const name = (s.client || '').trim().toLowerCase()
    if (!name) return
    const current = map.get(name) || 0
    if (s.type === 'purchase_credit' || s.pen_color === 'purple') {
      map.set(name, current + Number(s.debt || s.total || 0))
    } else if (s.type === 'payment_supplier') {
      map.set(name, Math.max(0, current - Number(s.paid || s.total || 0)))
    }
  })
  return map.get(suppName.trim().toLowerCase()) || 0
}

const suppDebtBefore = computeSupplierDebt([purchaseCredit], 'Grossiste SODIBE')
assert(suppDebtBefore === 10000, `Dette fournisseur avant paiement doit valoir 10000 F (obtenu: ${suppDebtBefore})`)

const suppDebtAfter = computeSupplierDebt([purchaseCredit, paymentSupplier], 'Grossiste SODIBE')
assert(suppDebtAfter === 0, `Dette fournisseur après paiement doit valoir 0 F (obtenu: ${suppDebtAfter})`)

console.log('\n============================================================')
console.log(`📊 RÉSULTAT DU CONTRÔLE : ${passes} SUCCÈS / ${failures} ÉCHECS`)
console.log('============================================================')

if (failures > 0) {
  process.exit(1)
}
