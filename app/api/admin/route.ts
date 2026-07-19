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
    const adminEmail = request.headers.get('x-admin-email') || ''
    
    // En production, on restreint aux emails de confiance
    const isAuthorized = adminEmail.endsWith('@cahier.admin') || adminEmail === 'admin@cahier.com' || adminEmail === 'tolkeeee@gmail.com' || adminEmail === 'tolkeeeee@gmail.com'
    
    // Bypass en mode développement local
    const isDev = process.env.NODE_ENV === 'development'
    
    if (!isAuthorized && !isDev) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    if (isSupabaseConfigured()) {
      let users: any[] = []

      // 1. a) Récupérer les comptes authentifiés via l'API Admin de Supabase
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
        if (!authError && authData?.users && authData.users.length > 0) {
          authData.users.forEach(u => {
            const userMeta = u.user_metadata || {}
            const email = u.email || ''
            const shopId = userMeta.shop_id || u.app_metadata?.shop_id || (email ? `SHOP-${email.split('@')[0].toUpperCase()}` : 'default-shop')
            const name = userMeta.full_name || userMeta.name || (email ? email.split('@')[0] : 'Propriétaire')
            const role = userMeta.role || 'owner'

            users.push({
              id: u.id,
              shop_id: shopId,
              email: email,
              name: name,
              role: role,
              created_at: u.created_at
            })
          })
        }
      } catch (err) {
        console.warn('Avertissement listUsers auth admin:', err)
      }

      // 1. b) Récupérer les employés enregistrés dans la table `employees`
      try {
        const { data: empUsers } = await supabase
          .from('employees')
          .select('*')
          .order('created_at', { ascending: false })

        if (empUsers && empUsers.length > 0) {
          empUsers.forEach(emp => {
            if (!users.some(u => u.email === emp.email)) {
              users.push(emp)
            }
          })
        }
      } catch (err) {
        console.warn('Avertissement table employees:', err)
      }

      // 2. Récupérer toutes les transactions pour agrégations
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          shop_id,
          date,
          time,
          client_name,
          total_amount,
          paid_amount,
          debt_amount,
          status,
          type,
          pen_color,
          notes,
          category,
          created_at,
          sold_articles(
            product_name,
            quantity,
            unit_price,
            category
          )
        `)

      if (salesError) throw salesError

      // 1. c) Si aucun utilisateur Auth/Employee n'est retourné, créer des gérants virtuels à partir des boutiques des ventes
      if (users.length === 0 && sales && sales.length > 0) {
        const uniqueShops = Array.from(new Set(sales.map(s => s.shop_id || 'default-shop')))
        users = uniqueShops.map((sid, idx) => ({
          id: `user_shop_${idx}`,
          shop_id: sid,
          name: sid === 'default-shop' ? 'Propriétaire Chantal' : `Commerçant #${sid.replace('SHOP-', '')}`,
          email: sid === 'default-shop' ? 'chantal@cahier.com' : `proprio_${sid.toLowerCase().slice(-6)}@cahier.com`,
          role: 'owner',
          created_at: new Date().toISOString()
        }))
      }

      const stats = buildAdminStats(users, sales || [])
      return NextResponse.json(stats)
    }

    // Fallback Mock Local
    const localSales = getLocalDb()
    
    // Dériver des utilisateurs locaux factices à partir des écritures locales
    const uniqueShops = Array.from(new Set(localSales.map(s => s.shop_id || 'default-shop')))
    const fakeUsers = uniqueShops.map((shopId, idx) => ({
      id: `fake_u_${idx}`,
      shop_id: shopId,
      name: idx === 0 ? 'Chantal' : `Boutiquier ${idx}`,
      email: idx === 0 ? 'chantal@cahier.com' : `owner_${idx}@cahier.com`,
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

// Fonction de formatage propre des noms de boutiques
function formatShopName(sid: string, ownerName?: string): string {
  if (ownerName && ownerName !== 'Utilisateur' && ownerName !== 'Propriétaire' && !ownerName.startsWith('Commerçant')) {
    return `Boutique de ${ownerName}`
  }
  if (sid === 'default-shop') {
    return 'Boutique Principale (Chantal)'
  }
  if (sid.startsWith('SHOP-')) {
    return `Boutique #${sid.replace('SHOP-', '')}`
  }
  if (sid.length > 15) {
    return `Boutique #${sid.slice(0, 8).toUpperCase()}`
  }
  return `Boutique ${sid}`
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

  // 1. Identifier les boutiques et leurs propriétaires/employés
  users.forEach(u => {
    const sid = u.shop_id || 'default-shop'
    if (!shopMap[sid]) {
      shopMap[sid] = {
        shop_id: sid,
        name: formatShopName(sid, u.role === 'owner' ? u.name : undefined),
        owner_email: u.role === 'owner' ? u.email : '',
        transactions_count: 0,
        total_sales: 0,
        cash_balance: 0,
        employees_count: 0,
        created_at: u.created_at || new Date().toISOString()
      }
    }
    if (u.role === 'owner') {
      shopMap[sid].name = formatShopName(sid, u.name)
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
        name: formatShopName(sid),
        owner_email: sid === 'default-shop' ? 'chantal@cahier.com' : `proprio_${sid.toLowerCase().slice(-6)}@cahier.com`,
        transactions_count: 0,
        total_sales: 0,
        cash_balance: 0,
        employees_count: 1,
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
  const totalUsers = Math.max(users.length, totalBoutiques)
  const globalTransactions = sales.filter(s => s.status !== 'crossed_out').length
  const globalVolumeSales = shopsList.reduce((acc, s) => acc + s.total_sales, 0)

  const formattedSales = sales.map(s => ({
    id: s.id,
    date: s.date || (s.created_at ? s.created_at.slice(0, 10) : ''),
    time: s.time || '',
    client: s.client_name || s.client || 'Client anonyme',
    total: s.total_amount ?? s.total ?? 0,
    paid: s.paid_amount ?? s.paid ?? 0,
    debt: s.debt_amount ?? s.debt ?? 0,
    status: s.status,
    type: s.type,
    pen_color: s.pen_color || 'blue',
    notes: s.notes || '',
    category: s.category || 'Divers',
    articles: (s.sold_articles || s.articles || []).map((art: any) => ({
      name: art.product_name || art.name,
      quantity: art.quantity,
      unit_price: art.unit_price,
      category: art.category || 'Divers'
    }))
  }))

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
    })),
    allSales: formattedSales
  }
}
