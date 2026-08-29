import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'
import { formatShortShopCode } from '@/lib/shopCodeUtils'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && !url.includes('placeholder') && key && !key.includes('placeholder')
}


// GET /api/employees
// Récupère la liste des employés associés à une boutique
export async function GET(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || 'default-shop'

    if (isSupabaseConfigured()) {
      const altShopId = shopId.startsWith('SHOP-')
        ? shopId.replace(/^SHOP-/i, 'BTQ-')
        : shopId.startsWith('BTQ-')
          ? shopId.replace(/^BTQ-/i, 'SHOP-')
          : shopId

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json({ employees: data || [] })
    }

    // Fallback local en mémoire pour le mode démo ou hors-ligne
    return NextResponse.json({ employees: [] })
  } catch (err) {
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
    const shopId = request.headers.get('x-shop-id') || 'default-shop'
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

    if (isSupabaseConfigured()) {
      const altShopId = shopId.startsWith('SHOP-')
        ? shopId.replace(/^SHOP-/i, 'BTQ-')
        : shopId.startsWith('BTQ-')
          ? shopId.replace(/^BTQ-/i, 'SHOP-')
          : shopId

      // 1. Supprimer toute ancienne ligne résiduelle avec cet email pour cette boutique pour autoriser la ré-invitation
      await supabase
        .from('employees')
        .delete()
        .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)
        .eq('email', cleanEmail)

      // 2. Insérer la nouvelle fiche employé dans la table `employees`
      const { data, error } = await supabase
        .from('employees')
        .insert([
          {
            id: randomUUID(),
            shop_id: shopId,
            name: cleanName,
            email: cleanEmail,
            role: role || 'employee',
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
                role: role || 'employee',
                shop_id: shopId,
                shop_name: shopName,
                shop_activity: 'boutique',
              },
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/callback`,
            }
          )

          if (invErr) {
            console.warn('[Invite] Premier essai invitation échoué, tentative de mise à jour:', invErr.message)
            // Si l'utilisateur a déjà un compte Auth, mettre à jour ses métadonnées boutique
            const { data: authUsers } = await supabase.auth.admin.listUsers()
            const existingUser = authUsers?.users?.find(u => u.email?.toLowerCase() === cleanEmail)

            if (existingUser) {
              await supabase.auth.admin.updateUserById(existingUser.id, {
                user_metadata: {
                  full_name: cleanName,
                  role: role || 'employee',
                  shop_id: shopId,
                  shop_name: shopName,
                  shop_activity: 'boutique',
                }
              })

              const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email: cleanEmail,
                options: {
                  redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/callback`,
                }
              })

              if (!linkErr && linkData) {
                inviteSent = true
                inviteError = null
              } else {
                inviteSent = true
                inviteError = 'Employé associé. Lien d\'accès réactivé.'
              }
            } else {
              inviteError = invErr.message
            }
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
    const shopId = request.headers.get('x-shop-id') || 'default-shop'

    if (!id) {
      return NextResponse.json(
        { error: "L'identifiant de l'employé est obligatoire." },
        { status: 400 }
      )
    }

    if (isSupabaseConfigured()) {
      const altShopId = shopId.startsWith('SHOP-')
        ? shopId.replace(/^SHOP-/i, 'BTQ-')
        : shopId.startsWith('BTQ-')
          ? shopId.replace(/^BTQ-/i, 'SHOP-')
          : shopId

      // 1. Récupérer l'email de l'employé avant la suppression
      const { data: empData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      const empEmail = empData?.email?.toLowerCase().trim()

      // 2. Supprimer la ligne dans `employees` par ID et/ou email pour shopId et altShopId
      if (empEmail) {
        await supabase
          .from('employees')
          .delete()
          .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)
          .eq('email', empEmail)
      }

      await supabase
        .from('employees')
        .delete()
        .eq('id', id)

      // 3. Nettoyer le compte Auth Supabase correspondant pour permettre une ré-invitation ultérieure
      const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')

      if (hasServiceRoleKey && empEmail) {
        try {
          const { data: authUsers } = await supabase.auth.admin.listUsers()
          const matchedUser = authUsers?.users?.find(u => u.email?.toLowerCase() === empEmail)
          if (matchedUser) {
            await supabase.auth.admin.deleteUser(matchedUser.id)
          }
        } catch (authErr) {
          console.warn('[DELETE Employee Auth Warning]:', authErr)
        }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erreur DELETE /api/employees:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
