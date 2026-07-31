import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'

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
      const { data, error } = await supabase
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

    if (isSupabaseConfigured()) {
      // 1. Insérer la fiche employé dans la table `employees`
      const { data, error } = await supabase
        .from('employees')
        .insert([
          {
            id: randomUUID(),
            shop_id: shopId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            role: role || 'employee',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'Cet employé est déjà associé à cette boutique.' },
            { status: 409 }
          )
        }
        throw error
      }

      // 2. Envoyer une invitation par e-mail via Supabase Auth Admin
      // Cela génère un lien sécurisé que l'employé clique pour définir son mot de passe.
      // Nécessite SUPABASE_SERVICE_ROLE_KEY (pas la clé anon).
      let inviteSent = false
      let inviteError: string | null = null

      const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')

      if (hasServiceRoleKey) {
        try {
          const { error: invErr } = await supabase.auth.admin.inviteUserByEmail(
            email.trim().toLowerCase(),
            {
              data: {
                full_name: name.trim(),
                role: role || 'employee',
                shop_id: shopId,
                shop_name: shopName,
                shop_activity: 'boutique',
              },
              // L'employé sera redirigé ici après avoir défini son mot de passe
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/callback`,
            }
          )
          if (invErr) {
            // L'utilisateur a peut-être déjà un compte — ce n'est pas bloquant
            inviteError = invErr.message
            console.warn('[Invite] Erreur non bloquante:', invErr.message)
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
      name: name.trim(),
      email: email.trim().toLowerCase(),
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
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('shop_id', shopId)

      if (error) throw error
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
