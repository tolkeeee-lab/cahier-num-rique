import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'

/**
 * Recupère un Bearer Token valide pour l'utilisateur actuellement connecté.
 */
export async function getValidAccessToken(): Promise<string | null> {
  if (!isSupabaseClientConfigured()) return null

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession()
    let token = sessionData.session?.access_token ?? null

    if (!token) {
      const { data: refreshed } = await supabaseClient.auth.refreshSession()
      token = refreshed.session?.access_token ?? null
    }

    return token
  } catch (err) {
    console.warn('[authenticatedFetch] Impossible de récupérer le token de session Supabase:', err)
    return null
  }
}

/**
 * Effectue une requête HTTP fetch munie automatiquement des en-têtes d'authentification Bearer
 * et de l'identifiant de la boutique (x-shop-id).
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { shopId?: string }
): Promise<Response> {
  const token = await getValidAccessToken()
  const headers = new Headers(init?.headers)

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const shopId = init?.shopId
  if (shopId && !headers.has('x-shop-id')) {
    headers.set('x-shop-id', shopId)
  }

  if (init?.body && !headers.has('Content-Type') && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const { shopId: _discard, ...fetchInit } = init || {}
  return fetch(input, {
    ...fetchInit,
    headers,
  })
}
