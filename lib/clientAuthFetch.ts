'use client'

import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'

let installed = false
let cachedAccessToken: string | null = null
let tokenLoaded = false

function isSameOriginApiRequest(input: RequestInfo | URL): boolean {
  if (typeof window === 'undefined') return false
  let urlStr = ''
  if (typeof input === 'string') {
    urlStr = input
  } else if (input instanceof URL) {
    urlStr = input.toString()
  } else if (typeof Request !== 'undefined' && input instanceof Request) {
    urlStr = input.url
  }

  if (urlStr.startsWith('/api/')) return true
  if (urlStr.startsWith(`${window.location.origin}/api/`)) return true
  return false
}

async function resolveAccessToken(): Promise<string | null> {
  if (!isSupabaseClientConfigured()) return null
  if (cachedAccessToken) return cachedAccessToken
  if (!tokenLoaded) {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      cachedAccessToken = session?.access_token ?? null
      tokenLoaded = true
    } catch {
      return null
    }
  }
  return cachedAccessToken
}

/**
 * Installe un intercepteur idempotent sur window.fetch pour injecter
 * automatiquement `Authorization: Bearer <access_token>` sur tous les appels
 * same-origin `/api/*` sans jamais envoyer le token à des origines externes.
 */
export function installAuthenticatedApiFetch(): void {
  if (typeof window === 'undefined' || installed) return
  installed = true

  if (isSupabaseClientConfigured()) {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      cachedAccessToken = session?.access_token ?? null
      tokenLoaded = true
    }).catch(() => {})

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      cachedAccessToken = session?.access_token ?? null
      tokenLoaded = true
    })
  }

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isSameOriginApiRequest(input)) {
      return originalFetch(input, init)
    }

    const headers = new Headers(
      init?.headers ?? (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined)
    )

    if (!headers.has('Authorization')) {
      const token = await resolveAccessToken()
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
    }

    return originalFetch(input, { ...init, headers })
  }
}
