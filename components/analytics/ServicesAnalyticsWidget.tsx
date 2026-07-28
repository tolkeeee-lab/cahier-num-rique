'use client'

import React, { useMemo } from 'react'
import { Scissors, Users, TrendingUp, DollarSign, Share2 } from 'lucide-react'
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

interface ServicesAnalyticsWidgetProps {
  sales: Sale[]
  period: 'today' | '7days' | 'month' | 'all'
  onPeriodChange: (p: 'today' | '7days' | 'month' | 'all') => void
  shopName?: string
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(price) + ' F'
}

export function ServicesAnalyticsWidget({ sales, period, onPeriodChange, shopName = 'Salon & Services' }: ServicesAnalyticsWidgetProps) {
  const serviceStats = useMemo(() => {
    let totalServices = 0
    let totalProduits = 0
    let totalClientsServis = sales.length

    const serviceMap: Record<string, { name: string; qty: number; revenue: number }> = {}

    sales.forEach(s => {
      if (s.status === 'crossed_out') return

      if (s.articles && s.articles.length > 0) {
        s.articles.forEach(art => {
          const rev = art.unit_price * art.quantity
          const nameLower = art.name.toLowerCase()
          const isProduit = nameLower.includes('huile') || nameLower.includes('tissu') || nameLower.includes('pièce') || nameLower.includes('produit') || nameLower.includes('savon') || nameLower.includes('crème')

          if (isProduit) {
            totalProduits += rev
          } else {
            totalServices += rev
          }

          const key = art.name.trim().toLowerCase()
          if (!serviceMap[key]) {
            serviceMap[key] = { name: art.name.trim(), qty: 0, revenue: 0 }
          }
          serviceMap[key].qty += art.quantity
          serviceMap[key].revenue += rev
        })
      } else {
        totalServices += s.total
      }
    })

    const totalRecette = totalServices + totalProduits
    const ratioServices = totalRecette > 0 ? Math.round((totalServices / totalRecette) * 100) : 80
    const ratioProduits = totalRecette > 0 ? 100 - ratioServices : 20

    const topServices = Object.values(serviceMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)

    const recetteMoyenneClient = totalClientsServis > 0 ? Math.round(totalRecette / totalClientsServis) : 0

    return {
      totalRecette,
      totalServices,
      totalProduits,
      ratioServices,
      ratioProduits,
      totalClientsServis,
      recetteMoyenneClient,
      topServices
    }
  }, [sales])

  return (
    <div className="space-y-6">
      {/* En-tête Services */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-blue-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✂️</span>
          <div>
            <h2 className="font-handwritten text-xl font-bold text-gray-900">
              Analyses Prestations & Services
            </h2>
            <p className="text-[9px] font-mono uppercase text-gray-400">
              ACTIVITE DU SALON, ATELIER ET VALEUR DE LA MAIN D'OEUVRE
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
            <span>Rapport Atelier WhatsApp</span>
          </a>
        </div>
      </div>

      {/* 4 KPIs Clés Services */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Recette Services</span>
            <span className="text-lg font-bold font-mono text-emerald-800">{formatPrice(serviceStats.totalRecette)}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Clients Servis</span>
            <span className="text-lg font-bold font-mono text-gray-800">{serviceStats.totalClientsServis} pers.</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Main d'Œuvre Pur</span>
            <span className="text-lg font-bold font-mono text-gray-800">{formatPrice(serviceStats.totalServices)}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Recette / Client</span>
            <span className="text-lg font-bold font-mono text-gray-800">{formatPrice(serviceStats.recetteMoyenneClient)}</span>
          </div>
        </div>
      </div>

      {/* ✂️ Dualité Main d'Œuvre vs Fournitures */}
      <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm space-y-4">
        <h3 className="font-handwritten text-xl font-bold text-gray-800 flex items-center gap-2">
          ✂️ Répartition Main d'Œuvre vs Ventes Produits
        </h3>

        <div className="space-y-3">
          <div className="h-6 w-full bg-gray-100 rounded-2xl overflow-hidden flex shadow-inner border border-gray-200">
            <div
              className="bg-purple-700 text-white font-mono font-bold text-[10px] flex items-center justify-center transition-all"
              style={{ width: `${serviceStats.ratioServices}%` }}
            >
              Services {serviceStats.ratioServices}%
            </div>
            <div
              className="bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center transition-all"
              style={{ width: `${serviceStats.ratioProduits}%` }}
            >
              Matériel {serviceStats.ratioProduits}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl flex justify-between items-center">
              <span className="font-bold text-purple-900 flex items-center gap-1.5">
                <span>✂️</span> Main d'Œuvre & Prestations
              </span>
              <strong className="text-purple-950">{formatPrice(serviceStats.totalServices)}</strong>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex justify-between items-center">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                <span>📦</span> Fournitures & Produits Vendus
              </span>
              <strong className="text-emerald-950">{formatPrice(serviceStats.totalProduits)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 🏆 Classement des Prestations Phares */}
      <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm space-y-4">
        <h3 className="font-handwritten text-xl font-bold text-gray-800 flex items-center gap-2">
          🏆 Top Prestations & Services Réalisés ({serviceStats.topServices.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {serviceStats.topServices.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between bg-[#fdfaf2] border border-gray-200 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-900 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                  #{idx + 1}
                </span>
                <span className="font-bold text-xs text-gray-900 flex items-center gap-1">
                  <span>✂️</span>
                  <span>{item.name}</span>
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-purple-900 block">{formatPrice(item.revenue)}</span>
                <span className="text-[9px] text-gray-500">{item.qty} réalisé(s)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
