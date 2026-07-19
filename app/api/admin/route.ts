import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getLocalDb } from '@/lib/localDb'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && !url.includes('placeholder') && key && !key.includes('placeholder')
}

export async function GET(request: NextRequest) {
  try {
    // Vérification de sécurité : Seul l'admin a le droit d'appeler cette API
    // On passe par un header de clé ou on vérifie le mail de l'admin connecté
    const adminEmail = request.headers.get('x-admin-email') || ''
    
    // En production, on restreint aux emails de confiance
    const isAuthorized = adminEmail.endsWith('@cahier.admin') || adminEmail === 'admin@cahier.com' || adminEmail === 'tolkeeee@gmail.com' || adminEmail === 'tolkeeeee@gmail.com'
    
    // Bypass en mode développement local
    const isDev = process.env.NODE_ENV === 'development'
    
    if (!isAuthorized && !isDev) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    if (isSupabaseConfigured()) {
      // 1. Récupérer tous les utilisateurs (table employees)
      const { data: users, error: usersError } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // 2. Récupérer toutes les transactions pour agrégations
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, shop_id, type, total_amount, paid_amount, status, created_at')

      if (salesError) throw salesError

      const stats = buildAdminStats(users || [], sales || [])
      return NextResponse.json(stats)
    }

    // Fallback Mock Local
    const localSales = getLocalDb()
    
    // Dériver des utilisateurs locaux factices à partir des écritures locales
    const uniqueShops = Array.from(new Set(localSales.map(s => s.shop_id || 'default-shop')))
    const fakeUsers = uniqueShops.map((shopId, idx) => ({
      id: `fake_u_${idx}`,
      shop_id: shopId,
      name: idx === 0 ? 'Boutique Chantal' : `Boutique de Caisse ${idx}`,
      email: `owner_${idx}@cahier.com`,
      role: 'owner',
      created_at: new Date().toISOString()
    }))

    const stats = buildAdminStats(fakeUsers, localSales)
    return NextResponse.json(stats)

  } catch (err) {
    console.error('Erreur GET /api/admin:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}

// Fonction d'agrégation d'indicateurs
function buildAdminStats(users: any[], sales: any[]) {
  const shopMap: Record<string, {
    shop_id: string
    name: string
    owner_email: string
    transactions_count: number
    total_sales: number
    cash_balance: number
    employees_count: number
    created_at: string
  }> = {}

  // 1. Identifier les boutiques et leurs employés
  users.forEach(u => {
    const sid = u.shop_id
    if (!shopMap[sid]) {
      shopMap[sid] = {
        shop_id: sid,
        name: u.role === 'owner' ? u.name : `Boutique ${sid.slice(0, 5)}`,
        owner_email: u.role === 'owner' ? u.email : '',
        transactions_count: 0,
        total_sales: 0,
        cash_balance: 0,
        employees_count: 0,
        created_at: u.created_at
      }
    }
    if (u.role === 'owner') {
      shopMap[sid].name = u.name
      shopMap[sid].owner_email = u.email
    }
    shopMap[sid].employees_count += 1
  })

  // 2. Agréger les écritures financières par boutique
  sales.forEach(sale => {
    const sid = sale.shop_id || 'default-shop'
    if (!shopMap[sid]) {
      shopMap[sid] = {
        shop_id: sid,
        name: `Boutique ${sid.slice(0, 5)}`,
        owner_email: 'Inconnu',
        transactions_count: 0,
        total_sales: 0,
        cash_balance: 0,
        employees_count: 0,
        created_at: sale.created_at || new Date().toISOString()
      }
    }

    const item = shopMap[sid]
    if (sale.status !== 'crossed_out') {
      item.transactions_count += 1
      const total = sale.total_amount ?? sale.total ?? 0
      const paid = sale.paid_amount ?? sale.paid ?? 0

      // Calcul du chiffre d'affaires (ventes)
      if (sale.type === 'cash_in' || sale.type === 'sale_credit') {
        item.total_sales += total
      }

      // Calcul du solde de caisse réel
      if (sale.type === 'cash_in' || sale.type === 'payment_client') {
        item.cash_balance += paid
      } else if (sale.type === 'cash_out' || sale.type === 'purchase_cash' || sale.type === 'payment_supplier') {
        item.cash_balance -= total
      }
    }
  })

  const shopsList = Object.values(shopMap).sort((a, b) => b.transactions_count - a.transactions_count)

  // Indicateurs globaux
  const totalBoutiques = shopsList.length
  const totalUsers = users.length
  const globalTransactions = sales.filter(s => s.status !== 'crossed_out').length
  const globalVolumeSales = shopsList.reduce((acc, s) => acc + s.total_sales, 0)

  return {
    kpis: {
      totalBoutiques,
      totalUsers,
      globalTransactions,
      globalVolumeSales
    },
    shops: shopsList,
    users: users.map(u => ({
      id: u.id,
      shop_id: u.shop_id,
      name: u.name,
      email: u.email,
      role: u.role,
      created_at: u.created_at
    }))
  }
}
