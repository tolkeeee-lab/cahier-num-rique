'use client'

import React, { useState, useEffect } from 'react'
import {
  Download,
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

import { canAccessAdminSettings, isEmployeeRole } from '@/lib/roleUtils'

interface JournalHeaderProps {
  user: any
  currentShopName: string
  activity: string
  shops?: Array<{ id: string; name: string; activity: string }>
  selectedShopId?: string
  userRole?: string | null
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
  userRole,
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true)
    }
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  useEffect(() => {
    if (!showMobileMenu) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMobileMenu(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showMobileMenu])

  const getActivityBadge = (act: string) => {
    switch (act) {
      case 'resto': return 'Resto'
      case 'prestations': return 'Prestations'
      case 'particulier': return 'Foyer'
      default: return 'Boutique'
    }
  }

  return (
    <div className="px-2.5 sm:px-3 pt-[max(env(safe-area-inset-top),0.375rem)] pb-1.5 border-b border-dashed border-amber-300/60 select-none bg-[#faf5e8] relative">
      {/* RangÃ©e 1 : App Bar Ultra-Compacte */}
      <div className="flex items-center justify-between gap-1.5 h-8 sm:h-9">
        {/* Titre & SÃ©lecteur Boutique */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border border-amber-300/80 flex items-center justify-center shadow-xs flex-shrink-0 p-0.5">
            <img src="/logo/logo-symbole.svg" alt="Cahier NumÃ©rique" className="w-full h-full object-contain" />
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
                  {s.name} Â· {getActivityBadge(s.activity)}
                </option>
              ))}
              {!isEmployeeRole(userRole) && (
                <option value="ADD_NEW_SHOP" className="bg-white text-amber-800 font-bold">
                  + Nouvelle Boutique...
                </option>
              )}
            </select>
            <ChevronDown className="w-3 h-3 text-amber-800 absolute right-1 pointer-events-none" />
          </div>
        </div>

        {/* Actions & Statut RÃ©seau */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Badge Statut RÃ©seau */}
          <button
            type="button"
            onClick={onSyncClick}
            disabled={isSyncing}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer active:scale-[0.97] ${
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
            <span className="hidden sm:inline">{isOnline ? 'En ligne' : 'Hors-ligne'}</span>
            {pendingSyncCount > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[9px] font-bold font-mono tabular-nums rounded-full">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Desktop Only Actions */}
          <div className="hidden sm:flex items-center gap-1">
          {deferredPrompt && !isStandalone && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0E8F6E]/15 hover:bg-[#0E8F6E]/25 text-[#0E8F6E] text-xs font-bold border border-[#0E8F6E]/30 transition-colors shadow-2xs cursor-pointer active:scale-[0.97]"
              title="Installer l'application sur cet appareil"
            >
              <Download className="w-3 h-3" />
              <span>Installer</span>
            </button>
          )}
            {features.enableCashClosing && onOpenCashClosing && (
              <button
                type="button"
                onClick={onOpenCashClosing}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100/90 hover:bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 transition-colors shadow-2xs cursor-pointer active:scale-[0.97]"
              >
                <Calculator className="w-3 h-3 text-amber-700" />
                <span>ClÃ´ture</span>
              </button>
            )}

            {onOpenBoutiqueAssistant && (
              <button
                type="button"
                onClick={onOpenBoutiqueAssistant}
                className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-colors shadow-2xs cursor-pointer active:scale-[0.97]"
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
                title="ComptabilitÃ© SYSCOHADA"
              >
                <BookText className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ParamÃ¨tres & Menu Mobile */}
          {canAccessAdminSettings(userRole) && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1 sm:p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors shadow-2xs"
              title="ParamÃ¨tres"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}


          {/* Menu d'actions secondaires sur mobile */}
          <div className="sm:hidden">
            <button
              type="button"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-1.5 rounded-xl bg-amber-100/90 text-amber-950 border border-amber-300 shadow-xs cursor-pointer hover:bg-amber-200 active:scale-[0.97] transition-transform duration-100"
              title="Plus d'actions"
            >
              <MoreVertical className="w-4 h-4" strokeWidth={1.75} />
            </button>

            {showMobileMenu && (
              <>
                {/* Backdrop plein Ã©cran pour fermer en cliquant Ã  l'extÃ©rieur */}
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90] pointer-events-auto"
                  onClick={() => setShowMobileMenu(false)}
                />

                {/* Tiroir Popup Net, 100% Opaque et au premier plan */}
                <div className="fixed right-3 top-12 w-64 bg-[#fffdf2] border-2 border-amber-500 rounded-2xl shadow-2xl z-[100] p-2.5 space-y-1 font-mono text-xs animate-in fade-in zoom-in-95 pointer-events-auto">
                  <div className="px-2.5 py-1 text-[10px] text-amber-900 font-semibold uppercase border-b border-amber-200 mb-1 tracking-normal">
                    Menu & Outils
                  </div>
                  {deferredPrompt && !isStandalone && (
                    <button
                      type="button"
                      onClick={() => { setShowMobileMenu(false); handleInstallClick(); }}
                      className="w-full text-left px-3 py-2 rounded-xl bg-[#0E8F6E]/10 hover:bg-[#0E8F6E]/20 active:scale-[0.97] text-[#0E8F6E] font-bold flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap border border-[#0E8F6E]/30"
                    >
                      <div className="w-6 h-6 rounded-lg bg-[#0E8F6E]/20 flex items-center justify-center flex-shrink-0 text-[#0E8F6E]">
                        <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </div>
                      <span>Installer l'application</span>
                    </button>
                  )}

                  {features.enableCashClosing && onOpenCashClosing && (
                    <button
                      type="button"
                      onClick={() => { setShowMobileMenu(false); onOpenCashClosing() }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-100 active:scale-[0.97] text-gray-950 font-bold flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <div className="w-6 h-6 rounded-lg bg-amber-200/80 flex items-center justify-center flex-shrink-0 text-amber-900">
                        <Calculator className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </div>
                      <span>ClÃ´ture de Caisse (Z)</span>
                    </button>
                  )}

                  {onOpenBoutiqueAssistant && (
                    <button
                      type="button"
                      onClick={() => { setShowMobileMenu(false); onOpenBoutiqueAssistant() }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-100 active:scale-[0.97] text-gray-950 font-bold flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <div className="w-6 h-6 rounded-lg bg-amber-200/80 flex items-center justify-center flex-shrink-0 text-amber-900">
                        <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </div>
                      <span>Assistant IA Boutique</span>
                    </button>
                  )}

                  {features.enableBarcodeScanner && onOpenBarcodeScanner && (
                    <button
                      type="button"
                      onClick={() => { setShowMobileMenu(false); onOpenBarcodeScanner() }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-100 active:scale-[0.97] text-gray-950 font-bold flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <div className="w-6 h-6 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-800">
                        <ScanLine className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </div>
                      <span>Scanner Code-barres</span>
                    </button>
                  )}

                  {features.enableSyscohada && onOpenSyscohada && (
                    <button
                      type="button"
                      onClick={() => { setShowMobileMenu(false); onOpenSyscohada() }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-100 active:scale-[0.97] text-gray-950 font-bold flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <div className="w-6 h-6 rounded-lg bg-amber-200/80 flex items-center justify-center flex-shrink-0 text-amber-900">
                        <BookText className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </div>
                      <span>Compta SYSCOHADA</span>
                    </button>
                  )}

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => { setShowMobileMenu(false); onLogout() }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-100 active:scale-[0.97] text-rose-700 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer border-t border-amber-200 mt-1 pt-1.5 whitespace-nowrap"
                    >
                      <div className="w-6 h-6 rounded-lg bg-rose-200/80 flex items-center justify-center flex-shrink-0 text-rose-700">
                        <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </div>
                      <span>DÃ©connexion</span>
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
              title="Se dÃ©connecter"
            >
              <LogOut className="w-3 h-3" />
              <span>Quitter</span>
            </button>
          )}
        </div>
      </div>

      {/* RangÃ©e 2 : Tiroirs KPI DÃ©filables Horizontalement sur Mobile (et Grille 3 colonnes sur Ã‰cran Large) */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1 font-mono sm:grid sm:grid-cols-3 w-full">
        {/* Tiroir Cash */}
        <div className="flex-shrink-0 min-w-[140px] sm:min-w-0 sm:flex-1 bg-[#faf5e8] border border-stone-900/10 rounded-xl px-3 py-1.5 relative flex flex-col justify-center">
          <div className="flex items-center justify-between text-[11px] text-stone-600 font-medium gap-1.5">
            <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0" /><span>{labels.tiroirCash}</span></span>
            {onOpenCashAdjustment && (
              <button
                type="button"
                onClick={onOpenCashAdjustment}
                className="text-[7.5px] sm:text-[8px] underline text-amber-800 font-semibold cursor-pointer flex-shrink-0"
              >
                Ajuster
              </button>
            )}
          </div>
          <div className="text-xs sm:text-sm font-mono font-semibold tabular-nums tracking-tight text-stone-950 whitespace-nowrap mt-0.5">
            {formatPrice(tiroirCaisse)}
          </div>
        </div>

        {/* CrÃ©dits Dehors */}
        <div className="flex-shrink-0 min-w-[140px] sm:min-w-0 sm:flex-1 bg-[#faf5e8] border border-stone-900/10 rounded-xl px-3 py-1.5 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-600 font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 flex-shrink-0" /><span>{labels.creditsDehors}</span>
          </div>
          <div className="text-xs sm:text-sm font-mono font-semibold tabular-nums tracking-tight text-rose-900 whitespace-nowrap mt-0.5">
            {formatPrice(argentDehors)}
          </div>
        </div>

        {/* Nos Dettes */}
        <div className="flex-shrink-0 min-w-[140px] sm:min-w-0 sm:flex-1 bg-[#faf5e8] border border-stone-900/10 rounded-xl px-3 py-1.5 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-600 font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-800 flex-shrink-0" /><span>{labels.nosDettes}</span>
          </div>
          <div className="text-xs sm:text-sm font-mono font-semibold tabular-nums tracking-tight text-stone-900 whitespace-nowrap mt-0.5">
            {formatPrice(nosDettes)}
          </div>
        </div>
      </div>
    </div>
  )
}
