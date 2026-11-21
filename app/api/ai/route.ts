import { NextResponse } from 'next/server'
import { requireAuthenticatedUser, unauthorizedResponse } from '@/lib/server/auth'

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser(request)
  } catch (err) {
    return unauthorizedResponse(err instanceof Error ? err.message : 'Authentication required')
  }

  const apiKey = process.env.NVIDIA_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Clé NVIDIA_API_KEY non configurée dans les variables d\'environnement.' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const {
      prompt,
      messages = [],
      model = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      temperature = 0.6,
      top_p = 0.95,
      max_tokens = 65536,
      reasoning_budget = 16384,
      stream = false,
    } = body

    const ALLOWED_MODELS = new Set([
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      'meta/llama-3.1-8b-instruct',
      'meta/llama-3.3-70b-instruct',
    ])
    const safeModel = typeof model === 'string' && ALLOWED_MODELS.has(model)
      ? model
      : 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'

    if (!Array.isArray(messages) || messages.length > 30) return NextResponse.json({ error: 'Trop de messages dans la requête.' }, { status: 400 })
    if (typeof prompt === 'string' && prompt.length > 20000) return NextResponse.json({ error: 'Prompt trop volumineux.' }, { status: 400 })

    // Bloquer l'injection de rôle system côté client et borner la taille cumulée de messages[i].content
    let totalChars = 0
    const sanitizedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []
    for (const m of messages) {
      if (!m || typeof m !== 'object') continue
      const content = typeof m.content === 'string' ? m.content : ''
      totalChars += content.length
      if (totalChars > 20000) {
        return NextResponse.json({ error: 'Contenu total des messages trop volumineux (max 20 000 caractères).' }, { status: 400 })
      }
      const role = m.role === 'assistant' ? 'assistant' : 'user'
      sanitizedMessages.push({ role, content })
    }

    const safeMaxTokens = Math.min(Math.max(Number(max_tokens) || 2048, 1), 4096)
    const safeReasoningBudget = Math.min(Math.max(Number(reasoning_budget) || 0, 0), 2048)

    const formattedMessages = sanitizedMessages.length > 0
      ? sanitizedMessages
      : [{ role: 'user' as const, content: typeof prompt === 'string' && prompt.trim() ? prompt : 'Bonjour' }]

    const payload: Record<string, any> = {
      model: safeModel,
      messages: formattedMessages,
      max_tokens: safeMaxTokens,
      reasoning_budget: safeReasoningBudget,
      temperature,
      top_p,
      stream,
    }

    if (prompt && messages.length === 0) {
      payload.prompt = prompt
    }

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: stream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[API/ai] Erreur NVIDIA NIM:', response.status, errorText)
      return NextResponse.json(
        { error: `Erreur NVIDIA (${response.status}): ${errorText}` },
        { status: response.status }
      )
    }

    if (stream) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[API/ai] Exception:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
