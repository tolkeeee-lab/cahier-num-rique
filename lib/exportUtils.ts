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

/**
 * Exporte le rapport financier au format PDF via l'impression HTML haute définition.
 */
export function exportSalesToPDF(
  sales: SaleExportItem[],
  periodLabel: string = 'Toutes_les_ventes',
  shopName: string = 'Cahier Numérique'
) {
  if (sales.length === 0) {
    alert("Aucune vente disponible à exporter pour cette période.")
    return
  }

  const validSales = sales.filter(s => s.status !== 'crossed_out')
  const totalRevenue = validSales.reduce((sum, s) => sum + (s.total || 0), 0)
  const totalPaid = validSales.reduce((sum, s) => sum + (s.paid || 0), 0)
  const totalDebt = validSales.reduce((sum, s) => sum + (s.debt || 0), 0)

  const formatPrice = (p: number) => new Intl.NumberFormat('fr-FR').format(p) + ' FCFA'
  const todayStr = new Date().toLocaleDateString('fr-FR')

  const rowsHtml = sales.map(s => {
    const isCrossed = s.status === 'crossed_out'
    const statusBg = isCrossed ? '#fee2e2' : s.debt > 0 ? '#fef3c7' : '#dcfce7'
    const statusText = isCrossed ? '#991b1b' : s.debt > 0 ? '#92400e' : '#166534'
    const statusLabel = isCrossed ? 'Annulée' : s.debt > 0 ? 'Crédit' : 'Payée'

    const articlesStr = s.articles && s.articles.length > 0
      ? s.articles.map(a => `${a.quantity}x ${a.name} (${formatPrice(a.unit_price)})`).join(', ')
      : s.notes || '—'

    return `
      <tr style="${isCrossed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${s.date} ${s.time || ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${s.client || 'Client anonyme'}</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px;">${articlesStr}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="background: ${statusBg}; color: ${statusText}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">
            ${statusLabel}
          </span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-weight: bold;">${formatPrice(s.total || 0)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: #166534;">${formatPrice(s.paid || 0)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; color: #991b1b;">${s.debt > 0 ? formatPrice(s.debt) : '—'}</td>
      </tr>
    `
  }).join('')

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres surgissantes (popups) pour imprimer le PDF.")
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Rapport Financier - ${shopName} - ${periodLabel}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #111827; margin: 0; padding: 24px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #374151; padding-bottom: 12px; margin-bottom: 16px; }
          .shop-title { font-size: 20px; font-weight: bold; color: #111827; }
          .kpi-container { display: flex; gap: 12px; margin-bottom: 20px; }
          .kpi-card { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px 14px; border-radius: 8px; }
          .kpi-title { font-size: 9px; text-transform: uppercase; color: #6b7280; font-weight: bold; }
          .kpi-value { font-size: 15px; font-weight: bold; font-family: monospace; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 10px; uppercase; color: #374151; border-bottom: 2px solid #d1d5db; }
          @media print {
            body { padding: 0; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="shop-title">📊 RAPPORT FINANCIER & D'ACTIVITÉ</div>
            <div style="color: #4b5563; margin-top: 2px;">Commerce : <strong>${shopName}</strong> | Période : <strong>${periodLabel}</strong></div>
          </div>
          <div style="text-align: right; color: #6b7280; font-size: 11px;">
            Généré le ${todayStr}<br/>
            Cahier Numérique PWA
          </div>
        </div>

        <div class="kpi-container">
          <div class="kpi-card">
            <div class="kpi-title">Chiffre d'Affaires Net</div>
            <div class="kpi-value" style="color: #111827;">${formatPrice(totalRevenue)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Encaissements Cash</div>
            <div class="kpi-value" style="color: #166534;">${formatPrice(totalPaid)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Crédits / Dettes Client</div>
            <div class="kpi-value" style="color: #991b1b;">${formatPrice(totalDebt)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date & Heure</th>
              <th>Client</th>
              <th>Détails Articles</th>
              <th style="text-align: center;">Statut</th>
              <th style="text-align: right;">Total</th>
              <th style="text-align: right;">Payé</th>
              <th style="text-align: right;">Dette</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 24px; text-align: center; color: #9ca3af; font-size: 10px; font-family: monospace; border-top: 1px solid #e5e7eb; padding-top: 12px;">
          Document officiel généré automatiquement par Cahier Numérique.
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

