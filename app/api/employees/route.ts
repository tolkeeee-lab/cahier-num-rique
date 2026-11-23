import { NextRequest, NextResponse } from 'next/server'
import { supabase, isBackendSupabaseConfigured } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { requireShopAccess, requireShopOwner, shopAuthorizationErrorResponse } from '@/lib/server/shopAccess'

const isSupabaseConfigured = isBackendSupabaseConfigured


// GET /api/employees
// Récupère la liste des employés associés à une boutique
export async function GET(request: NextRequest) {
  try {
    const requestedShopId = request.headers.get('x-shop-id')
    if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
    const { shop, client: dbClient } = await requireShopAccess(request, requestedShopId)
    const shopId = shop.id
    const targetClient = (dbClient as typeof supabase) || supabase

    if (isSupabaseConfigured()) {
      const { data, error } = await targetClient
        .from('employees')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json({ employees: data || [] })
    }

    // Fallback local en mémoire pour le mode démo ou hors-ligne
    return NextResponse.json({ employees: [] })
  } catch (err) {
    if ((err as { status?: number })?.status === 401 || (err as { status?: number })?.status === 403) return shopAuthorizationErrorResponse(err)
    console.error('Erreur GET /api/employees:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}

// POST /api/employees
// Ajoute un employé à la boutique et lui envoie une invitation par e-mail
export async function POST(request: NextRequest) {
  try {
    const requestedShopId = request.headers.get('x-shop-id')
    if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
    const { shop, client: dbClient } = await requireShopOwner(request, requestedShopId)
    const shopId = shop.id
    const targetClient = (dbClient as typeof supabase) || supabase
    const shopName = request.headers.get('x-shop-name') || ''
    const { name, email, role } = await request.json()

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Nom et e-mail sont obligatoires.' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()
    const allowedRoles = ['employee', 'admin']
    const safeRole = allowedRoles.includes(String(role || '').toLowerCase()) ? String(role).toLowerCase() : 'employee'

    if (isSupabaseConfigured()) {
      // 1. Supprimer toute ancienne ligne résiduelle avec cet email pour cette boutique pour autoriser la ré-invitation
      await targetClient
        .from('employees')
        .delete()
        .eq('shop_id', shopId)
        .eq('email', cleanEmail)

      // 2. Insérer la nouvelle fiche employé dans la table `employees`
      const { data, error } = await targetClient
        .from('employees')
        .insert([
          {
            id: randomUUID(),
            shop_id: shopId,
            name: cleanName,
            email: cleanEmail,
            role: safeRole,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) {
        throw error
      }

      // 3. Envoyer ou ré-émettre l'invitation par e-mail via Supabase Auth Admin
      let inviteSent = false
      let inviteError: string | null = null

      const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')

      if (hasServiceRoleKey) {
        try {
          const { error: invErr } = await supabase.auth.admin.inviteUserByEmail(
            cleanEmail,
            {
              data: {
                full_name: cleanName,
                role: safeRole,
                shop_id: shopId,
                shop_name: shopName,
                shop_activity: 'boutique',
              },
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/callback`,
            }
          )

          if (invErr) {
            // SECURITE : Ne jamais modifier les user_metadata d'un compte Auth existant (peut appartenir a un autre patron ou superadmin).
            console.warn('[Invite] Compte Auth deja existant — rattachement via public.employees uniquement:', invErr.message)
            inviteSent = false
            inviteError = 'Compte deja existant : l\'employe a ete rattache a votre boutique.'
          } else {
            inviteSent = true
          }
        } catch (inviteEx: any) {
          inviteError = inviteEx?.message || 'Erreur lors de l\'envoi de l\'invitation'
          console.warn('[Invite] Exception non bloquante:', inviteEx)
        }
      } else {
        inviteError = 'SUPABASE_SERVICE_ROLE_KEY manquante — invitation e-mail désactivée.'
      }

      return NextResponse.json(
        { employee: data, inviteSent, inviteError },
        { status: 201 }
      )
    }

    // Fallback local en mémoire (mode démo / hors-ligne)
    const mockEmployee = {
      id: randomUUID(),
      shop_id: shopId,
      name: cleanName,
      email: cleanEmail,
      role: role || 'employee',
      created_at: new Date().toISOString()
    }
    return NextResponse.json(
      { employee: mockEmployee, inviteSent: false, inviteError: 'Mode hors-ligne — aucune invitation envoyée.' },
      { status: 201 }
    )
  } catch (err) {
    if ((err as { status?: number })?.status === 401 || (err as { status?: number })?.status === 403) return shopAuthorizationErrorResponse(err)
    console.error('Erreur POST /api/employees:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}


// DELETE /api/employees?id=UUID
// Dissocie un employé de la boutique
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const requestedShopId = request.headers.get('x-shop-id')
    if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
    const { shop, client: dbClient } = await requireShopOwner(request, requestedShopId)
    const shopId = shop.id
    const targetClient = (dbClient as typeof supabase) || supabase

    if (!id) {
      return NextResponse.json(
        { error: "L'identifiant de l'employé est obligatoire." },
        { status: 400 }
      )
    }

    if (isSupabaseConfigured()) {
      // 1. Récupérer l'email de l'employé avant la suppression (restreint strictement à la boutique)
      const { data: empData } = await targetClient
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('shop_id', shopId)
        .maybeSingle()

      if (!empData) {
        return NextResponse.json({ success: true, message: 'Employé introuvable ou déjà dissocié' })
      }

      const empEmail = empData?.email?.toLowerCase().trim()

      // 2. Supprimer la ligne dans `employees` par ID et/ou email pour la boutique autorisée
      if (empEmail) {
        await targetClient
          .from('employees')
          .delete()
          .eq('shop_id', shopId)
          .eq('email', empEmail)
      }

      await targetClient
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('shop_id', shopId)

      // 3. SÉCURITÉ : Ne jamais appeler supabase.auth.admin.deleteUser() ici.
      // La suppression de la ligne dans `employees` (scopée à shopId) suffit à révoquer l'accès à cette boutique
      // sans risquer de détruire le compte Auth global d'un propriétaire d'une autre boutique ou d'un administrateur.

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if ((err as { status?: number })?.status === 401 || (err as { status?: number })?.status === 403) return shopAuthorizationErrorResponse(err)
    console.error('Erreur DELETE /api/employees:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
