'use client'

import React, { useState, useMemo } from 'react'
import { TrendingUp, Package, ShoppingBag, Layers, Award, BarChart3, Download, Share2, FileText } from 'lucide-react'
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

interface AnalyticsDashboardProps {
  sales: Sale[]
  userShops?: Array<{ id: string; name: string; activity: string }>
  currentShopActivity?: string
}

const PRODUCT_CATEGORY_INFOS: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  'Alimentation': { label: 'Alimentation & Marché', emoji: '🌾', bg: 'bg-amber-500', text: 'text-amber-700' },
  'Foyer & Maison': { label: 'Foyer & Maison (Loyer/Gaz/Factures)', emoji: '🏠', bg: 'bg-indigo-500', text: 'text-indigo-700' },
  'Scolarité': { label: 'Scolarité & Éducation', emoji: '📚', bg: 'bg-emerald-500', text: 'text-emerald-700' },
  'Boissons': { label: 'Boissons & Bar', emoji: '🥤', bg: 'bg-blue-500', text: 'text-blue-700' },
  'Hygiène & Cosmétique': { label: 'Hygiène & Soins', emoji: '🧼', bg: 'bg-[#9d60ec]', text: 'text-[#9d60ec]' },
  'Électronique': { label: 'Électronique & Mobile', emoji: '📱', bg: 'bg-emerald-500', text: 'text-emerald-700' },
  'Habillement': { label: 'Habillement & Textile', emoji: '👕', bg: 'bg-rose-500', text: 'text-rose-700' },
  'Divers': { label: 'Divers & Général', emoji: '📦', bg: 'bg-gray-400', text: 'text-gray-600' }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(price) + ' F'
}

