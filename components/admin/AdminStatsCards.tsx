'use client'

import React from 'react'
import { Store, Users, TrendingUp, FileText } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface AdminKPIs {
  totalBoutiques: number
  totalUsers: number
  globalTransactions: number
  globalVolumeSales: number
}

interface AdminStatsCardsProps {
  kpis: AdminKPIs | null
}

export const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({ kpis }) => {
  if (!kpis) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Total Boutiques */}
      <div className="bg-[#1e1a18] p-4 rounded-2xl border border-gray-800 space-y-1 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-blue-400 font-mono">
          <Store className="w-3.5 h-3.5" />
          <span>Boutiques Réseau</span>
        </div>
        <p className="text-xl font-extrabold text-white font-mono">
          {kpis.totalBoutiques}
        </p>
      </div>

      {/* Utilisateurs */}
      <div className="bg-[#1e1a18] p-4 rounded-2xl border border-gray-800 space-y-1 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
          <Users className="w-3.5 h-3.5" />
          <span>Utilisateurs</span>
        </div>
        <p className="text-xl font-extrabold text-white font-mono">
          {kpis.totalUsers}
        </p>
      </div>

      {/* Volume de transactions */}
      <div className="bg-[#1e1a18] p-4 rounded-2xl border border-gray-800 space-y-1 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-purple-400 font-mono">
          <FileText className="w-3.5 h-3.5" />
          <span>Transactions</span>
        </div>
        <p className="text-xl font-extrabold text-white font-mono">
          {kpis.globalTransactions}
        </p>
      </div>

      {/* Volume Ventes Cumulées */}
      <div className="bg-[#1e1a18] p-4 rounded-2xl border border-amber-900/40 space-y-1 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Volume Réseau</span>
        </div>
        <p className="text-[15px] font-extrabold text-amber-400 font-mono truncate">
          {formatPrice(kpis.globalVolumeSales)}
        </p>
      </div>
    </div>
  )
}
