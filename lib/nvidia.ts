/**
 * Client d'intégration NVIDIA NIM pour CumuluShop
 * Modèle principal : Nemotron 30B / Llama 3.1 70B Instruct
 */

export interface SourcingProductInput {
  name: string
  category: string
  supplierPrice: number
  targetSalePrice: number
  sourcePlatform?: string
  estimatedShipping?: number
  notes?: string
}

export interface AdCreativeInput {
  productName: string
  productDescription: string
  platform: 'tiktok' | 'reels' | 'facebook' | 'google'
  angle: 'problem_solution' | 'unboxing_ugc' | 'viral_curiosity' | 'discount_urgency'
  targetAudience?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callNvidiaAI(messages: ChatMessage[], temperature = 0.6, maxTokens = 4096): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) {
    throw new Error("Clé API NVIDIA_API_KEY non configurée dans l'environnement.")
  }

  const model = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        top_p: 0.95,
        max_tokens: maxTokens,
        stream: false,
      }),
    })

    if (!response.ok) {
      console.warn(`NVIDIA Nemotron status ${response.status}. Tentative de fallback sur Llama 3.1 70B...`)
      const fallbackResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-70b-instruct',
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      })

      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text()
        throw new Error(`Erreur API NVIDIA (${fallbackResponse.status}): ${errorText}`)
      }

      const fallbackData = await fallbackResponse.json()
      return fallbackData.choices?.[0]?.message?.content || ''
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (err: any) {
    console.error('Erreur callNvidiaAI:', err)
    throw err
  }
}
