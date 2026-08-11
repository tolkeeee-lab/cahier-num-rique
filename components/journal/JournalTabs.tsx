'use client'

import React from 'react'
import { 
  BookOpen, 
  Package, 
  BookText, 
  ShoppingCart, 
  ClipboardList, 
  BarChart3, 
  Settings, 
  Utensils 
} from 'lucide-react'
import { useFeatures } from '@/context/FeatureContext'

export type JournalTab = 'cahier' | 'stock' | 'dettes' | 'shopping' | 'demandes' | 'analytics' | 'particulier' | 'settings'

interface JournalTabsProps {
  activeTab: JournalTab
  onTabChange: (tab: JournalTab) => void
  activity: string
  pendingDebtsCount?: number
  pendingRequestsCount?: number
}

export const JournalTabs: React.FC<JournalTabsProps> = ({
  activeTab,
  onTabChange,
  activity,
  pendingDebtsCount = 0,
  pendingRequestsCount = 0,
}) => {
  const { features } = useFeatures()

  const tabs = [
    {
      id: 'cahier' as JournalTab,
      label: activity === 'particulier' ? 'Mon Journal' : 'Mon Cahier',
      icon: BookOpen,
      show: true,
    },
    {
      id: 'stock' as JournalTab,
      label: activity === 'resto' ? 'Stock & Bar' : 'Stock Produits',
      icon: Package,
      show: features.enableStockManagement && activity !== 'particulier',
    },
    {
      id: 'dettes' as JournalTab,
      label: activity === 'particulier' ? 'Carnet Boutiquier' : 'Dettes & Règlements',
      icon: BookText,
      badge: pendingDebtsCount > 0 ? pendingDebtsCount : undefined,
      show: true,
    },
    {
      id: 'shopping' as JournalTab,
      label: activity === 'particulier' ? 'Marché & Courses' : 'Liste de Ravitaillement',
      icon: ShoppingCart,
      show: true,
    },
    {
      id: 'demandes' as JournalTab,
      label: 'Demandes Clients',
      icon: ClipboardList,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      show: activity !== 'particulier',
    },
    {
      id: 'analytics' as JournalTab,
      label: 'Statistiques',
      icon: BarChart3,
      show: features.enableAnalytics,
    },
    {
      id: 'particulier' as JournalTab,
      label: 'Mon Foyer',
      icon: Utensils,
      show: features.enableParticulierMode || activity === 'particulier',
    },
    {
      id: 'settings' as JournalTab,
      label: 'Réglages',
      icon: Settings,
      show: true,
    },
  ].filter(t => t.show)

  return (
    <nav className="bg-[#191614] border-b border-[#2a2421] px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
              isActive
                ? 'bg-gradient-to-r from-[#064e3b] to-[#043c2d] text-[#f59e0b] border-[#047857]/60 shadow-md scale-[1.02]'
                : 'bg-[#221e1b]/60 text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#2a2421]'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-[#f59e0b]' : 'text-gray-400'}`} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono rounded-full font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
