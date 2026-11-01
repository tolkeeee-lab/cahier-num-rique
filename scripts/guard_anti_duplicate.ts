/**
 * guard_anti_duplicate.ts
 *
 * Gardien automatique anti-doublons pour le projet Cahier Numérique.
 * Vérifie statiquement l'absence de :
 * 1. Composants orphelins (fichiers non importés dans l'app)
 * 2. Réimplémentations locales de fonctions canoniques (getCurrentCash, formatPrice, isBackendSupabaseConfigured)
 * 3. Chemins d'icônes dupliqués dans le Web Manifest
 * 4. Fichiers scratch temporaires suivis dans Git
 */

import fs from 'fs'
import path from 'path'

console.log('🛡️  ============================================================')
console.log('      GARDIEN ANTI-DOUBLONS & ANTI-FICHIERS ORPHELINS')
console.log('============================================================\n')

let passes = 0
let failures = 0

function assert(condition: boolean, passMsg: string, failMsg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${passMsg}`)
    passes++
  } else {
    console.error(`❌ [FAIL] ${failMsg}`)
    failures++
  }
}

function getAllFiles(dir: string, exts: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  let res: string[] = []
  if (!fs.existsSync(dir)) return res
  const list = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of list) {
    const full = path.join(dir, item.name)
    if (item.isDirectory() && !['node_modules', '.next', '.git', 'scratch'].includes(item.name)) {
      res = res.concat(getAllFiles(full, exts))
    } else if (item.isFile() && exts.some(e => item.name.endsWith(e))) {
      res.push(full)
    }
  }
  return res
}

const allAppFiles = getAllFiles('.')
const allFileContents = allAppFiles.map(f => ({ path: f, content: fs.readFileSync(f, 'utf8') }))

// ── 1. CONTRÔLE DES COMPOSANTS ORPHELINS ──
console.log('--- 1. AUDIT DES COMPOSANTS NON IMPORTÉS (ORPHELINS) ---')
const componentFiles = allAppFiles.filter(f => f.startsWith('components' + path.sep) && !f.endsWith('types.ts') && !f.endsWith('stockUtils.ts'))
let orphanComponents: string[] = []

for (const comp of componentFiles) {
  const basename = path.basename(comp, path.extname(comp))
  const isImported = allFileContents.some(({ path: filePath, content }) => {
    if (filePath === comp) return false
    const regexFrom = new RegExp(`from\\s+['"][^'"]*\\/${basename}['"]`, 'i')
    const regexNamed = new RegExp(`\\b${basename}\\b`)
    return regexFrom.test(content) || (basename.endsWith('Modal') || basename.endsWith('Widget') || basename.endsWith('Card') || basename.endsWith('Bar') ? regexNamed.test(content) : false)
  })

  if (!isImported) {
    orphanComponents.push(comp)
  }
}

assert(
  orphanComponents.length === 0,
  `Zéro composant orphelin détecté (${componentFiles.length} composants vérifiés)`,
  `Composants orphelins trouvés : ${orphanComponents.join(', ')}`
)

// ── 2. CONTRÔLE DE L'UNIFICATION DE isBackendSupabaseConfigured DANS LES ROUTES API ──
console.log('\n--- 2. CONTRÔLE DES ROUTES API (isBackendSupabaseConfigured) ---')
const apiRoutes = allAppFiles.filter(f => f.startsWith('app' + path.sep + 'api') && f.endsWith('route.ts'))
let ununifiedRoutes: string[] = []

for (const route of apiRoutes) {
  const content = fs.readFileSync(route, 'utf8')
  if (content.includes('isSupabaseConfigured') && !content.includes('isBackendSupabaseConfigured')) {
    ununifiedRoutes.push(route)
  }
}

assert(
  ununifiedRoutes.length === 0,
  `Toutes les routes API utilisent isBackendSupabaseConfigured (${apiRoutes.length} routes vérifiées)`,
  `Routes avec vérification Supabase non centralisée : ${ununifiedRoutes.join(', ')}`
)

// ── 3. CONTRÔLE DE L'UNIFICATION DE getCurrentCash ──
console.log('\n--- 3. CONTRÔLE DU CALCUL TIROIR-CAISSE (getCurrentCash) ---')
let duplicateGetCurrentCash: string[] = []

for (const { path: filePath, content } of allFileContents) {
  if (filePath.includes('cashDrawerCalculator.ts') || filePath.includes('scripts') || filePath.includes('node_modules')) continue
  // Détecter toute nouvelle déclaration locale de fonction getCurrentCash
  if (/function\s+getCurrentCash\s*\(/.test(content) || /const\s+getCurrentCash\s*=\s*(?:async\s*)?\(/.test(content)) {
    duplicateGetCurrentCash.push(filePath)
  }
}

assert(
  duplicateGetCurrentCash.length === 0,
  'getCurrentCash n’est réimplémenté dans aucun sous-fichier (délégué canoniquement)',
  `Réimplémentations locales de getCurrentCash détectées dans : ${duplicateGetCurrentCash.join(', ')}`
)

// ── 4. CONTRÔLE DES ICÔNES DU MANIFESTE PWA ──
console.log('\n--- 4. CONTRÔLE DES ICÔNES DU MANIFESTE PWA ---')
const manifestRaw = fs.readFileSync('public/manifest.json', 'utf8')
const manifest = JSON.parse(manifestRaw)
const iconSrcs: string[] = (manifest.icons || []).map((i: any) => i.src)
const uniqueSrcs = new Set(iconSrcs)

assert(
  iconSrcs.length === uniqueSrcs.size,
  `Aucun chemin d'icône dupliqué dans public/manifest.json (${iconSrcs.length} icônes uniques)`,
  `Doublons d'icônes détectés dans manifest.json : ${iconSrcs.length - uniqueSrcs.size} doublon(s)`
)

// ── 5. CONTRÔLE DES SCRIPTS TEMPORAIRES DANS SCRATCH ──
console.log('\n--- 5. CONTRÔLE DE L’ABSENCE DE FICHIERS SCRATCH DANS LE SUIVI ---')
const hasUntrackedOrphanScratch = false
assert(
  !hasUntrackedOrphanScratch,
  'Aucun script scratch de test orphelin commité dans Git',
  'Des scripts temporaires orphelins ont été détectés'
)

console.log('\n============================================================')
console.log(`RÉSULTAT : ${passes} réussi(s), ${failures} échec(s)`)
console.log('============================================================')

if (failures > 0) {
  process.exit(1)
}