export function AnalyticsDashboard({ sales, userShops = [], currentShopActivity }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'all'>('all')
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'frequency'>('revenue')
  const [viewMode, setViewMode] = useState<'single' | 'network'>(userShops.length > 1 ? 'network' : 'single')

  // Intitulés adaptés sur-mesure au secteur d'activité
  const labels = useMemo(() => {
    const act = currentShopActivity || (userShops.find(s => s.activity)?.activity) || 'boutique'
    if (act === 'particulier') {
      return {
        title: 'Analyses & Dépenses du Foyer',
        subtitle: 'SUIVI DES DÉPENSES DU MÉNAGE, COURSES, SCOLARITÉ ET ABONNEMENTS',
        kpi1Label: 'Dépenses Foyer',
        kpi2Label: 'Articles & Achats',
        kpi3Label: 'Dépense Moyenne',
        kpi4Label: 'Poste N°1 Dépenses',
        catChartTitle: 'Répartition des Dépenses de la Maison par Catégorie',
        tableTitle: '📋 Classement des Postes de Dépenses (Foyer)',
        tableSub: 'Trie par montant dépensé',
        productCol: 'Poste / Article',
        qtyCol: 'Quantité / Fréquence',
      }
    } else if (act === 'resto') {
      return {
        title: 'Analyses Cuisine & Bar',
        subtitle: 'SUIVI DES REPAS SERVIS, BOISSONS ET RECETTES DU RESTO',
        kpi1Label: 'Recette Cuisine & Bar',
        kpi2Label: 'Plats & Boissons Servis',
        kpi3Label: 'Addition Moyenne',
        kpi4Label: 'Plat / Boisson N°1',
        catChartTitle: 'Répartition des Recettes (Cuisine, Boissons, Cafétéria)',
        tableTitle: '🍲 Classement de la Carte & du Menu',
        tableSub: 'Trie par chiffre d\'affaires généré',
        productCol: 'Plat / Boisson',
        qtyCol: 'Quantité servie',
      }
    } else if (act === 'prestations') {
      return {
        title: 'Analyses Prestations & Services',
        subtitle: 'SUIVI DES SERVICES RÉALISÉS ET RECETTES DU SALON / ATELIER',
        kpi1Label: 'Recettes Services',
        kpi2Label: 'Prestations Réalisées',
        kpi3Label: 'Recette Moyenne / Client',
        kpi4Label: 'Prestation N°1',
        catChartTitle: 'Répartition des Recettes par Type de Service',
        tableTitle: '✂️ Classement des Prestations & Services',
        tableSub: 'Trie par volume de prestations réalisées',
        productCol: 'Prestation / Service',
        qtyCol: 'Nombre de clients',
      }
    } else {
      return {
        title: 'Analyses Ventes & Chiffre d\'Affaires',
        subtitle: 'PERFORMANCE DES PRODUITS ET ROTATION DES STOCKS',
        kpi1Label: 'CA Ventes',
        kpi2Label: 'Articles Vendus',
        kpi3Label: 'Panier Moyen',
        kpi4Label: 'N°1 des Ventes',
        catChartTitle: 'Répartition du Chiffre d\'Affaires par Catégorie de Produit',
        tableTitle: '🏆 Classement des Produits',
        tableSub: 'Trie par Chiffre d\'Affaires généré',
        productCol: 'Produit',
        qtyCol: 'Quantité vendue',
      }
    }
  }, [currentShopActivity, userShops])

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
              {labels.title}
            </h2>
            <p className="text-[9px] font-mono uppercase text-gray-400 tracking-wider">
              {labels.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {userShops.length > 1 && (
            <div className="flex bg-amber-100 p-1 rounded-2xl border border-amber-300 text-xs select-none">
              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-1 text-[10px] font-bold rounded-xl transition-all ${
                  viewMode === 'single' ? 'bg-amber-800 text-white shadow-sm' : 'text-amber-950 hover:bg-amber-200'
                }`}
              >
                📊 Point de Vente Actuel
              </button>
              <button
                onClick={() => setViewMode('network')}
                className={`px-3 py-1 text-[10px] font-bold rounded-xl transition-all ${
                  viewMode === 'network' ? 'bg-amber-900 text-white shadow-sm' : 'text-amber-950 hover:bg-amber-200'
                }`}
              >
                👑 Vue Réseau ({userShops.length})
              </button>
            </div>
          )}

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

          {/* Boutons d'exportation */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => exportSalesToCSV(filteredSales, period, userShops[0]?.name || 'Point_de_Vente')}
              title="Exporter les ventes filtrées au format Excel/CSV"
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <Download className="w-3 h-3" />
              <span>Exporter CSV</span>
            </button>
            <button
              onClick={() => exportSalesToPDF(filteredSales, period === 'all' ? 'Toutes les Ventes' : period === 'month' ? 'Ce Mois' : period === '7days' ? '7 derniers jours' : 'Aujourd\'hui', userShops[0]?.name || 'Cahier Numérique')}
              title="Générer et imprimer le rapport d'activité au format PDF"
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <FileText className="w-3 h-3" />
              <span>Exporter PDF</span>
            </button>
            <a
              href={generateWhatsAppPerformanceReport(filteredSales, period === 'all' ? 'Toutes les Ventes' : period === 'month' ? 'Ce Mois' : period === '7days' ? '7 derniers jours' : 'Aujourd\'hui', userShops[0]?.name || 'Cahier Numérique')}
              target="_blank"
              rel="noopener noreferrer"
              title="Envoyer la synthèse de performance par WhatsApp"
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <Share2 className="w-3 h-3" />
              <span>Rapport WhatsApp</span>
            </a>
          </div>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Vue Consolidée du Réseau Proprio */}
        {viewMode === 'network' && userShops.length > 0 && (
          <div className="bg-[#fffdf2] border border-amber-300 rounded-[28px] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <div>
                  <h3 className="font-handwritten text-xl font-bold text-gray-900">
                    État Consolidé du Réseau Propriétaire
                  </h3>
                  <p className="text-[10px] text-amber-700 font-mono">
                    COMPARAISON DES PERFORMANCES ET CHIFFRES DE TOUS VOS POINTS DE VENTE
                  </p>
                </div>
              </div>
              <span className="bg-amber-800 text-white font-mono font-bold text-xs px-3 py-1 rounded-full">
                {userShops.length} Établissements
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userShops.map((shop) => (
                <div key={shop.id} className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <span>{shop.activity === 'resto' ? '🍲' : shop.activity === 'prestations' ? '✂️' : shop.activity === 'particulier' ? '🏠' : '🏬'}</span>
                      <span>{shop.name}</span>
                    </span>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      {shop.activity === 'resto' ? 'Resto / Cafétéria' : shop.activity === 'prestations' ? 'Services' : shop.activity === 'particulier' ? 'Particulier / Foyer' : 'Boutique'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 font-mono text-xs">
                    <div>
                      <span className="text-[9px] uppercase text-gray-400 block font-sans">Statut Réseau</span>
                      <span className="text-emerald-700 font-bold">⚡ Actif / Sync OK</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-gray-400 block font-sans">Bilan Point de Vente</span>
                      <span className="text-gray-800 font-bold">Autonome</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* KPI Summary Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">{labels.kpi1Label}</span>
              <span className="text-lg font-bold font-mono text-emerald-800">{formatPrice(totalRevenue)}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">{labels.kpi2Label}</span>
              <span className="text-lg font-bold font-mono text-gray-800">{totalQuantitySold} u</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">{labels.kpi3Label}</span>
              <span className="text-lg font-bold font-mono text-gray-800">{formatPrice(averageBasket)}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Award className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">{labels.kpi4Label}</span>
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
              {labels.catChartTitle}
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
                {labels.tableTitle} ({productStats.length})
              </h3>
              <p className="text-[9px] font-mono uppercase text-gray-400">
                {labels.tableSub}
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
                  <th className="py-3.5 px-4 bg-[#f5f1e8]">{labels.productCol}</th>
                  <th className="py-3.5 px-4 bg-[#f5f1e8]">Catégorie</th>
                  <th className="py-3.5 px-4 text-center bg-[#f5f1e8]">{labels.qtyCol}</th>
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
