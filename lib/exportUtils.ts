/**
 * exportUtils.ts — Générateur d'exportations CSV/Excel et Rapports WhatsApp
 */

export interface SaleExportItem {
  id: string
  date: string
  time?: string
  client?: string
  total: number
  paid: number
  debt: number
  status: string
  type: string
  notes?: string
  articles?: Array<{
    name: string
    quantity: number
    unit_price: number
  }>
}

/**
 * Exporte une liste de ventes en fichier CSV compatible Excel (UTF-8 BOM).
 */
export function exportSalesToCSV(
  sales: SaleExportItem[],
  periodLabel: string = 'Toutes_les_ventes',
  shopName: string = 'Cahier_Numerique'
) {
  if (sales.length === 0) {
    alert("Aucune vente disponible à exporter pour cette période.")
    return
  }

  const headers = [
    "Date",
    "Heure",
    "Client",
    "Type de Transaction",
    "Statut",
    "Articles Vendus / Détails",
    "Montant Total (F)",
    "Montant Payé (F)",
    "Reste à Payer / Dette (F)"
  ]

  const rows = sales.map(s => {
    const isCrossed = s.status === 'crossed_out'
    const statusLabel = isCrossed ? 'Annulée (Rayée)' : s.debt > 0 ? 'Crédit / Dette' : 'Payée (Solde)'
    
    const articlesStr = s.articles && s.articles.length > 0
      ? s.articles.map(a => `${a.quantity}x ${a.name} à ${a.unit_price}F`).join(' | ')
      : s.notes || '—'

    return [
      `"${s.date}"`,
      `"${s.time || ''}"`,
      `"${(s.client || 'Client anonyme').replace(/"/g, '""')}"`,
      `"${s.type}"`,
      `"${statusLabel}"`,
      `"${articlesStr.replace(/"/g, '""')}"`,
      s.total || 0,
      s.paid || 0,
      s.debt || 0
    ]
  })

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const cleanShopName = shopName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const dateStr = new Date().toISOString().split('T')[0]
  
  link.setAttribute("href", url)
  link.setAttribute("download", `Rapport_Ventes_${cleanShopName}_${periodLabel}_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Génère un rapport de performance structuré pour WhatsApp.
 */
export function generateWhatsAppPerformanceReport(
  sales: SaleExportItem[],
  periodLabel: string = 'Cette Période',
  shopName: string = 'Cahier Numérique'
): string {
  const validSales = sales.filter(s => s.status !== 'crossed_out' && (s.type === 'cash_in' || s.type === 'sale_credit'))
  const totalRevenue = validSales.reduce((sum, s) => sum + s.total, 0)
  const totalPaid = validSales.reduce((sum, s) => sum + s.paid, 0)
  const totalDebt = validSales.reduce((sum, s) => sum + s.debt, 0)

  // Aggrégation top 5 des articles
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
  validSales.forEach(s => {
    if (s.articles && s.articles.length > 0) {
      s.articles.forEach(a => {
        const key = a.name.toLowerCase().trim()
        if (!productMap[key]) {
          productMap[key] = { name: a.name.trim(), qty: 0, revenue: 0 }
        }
        productMap[key].qty += a.quantity
        productMap[key].revenue += a.quantity * a.unit_price
      })
    }
  })

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const formatPrice = (p: number) => new Intl.NumberFormat('fr-FR').format(p) + ' F'

  let msg = `📈 *SYNTHÈSE DE PERFORMANCE (${periodLabel.toUpperCase()})*\n`
  msg += `🏪 *Commerce* : ${shopName}\n`
  msg += `📅 *Généré le* : ${new Date().toLocaleDateString('fr-FR')}\n`
  msg += `═════════════════════════\n`
  msg += `💰 *Chiffre d'Affaires Net* : ${formatPrice(totalRevenue)}\n`
  msg += `💵 *Encaissements Cash*     : ${formatPrice(totalPaid)}\n`
  if (totalDebt > 0) {
    msg += `⚠️ *Crédits Client Accordés* : ${formatPrice(totalDebt)}\n`
  }
  msg += `═════════════════════════\n`

  if (topProducts.length > 0) {
    msg += `🏆 *TOP 5 MEILLEURES VENTES* :\n`
    topProducts.forEach((p, idx) => {
      msg += `${idx + 1}. *${p.name}* ➔ ${p.qty} vendu(s) (${formatPrice(p.revenue)})\n`
    })
    msg += `═════════════════════════\n`
  }

  msg += `✨ _Rapport généré par Cahier Numérique PWA_`

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`
}
