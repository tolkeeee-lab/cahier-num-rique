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
    <div className="bg-[#1e1a18] p-5 rounded-2xl border border-gray-800 space-y-3 mb-6 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-amber-400" />
          <h4 className="text-sm font-extrabold text-white">Suivi Tontine & Épargne</h4>
        </div>
        <span className="text-xs font-mono font-bold text-amber-400">
          {formatPrice(totalTontine)} / {formatPrice(targetGoal)}
        </span>
      </div>

      {/* Jauge de progression */}
      <div className="w-full bg-[#141210] h-3 rounded-full overflow-hidden border border-gray-800">
        <div
          className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
        <span>Progression : {percentage}%</span>
        {percentage >= 100 && (
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Objectif atteint !
          </span>
        )}
      </div>
    </div>
  )
}
