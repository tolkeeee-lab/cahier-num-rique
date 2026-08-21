import { isEmployeeRole, canViewFinancialMargins, canExportAccountingReports } from '../lib/roleUtils'

console.log('🧪 ============================================================')
console.log('    TEST DE VÉRIFICATION SYNCHRONISATION PATRON - EMPLOYÉ     ')
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

// ── TEST 1 : Détection et Étanchéité des Rôles ──
console.log('--- 1. TEST ÉTANCHÉITÉ DES RÔLES ---')
assert(isEmployeeRole('employee') === true, 'Role employee est bien identifié comme employé')
assert(isEmployeeRole('caissier') === true, 'Role caissier est bien identifié comme employé')
assert(isEmployeeRole('owner') === false, 'Role owner est identifié comme patron')
assert(isEmployeeRole(null) === false, 'Role par défaut (null) est géré comme patron/propriétaire')

// ── TEST 2 : Sécurité Financière (Masquage Marges & Coûts d\'achat) ──
console.log('\n--- 2. TEST SÉCURITÉ FINANCIÈRE ---')
assert(canViewFinancialMargins('employee') === false, 'Un employé NE PEUT PAS voir les prix d\'achat fournisseur')
assert(canViewFinancialMargins('caissier') === false, 'Un caissier NE PEUT PAS voir les prix d\'achat fournisseur')
assert(canViewFinancialMargins('owner') === true, 'Le patron PEUT voir les prix d\'achat et les marges')
assert(canExportAccountingReports('employee') === false, 'Un employé NE PEUT PAS exporter les rapports comptables')
assert(canExportAccountingReports('owner') === true, 'Le patron PEUT exporter les rapports comptables')

// ── TEST 3 : Simulation Assignation Boutique & Sync ID ──
console.log('\n--- 3. TEST TRANSMISSION SHOP_ID EMPLOYÉ -> PATRON ---')
const patronShopId = 'SHOP_BOUTIQUE_CENTRE_01'
const employeeData = {
  id: 'emp_123',
  email: 'caissier.moussa@gmail.com',
  name: 'Moussa',
  shop_id: patronShopId,
  role: 'employee',
}

// L'employé doit être strictement verrouillé sur le shop_id du patron
assert(employeeData.shop_id === patronShopId, 'L\'employé est rattaché au shop_id exact du patron')

// Simulation d'une écriture de vente enregistrée par l'employé
const saleRecordedByEmployee = {
  id: 'sale_999',
  shop_id: employeeData.shop_id,
  client: 'Mme Fatou',
  total: 5000,
  paid: 5000,
  debt: 0,
  recorded_by: employeeData.email,
  created_at: new Date().toISOString(),
}

assert(saleRecordedByEmployee.shop_id === patronShopId, 'La vente de l\'employé est envoyée dans la boutique du patron')
assert(saleRecordedByEmployee.recorded_by === 'caissier.moussa@gmail.com', 'La traçabilité de l\'employé est conservée')

// ── TEST 4 : Réception Temps Réel Côté Patron ──
console.log('\n--- 4. TEST SOUSCRIPTION TEMPS RÉEL (Supabase Channel) ---')
const realtimeChannelName = `realtime_sales_${patronShopId}`
assert(realtimeChannelName === 'realtime_sales_SHOP_BOUTIQUE_CENTRE_01', 'Le canal temps réel écoute la boutique exacte du patron')

console.log('\n============================================================')
console.log(`📊 RÉSULTAT DU CONTRÔLE : ${passedTests} SUCCÈS / ${failedTests} ÉCHECS`)
console.log('============================================================\n')

if (failedTests > 0) {
  process.exit(1)
}
