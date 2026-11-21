'use client'

import React from 'react'
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
      <div className="bg-[#faf5e8] p-4 rounded-xl border border-[#e2d6be] space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
          <span className="w-2 h-2 rounded-full bg-stone-500" />
          <span>Boutiques réseau</span>
        </div>
        <p className="text-xl font-semibold text-stone-900 font-mono tabular-nums">
          {kpis.totalBoutiques}
        </p>
      </div>

      <div className="bg-[#faf5e8] p-4 rounded-xl border border-[#e2d6be] space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>Utilisateurs</span>
        </div>
        <p className="text-xl font-semibold text-stone-900 font-mono tabular-nums">
          {kpis.totalUsers}
        </p>
      </div>

      <div className="bg-[#faf5e8] p-4 rounded-xl border border-[#e2d6be] space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
          <span className="w-2 h-2 rounded-full bg-amber-600" />
          <span>Transactions</span>
        </div>
        <p className="text-xl font-semibold text-stone-900 font-mono tabular-nums">
          {kpis.globalTransactions}
        </p>
      </div>

      <div className="bg-[#faf5e8] p-4 rounded-xl border border-[#e2d6be] space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
          <span className="w-2 h-2 rounded-full bg-emerald-700" />
          <span>Volume réseau</span>
        </div>
        <p className="text-lg font-semibold text-emerald-800 font-mono truncate tabular-nums">
          {formatPrice(kpis.globalVolumeSales)}
        </p>
      </div>
    </div>
  )
}
