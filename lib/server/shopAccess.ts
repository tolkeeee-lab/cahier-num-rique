import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { requireAuthenticatedUser } from '@/lib/server/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Retourne un client Supabase autorisé pour les opérations serveur :
 * 1. Priorité au Service Role Key si configuré (contourne RLS).
 * 2. Si absent, repli sur l'Anon Key avec le Bearer token de l'utilisateur (respecte RLS 'authenticated').
 */
export function getAuthorizedServerClient(accessToken?: string) {
  if (serviceRoleKey && supabaseUrl) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }

  const key = anonKey
  if (!supabaseUrl || !key) {
    throw new Error('Supabase server authorization is not configured')
  }

  return createClient(supabaseUrl, key, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}


export type AuthorizedShop = {
  id: string
  shopCode: string | null
  role: string
}

function normalizeShopId(value: string) {
  return value.trim()
}

export async function requireShopAccess(
  request: Request,
  requestedShopId: string,
): Promise<{ user: User; shop: AuthorizedShop; accessToken: string; client: any }> {
  const { user, accessToken } = await requireAuthenticatedUser(request)
  const shopId = normalizeShopId(requestedShopId)

  if (!shopId) {
    const error = new Error('Shop identification required')
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const client = getAuthorizedServerClient(accessToken)

  // 1. Recherche par UUID exact
  let { data: shop, error: shopError } = await client
    .from('shops')
    .select('id, shop_code, owner_id, name')
    .eq('id', shopId)
    .maybeSingle()

  if (shopError) throw shopError

  // 2. Recherche par shop_code (avec ou sans préfixe BTQ- / SHOP-)
  if (!shop) {
    const rawClean = shopId.replace(/^(BTQ-|SHOP-)/i, '').trim()
    const result = await client
      .from('shops')
      .select('id, shop_code, owner_id, name')
      .or(`shop_code.eq.${shopId},shop_code.ilike.%${rawClean}%`)
      .limit(1)
      .maybeSingle()

    shop = result.data
  }

  // 3. Recherche par nom officiel de la boutique (ex: "MAFRO")
  if (!shop) {
    const nameResult = await client
      .from('shops')
      .select('id, shop_code, owner_id, name')
      .ilike('name', shopId)
      .limit(1)
      .maybeSingle()

    shop = nameResult.data
  }

  // 4. Si l'utilisateur est propriétaire, résoudre vers sa boutique principale
  if (!shop && user.id) {
    const ownerResult = await client
      .from('shops')
      .select('id, shop_code, owner_id, name')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    shop = ownerResult.data
  }

  // 5. Si l'utilisateur est un employé, résoudre vers la boutique de son assignation
  if (!shop && user.email) {
    const empResult = await client
      .from('employees')
      .select('shop_id')
      .eq('email', user.email.toLowerCase())
      .limit(1)
      .maybeSingle()

    if (empResult.data?.shop_id) {
      const empShopRes = await client
        .from('shops')
        .select('id, shop_code, owner_id, name')
        .eq('id', empResult.data.shop_id)
        .maybeSingle()
      shop = empShopRes.data
    }
  }

  if (!shop) {
    const error = new Error('Shop not found')
    ;(error as Error & { status?: number }).status = 404
    throw error
  }

  if (shop.owner_id === user.id) {
    return {
      user,
      accessToken,
      shop: { id: shop.id, shopCode: shop.shop_code, role: 'owner' },
      client,
    }
  }

  const employeeById = await client
    .from('employees')
    .select('id, email, role, shop_id')
    .eq('shop_id', shop.id)
    .eq('id', user.id)
    .maybeSingle()

  if (employeeById.error) throw employeeById.error

  let employee = employeeById.data

  if (!employee && user.email) {
    const employeeByEmail = await client
      .from('employees')
      .select('id, email, role, shop_id')
      .eq('shop_id', shop.id)
      .eq('email', user.email.toLowerCase())
      .maybeSingle()

    if (employeeByEmail.error) throw employeeByEmail.error
    employee = employeeByEmail.data
  }

  if (!employee) {
    const error = new Error('You do not have access to this shop')
    ;(error as Error & { status?: number }).status = 403
    throw error
  }

  return {
    user,
    accessToken,
    shop: {
      id: shop.id,
      shopCode: shop.shop_code,
      role: employee.role || 'employee',
    },
    client,
  }
}

export function shopAuthorizationErrorResponse(error: unknown) {
  const status =
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number'
      ? error.status
      : 500

  return Response.json(
    { error: error instanceof Error ? error.message : 'Authorization failed' },
    { status },
  )
}

export async function requireShopOwner(
  request: Request,
  requestedShopId: string,
): Promise<{ user: User; shop: AuthorizedShop; accessToken: string; client: any }> {
  const result = await requireShopAccess(request, requestedShopId)
  if (result.shop.role !== 'owner') {
    const error = new Error('Owner permission required')
    ;(error as Error & { status?: number }).status = 403
    throw error
  }
  return result
}
