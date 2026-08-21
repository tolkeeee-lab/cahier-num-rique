import { NextRequest, NextResponse } from 'next/server'
import { callNvidiaAI, ChatMessage } from '@/lib/nvidia'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, context } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages invalides' }, { status: 400 })
    }

    const systemPrompt = `Tu es l'Assistant Stratégique E-Commerce Copilote 24/7 de CumuluShop, propulsé par l'IA NVIDIA Nemotron.
Tu accompagnes les entrepreneurs et e-commerçants pour :
- Trouver des niches rentables et des produits gagnants
- Optimiser le ROAS (Return On Ad Spend) sur TikTok Ads, Facebook Ads et Google
- Améliorer le taux de conversion de leur boutique
- Gérer la logistique, négocier avec les fournisseurs et fidéliser les clients
- Automatiser les processus de vente et le service après-vente

Contexte boutique actuel : ${context ? JSON.stringify(context) : 'Aucun contexte spécifique'}

Réponds de manière concise, précise, encourageante, actionnable et orientée business. Utilise des listes à puces claires et des exemples concrets quand pertinent.`

    const formattedMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    const reply = await callNvidiaAI(formattedMessages, 0.7, 2500)

    return NextResponse.json({
      success: true,
      reply,
    })
  } catch (error: any) {
    console.error('Erreur API Copilot:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la génération de la réponse' },
      { status: 500 }
    )
  }
}
