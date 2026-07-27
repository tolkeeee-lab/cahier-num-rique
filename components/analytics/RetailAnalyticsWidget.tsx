'use client'

import React, { useMemo } from 'react'
import { TrendingUp, Package, ShoppingBag, Award, Share2, Download, FileText, Layers } from 'lucide-react'
import { exportSalesToCSV, exportSalesToPDF, generateWhatsAppPerformanceReport } from '@/lib/exportUtils'

interface Article {
  name: string
  quantity: number
  unit_price: number
  category?: string
}

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
  articles?: Article[]
}

interface RetailAnalyticsWidgetProps {
  sales: Sale[]
  period: 'today' | '7days' | 'month' | 'all'
  onPeriodChange: (p: 'today' | '7days' | 'month' | 'all') => void
  userShops?: Array<{ id: string; name: string; activity: string }>
  shopName?: string
}

const PRODUCT_CATEGORY_INFOS: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  'Alimentation': { label: 'Alimentation', emoji: '🌾', bg: 'bg-amber-500', text: 'text-amber-700' },
  'Boissons': { label: 'Boissons', emoji: '🥤', bg: 'bg-blue-500', text: 'text-blue-700' },
  'Hygiène & Cosmétique': { label: 'Hygiène & Cosmétique', emoji: '🧼', bg: 'bg-[#9d60ec]', text: 'text-[#9d60ec]' },
  'Électronique': { label: 'Électronique & Mobile', emoji: '📱', bg: 'bg-emerald-500', text: 'text-emerald-700' },
  'Habillement': { label: 'Habillement & Textile', emoji: '👕', bg: 'bg-rose-500', text: 'text-rose-700' },
  'Divers': { label: 'Divers & Général', emoji: '📦', bg: 'bg-gray-400', text: 'text-gray-600' }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(price) + ' F'
}

