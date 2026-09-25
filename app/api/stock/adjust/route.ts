import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { stockAdjustSchema, validatePayload } from '@/lib/validations'
import { requireShopAccess, shopAuthorizationErrorResponse } from '@/lib/server/shopAccess'

export async function POST(request: Request) {
  const requestedShopId = request.headers.get('x-shop-id')
  if (!requestedShopId) return NextResponse.json({ error: 'Boutique requise' }, { status: 400 })
  let shopId: string
  try { shopId = (await requireShopAccess(request, requestedShopId)).shop.id } catch (err) { return shopAuthorizationErrorResponse(err) }
  const altShopId = shopId.startsWith('SHOP-') ? shopId.replace(/^SHOP-/i, '') : `SHOP-${shopId}`
  const employeeName = request.headers.get('x-employee-name') || 'Gérant'

  try {
    const rawBody = await request.json()
    const validation = validatePayload(stockAdjustSchema, rawBody)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { productId, quantity, type, reason, notes } = validation.data

    // 1. Récupérer le produit (support shopId et altShopId)
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)
      .single()

    if (prodErr || !product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
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
    const parsedCost = typeof rawBody?.unitCost === 'number'
      ? rawBody.unitCost
      : (parseFloat(String(rawBody?.unitCost || '').replace(/\s+/g, '').replace(',', '.')) || 0)
    const effectiveUnitCost = (Number.isFinite(parsedCost) && parsedCost > 0) ? parsedCost : (product.unit_cost || 0)

    // Calcul de l'impact financier en caisse :
    // - Un ajustement d'inventaire ou une casse N'AJOUTE PAS d'argent au tiroir cash
    // - Un achat réel d'approvisionnement déduit le montant réel (unit_cost * qté)
    // - Une casse/perte enregistre la valeur pour traçabilité mais paid_amount = 0
    let calculatedTotal = 0
    let calculatedPaid = 0
    let saleType = 'stock_adjustment'
    let penColor = 'blue'

    if (reason === 'inventory_correction') {
      calculatedTotal = 0
      calculatedPaid = 0
      saleType = 'stock_adjustment'
      penColor = 'blue'
    } else if (type === 'in') {
      calculatedTotal = effectiveUnitCost * quantity
      calculatedPaid = calculatedTotal
      saleType = 'purchase_cash'
      penColor = 'green'
    } else if (reason === 'damage') {
      calculatedTotal = effectiveUnitCost * quantity
      calculatedPaid = 0
      saleType = 'stock_damage'
      penColor = 'red'
    } else if (reason === 'personal_use') {
      calculatedTotal = effectiveUnitCost * quantity
      calculatedPaid = 0
      saleType = 'personal_use'
      penColor = 'purple'
    } else {
      calculatedTotal = (product.unit_price || 0) * quantity
      calculatedPaid = 0
      saleType = 'stock_adjustment'
      penColor = 'blue'
    }

    // 2. Créer l'écriture dans sales
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        shop_id: shopId,
        client_name: fullNotes,
        date: todayStr,
        time: timeStr,
        total_amount: calculatedTotal,
        paid_amount: calculatedPaid,
        debt_amount: 0,
        status: 'paid',
        type: saleType,
        pen_color: penColor,
        notes: fullNotes,
      })
      .select()
      .single()

    if (saleErr) throw saleErr

    // 3. Créer l'article dans sold_articles
    const { error: articleErr } = await supabase
      .from('sold_articles')
      .insert({
        shop_id: shopId,
        sale_id: sale.id,
        product_id: product.id,
        product_name: product.name,
        product_name_canonical: product.name,
        quantity: quantity,
        unit_price: type === 'in' ? effectiveUnitCost : (product.unit_price || 0),
        subtotal: calculatedTotal,
      })

    if (articleErr) throw articleErr

    // 4. Mettre à jour la quantité globale en stock du produit et réinitialiser tracking_started_at
    // pour éviter que les calculs automatiques ne déduisent ou n'ajoutent une seconde fois l'opération.
    // Calcul du stock effectif réel avant cet ajustement pour ne pas effacer les ventes passées :
    let currentVal = product.initial_stock || 0
    if (typeof rawBody?.currentStock === 'number' && Number.isFinite(rawBody.currentStock)) {
      currentVal = Math.max(0, rawBody.currentStock)
    } else {
      const trackingStart = product.tracking_started_at || product.created_at
      let articlesQuery = supabase
        .from('sold_articles')
        .select('quantity, sales!inner(type, status, created_at)')
        .eq('product_id', product.id)
        .neq('sales.status', 'crossed_out')

      if (trackingStart) {
        articlesQuery = articlesQuery.gt('sales.created_at', trackingStart)
      }

      const { data: pastArticles } = await articlesQuery
      if (pastArticles && pastArticles.length > 0) {
        let totalIn = 0
        let totalOut = 0
        for (const item of pastArticles) {
          const sType = (item.sales as any)?.type
          const isEntry = ['purchase_cash', 'purchase_credit', 'stock_in', 'purchase_return'].includes(sType)
          if (isEntry) {
            totalIn += Number(item.quantity || 0)
          } else {
            totalOut += Number(item.quantity || 0)
          }
        }
        currentVal = Math.max(0, currentVal + totalIn - totalOut)
      }
    }

    const newStockVal = type === 'in' ? currentVal + quantity : Math.max(0, currentVal - quantity)
    const saleCreatedAt = sale.created_at || new Date().toISOString()
    const trackingTime = new Date(new Date(saleCreatedAt).getTime() + 1000).toISOString()

    const updatePayload: any = {
      initial_stock: Math.max(0, newStockVal),
      tracking_started_at: trackingTime,
      updated_at: new Date().toISOString(),
    }

    if (effectiveUnitCost > 0) {
      updatePayload.unit_cost = effectiveUnitCost
    }

    await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', product.id)
      .or(`shop_id.eq.${shopId},shop_id.eq.${altShopId}`)

    return NextResponse.json({
      success: true,
      message: `Stock ajusté (${signSymbol}${quantity} ${product.unit || 'unités'}) pour « ${product.name} ».`,
    })
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return shopAuthorizationErrorResponse(err)
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API/stock/adjust POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
