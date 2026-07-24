import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const shopId = request.headers.get('x-shop-id') || 'default-shop'
  const employeeName = request.headers.get('x-employee-name') || 'Gérant'

  try {
    const body = await request.json()
    const { productId, quantity, type, reason, notes } = body

    if (!productId || !quantity || quantity <= 0 || !['in', 'out'].includes(type)) {
      return NextResponse.json({ error: 'Paramètres d\'ajustement invalides' }, { status: 400 })
    }

    // 1. Récupérer le produit
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('shop_id', shopId)
      .single()

    if (prodErr || !product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const timeStr = new Date().toTimeString().split(' ')[0]
    const reasonLabel = {
      purchase: 'Achat / Reconstitution',
      damage: 'Casse / Perte / Périmé',
      inventory_correction: 'Ajustement Inventaire',
      personal_use: 'Consommation Personnelle',
    }[reason as string] || reason || 'Ajustement Manuel'

    const saleType = type === 'in' ? 'purchase_cash' : 'cash_in'
    const fullNotes = `[${reasonLabel}] ${notes ? `${notes} - ` : ''}Par ${employeeName}`

    // 2. Créer l'écriture dans sales
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        shop_id: shopId,
        client_name: fullNotes,
        date: todayStr,
        time: timeStr,
        total_amount: type === 'in' ? (product.unit_cost || 0) * quantity : (product.unit_price || 0) * quantity,
        paid_amount: type === 'in' ? (product.unit_cost || 0) * quantity : (product.unit_price || 0) * quantity,
        debt_amount: 0,
        status: 'paid',
        type: saleType,
        notes: fullNotes,
      })
      .select()
      .single()

    if (saleErr) throw saleErr

    // 3. Créer l'article dans sold_articles
    const { error: articleErr } = await supabase
      .from('sold_articles')
      .insert({
        sale_id: sale.id,
        product_id: product.id,
        product_name: product.name,
        product_name_canonical: product.name,
        quantity: quantity,
        unit_price: type === 'in' ? (product.unit_cost || 0) : (product.unit_price || 0),
        subtotal: type === 'in' ? (product.unit_cost || 0) * quantity : (product.unit_price || 0) * quantity,
      })

    if (articleErr) throw articleErr

    return NextResponse.json({
      success: true,
      message: `Stock ajusté (${type === 'in' ? '+' : '-'}${quantity} ${product.unit || 'unités'}) pour « ${product.name} ».`,
    })
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API/stock/adjust POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
