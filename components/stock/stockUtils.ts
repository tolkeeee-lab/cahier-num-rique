import { StockItem, StockStatus, StockFormState } from './types'
import { getTodayDateString } from '@/lib/dateUtils'

export const CATEGORIES = [
  'Général',
  'Boissons',
  'Boissons & Bar',
  'Cuisiné / Plats',
  'Cafétéria / Ptis-dej',
  'Matières Premières / Ingrédients',
  'Prestations & Services',
  'Alimentation',
  'Hygiène',
  'Autre',
]

export const UNITS = [
  'unité',
  'pièce',
  'kg',
  'g',
  'litre',
  'cl',
  'carton',
  'sac',
  'colis',
  'boîte',
  'bouteille',
]

export const EMPTY_FORM: StockFormState = {
  name: '',
  category: 'Général',
  unit: 'unité',
  alert_threshold: 5,
  initial_stock: 0,
  unit_cost: 0,
  unit_price: 0,
  multiplier: 1,
  packaging_name: '',
  lot_quantity: 0,
  lot_price: 0,
}

export function formatPrice(price: number): string {
  const safe = Number.isFinite(price) ? price : 0
  return new Intl.NumberFormat('fr-FR').format(safe) + ' F'
}

export function getItemPurchaseValue(item: StockItem): number {
  const cost = Number(item.unit_cost || 0)
  const rawStock = Number(item.current_stock || 0)
  if (!cost || rawStock <= 0) return 0
  const stock = Math.max(0, rawStock)
  const mult = item.multiplier && item.multiplier > 1 ? Math.max(1, Math.round(item.multiplier)) : 1

  if (mult > 1) {
    const wholeCartons = Math.floor(stock / mult)
    const extraUnits = stock % mult
    let cartonCost = Math.round(cost * mult)

    // Reconstitution du prix exact du carton sans artefact d'arrondi de division
    // Ex: 333 F x 30 = 9990 F -> Vrai prix carton = 10 000 F (car 10000 / 30 = 333 F)
    for (const step of [500, 100, 50, 25, 10, 5]) {
      const candidate = Math.round(cartonCost / step) * step
      if (candidate > 0 && Math.abs(candidate - cartonCost) < mult && Math.round(candidate / mult) === Math.round(cost)) {
        cartonCost = candidate
        break
      }
    }

    return Math.round((wholeCartons * cartonCost) + (extraUnits * cost))
  }

  return Math.round(stock * cost)
}

export function getStockStatus(item: StockItem): StockStatus {
  if (item.is_unlimited || item.is_service) return 'ok'
  if (item.category) {
    const catLower = item.category.toLowerCase()
    if (
      catLower.includes('prestation') || 
      catLower.includes('service') || 
      catLower.includes('coiffure') || 
      catLower.includes('atelier') || 
      catLower.includes('salon') || 
      catLower.includes('couture')
    ) return 'ok'
  }

  const hasInitial = (item.initial_stock || 0) > 0
  const hasPurchases = (item.total_in || 0) > 0
  const isExplicitlyTracked = item.stock_tracked === true
  const isExplicitlyUntracked = item.stock_tracked === false

  if (isExplicitlyUntracked) return 'untracked'
  if (!isExplicitlyTracked && !hasInitial && !hasPurchases) return 'untracked'

  const current = item.current_stock ?? 0
  if (current <= 0) return 'out'
  if (current <= (item.alert_threshold ?? 5)) return 'low'
  return 'ok'
}

export function getStatusColors(status: StockStatus) {
  switch (status) {
    case 'ok':
      return { dot: 'bg-emerald-500', bar: 'bg-emerald-400', text: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50' }
    case 'low':
      return { dot: 'bg-amber-500', bar: 'bg-amber-400', text: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50' }
    case 'out':
      return { dot: 'bg-red-500', bar: 'bg-red-400', text: 'text-red-700', border: 'border-red-200', bg: 'bg-red-50' }
    case 'untracked':
      return { dot: 'bg-slate-400', bar: 'bg-slate-300', text: 'text-slate-500', border: 'border-slate-200', bg: 'bg-slate-50' }
  }
}

export function getBarWidth(item: StockItem): number {
  const curr = Number(item.current_stock || 0)
  if (curr <= 0) return 0
  const init = Number(item.initial_stock || 0)
  const totalIn = Number(item.total_in || 0)
  const alertThresh = Number(item.alert_threshold || 5)
  const max = Math.max(init + totalIn, alertThresh * 3, curr * 2, 1)
  return Math.min(100, Math.max(0, (curr / max) * 100))
}

export function exportStockToCSV(items: StockItem[], shopId: string) {
  if (items.length === 0) {
    alert("Aucun produit à exporter dans le stock.")
    return
  }

  const headers = [
    "Nom du Produit",
    "Catégorie",
    "Unité",
    "Prix d'Achat (F)",
    "Prix de Vente (F)",
    "Stock Initial",
    "Entrées de stock",
    "Sorties de stock",
    "Stock Actuel",
    "Valeur Stock Achat (F)",
    "Valeur Stock Vente (F)",
    "Statut Stock"
  ]

  const rows = items.map(item => {
    const st = getStockStatus(item)
    const status = st === 'untracked' ? 'Non suivi' : st === 'out' ? 'Rupture' : st === 'low' ? 'Stock Bas' : 'OK'
    const valAchat = getItemPurchaseValue(item)
    const valVente = Math.round(Math.max(0, Number(item.current_stock || 0)) * Number(item.unit_price || 0))

    return [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${(item.category || 'Général').replace(/"/g, '""')}"`,
      `"${(item.unit || 'unité').replace(/"/g, '""')}"`,
      item.unit_cost || 0,
      item.unit_price || 0,
      item.initial_stock || 0,
      item.total_in || 0,
      item.total_out || 0,
      item.current_stock,
      valAchat,
      valVente,
      `"${status}"`
    ]
  })

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `Cahier_Stock_${shopId}_${getTodayDateString()}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
