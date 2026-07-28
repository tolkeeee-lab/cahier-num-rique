'use client'

import React, { useMemo } from 'react'
import { Utensils, GlassWater, TrendingUp, DollarSign, Share2 } from 'lucide-react'
import { generateWhatsAppPerformanceReport } from '@/lib/exportUtils'

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

interface RestaurantAnalyticsWidgetProps {
  sales: Sale[]
  period: 'today' | '7days' | 'month' | 'all'
  onPeriodChange: (p: 'today' | '7days' | 'month' | 'all') => void
  shopName?: string
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(price) + ' F'
}

export function RestaurantAnalyticsWidget({ sales, period, onPeriodChange, shopName = 'Restaurant & Bar' }: RestaurantAnalyticsWidgetProps) {
  const restoStats = useMemo(() => {
    let totalCuisine = 0
    let totalBar = 0
    let totalPlatsServis = 0
    let totalBoissonsServies = 0

    const itemMap: Record<string, { name: string; qty: number; revenue: number; isBar: boolean }> = {}

    sales.forEach(s => {
      if (s.status === 'crossed_out') return

      if (s.articles && s.articles.length > 0) {
        s.articles.forEach(art => {
          const nameLower = art.name.toLowerCase()
          const rev = art.unit_price * art.quantity
          const isBar = nameLower.includes('bière') || nameLower.includes('coca') || nameLower.includes('fanta') || nameLower.includes('sprite') || nameLower.includes('jus') || nameLower.includes('eau') || nameLower.includes('boisson') || nameLower.includes('vin') || nameLower.includes('bouteille') || art.category === 'Boissons'

          if (isBar) {
            totalBar += rev
            totalBoissonsServies += art.quantity
          } else {
            totalCuisine += rev
            totalPlatsServis += art.quantity
          }

          const key = art.name.trim().toLowerCase()
          if (!itemMap[key]) {
            itemMap[key] = { name: art.name.trim(), qty: 0, revenue: 0, isBar }
          }
          itemMap[key].qty += art.quantity
          itemMap[key].revenue += rev
        })
      } else {
        totalCuisine += s.total
      }
    })

    const totalRecette = totalCuisine + totalBar
    const ratioCuisine = totalRecette > 0 ? Math.round((totalCuisine / totalRecette) * 100) : 50
    const ratioBar = totalRecette > 0 ? 100 - ratioCuisine : 50

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)

    const additionMoyenne = sales.length > 0 ? Math.round(totalRecette / sales.length) : 0

    return {
      totalRecette,
      totalCuisine,
      totalBar,
      ratioCuisine,
      ratioBar,
      totalPlatsServis,
      totalBoissonsServies,
      additionMoyenne,
      topItems
    }
  }, [sales])

  return (
    <div className="space-y-6">
      {/* En-tête Resto */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-amber-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍲</span>
          <div>
            <h2 className="font-handwritten text-xl font-bold text-gray-900">
              Analyses Cuisine & Bar
            </h2>
            <p className="text-[10px] font-mono uppercase text-gray-400">
              VENTES DU MENU, REPARTITION CUISINE ET VITESSE DE SERVICE
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

          <a
            href={generateWhatsAppPerformanceReport(sales, period === 'all' ? 'Tout' : period === 'month' ? 'Ce Mois' : period === '7days' ? '7 Jours' : 'Aujourd\'hui', shopName)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-[10px] font-bold uppercase tracking-wide transition-all shadow-sm"
          >
            <Share2 className="w-3 h-3" />
            <span>Rapport Resto WhatsApp</span>
          </a>
        </div>
      </div>

      {/* 4 KPIs Clés Cuisine & Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Recette Totale</span>
            <span className="text-lg font-bold font-mono text-emerald-800">{formatPrice(restoStats.totalRecette)}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Plats Servis</span>
            <span className="text-lg font-bold font-mono text-gray-800">{restoStats.totalPlatsServis} plats</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <GlassWater className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Boissons Servies</span>
            <span className="text-lg font-bold font-mono text-gray-800">{restoStats.totalBoissonsServies} bbt</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Addition Moyenne</span>
            <span className="text-lg font-bold font-mono text-gray-800">{formatPrice(restoStats.additionMoyenne)}</span>
          </div>
        </div>
      </div>

      {/* ⚖️ Dualité Cuisine vs Bar (Graphique Comparatif) */}
      <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm space-y-4">
        <h3 className="font-handwritten text-xl font-bold text-gray-800 flex items-center gap-2">
          ⚖️ Équilibre Recettes Cuisine vs Bar
        </h3>

        <div className="space-y-3">
          {/* Barre de répartition */}
          <div className="h-6 w-full bg-gray-100 rounded-2xl overflow-hidden flex shadow-inner border border-gray-200">
            <div
              className="bg-amber-600 text-white font-mono font-bold text-[10px] flex items-center justify-center transition-all"
              style={{ width: `${restoStats.ratioCuisine}%` }}
            >
              Cuisine {restoStats.ratioCuisine}%
            </div>
            <div
              className="bg-sky-600 text-white font-mono font-bold text-[10px] flex items-center justify-center transition-all"
              style={{ width: `${restoStats.ratioBar}%` }}
            >
              Bar {restoStats.ratioBar}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex justify-between items-center">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <span>🍲</span> Plats Chauds & Cuisine
              </span>
              <strong className="text-amber-950">{formatPrice(restoStats.totalCuisine)}</strong>
            </div>
            <div className="bg-sky-50 border border-sky-200 p-3 rounded-2xl flex justify-between items-center">
              <span className="font-bold text-sky-900 flex items-center gap-1.5">
                <span>🍺</span> Boissons & Bar
              </span>
              <strong className="text-sky-950">{formatPrice(restoStats.totalBar)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 🏆 Palmarès de la Carte (Top Plats & Boissons) */}
      <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm space-y-4">
        <h3 className="font-handwritten text-xl font-bold text-gray-800 flex items-center gap-2">
          🏆 Top Plats & Boissons du Menu ({restoStats.topItems.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {restoStats.topItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between bg-[#fdfaf2] border border-gray-200 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-900 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                  #{idx + 1}
                </span>
                <span className="font-bold text-xs text-gray-900 flex items-center gap-1">
                  <span>{item.isBar ? '🥤' : '🍲'}</span>
                  <span>{item.name}</span>
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-amber-900 block">{formatPrice(item.revenue)}</span>
                <span className="text-[9px] text-gray-500">{item.qty} servis</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
