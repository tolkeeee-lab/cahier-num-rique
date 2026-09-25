import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null

  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

/**
 * Authenticate the caller from the Supabase access token.
 *
 * Client-controlled values such as x-shop-id or x-user-role are deliberately
 * not used to establish identity or permissions.
 */
export async function requireAuthenticatedUser(
  request: Request,
): Promise<{ user: User; accessToken: string }> {
  if (!supabaseUrl || !supabaseAnonKey) {
    const error = new Error('Supabase server authentication is not configured')
    ;(error as Error & { status?: number }).status = 500
    throw error
  }

  const accessToken = getBearerToken(request)

  if (!accessToken) {
    const error = new Error('Authentication required')
    ;(error as Error & { status?: number }).status = 401
    throw error
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await client.auth.getUser(accessToken)

  if (error || !data.user) {
    const authError = new Error('Invalid or expired authentication token')
    ;(authError as Error & { status?: number }).status = 401
    throw authError
  }

  return { user: data.user, accessToken }
}

export function unauthorizedResponse(message = 'Authentication required') {
  return Response.json({ error: message }, { status: 401 })
}

export function getErrorStatus(error: unknown): number {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status
  }

  return 500
}
