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

    const signSymbol = type === 'in' ? '+' : '-'
    const fullNotes = `[${reasonLabel}] ${signSymbol}${quantity} ${product.name} par ${employeeName}${notes ? ` (${notes})` : ''}`

    // Coût d'achat unitaire effectif fourni par le propriétaire ou pré-existant en base (sans estimation à 60%)
    const inputUnitCost = typeof body.unitCost === 'number' ? body.unitCost : (parseInt(body.unitCost) || 0)
    const effectiveUnitCost = inputUnitCost > 0 ? inputUnitCost : (product.unit_cost || 0)

    // Calcul de l'impact financier en caisse :
    // - Un simple ajustement d'inventaire (inventaire physique) N'IMPACTE PAS le tiroir cash (0 F)
    // - Un achat réel d'approvisionnement déduit le montant réel (unit_cost * qté)
    // - Une casse/perte enregistre la valeur d'achat du produit perdu
    let calculatedAmount = 0
    if (reason === 'inventory_correction') {
      calculatedAmount = 0
    } else if (type === 'in') {
      calculatedAmount = effectiveUnitCost * quantity
    } else {
      calculatedAmount = (reason === 'damage' || reason === 'personal_use')
        ? effectiveUnitCost * quantity
        : (product.unit_price || 0) * quantity
    }

    const saleType = type === 'in' ? 'stock_cash' : 'cash_in'

    // 2. Créer l'écriture dans sales
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        shop_id: shopId,
        client_name: fullNotes,
        date: todayStr,
        time: timeStr,
        total_amount: calculatedAmount,
        paid_amount: calculatedAmount,
        debt_amount: 0,
        status: 'paid',
        type: saleType,
        pen_color: type === 'in' ? 'green' : 'black',
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
        unit_price: type === 'in' ? effectiveUnitCost : (product.unit_price || 0),
        subtotal: calculatedAmount,
      })

    if (articleErr) throw articleErr

    // 4. Mettre à jour la quantité globale en stock du produit
    const updatePayload: any = {
      initial_stock: Math.max(0, newStockVal),
      updated_at: new Date().toISOString()
    }

    if (effectiveUnitCost > 0) {
      updatePayload.unit_cost = effectiveUnitCost
    }

    await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', product.id)

    return NextResponse.json({
      success: true,
      message: `Stock ajusté (${signSymbol}${quantity} ${product.unit || 'unités'}) pour « ${product.name} ».`,
    })
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API/stock/adjust POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