export function RetailAnalyticsWidget({ sales, period, onPeriodChange, shopName = 'Boutique' }: RetailAnalyticsWidgetProps) {
  const [sortBy, setSortBy] = React.useState<'revenue' | 'quantity' | 'frequency'>('revenue')

  const retailStats = useMemo(() => {
    let totalCash = 0
    let totalCreditDehors = 0

    const map: Record<string, {
      name: string
      totalQuantity: number
      totalRevenue: number
      frequency: number
      category: string
    }> = {}

    sales.forEach(sale => {
      if (sale.status === 'crossed_out') return

      totalCash += sale.paid
      totalCreditDehors += sale.debt

      if (sale.articles && sale.articles.length > 0) {
        sale.articles.forEach(art => {
          const key = art.name.trim().toLowerCase()
          if (!map[key]) {
            map[key] = {
              name: art.name.trim(),
              totalQuantity: 0,
              totalRevenue: 0,
              frequency: 0,
              category: art.category || 'Divers'
            }
          }
          map[key].totalQuantity += art.quantity
          map[key].totalRevenue += (art.unit_price * art.quantity)
          map[key].frequency += 1
        })
      }
    })

    const productList = Object.values(map).sort((a, b) => {
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue
      if (sortBy === 'quantity') return b.totalQuantity - a.totalQuantity
      return b.frequency - a.frequency
    })

    const totalRevenue = totalCash + totalCreditDehors
    const totalQuantitySold = productList.reduce((acc, curr) => acc + curr.totalQuantity, 0)
    const averageBasket = sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0
    const topProduct = productList[0] || null

    // Catégories
    const catMap: Record<string, number> = {}
    productList.forEach(p => {
      const cat = p.category || 'Divers'
      catMap[cat] = (catMap[cat] || 0) + p.totalRevenue
    })

    const categoryStats = Object.entries(catMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
        info: PRODUCT_CATEGORY_INFOS[name] || PRODUCT_CATEGORY_INFOS['Divers']
      }))
      .sort((a, b) => b.amount - a.amount)

    return {
      totalRevenue,
      totalCash,
      totalCreditDehors,
      totalQuantitySold,
      averageBasket,
      topProduct,
      productList,
      categoryStats
    }
  }, [sales, sortBy])

  return (
    <div className="space-y-6">
      {/* Header Boutique */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏬</span>
          <div>
            <h2 className="font-handwritten text-xl font-bold text-gray-900">
              Analyses Ventes & Chiffre d'Affaires
            </h2>
            <p className="text-[9px] font-mono uppercase text-gray-400">
              PERFORMANCE DES PRODUITS ET ROTATION DES STOCKS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Boutons Période */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200">
            {[
              { id: 'all', label: 'Tout' },
              { id: 'month', label: 'Ce Mois' },
              { id: '7days', label: '7 Jours' },
              { id: 'today', label: 'Aujourd\'hui' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => onPeriodChange(p.id as any)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                  period === p.id 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => exportSalesToCSV(sales, period, shopName)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-bold uppercase tracking-wide transition-all shadow-sm"
            >
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => exportSalesToPDF(sales, period === 'all' ? 'Toutes les Ventes' : period, shopName)}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-bold uppercase tracking-wide transition-all shadow-sm"
            >
              <FileText className="w-3 h-3" />
              <span>PDF</span>
            </button>
            <a
              href={generateWhatsAppPerformanceReport(sales, period === 'all' ? 'Tout' : period, shopName)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-[10px] font-bold uppercase tracking-wide transition-all shadow-sm"
            >
              <Share2 className="w-3 h-3" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* 4 KPIs Clés Boutique */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">CA Ventes</span>
            <span className="text-lg font-bold font-mono text-emerald-800">{formatPrice(retailStats.totalRevenue)}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Articles Vendus</span>
            <span className="text-lg font-bold font-mono text-gray-800">{retailStats.totalQuantitySold} u</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Panier Moyen</span>
            <span className="text-lg font-bold font-mono text-gray-800">{formatPrice(retailStats.averageBasket)}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Award className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">N°1 des Ventes</span>
            <span className="text-xs font-bold text-gray-800 block truncate font-handwritten">
              {retailStats.topProduct ? retailStats.topProduct.name : 'Aucun'}
            </span>
          </div>
        </div>
      </div>

      {/* 📊 Répartition par Catégorie de Produit */}
      {retailStats.categoryStats.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm">
          <h3 className="font-handwritten text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-gray-700" />
            Répartition du Chiffre d'Affaires par Catégorie de Produit
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {retailStats.categoryStats.map((cat, idx) => (
              <div key={idx} className="space-y-1.5 bg-[#fdfaf2] border border-gray-150 p-3 rounded-2xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700 flex items-center gap-1.5">
                    <span>{cat.info.emoji}</span>
                    <span>{cat.info.label}</span>
                  </span>
                  <span className="font-mono font-bold text-gray-600">
                    {formatPrice(cat.amount)} ({cat.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cat.info.bg}`}
                    style={{ width: `${cat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🏆 Classement des Produits */}
      <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
          <div>
            <h3 className="font-handwritten text-xl font-bold text-gray-800 flex items-center gap-2">
              🏆 Classement des Produits ({retailStats.productList.length})
            </h3>
            <p className="text-[9px] font-mono uppercase text-gray-400">
              {sortBy === 'revenue' ? 'Trié par Chiffre d\'Affaires généré' : sortBy === 'quantity' ? 'Trié par volume d\'articles vendus' : 'Trié par fréquence de vente'}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#f5f1e8] p-1 rounded-2xl border border-gray-200">
            <button
              onClick={() => setSortBy('revenue')}
              className={`px-3 py-1 text-[10px] font-bold rounded-xl transition-all ${
                sortBy === 'revenue' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              💰 Par CA
            </button>
            <button
              onClick={() => setSortBy('quantity')}
              className={`px-3 py-1 text-[10px] font-bold rounded-xl transition-all ${
                sortBy === 'quantity' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📦 Par Quantité
            </button>
            <button
              onClick={() => setSortBy('frequency')}
              className={`px-3 py-1 text-[10px] font-bold rounded-xl transition-all ${
                sortBy === 'frequency' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🔄 Par Fréquence
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-gray-200 rounded-2xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#f5f1e8] text-[9px] uppercase font-bold text-gray-400 font-mono tracking-wider border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-3.5 px-4 bg-[#f5f1e8]">Rang</th>
                <th className="py-3.5 px-4 bg-[#f5f1e8]">Produit</th>
                <th className="py-3.5 px-4 bg-[#f5f1e8]">Catégorie</th>
                <th className="py-3.5 px-4 text-center bg-[#f5f1e8]">Quantité Vendue</th>
                <th className="py-3.5 px-4 text-center bg-[#f5f1e8]">Fréquence Ventes</th>
                <th className="py-3.5 px-4 text-right bg-[#f5f1e8]">CA Généré</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-sans bg-white">
              {retailStats.productList.map((prod, idx) => {
                const catInfo = PRODUCT_CATEGORY_INFOS[prod.category] || PRODUCT_CATEGORY_INFOS['Divers']
                return (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {idx === 0 ? '🥇 1er' : idx === 1 ? '🥈 2e' : idx === 2 ? '🥉 3e' : `#${idx + 1}`}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-800 flex items-center gap-2">
                      <span>{prod.name}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${catInfo.bg} text-white`}>
                        {catInfo.emoji} {catInfo.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-700">
                      {prod.totalQuantity} u
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-gray-500">
                      {prod.frequency} fois
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatPrice(prod.totalRevenue)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
