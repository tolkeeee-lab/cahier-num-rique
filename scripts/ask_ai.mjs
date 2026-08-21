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

const args = process.argv.slice(2)
let prompt = ''
let filePath = ''

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' || args[i] === '-f') {
    filePath = args[i + 1] || ''
    i++
  } else {
    prompt += (prompt ? ' ' : '') + args[i]
  }
}

let context = ''
if (filePath && fs.existsSync(filePath)) {
  context = fs.readFileSync(filePath, 'utf8')
}

if (!prompt && !context) {
  console.log('Utilisation: node scripts/ask_ai.mjs "Votre question de code..."')
  console.log('Option fichier: node scripts/ask_ai.mjs -f components/StockManager.tsx "Analyse ce code"')
  process.exit(0)
}

let fullContent = prompt || 'Analyse ce code et propose des améliorations.'
if (context) {
  fullContent = `--- CONTEXTE FICHIER (${filePath}) ---\n${context}\n\n--- QUESTION / INSTRUCTION ---\n${fullContent}`
}

console.log('🤖 [NVIDIA Nemotron 30B Reasoning] Analyse en cours...\n')

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
      messages: [{ role: 'user', content: fullContent }],
      temperature: 0.6,
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

  if (message.reasoning_content) {
    console.log('🧠 --- RAISONNEMENT DU MODÈLE ---')
    console.log(message.reasoning_content)
    console.log('\n' + '='.repeat(60) + '\n')
  }

  console.log('💡 --- RÉPONSE / CODE DU MODÈLE ---')
  console.log(message.content || 'Aucune réponse.')
} catch (err) {
  console.error('❌ Exception:', err.message || err)
}
