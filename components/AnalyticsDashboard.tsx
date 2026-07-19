'use client'

import React, { useState, useMemo } from 'react'
import { TrendingUp, Package, ShoppingBag, Layers, Award, BarChart3 } from 'lucide-react'

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

interface AnalyticsDashboardProps {
  sales: Sale[]
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
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(price) + ' F'
}

export function AnalyticsDashboard({ sales }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'all'>('all')
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'frequency'>('revenue')

  // Filtrer les ventes selon la période choisie
  const filteredSales = useMemo(() => {
    const validSales = sales.filter(s => s.status !== 'crossed_out' && (s.type === 'cash_in' || s.type === 'sale_credit'))
    if (period === 'all') return validSales

    const now = new Date()
    const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

    if (period === 'today') {
      return validSales.filter(s => s.date === todayStr)
    }

    if (period === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return validSales.filter(s => new Date(s.date) >= sevenDaysAgo)
    }

    if (period === 'month') {
      const currentMonth = todayStr.slice(0, 7) // "YYYY-MM"
      return validSales.filter(s => s.date && s.date.startsWith(currentMonth))
    }

    return validSales
  }, [sales, period])

  // Aggrégation par produit
  const productStats = useMemo(() => {
    const map: Record<string, {
      name: string
      totalQuantity: number
      totalRevenue: number
      frequency: number
      category: string
      unitPrices: number[]
    }> = {}

    filteredSales.forEach(sale => {
      if (sale.articles && sale.articles.length > 0) {
        sale.articles.forEach(art => {
          const key = art.name.trim().toLowerCase()
          if (!map[key]) {
            map[key] = {
              name: art.name.trim(),
              totalQuantity: 0,
              totalRevenue: 0,
              frequency: 0,
              category: art.category || 'Divers',
              unitPrices: []
            }
          }
          map[key].totalQuantity += art.quantity
          map[key].totalRevenue += art.quantity * art.unit_price
          map[key].frequency += 1
          map[key].unitPrices.push(art.unit_price)
        })
      }
    })

    return Object.values(map).sort((a, b) => {
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue
      if (sortBy === 'quantity') return b.totalQuantity - a.totalQuantity
      return b.frequency - a.frequency
    })
  }, [filteredSales, sortBy])

  // Aggrégation par catégorie de produit
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {}
    let totalRev = 0

    productStats.forEach(p => {
      const cat = p.category || 'Divers'
      map[cat] = (map[cat] || 0) + p.totalRevenue
      totalRev += p.totalRevenue
    })

    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalRev > 0 ? Math.round((amount / totalRev) * 100) : 0,
        info: PRODUCT_CATEGORY_INFOS[name] || PRODUCT_CATEGORY_INFOS['Divers']
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [productStats])

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, curr) => acc + curr.total, 0)
  }, [filteredSales])

  const totalQuantitySold = useMemo(() => {
    return productStats.reduce((acc, curr) => acc + curr.totalQuantity, 0)
  }, [productStats])

  const averageBasket = useMemo(() => {
    return filteredSales.length > 0 ? Math.round(totalRevenue / filteredSales.length) : 0
  }, [totalRevenue, filteredSales])

  const topProduct = productStats[0] || null

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fbf9f4] font-sans">
      {/* Header avec filtre de période */}
      <div className="px-6 py-4 border-b border-gray-200 bg-[#f5f1e8] flex flex-col sm:flex-row items-center justify-between gap-3 select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-700" />
          <div>
            <h2 className="font-handwritten text-2xl font-bold text-gray-900">
              Analyses & Statistiques de Ventes
            </h2>
            <p className="text-[9px] font-mono uppercase text-gray-400 tracking-wider">
              PERFORMANCE DES PRODUITS ET ROTATION DES STOCKS
            </p>
          </div>
        </div>

        {/* Boutons Période */}
        <div className="flex gap-1.5 bg-white border border-gray-250 p-1 rounded-2xl shadow-sm">
          {[
            { id: 'all', label: 'Tout' },
            { id: 'month', label: 'Ce Mois' },
            { id: '7days', label: '7 Jours' },
            { id: 'today', label: 'Aujourd\'hui' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                period === p.id 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* KPI Summary Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">CA Ventes</span>
              <span className="text-lg font-bold font-mono text-emerald-800">{formatPrice(totalRevenue)}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Articles Vendus</span>
              <span className="text-lg font-bold font-mono text-gray-800">{totalQuantitySold} u</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Panier Moyen</span>
              <span className="text-lg font-bold font-mono text-gray-800">{formatPrice(averageBasket)}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Award className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">N°1 des Ventes</span>
              <span className="text-xs font-bold text-gray-800 block truncate font-handwritten">
                {topProduct ? topProduct.name : 'Aucun'}
              </span>
            </div>
          </div>
        </div>

        {/* Graphique de Répartition par Catégorie de Produit */}
        {categoryStats.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm">
            <h3 className="font-handwritten text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-gray-700" />
              Répartition du Chiffre d'Affaires par Catégorie de Produit
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryStats.map((cat, idx) => (
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

        {/* Tableau du Classement des Produits (Top Produit + Fréquence) */}
        <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
            <div>
              <h3 className="font-handwritten text-xl font-bold text-gray-800 flex items-center gap-2">
                🏆 Classement des Produits ({productStats.length})
              </h3>
              <p className="text-[9px] font-mono uppercase text-gray-400">
                {sortBy === 'revenue' ? 'Trié par Chiffre d\'Affaires généré' : sortBy === 'quantity' ? 'Trié par volume d\'articles vendus' : 'Trié par fréquence de vente'}
              </p>
            </div>

            {/* Boutons de Tri */}
            <div className="flex items-center gap-1 bg-[#f5f1e8] p-1 rounded-2xl border border-gray-200">
              <button
                onClick={() => setSortBy('revenue')}
                className={`px-3 py-1 text-[10px] font-bold rounded-xl transition-all ${
                  sortBy === 'revenue' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                💰 Par CA
              </button>
              <button
                onClick={() => setSortBy('quantity')}
                className={`px-3 py-1 text-[10px] font-bold rounded-xl transition-all ${
                  sortBy === 'quantity' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                📦 Par Quantité
              </button>
              <button
                onClick={() => setSortBy('frequency')}
                className={`px-3 py-1 text-[10px] font-bold rounded-xl transition-all ${
                  sortBy === 'frequency' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                {productStats.map((prod, idx) => {
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
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 ${catInfo.text}`}>
                          <span>{catInfo.emoji}</span>
                          <span>{catInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-900">
                        {prod.totalQuantity} u
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-gray-500">
                        {prod.frequency} transaction{prod.frequency > 1 ? 's' : ''}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatPrice(prod.totalRevenue)}
                      </td>
                    </tr>
                  )
                })}

                {productStats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 font-handwritten text-lg">
                      Aucune vente enregistrée pour cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
