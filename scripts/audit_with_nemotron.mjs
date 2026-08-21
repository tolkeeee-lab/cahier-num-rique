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

// Répertoires à analyser
const TARGET_DIRS = ['components', 'hooks', 'lib', 'app/api']
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
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath)
    }
  }
  return results
}

console.log('📦 Collecte des fichiers du projet en cours...')
let allFiles = []
for (const dir of TARGET_DIRS) {
  allFiles = allFiles.concat(getFiles(dir))
}

console.log(`📁 ${allFiles.length} fichiers TypeScript trouvés.\n`)

// Construire un condensé synthétique de l'architecture
let codebaseSummary = `ARCHITECTURE DU PROJET CAHIER NUMÉRIQUE (${allFiles.length} fichiers)\n\n`

for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8')
  const lines = content.split('\n')
  const imports = lines.filter(l => l.startsWith('import ')).slice(0, 5).join(' ')
  const exports = lines.filter(l => l.startsWith('export ')).slice(0, 8).join('\n  ')
  codebaseSummary += `=== FICHIER: ${f} (${lines.length} lignes) ===\n`
  codebaseSummary += `Exports/Types:\n  ${exports || 'Composant interne'}\n\n`
}

// Ajouter le code critique des modules clés (Stock, Synchronisation, Hooks)
const criticalFiles = [
  'components/StockManager.tsx',
  'components/stock/ProductModal.tsx',
  'components/stock/ProductAdvancedForm.tsx',
  'components/stock/types.ts',
  'app/api/stock/route.ts',
  'lib/productUtils.ts',
  'hooks/useShopManager.ts'
]

codebaseSummary += `\n\n=== EXTRAITS DE CODE CRITIQUE DES MODULES CŒUR ===\n`
for (const cf of criticalFiles) {
  if (fs.existsSync(cf)) {
    const code = fs.readFileSync(cf, 'utf8')
    codebaseSummary += `\n--- CODE COMPLET: ${cf} ---\n${code}\n`
  }
}

const prompt = `Tu es un Expert Principal en Architecture Logicielle (React 19, Next.js 15, TypeScript, Supabase, Offline-first).

Effectue un AUDIT DE CODE COMPLET et APPROFONDI de l'ensemble du projet "Cahier Numérique" ci-dessous.

Voici les 5 axes précis à évaluer :
1. 🛡️ STABILITÉ & RISQUES DE BUGS : Y a-t-il des failles potentielles dans la gestion du stock, les synchronisations offline/online, ou les calculs de prix ?
2. 🧩 MODULARITÉ & DÉCOUPAGE : Y a-t-il encore des composants trop lourds ou monolithiques à surveiller ?
3. ⚡ PERFORMANCE & FLUIDITÉ : Les re-rendus React, les clés d'état et les hooks sont-ils optimaux pour les téléphones peu puissants en Afrique de l'Ouest ?
4. 🔒 SÉCURITÉ & RÔLES : La gestion multi-boutiques et la séparation Propriétaire / Employé sont-elles bien étanches ?
5. 📋 PLAN D'ACTION : Quelles sont les 3 recommandations concrètes prioritaires pour garantir une production sans aucune faille ?

Réponds en français avec un ton professionnel, structuré et très précis.`

console.log('🤖 [NVIDIA Nemotron 30B Reasoning] Audit global en cours avec raisonnement profond...\n')

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
        { role: 'system', content: 'Tu es un architecte logiciel de classe mondiale spécialisé en Next.js, React et systèmes distribués/offline-first.' },
        { role: 'user', content: `${prompt}\n\n${codebaseSummary}` }
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
  console.log('         RAISONNEMENT DE NEMOTRON (INTERNAL CHAIN OF THOUGHT)   ')
  console.log('============================================================\n')
  console.log(message.reasoning_content || 'Raisonnement intégré.')

  console.log('\n\n💡 ============================================================')
  console.log('         RAPPORT D\'AUDIT GLOBAL DE NEMOTRON                   ')
  console.log('============================================================\n')
  console.log(message.content || 'Aucune réponse.')
} catch (err) {
  console.error('❌ Exception:', err.message || err)
}
