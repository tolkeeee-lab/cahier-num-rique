'use client'

import React from 'react'
import Link from 'next/link'
import { Sparkles, ShoppingBag, Video, MessageSquare, Package, BarChart3, Cloud, ExternalLink } from 'lucide-react'

export type CumuluTab = 'overview' | 'sourcing' | 'studio' | 'orders' | 'copilot' | 'caisse'

interface NavbarProps {
  activeTab: CumuluTab
  setActiveTab: (tab: CumuluTab) => void
}

export const CumuluNavbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'overview', label: 'Tableau de bord', icon: BarChart3 },
    { id: 'sourcing', label: 'Sourcing IA', icon: Sparkles, badge: 'NVIDIA' },
    { id: 'studio', label: 'Studio Ads & UGC', icon: Video },
    { id: 'orders', label: 'Commandes', icon: ShoppingBag },
    { id: 'copilot', label: 'Copilote 24/7', icon: MessageSquare },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-indigo-900/30 bg-[#0c0d14]/90 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
              <Cloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-cyan-400">
                  CumuluShop
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  IA Live
                </span>
              </div>
              <p className="text-[11px] text-gray-400 hidden sm:block">
                Copilote E-Commerce propulsé par NVIDIA Nemotron
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as CumuluTab)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Right Action Switcher */}
          <div className="flex items-center gap-2">
            <Link
              href="/journal"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800/80 text-gray-300 hover:text-white hover:bg-slate-700/80 border border-slate-700 transition"
              title="Accéder au journal de caisse et stock physique"
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Caisse & Stock</span>
            </Link>

            <a
              href="https://github.com/tolkeeee-lab/Cumulushop"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-indigo-950/60 text-indigo-300 hover:text-cyan-300 hover:bg-indigo-900/60 border border-indigo-800/50 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-between py-2 overflow-x-auto gap-1 border-t border-slate-800/60">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CumuluTab)}
                className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap ${
                  isActive ? 'bg-indigo-600 text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
