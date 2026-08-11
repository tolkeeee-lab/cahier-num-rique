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
  Calculator 
} from 'lucide-react'
import { useFeatures } from '@/context/FeatureContext'

interface JournalHeaderProps {
  user: any
  currentShopName: string
  activity: string
  isOnline: boolean
  pendingSyncCount: number
  isSyncing: boolean
  onSyncClick: () => void
  onOpenSettings: () => void
  onOpenCashClosing?: () => void
  onOpenBarcodeScanner?: () => void
  onOpenBoutiqueAssistant?: () => void
  onOpenSyscohada?: () => void
}

export const JournalHeader: React.FC<JournalHeaderProps> = ({
  user,
  currentShopName,
  activity,
  isOnline,
  pendingSyncCount,
  isSyncing,
  onSyncClick,
  onOpenSettings,
  onOpenCashClosing,
  onOpenBarcodeScanner,
  onOpenBoutiqueAssistant,
  onOpenSyscohada,
}) => {
  const { features } = useFeatures()

  return (
    <header className="bg-[#1e1a18] border-b border-[#2a2421] sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Logo & Shop Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg text-lg font-bold text-[#141210]">
            📓
          </div>
          <div>
            <h1 className="font-extrabold text-base text-white tracking-wide flex items-center gap-2">
              {currentShopName || 'Cahier Numérique'}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#064e3b] text-[#f59e0b] font-mono border border-[#047857]/50 uppercase">
                {activity}
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-mono">
              {user?.email || 'Commerçant'}
            </p>
          </div>
        </div>

        {/* Action Buttons & Status */}
        <div className="flex items-center gap-2">
          {/* Sync Status Badge */}
          <button
            onClick={onSyncClick}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
              isOnline
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 text-amber-400 border-amber-800/50 hover:bg-amber-900/40'
            }`}
            title={isOnline ? 'En ligne - Synchronisation active' : 'Hors ligne - Données stockées localement'}
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline">
              {isOnline ? 'En ligne' : 'Hors-ligne'}
            </span>
            {pendingSyncCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-black text-[10px] font-bold rounded-full">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Quick Actions (Conditioned by Feature Flags) */}
          {features.enableBarcodeScanner && onOpenBarcodeScanner && (
            <button
              onClick={onOpenBarcodeScanner}
              className="p-2 rounded-lg bg-[#2a2421] text-gray-300 hover:text-amber-400 hover:bg-[#342d29] transition-colors border border-gray-800"
              title="Scanner un code-barres"
            >
              <ScanLine className="w-4 h-4" />
            </button>
          )}

          {features.enableSyscohada && onOpenSyscohada && (
            <button
              onClick={onOpenSyscohada}
              className="p-2 rounded-lg bg-[#2a2421] text-amber-400 hover:bg-[#342d29] transition-colors border border-amber-900/40"
              title="Comptabilité SYSCOHADA"
            >
              <BookText className="w-4 h-4" />
            </button>
          )}

          {features.enableCashClosing && onOpenCashClosing && (
            <button
              onClick={onOpenCashClosing}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2421] text-gray-200 hover:text-amber-400 hover:bg-[#342d29] text-xs font-semibold border border-gray-800 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              <span>Clôture</span>
            </button>
          )}

          {onOpenBoutiqueAssistant && (
            <button
              onClick={onOpenBoutiqueAssistant}
              className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors border border-amber-500/30"
              title="Assistant IA Boutique"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-[#2a2421] text-gray-300 hover:text-white hover:bg-[#342d29] transition-colors border border-gray-800"
            title="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
