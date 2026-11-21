'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { 
  Package, 
  FileSpreadsheet, 
  Share2,
  Coins,
  ArrowDownRight,
  TrendingUp,
  Scale,
  FileText,
  Landmark
} from 'lucide-react'
import { getOfflineProducts, OfflineProduct } from '@/lib/offlineDb'
import { getItemPurchaseValue } from '@/components/stock/stockUtils'
import { exportSalesToCSV, exportSalesToPDF, generateWhatsAppPerformanceReport } from '@/lib/exportUtils'

interface Sale {
  id: string
  date: string
  time: string
  client: string
  total: number
  paid: number
  debt: number
  status: string
  type: string
  pen_color: string
  notes: string
  category?: string
  articles?: Array<{ name: string; quantity: number; unit_price: number; category?: string }>
}

interface ShopAccountingReportProps {
  sales: Sale[]
  shopId: string
  shopName?: string
  shopActivity?: string
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(amount)) + ' F'
}

export function ShopAccountingReport({
  sales,
  shopId,
  shopName = 'Ma Boutique',
}: ShopAccountingReportProps) {
  const [period, setPeriod] = useState<'all' | 'month' | '7days' | 'today'>('all')
  const [products, setProducts] = useState<OfflineProduct[]>([])

  // Charger le catalogue et les niveaux de stock
  useEffect(() => {
    if (!shopId) return
    const local = getOfflineProducts(shopId)
    setProducts(local || [])

    fetch('/api/stock', {
      headers: { 'x-shop-id': shopId },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.products && data.products.length > 0) {
          setProducts(data.products)
        }
      })
      .catch(() => {})
  }, [shopId])

  // Filtrer les ventes selon la pÃ©riode
  const filteredSales = useMemo(() => {
    const valid = sales.filter(s => s.status !== 'crossed_out')
    if (period === 'all') return valid

    const now = new Date()
    const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

    if (period === 'today') {
      return valid.filter(s => s.date === todayStr)
    }

    if (period === '7days') {
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const cutoffStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(sevenDaysAgo)
      return valid.filter(s => s.date >= cutoffStr)
    }

    if (period === 'month') {
      const currentMonth = todayStr.slice(0, 7)
      return valid.filter(s => s.date && s.date.startsWith(currentMonth))
    }

    return valid
  }, [sales, period])

  // Calculs Comptables Complets
  const accounting = useMemo(() => {
    let totalSalesCa = 0           // CA Total (Ventes au comptant + CrÃ©dits accordÃ©s)
    let totalCashReceived = 0      // Argent rÃ©el encaissÃ© en caisse
    let totalCustomerDebts = 0     // Dettes clients (crÃ©dits dehors)
    let totalStockPurchases = 0    // Achats de marchandises / RÃ©approvisionnement (Stylo Vert)
    let totalGeneralExpenses = 0   // DÃ©penses gÃ©nÃ©rales / Charges (Stylo Rouge)

    const expenseCategoryMap: Record<string, number> = {}

    filteredSales.forEach(s => {
      // 1. DÃ©penses d'exploitation & RÃ¨glements Fournisseurs
      if (s.pen_color === 'red' || s.type === 'cash_out' || s.type === 'payment_supplier') {
        const amt = s.total || s.paid || 0
        totalGeneralExpenses += amt
        const cat = s.category || (s.type === 'payment_supplier' ? 'RÃ¨glements Fournisseurs' : 'Charges diverses')
        expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + amt
        return
      }

      // 2. Achats de Marchandises / Stock (Cash ou CrÃ©dit Grossiste)
      if (s.pen_color === 'green' || s.pen_color === 'purple' || s.type === 'purchase_cash' || s.type === 'purchase_credit' || s.type === 'stock_cash') {
        const amt = s.total || s.paid || s.debt || 0
        totalStockPurchases += amt
        expenseCategoryMap['Achats Marchandises'] = (expenseCategoryMap['Achats Marchandises'] || 0) + amt
        return
      }

      // 3. Encaissements de crÃ©ances clients (RÃ¨glement dette)
      if (s.type === 'payment_client') {
        totalCashReceived += (s.paid || s.total || 0)
        return
      }

      // 4. Ventes Clients (Cash ou CrÃ©dit)
      if (s.type !== 'client_request') {
        totalSalesCa += (s.total || 0)
        totalCashReceived += (s.paid || 0)
        totalCustomerDebts += (s.debt || 0)
      }
    })

    // CoÃ»t estimÃ© des marchandises vendues (COGS)
    let costOfGoodsSold = 0
    filteredSales.forEach(s => {
      const isClientSale = ['cash_in', 'sale', 'sale_cash', 'sale_credit'].includes(s.type) || s.pen_color === 'blue' || s.pen_color === 'yellow'
      if (isClientSale && s.type !== 'client_request' && s.type !== 'payment_client') {
        s.articles?.forEach(art => {
          const prod = products.find(p => p.name.toLowerCase().trim() === art.name.toLowerCase().trim())
          const unitCost = prod?.unit_cost || 0
          costOfGoodsSold += unitCost * (art.quantity || 1)
        })
      }
    })

    // BÃ©nÃ©fice Net RÃ©alisÃ© = CA Total - CoÃ»t des marchandises vendues (ou achats) - DÃ©penses gÃ©nÃ©rales
    const realProfit = totalSalesCa - (costOfGoodsSold > 0 ? costOfGoodsSold : totalStockPurchases) - totalGeneralExpenses
    const profitMarginPercent = totalSalesCa > 0 ? Math.round((realProfit / totalSalesCa) * 100) : 0

    // â”€â”€ Valorisation Actuelle du Stock en Magasin â”€â”€
    let totalStockPurchaseValue = 0  // Valeur d'Achat du stock immobilisÃ©
    let totalStockSalesValue = 0     // Valeur Marchande de Revente du stock
    let totalUnitsInStock = 0        // Nombre total d'unitÃ©s physiques en magasin

    products.forEach(p => {
      const stockQty = Math.max(0, p.current_stock ?? p.initial_stock ?? 0)
      if (stockQty > 0 && stockQty < 999900 && !p.is_unlimited) {
        totalUnitsInStock += stockQty
        totalStockPurchaseValue += getItemPurchaseValue(p as any)
        totalStockSalesValue += stockQty * (p.unit_price || 0)
      }
    })

    const expectedStockProfit = Math.max(0, totalStockSalesValue - totalStockPurchaseValue)

    // Dettes clients totales non soldÃ©es (toute pÃ©riode confondue)
    const allTimeUnpaidDebts = sales
      .filter(s => s.status !== 'crossed_out')
      .reduce((sum, s) => sum + (s.debt || 0), 0)

    return {
      totalSalesCa,
      totalCashReceived,
      totalCustomerDebts,
      totalStockPurchases,
      totalGeneralExpenses,
      totalAllExpenses: totalStockPurchases + totalGeneralExpenses,
      costOfGoodsSold,
      realProfit,
      profitMarginPercent,
      totalStockPurchaseValue,
      totalStockSalesValue,
      expectedStockProfit,
      totalUnitsInStock,
      allTimeUnpaidDebts,
      expenseCategoryBreakdown: Object.entries(expenseCategoryMap).map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: (totalStockPurchases + totalGeneralExpenses) > 0 
          ? Math.round((amt / (totalStockPurchases + totalGeneralExpenses)) * 100) 
          : 0
      })).sort((a, b) => b.amount - a.amount),
    }
  }, [filteredSales, products, sales])

  // Partager le rapport WhatsApp
  const handleShareWhatsApp = () => {
    const periodLabel = period === 'all' ? 'Ã€ vie (Depuis crÃ©ation)' : period === 'month' ? 'Ce mois' : period === '7days' ? '7 derniers jours' : 'Aujourd\'hui'
    const url = generateWhatsAppPerformanceReport(filteredSales as any, periodLabel, shopName)
    if (typeof window !== 'undefined') {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="space-y-4 font-sans text-stone-900 pb-8">
      {/* â”€â”€ 1. EntÃªte & SÃ©lecteur de PÃ©riode â”€â”€ */}
      <div className="bg-white border border-amber-300/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-amber-950 flex items-center gap-2 font-mono">
              <Landmark className="w-5 h-5 text-amber-800" strokeWidth={1.75} />
              <span>ComptabilitÃ© & Bilan : {shopName}</span>
            </h2>
          </div>
          <p className="text-xs text-stone-500 font-mono mt-0.5">
            Pilotage financier certifiÃ©, chiffre d'affaires, dÃ©penses et valorisation du stock
          </p>
        </div>

        {/* Boutons de PÃ©riode */}
        <div className="flex items-center gap-1 bg-amber-100/80 p-1 rounded-xl border border-amber-300 font-mono text-xs w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              period === 'all' ? 'bg-amber-900 text-white shadow-xs' : 'text-amber-950 hover:bg-amber-200/70'
            }`}
          >
            Tout
          </button>
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              period === 'month' ? 'bg-amber-900 text-white shadow-xs' : 'text-amber-950 hover:bg-amber-200/70'
            }`}
          >
            Ce Mois
          </button>
          <button
            type="button"
            onClick={() => setPeriod('7days')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              period === '7days' ? 'bg-amber-900 text-white shadow-xs' : 'text-amber-950 hover:bg-amber-200/70'
            }`}
          >
            7 Jours
          </button>
          <button
            type="button"
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              period === 'today' ? 'bg-amber-900 text-white shadow-xs' : 'text-amber-950 hover:bg-amber-200/70'
            }`}
          >
            Aujourd&apos;hui
          </button>
        </div>
      </div>

      {/* â”€â”€ 2. Les 4 Piliers Financiers Majeurs â”€â”€ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CA Total */}
        <div className="bg-[#faf5e8] border border-stone-900/10 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-blue-900 font-mono text-xs font-semibold">
            <span>CHIFFRE D'AFFAIRES (CA)</span>
            <span className="p-1.5 bg-blue-200/80 text-blue-900 rounded-xl">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-semibold text-blue-950 font-mono tabular-nums">
            {formatPrice(accounting.totalSalesCa)}
          </div>
          <div className="text-[11px] text-blue-800 font-mono flex items-center justify-between pt-1 border-t border-blue-200/60">
            <span>EncaissÃ© rÃ©el :</span>
            <span className="font-semibold tabular-nums">{formatPrice(accounting.totalCashReceived)}</span>
          </div>
        </div>

        {/* DÃ©penses Totales */}
        <div className="bg-[#faf5e8] border border-stone-900/10 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-rose-900 font-mono text-xs font-semibold">
            <span>DÃ‰PENSES & ACHATS</span>
            <span className="p-1.5 bg-rose-200/80 text-rose-900 rounded-xl">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-semibold text-rose-950 font-mono tabular-nums">
            {formatPrice(accounting.totalAllExpenses)}
          </div>
          <div className="text-[11px] text-rose-800 font-mono flex items-center justify-between pt-1 border-t border-rose-200/60">
            <span>Achats stock : {formatPrice(accounting.totalStockPurchases)}</span>
          </div>
        </div>

        {/* BÃ©nÃ©fice Net RÃ©alisÃ© */}
        <div className="bg-[#faf5e8] border border-stone-900/10 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-emerald-900 font-mono text-xs font-semibold">
            <span>BÃ‰NÃ‰FICE NET RÃ‰EL</span>
            <span className="p-1.5 bg-emerald-200 text-emerald-950 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-semibold text-emerald-900 font-mono tabular-nums">
            {accounting.realProfit >= 0 ? `+${formatPrice(accounting.realProfit)}` : formatPrice(accounting.realProfit)}
          </div>
          <div className="text-[11px] text-emerald-800 font-mono flex items-center justify-between pt-1 border-t border-emerald-200/60">
            <span>Marge nette :</span>
            <span className="font-semibold tabular-nums">{accounting.profitMarginPercent}%</span>
          </div>
        </div>

        {/* Valeur du Stock en Magasin */}
        <div className="bg-[#faf5e8] border border-stone-900/10 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-amber-900 font-mono text-xs font-semibold">
            <span>VALEUR STOCK EN RAYON</span>
            <span className="p-1.5 bg-amber-200 text-amber-950 rounded-xl">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-semibold text-amber-950 font-mono tabular-nums">
            {formatPrice(accounting.totalStockPurchaseValue)}
          </div>
          <div className="text-[11px] text-amber-800 font-mono flex items-center justify-between pt-1 border-t border-amber-200/60">
            <span>Revente potentielle :</span>
            <span className="font-semibold tabular-nums">{formatPrice(accounting.totalStockSalesValue)}</span>
          </div>
        </div>
      </div>

      {/* â”€â”€ 3. Section Valorisation ComplÃ¨te du Stock â”€â”€ */}
      <div className="bg-white border border-amber-300/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
          <div className="flex items-center gap-2 text-amber-950 font-semibold font-mono text-sm">
            <Package className="w-4 h-4 text-amber-800" />
            <span>Inventaire & Valorisation DÃ©taillÃ©e du Stock :</span>
          </div>
          <span className="text-xs text-amber-900 font-mono font-bold bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-300">
            {products.length} rÃ©fÃ©rences ({accounting.totalUnitsInStock} unitÃ©s au total)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
            <span className="text-[11px] text-amber-800 font-bold">Valeur d'Achat ImmobilisÃ©e :</span>
            <div className="text-lg font-semibold text-amber-950 tabular-nums">{formatPrice(accounting.totalStockPurchaseValue)}</div>
            <p className="text-[10px] text-gray-500">Ce que ces marchandises ont coÃ»tÃ© chez le fournisseur</p>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
            <span className="text-[11px] text-blue-800 font-bold">Valeur Marchande (Revente) :</span>
            <div className="text-lg font-semibold text-blue-950 tabular-nums">{formatPrice(accounting.totalStockSalesValue)}</div>
            <p className="text-[10px] text-gray-500">Chiffre d'affaires attendu une fois tout le stock vendu</p>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
            <span className="text-[11px] text-emerald-800 font-bold">BÃ©nÃ©fice Futur en Magasin :</span>
            <div className="text-lg font-semibold text-emerald-900 tabular-nums">+{formatPrice(accounting.expectedStockProfit)}</div>
            <p className="text-[10px] text-gray-500">Gain net prÃ©visionnel enfermÃ© dans les rayons</p>
          </div>
        </div>
      </div>

      {/* â”€â”€ 4. Ventilation des DÃ©penses & Dettes Dehors â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 font-mono">
        {/* DÃ©penses par poste */}
        <div className="bg-white border border-amber-300/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
            <h3 className="text-xs font-semibold text-amber-950 uppercase flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4 text-rose-700" />
              <span>OÃ¹ est parti l'argent (DÃ©penses) :</span>
            </h3>
            <span className="text-xs font-bold text-rose-800 tabular-nums">{formatPrice(accounting.totalAllExpenses)}</span>
          </div>

          {accounting.expenseCategoryBreakdown.length > 0 ? (
            <div className="space-y-2">
              {accounting.expenseCategoryBreakdown.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-stone-800">
                    <span>{item.category}</span>
                    <span className="text-rose-800 tabular-nums">{formatPrice(item.amount)} ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-600 h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-gray-400 italic">
              Aucune dÃ©pense enregistrÃ©e sur cette pÃ©riode.
            </div>
          )}
        </div>

        {/* TrÃ©sorerie & Dettes Clients */}
        <div className="bg-white border border-amber-300/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
            <h3 className="text-xs font-semibold text-amber-950 uppercase flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-800" />
              <span>TrÃ©sorerie & CrÃ©dits Clients :</span>
            </h3>
          </div>

          <div className="space-y-2.5">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-950">Cash RÃ©el EncaissÃ© en Caisse :</span>
                <p className="text-[10px] text-emerald-800">Paiements reÃ§us sur la pÃ©riode</p>
              </div>
              <span className="text-base font-semibold text-emerald-900 tabular-nums">{formatPrice(accounting.totalCashReceived)}</span>
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-950">CrÃ©dits AccordÃ©s sur la pÃ©riode :</span>
                <p className="text-[10px] text-amber-800">Ventes non payÃ©es de la pÃ©riode</p>
              </div>
              <span className="text-base font-semibold text-amber-900 tabular-nums">{formatPrice(accounting.totalCustomerDebts)}</span>
            </div>

            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-950">Total Dettes Dehors (Ã€ vie) :</span>
                <p className="text-[10px] text-rose-800">Argent Ã  recouvrer auprÃ¨s des clients</p>
              </div>
              <span className="text-base font-semibold text-rose-900 tabular-nums">{formatPrice(accounting.allTimeUnpaidDebts)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ 5. Actions d'Exportation & Partage â”€â”€ */}
      <div className="bg-amber-100/60 border border-amber-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
        <span className="text-amber-950 font-bold flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-amber-900" />
          <span>Rapports Comptables & Partage :</span>
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportSalesToCSV(filteredSales as any, `Bilan_${shopName}_${period}`)}
            className="px-3 py-2 bg-white hover:bg-amber-50 border border-amber-300 text-amber-950 rounded-xl font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={() => exportSalesToPDF(filteredSales as any, `Bilan_${shopName}_${period}`, shopName)}
            className="px-3 py-2 bg-white hover:bg-amber-50 border border-amber-300 text-amber-950 rounded-xl font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
          >
            <FileText className="w-3.5 h-3.5 text-rose-700" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Rapport WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  )
}
