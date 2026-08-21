'use client'

import React from 'react'
import { Cloud, BookOpen, MessageSquare, Flame, Video, FileText, PackageCheck } from 'lucide-react'

export type CumuluTab = 'copilot' | 'scorer' | 'scripts' | 'copywriting' | 'catalog'

interface CumuluHeaderProps {
  activeTab: CumuluTab
  onTabChange: (tab: CumuluTab) => void
}

export function CumuluHeader({ activeTab, onTabChange }: CumuluHeaderProps) {
  const tabs = [
    { id: 'copilot' as CumuluTab, label: 'Copilote IA', icon: MessageSquare, badge: 'NVIDIA 70B' },
    { id: 'scorer' as CumuluTab, label: 'Produits Gagnants', icon: Flame, badge: 'ROI' },
    { id: 'scripts' as CumuluTab, label: 'Studio Scripts Vidéo', icon: Video, badge: 'TikTok / Reels' },
    { id: 'copywriting' as CumuluTab, label: 'Fiches & Textes', icon: FileText, badge: 'WhatsApp / Web' },
    { id: 'catalog' as CumuluTab, label: 'Mes Produits & Commandes', icon: PackageCheck, badge: null },
  ]

  return (
    <header className="bg-slate-900 border-b border-indigo-950/80 text-white sticky top-0 z-40 shadow-xl backdrop-blur-md bg-slate-900/95">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        
        {/* Barre du haut */}
        <div className="flex items-center justify-between py-3 border-b border-slate-800/80">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-amber-400 p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Cloud className="w-5 h-5 text-sky-400 fill-sky-400/20" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-sky-100 to-amber-300 bg-clip-text text-transparent">
                  CumuluShop
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  AI E-Commerce
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
                Copilote intelligent de vente en ligne & sourcing de produits gagnants
              </p>
            </div>
          </div>

          {/* Boutons d'Action Rapide */}
          <div className="flex items-center gap-2">
            <a
              href="/journal"
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              title="Retourner au Cahier de Caisse physique"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cahier de Caisse</span>
            </a>

            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-[11px] font-mono text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>NVIDIA Live</span>
            </div>
          </div>
        </div>

        {/* Barre de navigation des onglets */}
        <nav className="flex items-center gap-1 sm:gap-2 py-2 overflow-x-auto scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

      </div>
    </header>
  )
}
