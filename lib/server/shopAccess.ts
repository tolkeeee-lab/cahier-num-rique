import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { requireAuthenticatedUser } from '@/lib/server/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function adminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server authorization is not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
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
): Promise<{ user: User; shop: AuthorizedShop; accessToken: string }> {
  const { user, accessToken } = await requireAuthenticatedUser(request)
  const shopId = normalizeShopId(requestedShopId)

  if (!shopId) {
    const error = new Error('Shop identification required')
    ;(error as Error & { status?: number }).status = 400
    throw error
  }

  const client = adminClient()

  let { data: shop, error: shopError } = await client
    .from('shops')
    .select('id, shop_code, owner_id')
    .eq('id', shopId)
    .maybeSingle()

  if (shopError) throw shopError

  if (!shop) {
    const result = await client
      .from('shops')
      .select('id, shop_code, owner_id')
      .eq('shop_code', shopId)
      .maybeSingle()

    shop = result.data
    shopError = result.error
    if (shopError) throw shopError
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
    }
  }

  const employeeById = await client
    .from('employees')
    .select('id, user_id, email, role, shop_id')
    .eq('shop_id', shop.id)
    .eq('id', user.id)
    .maybeSingle()

  if (employeeById.error) throw employeeById.error

  let employee = employeeById.data

  if (!employee) {
    const employeeByAuthId = await client
      .from('employees')
      .select('id, user_id, email, role, shop_id')
      .eq('shop_id', shop.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (employeeByAuthId.error) throw employeeByAuthId.error
    employee = employeeByAuthId.data
  }

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
): Promise<{ user: User; shop: AuthorizedShop; accessToken: string }> {
  const result = await requireShopAccess(request, requestedShopId)
  if (result.shop.role !== 'owner') {
    const error = new Error('Owner permission required')
    ;(error as Error & { status?: number }).status = 403
    throw error
  }
  return result
}
