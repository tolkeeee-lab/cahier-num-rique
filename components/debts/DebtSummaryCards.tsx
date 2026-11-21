'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'

interface DebtSummaryCardsProps {
  totalClientDebts: number
  totalSupplierDebts: number
  clientCount?: number
  supplierCount?: number
  totalRecovered?: number
  isEmployee?: boolean
}

export const DebtSummaryCards: React.FC<DebtSummaryCardsProps> = ({
  totalClientDebts,
  totalSupplierDebts,
  clientCount = 0,
  supplierCount = 0,
  totalRecovered = 0,
  isEmployee = false,
}) => {
  const totalVolume = totalClientDebts + totalRecovered
  const recoveryPct = totalVolume > 0 ? Math.round((totalRecovered / totalVolume) * 100) : 0

  return (
    <div className={`grid grid-cols-1 ${isEmployee ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-2.5`}>
      {/* Créances Clients (Argent Dehors) */}
      <div className="bg-[#faf5e8] px-4 py-3 rounded-xl border border-stone-900/10 space-y-1">
        <div className="flex items-center justify-between text-xs text-stone-600 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600 flex-shrink-0" />
            <span>Crédits clients</span>
          </span>
          <span className="font-mono text-[11px] text-stone-500 tabular-nums">
            {clientCount} en cours
          </span>
        </div>
        <p className="text-lg sm:text-xl font-semibold text-rose-900 font-mono tabular-nums tracking-tight">
          {formatPrice(totalClientDebts)}
        </p>
      </div>

      {/* Dettes Fournisseurs (Masqué pour les employés) */}
      {!isEmployee && (
        <div className="bg-[#faf5e8] px-4 py-3 rounded-xl border border-stone-900/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-600 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-600 flex-shrink-0" />
              <span>Dettes grossistes</span>
            </span>
            <span className="font-mono text-[11px] text-stone-500 tabular-nums">
              {supplierCount} en cours
            </span>
          </div>
          <p className="text-lg sm:text-xl font-semibold text-stone-900 font-mono tabular-nums tracking-tight">
            {formatPrice(totalSupplierDebts)}
          </p>
        </div>
      )}

      {/* Déjà recouvré */}
      <div className="bg-[#faf5e8] px-4 py-3 rounded-xl border border-stone-900/10 space-y-1">
        <div className="flex items-center justify-between text-xs text-stone-600 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0" />
            <span>Déjà encaissé</span>
          </span>
          {totalVolume > 0 && (
            <span className="font-mono text-[11px] text-emerald-800 tabular-nums">
              {recoveryPct}% recouvré
            </span>
          )}
        </div>
        <p className="text-lg sm:text-xl font-semibold text-emerald-900 font-mono tabular-nums tracking-tight">
          {formatPrice(totalRecovered)}
        </p>
      </div>
    </div>
  )
}
