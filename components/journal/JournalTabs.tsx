'use client'

import React from 'react'
import { 
  BookOpen, 
  History,
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

import { canViewExecutiveDashboard, canAccessAdminSettings, isEmployeeRole } from '@/lib/roleUtils'

export type JournalTab = 'cahier' | 'history' | 'stock' | 'dettes' | 'shopping' | 'demandes' | 'analytics' | 'particulier' | 'settings'

interface JournalTabsProps {
  activeTab: JournalTab
  onTabChange: (tab: JournalTab) => void
  activity: string
  userRole?: string | null
  pendingDebtsCount?: number
  pendingRequestsCount?: number
}

export const JournalTabs: React.FC<JournalTabsProps> = ({
  activeTab,
  onTabChange,
  activity,
  userRole,
  pendingDebtsCount = 0,
  pendingRequestsCount = 0,
}) => {
  const { features } = useFeatures()
  const labels = getActivityLabels(activity)
  const isEmployee = isEmployeeRole(userRole)

  const tabs = [
    {
      id: 'cahier' as JournalTab,
      label: labels.tabCahier,
      icon: BookOpen,
      show: true,
    },
    {
      id: 'history' as JournalTab,
      label: 'Historique Ventes',
      icon: History,
      show: true,
    },
    {
      id: 'stock' as JournalTab,
      label: labels.tabStock,
      icon: Package,
      show: !isEmployee && features.enableStockManagement && activity !== 'particulier',
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
      show: !isEmployee,
    },
    {
      id: 'demandes' as JournalTab,
      label: labels.tabDemandes,
      icon: ClipboardList,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      show: !isEmployee && activity !== 'particulier',
    },
    {
      id: 'analytics' as JournalTab,
      label: 'Comptabilité & Bilan',
      icon: BarChart3,
      show: !isEmployee && features.enableAnalytics && canViewExecutiveDashboard(userRole),
    },
    {
      id: 'particulier' as JournalTab,
      label: 'Mon Foyer',
      icon: Utensils,
      show: !isEmployee && Boolean(features.enableParticulierMode && activity !== 'particulier'),
    },
    {
      id: 'settings' as JournalTab,
      label: 'Réglages',
      icon: Settings,
      show: !isEmployee && canAccessAdminSettings(userRole),
    },
  ].filter(t => t.show)


  return (
    <nav className="bg-[#f7f2e4] border-b border-stone-900/10 px-2 sm:px-3 pt-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none select-none">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`notebook-tab flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap border-t border-x cursor-pointer active:scale-[0.98] ${
              isActive
                ? 'bg-[#064e3b] text-[#f59e0b] border-[#047857] -mb-[1px]'
                : 'bg-[#faf5e8]/70 text-stone-700 border-stone-900/10 hover:bg-[#faf5e8] hover:text-stone-950'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} strokeWidth={1.75} />
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] rounded-full font-semibold font-mono tabular-nums">
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
