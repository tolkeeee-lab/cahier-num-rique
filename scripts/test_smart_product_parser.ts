import { parseSmartProductText } from '../lib/stock/smartProductParser'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`)
    process.exit(1)
  }
  console.log(`✅ [PASS] ${message}`)
}

console.log('\n🧪 ============================================================')
console.log('       TEST DU MOTEUR NLP DE SAISIE MAGIQUE DE PRODUIT        ')
console.log('============================================================\n')

// 1. Test Savon BF en gros
console.log('--- 1. TEST CARTON GROSSISTE ---')
const t1 = parseSmartProductText('Savon BF 50 cartons achat 8000 vente 10000')
assert(t1.name.toLowerCase().includes('savon bf'), `Nom attendu Savon BF (obtenu: ${t1.name})`)
assert(t1.initial_stock === 50, `Stock attendu 50 (obtenu: ${t1.initial_stock})`)
assert(t1.unit === 'carton', `Unité attendue carton (obtenu: ${t1.unit})`)
assert(t1.trade_type === 'wholesale', `Trade type attendu wholesale (obtenu: ${t1.trade_type})`)
assert(t1.unit_cost === 8000, `Coût attendu 8000 (obtenu: ${t1.unit_cost})`)
assert(t1.unit_price === 10000, `Prix vente attendu 10000 (obtenu: ${t1.unit_price})`)
assert(t1.category === 'Hygiène & Entretien', `Catégorie attendue Hygiène & Entretien (obtenu: ${t1.category})`)

// 2. Test Sucre avec "à 900"
console.log('\n--- 2. TEST DÉTAIL AVEC PRIX "À" ---')
const t2 = parseSmartProductText('Sucre Saint Louis 30 paquets à 900')
assert(t2.name.toLowerCase().includes('sucre'), `Nom attendu Sucre Saint Louis (obtenu: ${t2.name})`)
assert(t2.initial_stock === 30, `Stock attendu 30 (obtenu: ${t2.initial_stock})`)
assert(t2.unit === 'paquet', `Unité attendue paquet (obtenu: ${t2.unit})`)
assert(t2.unit_price === 900, `Prix vente attendu 900 (obtenu: ${t2.unit_price})`)
assert(t2.category === 'Épicerie & Vivres', `Catégorie attendue Épicerie & Vivres (obtenu: ${t2.category})`)

// 3. Test Demi-Gros Pack de 6
console.log('\n--- 3. TEST DEMI-GROS PACK DE 6 ---')
const t3 = parseSmartProductText('Coca Cola 33cl 10 packs de 6 achat 2500 vente 3200')
assert(t3.name.toLowerCase().includes('coca'), `Nom attendu Coca (obtenu: ${t3.name})`)
assert(t3.initial_stock === 10, `Stock attendu 10 (obtenu: ${t3.initial_stock})`)
assert(t3.unit === 'pack', `Unité attendue pack (obtenu: ${t3.unit})`)
assert(t3.trade_type === 'semi_wholesale', `Trade type attendu semi_wholesale (obtenu: ${t3.trade_type})`)
assert(t3.lot_quantity === 6, `Lot quantity attendu 6 (obtenu: ${t3.lot_quantity})`)
assert(t3.unit_cost === 2500, `Coût attendu 2500 (obtenu: ${t3.unit_cost})`)
assert(t3.unit_price === 3200, `Prix vente attendu 3200 (obtenu: ${t3.unit_price})`)
assert(t3.category === 'Boissons & Brasserie', `Catégorie attendue Boissons & Brasserie (obtenu: ${t3.category})`)

// 4. Test Riz avec seuil d'alerte
console.log('\n--- 4. TEST RIZ EN SACS AVEC SEUIL D ALERTE ---')
const t4 = parseSmartProductText('Riz Papillon 25 sacs achat 18500 vente 21000 seuil 3')
assert(t4.name.toLowerCase().includes('riz papillon'), `Nom attendu Riz Papillon (obtenu: ${t4.name})`)
assert(t4.initial_stock === 25, `Stock attendu 25 (obtenu: ${t4.initial_stock})`)
assert(t4.unit === 'sac', `Unité attendue sac (obtenu: ${t4.unit})`)
assert(t4.alert_threshold === 3, `Seuil attendu 3 (obtenu: ${t4.alert_threshold})`)
assert(t4.unit_cost === 18500, `Coût attendu 18500 (obtenu: ${t4.unit_cost})`)
assert(t4.unit_price === 21000, `Prix attendu 21000 (obtenu: ${t4.unit_price})`)

// 5. Test Casier de 24 Beaufort
console.log('\n--- 5. TEST CASIERS DE 24 BIÈRE ---')
const t5 = parseSmartProductText('Bière Beaufort 15 casiers de 24 achat 11000 vente 14000')
assert(t5.name.toLowerCase().includes('beaufort'), `Nom attendu Beaufort (obtenu: ${t5.name})`)
assert(t5.initial_stock === 15, `Stock attendu 15 (obtenu: ${t5.initial_stock})`)
assert(t5.unit === 'casier', `Unité attendue casier (obtenu: ${t5.unit})`)
assert(t5.multiplier === 24, `Multiplier attendu 24 (obtenu: ${t5.multiplier})`)
assert(t5.category === 'Boissons & Brasserie', `Catégorie attendue Boissons & Brasserie (obtenu: ${t5.category})`)

// 6. Test Abréviations PA et PV avec Boîtes
console.log('\n--- 6. TEST ABRÉVIATIONS PA ET PV ---')
const t6 = parseSmartProductText('Lait Nido 400g 15 boîtes pa 2500 pv 3200 alerte 4')
assert(t6.name.toLowerCase().includes('lait nido'), `Nom attendu Lait Nido 400g (obtenu: ${t6.name})`)
assert(t6.initial_stock === 15, `Stock attendu 15 (obtenu: ${t6.initial_stock})`)
assert(t6.unit === 'boîte', `Unité attendue boîte (obtenu: ${t6.unit})`)
assert(t6.unit_cost === 2500, `PA attendu 2500 (obtenu: ${t6.unit_cost})`)
assert(t6.unit_price === 3200, `PV attendu 3200 (obtenu: ${t6.unit_price})`)
assert(t6.alert_threshold === 4, `Alerte attendue 4 (obtenu: ${t6.alert_threshold})`)
assert(t6.category === 'Produits Laitiers', `Catégorie attendue Produits Laitiers (obtenu: ${t6.category})`)

// 7. Test Quantité au début : 100 cahiers à 250
console.log('\n--- 7. TEST QUANTITÉ AU DÉBUT ---')
const t7 = parseSmartProductText('100 cahiers 100p à 250')
assert(t7.initial_stock === 100, `Stock attendu 100 (obtenu: ${t7.initial_stock})`)
assert(t7.name.toLowerCase().includes('cahier'), `Nom attendu contenant cahier (obtenu: ${t7.name})`)
assert(t7.unit_price === 250, `Prix attendu 250 (obtenu: ${t7.unit_price})`)
assert(t7.category === 'Papeterie', `Catégorie attendue Papeterie (obtenu: ${t7.category})`)

console.log('\n============================================================')
console.log('📊 TOUS LES TESTS DE PARSING INTELLIGENT DE PRODUIT SONT PASSÉS !')
console.log('============================================================\n')
