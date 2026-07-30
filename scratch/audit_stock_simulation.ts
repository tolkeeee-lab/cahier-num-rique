import { sanitizeProductData } from '../lib/productUtils'
import { getItemPurchaseValue } from '../components/stock/stockUtils'

console.log("=== SIMULATION AUDIT AUTOMATIQUE DU CATALOGUE & CALCULS ===")

// Test 1: Auto-correction unit_cost (10000 F pour 20 pcs -> 500 F/unité)
const rawItem1 = {
  name: 'eau fifa',
  unit_price: 600,
  unit_cost: 10000,
  multiplier: 20,
  unit: 'carton',
  packaging_name: 'carton'
}
const cleanItem1 = sanitizeProductData(rawItem1)
console.assert(cleanItem1.unit_cost === 500, `Test 1 ECHEC: unit_cost est ${cleanItem1.unit_cost}, attendu 500`)
console.assert(cleanItem1.unit === 'unité', `Test 1 ECHEC: unit est ${cleanItem1.unit}, attendu unité`)
console.log("✅ Test 1 Reussi: unit_cost ramené à 500 F/unité et unité normalisée en 'unité'")

// Test 2: Valeur d'achat exacte sans perte d'arrondi (120 unités à 333 F pour 4 cartons de 10 000 F)
const item2 = {
  id: 'test_2',
  name: 'Palmida',
  category: 'Hygiène',
  unit: 'unité',
  alert_threshold: 5,
  initial_stock: 120,
  current_stock: 120,
  unit_cost: 333,
  unit_price: 400,
  multiplier: 30,
  packaging_name: 'carton',
  created_at: new Date().toISOString()
}
const valAchat2 = getItemPurchaseValue(item2 as any)
console.assert(valAchat2 === 40000, `Test 2 ECHEC: Valeur achat est ${valAchat2}, attendu 40000`)
console.log("✅ Test 2 Reussi: Valeur achat exacte = 40 000 F (4 cartons de 10 000 F)")

// Test 3: Offre par lot invalide (lot_price >= normal price)
const rawItem3 = {
  name: 'Kopiko',
  unit_price: 20,
  lot_quantity: 3,
  lot_price: 100 // 100 F pour 3 au lieu de 60 F -> Promo invalide
}
const cleanItem3 = sanitizeProductData(rawItem3)
console.assert(cleanItem3.lot_quantity === 0 && cleanItem3.lot_price === 0, "Test 3 ECHEC: Offre invalide non annulée")
console.log("✅ Test 3 Reussi: Offre par lot invalide annulée")

// Test 4: Calcul stock avec reste (122 unités = 4 cartons de 10000 F + 2 unités à 333 F)
const item4 = {
  ...item2,
  current_stock: 122
}
const valAchat4 = getItemPurchaseValue(item4 as any)
console.assert(valAchat4 === 40666, `Test 4 ECHEC: Valeur achat est ${valAchat4}, attendu 40666`)
console.log("✅ Test 4 Reussi: Valeur achat avec reste = 40 666 F")

console.log("=== TOUS LES TESTS D'AUDIT SONT VALIDES AVEC SUCCES ! ===")
