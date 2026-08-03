'use client'

import React from 'react'
import { Search, X } from 'lucide-react'

interface StockFilterBarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  categoryFilter: string
  setCategoryFilter: (category: string) => void
  trackModeFilter: 'ALL' | 'TRACKED' | 'UNTRACKED'
  setTrackModeFilter: (mode: 'ALL' | 'TRACKED' | 'UNTRACKED') => void
  allCategories: string[]
  trackedCount: number
  untrackedCount: number
  totalCount: number
}

export function StockFilterBar({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  trackModeFilter,
  setTrackModeFilter,
  allCategories,
  trackedCount,
  untrackedCount,
  totalCount,
}: StockFilterBarProps) {
  return (
    <>
      {/* ── Search + Mode de Suivi + Category filter ── */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex flex-col gap-2 bg-[#faf7f0] flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Chercher un produit..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-mono outline-none focus:border-gray-400 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Commutateur de Mode de Suivi */}
          <div className="flex bg-gray-200/80 p-0.5 rounded-full text-[10px] font-bold select-none w-full sm:w-auto justify-center">
            <button
              onClick={() => setTrackModeFilter('ALL')}
              className={`px-3 py-1 rounded-full transition-all ${
                trackModeFilter === 'ALL' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              TOUT ({totalCount})
            </button>
            <button
              onClick={() => setTrackModeFilter('TRACKED')}
              className={`px-3 py-1 rounded-full transition-all ${
                trackModeFilter === 'TRACKED' ? 'bg-emerald-700 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📦 Stock Suivi ({trackedCount})
            </button>
            <button
              onClick={() => setTrackModeFilter('UNTRACKED')}
              className={`px-3 py-1 rounded-full transition-all ${
                trackModeFilter === 'UNTRACKED' ? 'bg-blue-700 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📝 Ventes Seules ({untrackedCount})
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex-shrink-0 transition-all ${
                categoryFilter === cat
                  ? 'bg-gray-800 border-gray-800 text-white scale-105'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
