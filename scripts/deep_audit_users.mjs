#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

// Lire .env.local
let apiKey = process.env.NVIDIA_API_KEY || ''
if (!apiKey) {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const match = line.match(/^\s*NVIDIA_API_KEY\s*=\s*(.*?)\s*$/)
      if (match) {
        apiKey = match[1].replace(/["']/g, '')
        break
      }
    }
  }
}

if (!apiKey) {
  console.error('❌ Erreur: Variable NVIDIA_API_KEY introuvable dans .env.local')
  process.exit(1)
}

// Répertoires à scanner
const TARGET_DIRS = ['components', 'hooks', 'lib', 'app/api', 'app/journal', 'public']
const IGNORED = ['node_modules', '.next', '.git', 'scratch', 'dist']

function getFiles(dir) {
  let results = []
  if (!fs.existsSync(dir)) return results
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      if (!IGNORED.includes(file)) {
        results = results.concat(getFiles(filePath))
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      results.push(filePath)
    }
  }
  return results
}

console.log('📦 Collecte complète des fichiers du projet...')
let allFiles = []
for (const dir of TARGET_DIRS) {
  allFiles = allFiles.concat(getFiles(dir))
}

console.log(`📁 ${allFiles.length} fichiers scannés.\n`)

// Fichiers clés pour l'expérience commerçant
const keyFiles = [
  'app/journal/page.tsx',
  'components/SalesHistory.tsx',
  'components/CashClosingModal.tsx',
  'components/ReceiptPrinterModal.tsx',
  'components/StockManager.tsx',
  'components/stock/ProductModal.tsx',
  'hooks/useShopManager.ts',
  'hooks/useChangeCalculator.ts',
  'lib/offlineDb.ts',
  'lib/productUtils.ts',
  'app/api/sales/route.ts',
  'app/api/debts/route.ts'
]

let codebaseContext = `PROJET : CAHIER NUMÉRIQUE (Application de gestion commerciale et comptable pour commerçants, demi-grossistes, grossistes et services en Afrique de l'Ouest)\n\n`
codebaseContext += `LISTE GLOBALE DES FICHIERS (${allFiles.length} fichiers au total) :\n`
for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8')
  const lines = content.split('\n')
  codebaseContext += `- ${f} (${lines.length} lignes)\n`
}

codebaseContext += `\n\n=== CONTENU DES MODULES COMMERÇANTS STRATÉGIQUES ===\n`
for (const kf of keyFiles) {
  if (fs.existsSync(kf)) {
    const code = fs.readFileSync(kf, 'utf8')
    // Tronquer intelligemment pour rester dans le contexte optimal
    const lines = code.split('\n')
    const sample = lines.length > 200 ? lines.slice(0, 200).join('\n') + '\n// ... (suite du fichier)' : code
    codebaseContext += `\n--- FICHIER: ${kf} ---\n${sample}\n`
  }
}

const userPersona = `
CONTEXTE UTILISATEURS DU CAHIER NUMÉRIQUE :
- Utilisateurs cibles : Commerçants de quartier, demi-grossistes, boutiques d'alimentation, quincailleries, salons de coiffure, dépôts de boisson en Afrique de l'Ouest (Côte d'Ivoire, Sénégal, Bénin, Mali, Togo, Burkina, etc.).
- Environnement terrain : Téléphones Android d'entrée/milieu de gamme (2 à 4 Go RAM), réseaux 3G/4G instables avec coupures fréquentes, forte luminosité du soleil sur les étals.
- Usages quotidiens : Encaisser vite au comptoir (FCFA), noter les dettes clients (crédits), clôturer la caisse le soir sans erreur de monnaie, imprimer ou partager un reçu WhatsApp, surveiller le stock en cartons/packs/unités.
`

const prompt = `Tu es le Directeur Technique (CTO) et Expert en Ergonomie & Systèmes Offline-First pour les marchés émergents.

${userPersona}

Effectue un AUDIT EXHAUSTIF À 100% de l'ensemble du projet en te mettant STRICTEMENT à la place de ces commerçants.

Structure ton rapport autour des 5 piliers suivants :

1. 🏪 FLUIDITÉ & ERGONOMIE AU COMPTOIR :
   - Qu'est-ce qui pourrait ralentir un commerçant qui a une file de 5 clients devant sa boutique ?
   - Les interfaces de calcul de monnaie, de remise de prix et de sélection de produits sont-elles parfaites ?

2. 📴 RÉSILIENCE HORS-LIGNE (OFFLINE-FIRST) & SYNCHRONISATION :
   - Que se passe-t-il si la connexion coupe au milieu d'une vente ou d'une clôture de caisse ?
   - Y a-t-il des risques de perte de données ou de doublons lors de la resynchronisation ?

3. 🧾 GESTION DES DETTES & CARNET DE CRÉDIT CLIENT :
   - Le suivi des clients endettés, des acomptes et des relances est-il 100% infaillible ?

4. 🔒 CLÔTURE DE CAISSE & SÉPARATION DES RÔLES :
   - La clôture de caisse du soir permet-elle d'identifier les écarts (manquants/surplus) facilement ?
   - Les employés peuvent-ils voir des informations confidentielles (bénéfices nets, prix d'achat fournisseur) ?

5. 💎 TOP 5 DES AMÉLIORATIONS PRIORITAIRES :
   - Liste les 5 actions les plus impactantes à implémenter pour rendre cette application la N°1 incontestée sur le terrain.

Rédige en français avec des exemples très concrets et un haut niveau d'exigence technique.`

console.log('🤖 [NVIDIA Nemotron 30B Reasoning] Audit 100% Commerçants & Terrain en cours...\n')

try {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      messages: [
        { role: 'system', content: 'Tu es un architecte logiciel d\'élite spécialisé dans les applications mobiles et web résilientes pour les commerces en Afrique.' },
        { role: 'user', content: `${prompt}\n\n${codebaseContext}` }
      ],
      temperature: 0.5,
      top_p: 0.95,
      max_tokens: 65536,
      reasoning_budget: 16384,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`❌ Erreur API (${response.status}): ${errorText}`)
    process.exit(1)
  }

  const data = await response.json()
  const choice = data.choices?.[0] || {}
  const message = choice.message || {}

  console.log('🧠 ============================================================')
  console.log('         RAISONNEMENT DE NEMOTRON (REASONING CHAIN)            ')
  console.log('============================================================\n')
  console.log(message.reasoning_content || 'Raisonnement intégré.')

  console.log('\n\n💡 ============================================================')
  console.log('         RAPPORT D\'AUDIT COMPLET TERRAIN & COMMERÇANTS         ')
  console.log('============================================================\n')
  console.log(message.content || 'Aucune réponse.')
} catch (err) {
  console.error('❌ Exception:', err.message || err)
}
