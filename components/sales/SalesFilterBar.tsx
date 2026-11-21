'use client'

import React from 'react'
import { Search, Download, Share2, X } from 'lucide-react'

interface SalesFilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  dateFilter: string
  onDateFilterChange: (filter: string) => void
  statusFilter: string
  onStatusFilterChange: (filter: string) => void
  onExportCSV?: () => void
  onExportPDF?: () => void
}

export const SalesFilterBar: React.FC<SalesFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  statusFilter,
  onStatusFilterChange,
  onExportCSV,
  onExportPDF,
}) => {
  return (
    <div className="bg-[#faf5e8] p-3.5 rounded-2xl border border-[#e2d6be] mb-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onSearchChange('')
              }
            }}
            placeholder="Rechercher par client, article ou note"
            className="w-full pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700 rounded-md transition-colors cursor-pointer"
              title="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer"
          >
            <option value="today">Aujourd&apos;hui</option>
            <option value="yesterday">Hier</option>
            <option value="week">7 derniers jours</option>
            <option value="month">Ce mois-ci</option>
            <option value="all">Historique complet</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="paid">Encaissés</option>
            <option value="debt">Dettes</option>
            <option value="crossed_out">Rayés</option>
          </select>

          {onExportCSV && (
            <button
              type="button"
              onClick={onExportCSV}
              className="p-2 rounded-xl bg-white hover:bg-stone-50 active:scale-[0.97] text-stone-700 border border-stone-200 transition-colors cursor-pointer"
              title="Exporter en CSV / Excel"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}

          {onExportPDF && (
            <button
              type="button"
              onClick={onExportPDF}
              className="p-2 rounded-xl bg-white hover:bg-stone-50 active:scale-[0.97] text-stone-700 border border-stone-200 transition-colors cursor-pointer"
              title="Générer rapport PDF"
            >
              <Share2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
