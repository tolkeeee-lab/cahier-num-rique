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
// Ajoute un employé à la boutique
export async function POST(request: NextRequest) {
  try {
    const shopId = request.headers.get('x-shop-id') || 'default-shop'
    const { name, email, role } = await request.json()

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Nom et e-mail sont obligatoires.' },
        { status: 400 }
      )
    }

    if (isSupabaseConfigured()) {
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

      return NextResponse.json({ employee: data }, { status: 201 })
    }

    // Fallback local en mémoire
    const mockEmployee = {
      id: randomUUID(),
      shop_id: shopId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || 'employee',
      created_at: new Date().toISOString()
    }
    return NextResponse.json({ employee: mockEmployee }, { status: 201 })
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
