import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    const formattedMessages = messages.length > 0
      ? messages
      : [{ role: 'user', content: prompt || 'Bonjour' }]

    const payload: Record<string, any> = {
      model,
      messages: formattedMessages,
      max_tokens,
      reasoning_budget,
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
