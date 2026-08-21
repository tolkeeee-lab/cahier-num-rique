'use client'

import React, { useState } from 'react'
import { Sparkles, TrendingUp, ShoppingBag, Video, MessageSquare, ArrowUpRight, DollarSign, Target, Zap } from 'lucide-react'
import { CumuluTab } from './Navbar'

interface OverviewDashboardProps {
  setActiveTab: (tab: CumuluTab) => void
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ setActiveTab }) => {
  // Simulateur de Scaling
  const [adSpend, setAdSpend] = useState(500)
  const [targetRoas, setTargetRoas] = useState(3.2)
  const productCostRatio = 0.25 // 25% coût produit

  const projectedRevenue = adSpend * targetRoas
  const productCost = projectedRevenue * productCostRatio
  const projectedNetProfit = projectedRevenue - adSpend - productCost

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-cyan-950 border border-indigo-500/30 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Copilote E-Commerce & Vente Intelligente
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Bienvenue sur <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">CumuluShop</span>
            </h1>
            <p className="text-sm text-gray-300 leading-relaxed">
              Votre hub tout-en-un pour sourcer les meilleurs produits gagnants, générer vos publicités virales avec l'IA NVIDIA et gérer vos commandes en toute autonomie.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('sourcing')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Dénicher un Produit</span>
            </button>
            <button
              onClick={() => setActiveTab('studio')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-gray-200 hover:text-white font-bold text-xs border border-slate-700 transition"
            >
              <Video className="w-4 h-4 text-violet-400" />
              <span>Créer un Script Ad</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">Chiffre d'Affaires</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">1 640,00 €</h3>
            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> +18.4% ce mois
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">Commandes Traitées</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">42</h3>
            <span className="text-[11px] text-cyan-400 font-bold flex items-center gap-0.5 mt-1">
              95.2% livrées avec succès
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">Marge Moyenne</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">68.5%</h3>
            <span className="text-[11px] text-indigo-300 font-bold flex items-center gap-0.5 mt-1">
              Coefficient x3.1
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Target className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">Score IA Produits</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">92 / 100</h3>
            <span className="text-[11px] text-purple-400 font-bold flex items-center gap-0.5 mt-1">
              4 Gagnants Actifs
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Modules Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module Sourcing */}
        <div
          onClick={() => setActiveTab('sourcing')}
          className="group cursor-pointer bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-3xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-white text-base group-hover:text-cyan-300 transition">
              Dénicheur de Produits Gagnants
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Algorithmes de détection des tendances virales et audit de viabilité financière par l'IA NVIDIA.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition">
            <span>Explorer les gagnants</span>
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Module Studio Ads */}
        <div
          onClick={() => setActiveTab('studio')}
          className="group cursor-pointer bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-violet-500/50 rounded-3xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 transition">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-white text-base group-hover:text-violet-300 transition">
              Studio Créatif & Scripts UGC
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Scripts TikTok, copywriting Meta Ads et descriptions fiches produits rédigés en 5 secondes.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-violet-400 group-hover:translate-x-1 transition">
            <span>Lancer le studio</span>
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Module Copilote */}
        <div
          onClick={() => setActiveTab('copilot')}
          className="group cursor-pointer bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-white text-base group-hover:text-indigo-300 transition">
              Copilote Stratégique 24/7
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Posez toutes vos questions sur le scaling, les fournisseurs et la conversion à notre IA e-commerce.
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition">
            <span>Démarrer la discussion</span>
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>

      {/* Simulator: Rentabilité & Scaling Ads */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Simulateur de Scalabilité & Bénéfice Net
            </h3>
            <p className="text-xs text-gray-400">Modélisez vos projections de rentabilité publicitaire</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-gray-300 font-medium mb-1">
                <span>Budget Publicitaire (Ads) :</span>
                <span className="font-bold text-white">{adSpend} €</span>
              </div>
              <input
                type="range"
                min="50"
                max="5000"
                step="50"
                value={adSpend}
                onChange={(e) => setAdSpend(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-gray-300 font-medium mb-1">
                <span>ROAS Cible (Retour sur dépenses pub) :</span>
                <span className="font-bold text-cyan-300">{targetRoas.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="6.0"
                step="0.1"
                value={targetRoas}
                onChange={(e) => setTargetRoas(parseFloat(e.target.value))}
                className="w-full accent-indigo-400"
              />
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-gray-400">Chiffre d'Affaires Brut</span>
              <p className="text-xl font-extrabold text-white mt-2">{projectedRevenue.toFixed(0)} €</p>
              <span className="text-[10px] text-gray-500">ROAS {targetRoas}x</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs text-gray-400">Coûts (Ads + Fournisseur)</span>
              <p className="text-xl font-extrabold text-rose-400 mt-2">
                -{(adSpend + productCost).toFixed(0)} €
              </p>
              <span className="text-[10px] text-gray-500">Pub + COGS</span>
            </div>

            <div className="bg-gradient-to-br from-indigo-950/80 to-emerald-950/80 border border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <span className="text-xs text-emerald-300 font-semibold">Bénéfice Net Estimé</span>
              <p className="text-2xl font-black text-emerald-400 mt-2">
                +{projectedNetProfit.toFixed(0)} €
              </p>
              <span className="text-[10px] text-emerald-200">
                Marge nette : {((projectedNetProfit / projectedRevenue) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
