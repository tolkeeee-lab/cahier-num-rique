'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { HandCoins, CheckCircle2 } from 'lucide-react'

interface TontineTrackerProps {
  totalTontine: number
  targetGoal?: number
}

export const TontineTracker: React.FC<TontineTrackerProps> = ({
  totalTontine,
  targetGoal = 100000,
}) => {
  const percentage = Math.min(100, Math.round((totalTontine / (targetGoal || 1)) * 100))

  return (
    <div className="bg-white/90 p-4 rounded-2xl border border-amber-300/80 space-y-3 mb-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-amber-700" />
          <h4 className="text-sm font-extrabold text-gray-900">Suivi Tontine & Épargne</h4>
        </div>
        <span className="text-xs font-mono font-black text-amber-950">
          {formatPrice(totalTontine)} / {formatPrice(targetGoal)}
        </span>
      </div>

      {/* Jauge de progression */}
      <div className="w-full bg-amber-100/80 h-3.5 rounded-full overflow-hidden border border-amber-200 shadow-inner">
        <div
          className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-500 rounded-full shadow-xs"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-gray-700 font-mono font-bold">
        <span>Progression : {percentage}%</span>
        {percentage >= 100 && (
          <span className="text-emerald-700 font-extrabold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Objectif atteint !
          </span>
        )}
      </div>
    </div>
  )
}
