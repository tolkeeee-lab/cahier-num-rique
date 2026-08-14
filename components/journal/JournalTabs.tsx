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

import { getActivityLabels } from '@/lib/activityLabels'

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
  const labels = getActivityLabels(activity)

  const tabs = [
    {
      id: 'cahier' as JournalTab,
      label: labels.tabCahier,
      icon: BookOpen,
      show: true,
    },
    {
      id: 'stock' as JournalTab,
      label: labels.tabStock,
      icon: Package,
      show: features.enableStockManagement && activity !== 'particulier',
    },
    {
      id: 'dettes' as JournalTab,
      label: labels.tabDettes,
      icon: BookText,
      badge: pendingDebtsCount > 0 ? pendingDebtsCount : undefined,
      show: true,
    },
    {
      id: 'shopping' as JournalTab,
      label: labels.tabShopping,
      icon: ShoppingCart,
      show: true,
    },
    {
      id: 'demandes' as JournalTab,
      label: labels.tabDemandes,
      icon: ClipboardList,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      show: activity !== 'particulier',
    },
    {
      id: 'analytics' as JournalTab,
      label: labels.tabTrends,
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
    <nav className="bg-[#f5eea5]/20 border-b border-amber-300/60 px-3 pt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none select-none">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`notebook-tab flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-extrabold transition-all whitespace-nowrap border-t border-x ${
              isActive
                ? 'bg-[#064e3b] text-[#f59e0b] border-[#047857] shadow-lg -mb-[1px] rounded-t-xl scale-[1.02]'
                : 'bg-amber-100/60 text-amber-950 border-amber-300/60 hover:bg-amber-200/80 rounded-t-lg opacity-85'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] rounded-full font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
