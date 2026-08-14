'use client'

import React from 'react'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Settings, 
  Sparkles, 
  BookText, 
  ScanLine, 
  Calculator,
  LogOut,
  ChevronDown
} from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'
import { useFeatures } from '@/context/FeatureContext'

interface JournalHeaderProps {
  user: any
  currentShopName: string
  activity: string
  shops?: Array<{ id: string; name: string; activity: string }>
  selectedShopId?: string
  onSelectShopId?: (id: string) => void
  onOpenNewShopModal?: () => void
  soldeDuJour?: number
  tiroirCaisse?: number
  argentDehors?: number
  nosDettes?: number
  isOnline: boolean
  pendingSyncCount: number
  isSyncing: boolean
  onSyncClick: () => void
  onOpenSettings: () => void
  onOpenCashAdjustment?: () => void
  onOpenCashClosing?: () => void
  onOpenBarcodeScanner?: () => void
  onOpenBoutiqueAssistant?: () => void
  onOpenSyscohada?: () => void
  onLogout?: () => void
}

export const JournalHeader: React.FC<JournalHeaderProps> = ({
  user,
  currentShopName,
  activity,
  shops = [],
  selectedShopId,
  onSelectShopId,
  onOpenNewShopModal,
  soldeDuJour = 0,
  tiroirCaisse = 0,
  argentDehors = 0,
  nosDettes = 0,
  isOnline,
  pendingSyncCount,
  isSyncing,
  onSyncClick,
  onOpenSettings,
  onOpenCashAdjustment,
  onOpenCashClosing,
  onOpenBarcodeScanner,
  onOpenBoutiqueAssistant,
  onOpenSyscohada,
  onLogout,
}) => {
  const { features } = useFeatures()

  const getActivityBadge = (act: string) => {
    switch (act) {
      case 'resto': return '🍲 Resto'
      case 'prestations': return '✂️ Service'
      case 'particulier': return '🏠 Foyer'
      default: return '📦 Boutique'
    }
  }

  return (
    <div className="px-4 pt-4 pb-2 border-b border-dashed border-sky-300/50 select-none space-y-3 bg-[#fdfaf2]">
      {/* Rangée 1 : Titre Cahier + Selecteur de Boutique + Actions Rapides */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg text-lg font-bold text-[#141210]">
            📖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 font-handwritten tracking-wide">
                {currentShopName || 'Cahier de Caisse Intelligent'}
              </h1>
              
              {/* Sélecteur de Boutique */}
              <div className="relative inline-flex items-center bg-amber-100/90 border border-amber-300 rounded-2xl px-2 py-0.5 text-xs font-bold text-amber-950 shadow-sm">
                <span className="mr-1 text-[10px]">{getActivityBadge(activity)}</span>
                <select
                  value={selectedShopId}
                  onChange={(e) => {
                    if (e.target.value === 'ADD_NEW_SHOP' && onOpenNewShopModal) {
                      onOpenNewShopModal()
                    } else if (onSelectShopId) {
                      onSelectShopId(e.target.value)
                    }
                  }}
                  className="bg-transparent text-xs font-bold text-amber-950 outline-none cursor-pointer py-0.5 pr-4 appearance-none"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id} className="bg-white text-gray-900 font-sans">
                      {s.name} ({getActivityBadge(s.activity)})
                    </option>
                  ))}
                  <option value="ADD_NEW_SHOP" className="bg-white text-amber-800 font-bold">
                    + Nouvelle Boutique...
                  </option>
                </select>
                <ChevronDown className="w-3 h-3 text-amber-800 absolute right-1.5 pointer-events-none" />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 font-mono">
              {user?.email || 'Commerçant'}
            </p>
          </div>
        </div>

        {/* Boutons d'Action & Statut en Ligne */}
        <div className="flex items-center gap-2">
          {/* Code-barres */}
          {features.enableBarcodeScanner && onOpenBarcodeScanner && (
            <button
              type="button"
              onClick={onOpenBarcodeScanner}
              className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors shadow-sm"
              title="Scanner un code-barres"
            >
              <ScanLine className="w-4 h-4" />
            </button>
          )}

          {/* SYSCOHADA */}
          {features.enableSyscohada && onOpenSyscohada && (
            <button
              type="button"
              onClick={onOpenSyscohada}
              className="p-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-colors shadow-sm"
              title="Comptabilité SYSCOHADA"
            >
              <BookText className="w-4 h-4" />
            </button>
          )}

          {/* Badge Statut Réseau */}
          <button
            type="button"
            onClick={onSyncClick}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition-all shadow-sm ${
              isOnline
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
            }`}
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-700" />
            )}
            <span className="hidden sm:inline">{isOnline ? 'EN LIGNE' : 'HORS-LIGNE'}</span>
            {pendingSyncCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-black text-[10px] font-bold rounded-full">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Clôture de Caisse */}
          {features.enableCashClosing && onOpenCashClosing && (
            <button
              type="button"
              onClick={onOpenCashClosing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100/90 hover:bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 transition-all shadow-sm"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Clôture</span>
            </button>
          )}

          {/* Assistant IA */}
          {onOpenBoutiqueAssistant && (
            <button
              type="button"
              onClick={onOpenBoutiqueAssistant}
              className="p-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-colors shadow-sm"
              title="Assistant IA Boutique"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {/* Paramètres */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors shadow-sm"
            title="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Quitter */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-2.5 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold border border-rose-300 transition-colors shadow-sm flex items-center gap-1"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">QUITTER</span>
            </button>
          )}
        </div>
      </div>

      {/* Rangée 2 : Cartes KPI Financières (Aujourd'hui, Tiroir Cash, Crédits Dehors, Nos Dettes) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
        {/* Aujourd'hui */}
        <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-2.5 space-y-0.5 shadow-sm">
          <div className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">
            📅 AUJOURD'HUI
          </div>
          <div className="text-base font-extrabold text-blue-900">
            {soldeDuJour >= 0 ? `+${formatPrice(soldeDuJour)}` : formatPrice(soldeDuJour)}
          </div>
        </div>

        {/* Tiroir Cash */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-2.5 space-y-0.5 shadow-sm relative">
          <div className="flex items-center justify-between text-[10px] text-amber-800 font-bold uppercase tracking-wider">
            <span>💵 TIROIR CASH</span>
            {onOpenCashAdjustment && (
              <button
                type="button"
                onClick={onOpenCashAdjustment}
                className="text-[9px] underline text-amber-700 hover:text-amber-950 font-bold uppercase"
              >
                AJUSTER
              </button>
            )}
          </div>
          <div className="text-base font-extrabold text-amber-950">
            {formatPrice(tiroirCaisse)}
          </div>
        </div>

        {/* Crédits Dehors */}
        <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-2.5 space-y-0.5 shadow-sm">
          <div className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">
            🔴 CRÉDITS DEHORS
          </div>
          <div className="text-base font-extrabold text-rose-900">
            {formatPrice(argentDehors)}
          </div>
        </div>

        {/* Nos Dettes */}
        <div className="bg-fuchsia-50/90 border border-fuchsia-200 rounded-2xl p-2.5 space-y-0.5 shadow-sm">
          <div className="text-[10px] text-fuchsia-700 font-bold uppercase tracking-wider">
            🟣 NOS DETTES
          </div>
          <div className="text-base font-extrabold text-fuchsia-900">
            {formatPrice(nosDettes)}
          </div>
        </div>
      </div>
    </div>
  )
}
