'use client'

import React from 'react'
import { Search, Download, Share2 } from 'lucide-react'

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
    <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-300/80 space-y-3 mb-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Champ de Recherche */}
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par client, article ou note..."
            className="w-full pl-9 pr-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 font-mono shadow-inner font-bold"
          />
        </div>

        {/* Filtres & Exportations */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          
          {/* Filtre de Date */}
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            className="px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-mono font-bold focus:outline-none cursor-pointer"
          >
            <option value="today">Aujourd'hui</option>
            <option value="yesterday">Hier</option>
            <option value="week">7 derniers jours</option>
            <option value="month">Ce mois-ci</option>
            <option value="all">Historique complet</option>
          </select>

          {/* Filtre de Statut */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-mono font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="paid">Encaissés ✓</option>
            <option value="debt">Dettes ⚠️</option>
            <option value="crossed_out">Rayés ❌</option>
          </select>

          {/* Boutons d'export */}
          {onExportCSV && (
            <button
              type="button"
              onClick={onExportCSV}
              className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
              title="Exporter en CSV / Excel"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {onExportPDF && (
            <button
              type="button"
              onClick={onExportPDF}
              className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
              title="Générer rapport PDF"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
