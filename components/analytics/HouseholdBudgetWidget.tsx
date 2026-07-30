'use client'

import React, { useMemo } from 'react'
import { Wallet, TrendingUp, TrendingDown, AlertCircle, Share2 } from 'lucide-react'
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

interface HouseholdBudgetWidgetProps {
  sales: Sale[]
  period: 'today' | '7days' | 'month' | 'all'
  onPeriodChange: (p: 'today' | '7days' | 'month' | 'all') => void
  shopName?: string
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(price) + ' F'
}

export function HouseholdBudgetWidget({ sales, period, onPeriodChange, shopName = 'Budget Foyer' }: HouseholdBudgetWidgetProps) {
  // Calculer les entrées d'argent (vert/chèque) vs sorties/dépenses (rouge/jaune)
  const budgetStats = useMemo(() => {
    let totalEntrees = 0
    let totalSorties = 0
    let totalArrieres = 0 // Dettes dues aux boutiquiers/factures

    const categoryMap: Record<string, number> = {
      'Alimentation & Marché': 0,
      'Loyer, Gaz & Maison': 0,
      'Scolarité & Enfants': 0,
      'Santé & Hygiène': 0,
      'Transport & Communication': 0,
      'Divers & Autres': 0
    }

    sales.forEach(s => {
      if (s.status === 'crossed_out') return

      const isIncome = s.pen_color === 'green' || s.type === 'cash_in'
      if (isIncome) {
        totalEntrees += (s.paid || s.total || 0)
      } else {
        const paidVal = s.paid ?? s.total ?? 0
        const debtVal = s.debt ?? 0
        totalSorties += paidVal
        totalArrieres += debtVal

        // Catégorisation des dépenses de la maison
        if (s.articles && s.articles.length > 0) {
          s.articles.forEach(art => {
            const nameLower = art.name.toLowerCase()
            const cost = art.unit_price * art.quantity

            if (nameLower.includes('riz') || nameLower.includes('huile') || nameLower.includes('pain') || nameLower.includes('viande') || nameLower.includes('poisson') || nameLower.includes('légume') || nameLower.includes('marché') || nameLower.includes('lait') || nameLower.includes('nourriture') || nameLower.includes('repas')) {
              categoryMap['Alimentation & Marché'] += cost
            } else if (nameLower.includes('loyer') || nameLower.includes('gaz') || nameLower.includes('courant') || nameLower.includes('eau') || nameLower.includes('cie') || nameLower.includes('sodeci') || nameLower.includes('recharge') || nameLower.includes('maison')) {
              categoryMap['Loyer, Gaz & Maison'] += cost
            } else if (nameLower.includes('école') || nameLower.includes('ecole') || nameLower.includes('scolarité') || nameLower.includes('scolarite') || nameLower.includes('cahier') || nameLower.includes('tenue') || nameLower.includes('livre')) {
              categoryMap['Scolarité & Enfants'] += cost
            } else if (nameLower.includes('pharmacie') || nameLower.includes('médicament') || nameLower.includes('medicament') || nameLower.includes('savon') || nameLower.includes('couche') || nameLower.includes('soin')) {
              categoryMap['Santé & Hygiène'] += cost
            } else if (nameLower.includes('essence') || nameLower.includes('carburant') || nameLower.includes('taxi') || nameLower.includes('transport') || nameLower.includes('deplacement') || nameLower.includes('pass')) {
              categoryMap['Transport & Communication'] += cost
            } else {
              categoryMap['Divers & Autres'] += cost
            }
          })
        } else {
          const notesLower = (s.notes || '').toLowerCase()
          const cost = paidVal || s.total || 0
          if (notesLower.includes('riz') || notesLower.includes('huile') || notesLower.includes('pain') || notesLower.includes('viande') || notesLower.includes('poisson') || notesLower.includes('marché') || notesLower.includes('lait') || notesLower.includes('nourriture') || notesLower.includes('repas')) {
            categoryMap['Alimentation & Marché'] += cost
          } else if (notesLower.includes('loyer') || notesLower.includes('gaz') || notesLower.includes('courant') || notesLower.includes('eau') || notesLower.includes('cie') || notesLower.includes('sodeci') || notesLower.includes('recharge') || notesLower.includes('maison')) {
            categoryMap['Loyer, Gaz & Maison'] += cost
          } else if (notesLower.includes('école') || notesLower.includes('ecole') || notesLower.includes('scolarité') || notesLower.includes('scolarite') || notesLower.includes('cahier') || notesLower.includes('tenue') || notesLower.includes('livre')) {
            categoryMap['Scolarité & Enfants'] += cost
          } else if (notesLower.includes('pharmacie') || notesLower.includes('médicament') || notesLower.includes('medicament') || notesLower.includes('savon') || notesLower.includes('couche') || notesLower.includes('soin')) {
            categoryMap['Santé & Hygiène'] += cost
          } else if (notesLower.includes('essence') || notesLower.includes('carburant') || notesLower.includes('taxi') || notesLower.includes('transport') || notesLower.includes('deplacement') || notesLower.includes('pass')) {
            categoryMap['Transport & Communication'] += cost
          } else {
            categoryMap['Divers & Autres'] += cost
          }
        }
      }
    })

    const resteAVivre = totalEntrees - totalSorties

    // Trier les catégories par montant
    const sortedCategories = Object.entries(categoryMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalSorties > 0 ? Math.round((amount / totalSorties) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    return {
      totalEntrees,
      totalSorties,
      totalArrieres,
      resteAVivre,
      sortedCategories
    }
  }, [sales])

  return (
    <div className="space-y-6">
      {/* Barre d'outils et filtres */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-amber-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <div>
            <h2 className="font-handwritten text-xl font-bold text-amber-950">
              Bilan Financier du Foyer
            </h2>
            <p className="text-[10px] font-mono uppercase text-amber-700">
              EQUILIBRE DU BUDGET ET CATEGORISATION DES DEPENSES DE LA MAISON
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Boutons Période */}
          <div className="flex gap-1 bg-amber-50 p-1 rounded-2xl border border-amber-200">
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
                    ? 'bg-amber-900 text-white shadow-sm' 
                    : 'text-amber-800 hover:bg-amber-100'
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
            <span>Rapport Conjoint WhatsApp</span>
          </a>
        </div>
      </div>

      {/* 💚 Radar de Santé Financière du Foyer (3 Cartes KPIs Clés) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entrées / Revenus */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-[28px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block font-mono">
              📥 Entrées / Salaires & Tontine
            </span>
            <span className="text-xl font-extrabold font-mono text-emerald-950 mt-1 block">
              +{formatPrice(budgetStats.totalEntrees)}
            </span>
            <span className="text-[9px] text-emerald-700 font-sans mt-0.5 block">
              Argent disponible reçu ce mois
            </span>
          </div>
          <div className="p-3 bg-emerald-200/60 rounded-2xl text-emerald-800">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Dépenses Totales */}
        <div className="bg-rose-50/80 border border-rose-200 rounded-[28px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block font-mono">
              📤 Achats & Dépenses Maison
            </span>
            <span className="text-xl font-extrabold font-mono text-rose-950 mt-1 block">
              -{formatPrice(budgetStats.totalSorties)}
            </span>
            <span className="text-[9px] text-rose-700 font-sans mt-0.5 block">
              Total payé (marché, factures, école)
            </span>
          </div>
          <div className="p-3 bg-rose-200/60 rounded-2xl text-rose-800">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Reste à Vivre Net */}
        <div className={`border rounded-[28px] p-5 shadow-sm flex items-center justify-between ${
          budgetStats.resteAVivre >= 0 ? 'bg-sky-50/80 border-sky-200' : 'bg-amber-50/80 border-amber-300'
        }`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block font-mono text-sky-900">
              💚 Reste à Vivre / Solde Net
            </span>
            <span className={`text-xl font-extrabold font-mono mt-1 block ${
              budgetStats.resteAVivre >= 0 ? 'text-sky-950' : 'text-amber-900'
            }`}>
              {budgetStats.resteAVivre >= 0 ? '+' : ''}{formatPrice(budgetStats.resteAVivre)}
            </span>
            <span className="text-[9px] text-sky-800 font-sans mt-0.5 block">
              {budgetStats.resteAVivre >= 0 ? 'Budget équilibré !' : '⚠️ Dépenses supérieures aux entrées'}
            </span>
          </div>
          <div className="p-3 bg-sky-200/60 rounded-2xl text-sky-800">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Dépenses dues aux boutiquiers du quartier ou factures impayées */}
      {budgetStats.totalArrieres > 0 && (
        <div className="bg-amber-500/10 border border-amber-300/80 rounded-2xl p-4 flex items-center gap-3 text-amber-950 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0" />
          <div>
            <strong>Rappel Arriérés & Carnet du Boutiquier :</strong> Vous avez <strong>{formatPrice(budgetStats.totalArrieres)}</strong> de dépenses restant à régler auprès de vos commerçants ou voisins.
          </div>
        </div>
      )}

      {/* 📊 Répartition des Dépenses de la Maison par Catégorie */}
      <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-150 pb-3">
          <h3 className="font-handwritten text-xl font-bold text-gray-800 flex items-center gap-2">
            📊 Répartition des Dépenses du Foyer
          </h3>
          <span className="text-[10px] font-mono text-gray-400">
            Toutes dépenses confondues
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetStats.sortedCategories.map((cat, idx) => (
            <div key={idx} className="space-y-1.5 bg-[#fdfaf2] border border-amber-100 p-3.5 rounded-2xl">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>{cat.name.includes('Alimentation') ? '🌾' : cat.name.includes('Loyer') ? '🏠' : cat.name.includes('Scolarité') ? '📚' : cat.name.includes('Santé') ? '🧼' : cat.name.includes('Transport') ? '🚗' : '📦'}</span>
                  <span>{cat.name}</span>
                </span>
                <span className="font-mono font-bold text-amber-900">
                  {formatPrice(cat.amount)} ({cat.percentage}%)
                </span>
              </div>
              <div className="h-3 w-full bg-amber-100/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-600 rounded-full transition-all duration-500"
                  style={{ width: `${cat.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
