/**
 * test_realtime_instant_sync.ts
 *
 * Test approfondi de l'unification de la synchronisation instantanée PC <-> Téléphone.
 * Valide :
 * 1. L'harmonie déterministe des noms de canaux WebSocket entre UUID et codes courts BTQ/SHOP.
 * 2. L'interopérabilité des messages Broadcast (PC sur UUID <-> Téléphone sur BTQ-).
 * 3. L'inclusion multi-alias dans getDualShopIds pour les requêtes Supabase.
 */

import { normalizeShopCode, getDualShopIds } from '../lib/shopCodeUtils'
import { getRealtimeChannelName } from '../lib/realtimeSync'

console.log('⚡ ============================================================')
console.log('   TEST VALIDATION SYNCHRONISATION INSTANTANÉE (PC <-> MOBILE) ')
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

// ── 1. Unification des codes courts et UUID ──
console.log('--- 1. HARMONISATION CODES COURTS ET UUID ---')
const testUuid = 'c7b8a123-4567-4890-abcd-ef1234567890'
const testBtqCode = 'BTQ-C7B8A'
const testShopCode = 'SHOP-C7B8A'
const testRawCode = 'C7B8A'

assert(normalizeShopCode(testBtqCode) === 'C7B8A', 'normalizeShopCode décode BTQ-C7B8A en C7B8A')
assert(normalizeShopCode(testShopCode) === 'C7B8A', 'normalizeShopCode décode SHOP-C7B8A en C7B8A')
assert(normalizeShopCode(testRawCode) === 'C7B8A', 'normalizeShopCode préserve C7B8A brut')
assert(normalizeShopCode(testUuid) === 'C7B8A', 'normalizeShopCode unifie l\'UUID complet en son code court C7B8A')

// ── 2. Unification du Topic WebSocket Realtime ──
console.log('\n--- 2. CANAL WEBSOCKET PARTAGÉ PC <-> SMARTPHONE ---')
const channelFromPc = getRealtimeChannelName(testUuid)
const channelFromPhone = getRealtimeChannelName(testBtqCode)
const channelFromShop = getRealtimeChannelName(testShopCode)

assert(channelFromPc === 'realtime_shop_C7B8A', 'PC sur UUID écoute realtime_shop_C7B8A')
assert(channelFromPhone === 'realtime_shop_C7B8A', 'Smartphone sur BTQ- écoute realtime_shop_C7B8A')
assert(channelFromPc === channelFromPhone, 'PC et Smartphone rejoignent EXACTEMENT le même canal WebSocket')
assert(channelFromPhone === channelFromShop, 'Tolérance totale avec le préfixe SHOP-')

// ── 3. Interopérabilité des Messages Broadcast ──
console.log('\n--- 3. FILTRAGE ET VALIDATION DES PAYLOADS BROADCAST ---')
// Le PC émet avec son UUID
const payloadFromPc = {
  shopId: testUuid,
  entity: 'sales' as const,
  senderDeviceId: 'dev_pc_1',
  timestamp: Date.now(),
}

// Le téléphone écoute avec son code BTQ-C7B8A
const normalizedSender = normalizeShopCode(payloadFromPc.shopId)
const normalizedReceiver = normalizeShopCode(testBtqCode)

assert(
  normalizedSender === normalizedReceiver,
  `Le téléphone valide le broadcast du PC (${normalizedSender} === ${normalizedReceiver})`
)

// Inversement : Le téléphone émet avec BTQ-C7B8A et le PC écoute sur son UUID
const payloadFromPhone = {
  shopId: testBtqCode,
  entity: 'sales' as const,
  senderDeviceId: 'dev_phone_1',
  timestamp: Date.now(),
}
const normSenderPhone = normalizeShopCode(payloadFromPhone.shopId)
const normReceiverPc = normalizeShopCode(testUuid)

assert(
  normSenderPhone === normReceiverPc,
  `Le PC valide le broadcast du téléphone (${normSenderPhone} === ${normReceiverPc})`
)

// ── 4. Requêtes SQL Supabase Multi-Alias ──
console.log('\n--- 4. MULTI-ALIAS DANS GETDUALSHOPIDS ---')
const dualFromPhone = getDualShopIds(testBtqCode)
assert(dualFromPhone.includes('BTQ-C7B8A'), 'dualShopIds contient BTQ-C7B8A')
assert(dualFromPhone.includes('SHOP-C7B8A'), 'dualShopIds contient SHOP-C7B8A')
assert(dualFromPhone.includes('C7B8A'), 'dualShopIds contient C7B8A')

const dualFromPc = getDualShopIds(testUuid)
assert(dualFromPc.includes(testUuid), 'dualShopIds PC contient l\'UUID')
assert(dualFromPc.includes('BTQ-C7B8A'), 'dualShopIds PC contient le code court BTQ-')
assert(dualFromPc.includes('C7B8A'), 'dualShopIds PC contient le code propre 5 chars')

console.log('\n============================================================')
console.log(`RÉSULTAT : ${passes} réussi(s), ${failures} échec(s)`)
console.log('============================================================')

if (failures > 0) {
  process.exit(1)
}
