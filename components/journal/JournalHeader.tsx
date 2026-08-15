'use client'

import React, { useState } from 'react'
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
  ChevronDown,
  MoreVertical
} from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'
import { useFeatures } from '@/context/FeatureContext'
import { getActivityLabels } from '@/lib/activityLabels'

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
  activity,
  shops = [],
  selectedShopId,
  onSelectShopId,
  onOpenNewShopModal,
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
  const labels = getActivityLabels(activity)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const getActivityBadge = (act: string) => {
    switch (act) {
      case 'resto': return '🍲 Resto'
      case 'prestations': return '✂️ Service'
      case 'particulier': return '🏠 Foyer'
      default: return '📦 Boutique'
    }
  }

  return (
    <div className="px-2.5 sm:px-3 py-1.5 border-b border-dashed border-amber-300/60 select-none bg-[#fdfaf2] relative">
      {/* Rangée 1 : App Bar Ultra-Compacte */}
      <div className="flex items-center justify-between gap-1.5 h-8 sm:h-9">
        {/* Titre & Sélecteur Boutique */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-xs text-xs font-bold text-[#141210] flex-shrink-0">
            📖
          </div>
          <div className="relative inline-flex items-center bg-amber-100/90 border border-amber-300 rounded-xl px-2 py-0.5 text-xs font-bold text-amber-950 max-w-[170px] sm:max-w-[260px] shadow-2xs">
            <select
              value={selectedShopId}
              onChange={(e) => {
                if (e.target.value === 'ADD_NEW_SHOP' && onOpenNewShopModal) {
                  onOpenNewShopModal()
                } else if (onSelectShopId) {
                  onSelectShopId(e.target.value)
                }
              }}
              className="bg-transparent text-xs font-bold text-amber-950 outline-none cursor-pointer pr-3 appearance-none truncate w-full"
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
            <ChevronDown className="w-3 h-3 text-amber-800 absolute right-1 pointer-events-none" />
          </div>
        </div>

        {/* Actions & Statut Réseau */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Badge Statut Réseau */}
          <button
            type="button"
            onClick={onSyncClick}
            disabled={isSyncing}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-mono font-bold border transition-all shadow-2xs ${
              isOnline
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}
          >
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-3 h-3 text-emerald-700" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-700" />
            )}
            <span className="hidden sm:inline">{isOnline ? 'EN LIGNE' : 'OFFLINE'}</span>
            {pendingSyncCount > 0 && (
              <span className="px-1 py-0.2 bg-amber-500 text-black text-[9px] font-bold rounded-full">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Desktop Only Actions */}
          <div className="hidden sm:flex items-center gap-1">
            {features.enableCashClosing && onOpenCashClosing && (
              <button
                type="button"
                onClick={onOpenCashClosing}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100/90 hover:bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 transition-all shadow-2xs"
              >
                <Calculator className="w-3 h-3 text-amber-700" />
                <span>Clôture</span>
              </button>
            )}

            {onOpenBoutiqueAssistant && (
              <button
                type="button"
                onClick={onOpenBoutiqueAssistant}
                className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-colors shadow-2xs"
                title="Assistant IA Boutique"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}

            {features.enableBarcodeScanner && onOpenBarcodeScanner && (
              <button
                type="button"
                onClick={onOpenBarcodeScanner}
                className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors shadow-2xs"
                title="Scanner un code-barres"
              >
                <ScanLine className="w-3.5 h-3.5" />
              </button>
            )}

            {features.enableSyscohada && onOpenSyscohada && (
              <button
                type="button"
                onClick={onOpenSyscohada}
                className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-colors shadow-2xs"
                title="Comptabilité SYSCOHADA"
              >
                <BookText className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Paramètres & Menu Mobile */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1 sm:p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors shadow-2xs"
            title="Paramètres"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Menu d'actions secondaires sur mobile */}
          <div className="relative sm:hidden">
            <button
              type="button"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMobileMenu && (
              <>
                {/* Backdrop pour fermer en cliquant à l'extérieur */}
                <div
                  className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40"
                  onClick={() => setShowMobileMenu(false)}
                />

                {/* Tiroir Popup Net & Opaque */}
                <div className="fixed right-3 top-12 w-56 bg-[#fffdf2] border-2 border-amber-400 rounded-2xl shadow-2xl z-50 p-2 space-y-1 font-mono text-xs animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] text-amber-900 font-extrabold uppercase border-b border-amber-200/80 mb-1">
                    Actions Rapides
                  </div>

                  {features.enableCashClosing && onOpenCashClosing && (
                    <button
                      type="button"
                      onClick={() => { setShowMobileMenu(false); onOpenCashClosing() }}
                      className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-amber-100/90 text-gray-900 font-extrabold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-lg bg-amber-200/80 flex items-center justify-center flex-shrink-0">
                        <Calculator className="w-3.5 h-3.5 text-amber-800" />
                      </div>
                      <span>Clôture de Caisse (Z)</span>
                    </button>
                  )}

                  {onOpenBoutiqueAssistant && (
                    <button
                      type="button"
                      onClick={() => { setShowMobileMenu(false); onOpenBoutiqueAssistant() }}
                      className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-amber-100/90 text-gray-900 font-extrabold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-lg bg-amber-200/80 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                      </div>
                      <span>Assistant IA Boutique</span>
                    </button>
                  )}

                  {features.enableBarcodeScanner && onOpenBarcodeScanner && (
                    <button
                      type="button"
                      onClick={() => { setShowMobileMenu(false); onOpenBarcodeScanner() }}
                      className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-amber-100/90 text-gray-900 font-extrabold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-lg bg-gray-200/80 flex items-center justify-center flex-shrink-0">
                        <ScanLine className="w-3.5 h-3.5 text-gray-800" />
                      </div>
                      <span>Scanner Code-barres</span>
                    </button>
                  )}

                  {features.enableSyscohada && onOpenSyscohada && (
                    <button
                      type="button"
                      onClick={() => { setShowMobileMenu(false); onOpenSyscohada() }}
                      className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-amber-100/90 text-gray-900 font-extrabold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-lg bg-amber-200/80 flex items-center justify-center flex-shrink-0">
                        <BookText className="w-3.5 h-3.5 text-amber-800" />
                      </div>
                      <span>SYSCOHADA</span>
                    </button>
                  )}

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => { setShowMobileMenu(false); onLogout() }}
                      className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-rose-100 text-rose-700 font-extrabold flex items-center gap-2.5 transition-colors cursor-pointer border-t border-amber-200/80 mt-1 pt-1.5"
                    >
                      <div className="w-6 h-6 rounded-lg bg-rose-200/80 flex items-center justify-center flex-shrink-0">
                        <LogOut className="w-3.5 h-3.5 text-rose-700" />
                      </div>
                      <span>Déconnexion</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Quitter Desktop */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="hidden md:flex px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold border border-rose-300 transition-colors shadow-2xs items-center gap-1"
              title="Se déconnecter"
            >
              <LogOut className="w-3 h-3" />
              <span>QUITTER</span>
            </button>
          )}
        </div>
      </div>

      {/* Rangée 2 : Tiroirs KPI Défilables Horizontalement sur Mobile (et Grille 3 colonnes sur Écran Large) */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1 font-mono sm:grid sm:grid-cols-3 w-full">
        {/* Tiroir Cash */}
        <div className="flex-shrink-0 min-w-[135px] sm:min-w-0 sm:flex-1 bg-amber-100/90 border border-amber-300/90 rounded-xl px-2.5 py-1 shadow-2xs relative flex flex-col justify-center">
          <div className="flex items-center justify-between text-[8.5px] sm:text-[9px] text-amber-900 font-extrabold uppercase gap-1">
            <span className="whitespace-nowrap">{labels.tiroirCash}</span>
            {onOpenCashAdjustment && (
              <button
                type="button"
                onClick={onOpenCashAdjustment}
                className="text-[7.5px] sm:text-[8px] underline text-amber-800 font-black cursor-pointer flex-shrink-0"
              >
                AJUST.
              </button>
            )}
          </div>
          <div className="text-xs sm:text-sm font-black text-amber-950 whitespace-nowrap">
            {formatPrice(tiroirCaisse)}
          </div>
        </div>

        {/* Crédits Dehors */}
        <div className="flex-shrink-0 min-w-[135px] sm:min-w-0 sm:flex-1 bg-rose-100/80 border border-rose-300/80 rounded-xl px-2.5 py-1 shadow-2xs flex flex-col justify-center">
          <div className="text-[8.5px] sm:text-[9px] text-rose-800 font-extrabold uppercase whitespace-nowrap">
            {labels.creditsDehors}
          </div>
          <div className="text-xs sm:text-sm font-black text-rose-950 whitespace-nowrap">
            {formatPrice(argentDehors)}
          </div>
        </div>

        {/* Nos Dettes */}
        <div className="flex-shrink-0 min-w-[135px] sm:min-w-0 sm:flex-1 bg-fuchsia-100/80 border border-fuchsia-300/80 rounded-xl px-2.5 py-1 shadow-2xs flex flex-col justify-center">
          <div className="text-[8.5px] sm:text-[9px] text-fuchsia-800 font-extrabold uppercase whitespace-nowrap">
            {labels.nosDettes}
          </div>
          <div className="text-xs sm:text-sm font-black text-fuchsia-950 whitespace-nowrap">
            {formatPrice(nosDettes)}
          </div>
        </div>
      </div>
    </div>
  )
}
