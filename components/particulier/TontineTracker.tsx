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
    <div className="bg-[#faf5e8] p-4 rounded-2xl border border-[#e2d6be] space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-emerald-700" strokeWidth={1.5} />
          <h4 className="text-sm font-semibold text-stone-900">Suivi tontine et épargne</h4>
        </div>
        <span className="text-xs font-mono font-semibold text-stone-900 tabular-nums">
          {formatPrice(totalTontine)} / {formatPrice(targetGoal)}
        </span>
      </div>

      <div className="w-full bg-stone-200/80 h-2.5 rounded-full overflow-hidden">
        <div
          className="bg-emerald-700 h-full transition-[width] duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-stone-600">
        <span>Progression : <span className="font-mono font-semibold tabular-nums text-stone-900">{percentage}%</span></span>
        {percentage >= 100 && (
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Objectif atteint
          </span>
        )}
      </div>
    </div>
  )
}
