/**
 * test_error_diagnostics.ts
 *
 * Suite de tests unitaires pour le moteur de télémétrie et auto-diagnostic
 * lib/errorDiagnostics.ts
 */

import {
  translateErrorToPlainLanguage,
  captureAppError,
  getRecentErrorLogs,
  clearErrorLogs,
  formatDiagnosticReport,
  generateWhatsAppErrorReportUrl,
} from '../lib/errorDiagnostics'

console.log('🩺 ============================================================')
console.log('      SUITE DE TESTS : TÉLÉMÉTRIE & AUTO-DIAGNOSTIC')
console.log('============================================================\n')

let passes = 0
let failures = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`)
    passes++
  } else {
    console.error(`❌ [FAIL] ${msg}`)
    failures++
  }
}

// 1. Traduction des erreurs Réseau
const netErr = translateErrorToPlainLanguage(new Error('Failed to fetch data from API'))
assert(netErr.category === 'network', 'Détection catégorie réseau pour "Failed to fetch"')
assert(netErr.title.includes('Connexion'), 'Titre commerçant adapté pour incident réseau')

// 2. Traduction des erreurs Supabase & Realtime Sync
const subErr = translateErrorToPlainLanguage(new Error('cannot add postgres_changes callbacks for realtime:realtime_shop_123 after subscribe()'))
assert(subErr.category === 'supabase_sync', 'Détection catégorie supabase_sync pour erreur subscribe')
assert(subErr.advice.includes('Relancer'), 'Conseil de relance présent pour synchronisation')

// 3. Traduction des erreurs de Stockage / Quota
const quotaErr = translateErrorToPlainLanguage(new Error('QuotaExceededError: The quota has been exceeded'))
assert(quotaErr.category === 'storage', 'Détection catégorie storage pour QuotaExceededError')
assert(quotaErr.title.includes('stockage'), 'Titre commerçant adapté pour saturation stockage')

// 4. Traduction des erreurs PWA / Cache
const chunkErr = translateErrorToPlainLanguage(new Error('Loading chunk app/journal/page failed'))
assert(chunkErr.category === 'pwa_cache', 'Détection catégorie pwa_cache pour ChunkLoadError')
assert(chunkErr.advice.includes('version'), 'Conseil de mise à jour pour chunk obsolète')

// 5. Traduction des erreurs d'authentification
const authErr = translateErrorToPlainLanguage(new Error('AuthSessionMissingError: No active session found'))
assert(authErr.category === 'auth', 'Détection catégorie auth')

// 6. Résilience absolue face aux entrées malformées (Zero Crash)
const nullErr = translateErrorToPlainLanguage(null)
assert(nullErr.category === 'runtime', 'Gestion gracieuse de null sans exception')

const cyclicObj: any = {}
cyclicObj.self = cyclicObj
const cyclicErr = translateErrorToPlainLanguage(cyclicObj)
assert(cyclicErr.category === 'runtime', 'Gestion gracieuse d\'objet cyclique sans exception')

// 7. Capture et Journalisation Locale (Ring Buffer)
clearErrorLogs()
const captured = captureAppError(new Error('Test capture error'), { shopId: 'BTQ-TEST-99' })
assert(captured.shopId === 'BTQ-TEST-99', 'Capture du code boutique dans le contexte')
assert(captured.id.startsWith('err_'), 'Génération d\'un ID unique d\'erreur')

const logs = getRecentErrorLogs()
assert(logs.length === 1, 'Journal local contient 1 log après capture')
assert(logs[0].technicalMessage.includes('Test capture error'), 'Message technique correctement journalisé')

// 8. Formatage du Rapport de Diagnostic & WhatsApp
const report = formatDiagnosticReport(captured)
assert(report.includes('DIAGNOSTIC TECHNIQUE'), 'En-tête de rapport présent')
assert(report.includes('BTQ-TEST-99'), 'Boutique présente dans le rapport textuel')

const waUrl = generateWhatsAppErrorReportUrl(captured, '+22990000000')
assert(waUrl.startsWith('https://wa.me/22990000000?text='), 'Génération URL WhatsApp support valide')
assert(waUrl.includes(encodeURIComponent('DIAGNOSTIC TECHNIQUE')), 'Contenu encodé correctement pour WhatsApp')

console.log('\n============================================================')
console.log(`RÉSULTAT : ${passes} réussi(s), ${failures} échec(s)`)
console.log('============================================================')

if (failures > 0) {
  process.exit(1)
}

