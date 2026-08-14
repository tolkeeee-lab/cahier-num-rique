'use client'

import React, { useState } from 'react'
import { SalesHistory } from '@/components/SalesHistory'
import type { Sale } from '@/hooks/useJournalData'

import { BudgetOverviewCard } from '@/components/particulier/BudgetOverviewCard'
import { TontineTracker } from '@/components/particulier/TontineTracker'
import { CarnetBoutiquierWidget } from '@/components/particulier/CarnetBoutiquierWidget'
import { ExpensesByCategoryChart } from '@/components/particulier/ExpensesByCategoryChart'
import { Home, PiggyBank, Store, FileText } from 'lucide-react'

export interface ParticulierDashboardProps {
  mappedUser?: { id: string; email: string; name: string; role: string; shop_id: string } | null
  shopId?: string
  userShops?: Array<{ id: string; name: string; activity: string }>
  currentShop?: { id: string; name: string; activity: string } | undefined
  selectedShopId?: string
  setSelectedShopId?: (id: string) => void
  setShowNewShopModal?: (v: boolean) => void

  sales?: Sale[]
  allSales?: Sale[]
  tiroirCaisse?: number
  argentDehors?: number
  nosDettes?: number
  soldeDuJour?: number
}

export function ParticulierDashboard({
  shopId = 'default-shop',
  sales = [],
}: ParticulierDashboardProps) {
  const [activeTab, setActiveTab] = useState<'budget' | 'tontine' | 'carnet' | 'historique'>('budget')

  const incomeTotal = sales
    .filter(s => s.status !== 'crossed_out' && s.pen_color === 'blue')
    .reduce((sum, s) => sum + (s.total || 0), 0)

  const expensesTotal = sales
    .filter(s => s.status !== 'crossed_out' && s.pen_color === 'red')
    .reduce((sum, s) => sum + (s.total || 0), 0)

  const reserveStockTotal = sales
    .filter(s => s.status !== 'crossed_out' && s.pen_color === 'green')
    .reduce((sum, s) => sum + (s.total || 0), 0)

  const netBalance = incomeTotal - expensesTotal - reserveStockTotal

  const tontineTotal = sales
    .filter(s => s.status !== 'crossed_out' && (s.notes || '').toLowerCase().includes('tontine'))
    .reduce((sum, s) => sum + (s.total || 0), 0)

  const boutiquierCreditTotal = sales
    .filter(s => s.status !== 'crossed_out' && s.pen_color === 'purple')
    .reduce((sum, s) => sum + (s.debt || s.total || 0), 0)

  const categoryBreakdown = [
    {
      category: 'Marché',
      label: 'Marché & Nourriture',
      emoji: '🛒',
      amount: sales.filter(s => (s.notes || '').toLowerCase().includes('marché')).reduce((sum, s) => sum + s.total, 0),
    },
    {
      category: 'Loyer',
      label: 'Loyer & Logement',
      emoji: '🏠',
      amount: sales.filter(s => (s.notes || '').toLowerCase().includes('loyer')).reduce((sum, s) => sum + s.total, 0),
    },
    {
      category: 'Factures',
      label: 'Factures (CIE / Eau / Net)',
      emoji: '⚡',
      amount: sales.filter(s => /cie|sodeci|eau|electricite/i.test(s.notes || '')).reduce((sum, s) => sum + s.total, 0),
    },
    {
      category: 'École',
      label: 'Scolarité & Enfants',
      emoji: '📚',
      amount: sales.filter(s => /ecole|école|scolarité/i.test(s.notes || '')).reduce((sum, s) => sum + s.total, 0),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Navigation Onglets Foyer */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-800 scrollbar-none">
        <button
          onClick={() => setActiveTab('budget')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'budget'
              ? 'bg-[#064e3b] text-[#f59e0b] border-[#047857] shadow-lg'
              : 'bg-[#1e1a18] text-gray-400 border-gray-800 hover:text-white'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Bilan Foyer</span>
        </button>

        <button
          onClick={() => setActiveTab('tontine')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'tontine'
              ? 'bg-[#064e3b] text-[#f59e0b] border-[#047857] shadow-lg'
              : 'bg-[#1e1a18] text-gray-400 border-gray-800 hover:text-white'
          }`}
        >
          <PiggyBank className="w-4 h-4" />
          <span>Tontine & Épargne</span>
        </button>

        <button
          onClick={() => setActiveTab('carnet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'carnet'
              ? 'bg-[#064e3b] text-[#f59e0b] border-[#047857] shadow-lg'
              : 'bg-[#1e1a18] text-gray-400 border-gray-800 hover:text-white'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Carnet Boutiquier</span>
        </button>

        <button
          onClick={() => setActiveTab('historique')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'historique'
              ? 'bg-[#064e3b] text-[#f59e0b] border-[#047857] shadow-lg'
              : 'bg-[#1e1a18] text-gray-400 border-gray-800 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Historique Foyer</span>
        </button>
      </div>

      {/* Contenu Onglet Budget */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          <BudgetOverviewCard
            income={incomeTotal}
            expenses={expensesTotal}
            reserveStock={reserveStockTotal}
            netBalance={netBalance}
          />
          <ExpensesByCategoryChart categories={categoryBreakdown} totalExpenses={expensesTotal} />
        </div>
      )}

      {/* Contenu Onglet Tontine */}
      {activeTab === 'tontine' && (
        <TontineTracker totalTontine={tontineTotal} targetGoal={150000} />
      )}

      {/* Contenu Onglet Carnet Boutiquier */}
      {activeTab === 'carnet' && (
        <CarnetBoutiquierWidget
          totalCreditBoutiquier={boutiquierCreditTotal}
          debtsCount={sales.filter(s => s.pen_color === 'purple').length}
        />
      )}

      {/* Contenu Onglet Historique */}
      {activeTab === 'historique' && (
        <SalesHistory sales={sales} shopId={shopId} />
      )}
    </div>
  )
}
