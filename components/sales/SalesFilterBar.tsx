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
    <div className="bg-[#1e1a18] p-4 rounded-2xl border border-gray-800 space-y-3 mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Champ de Recherche */}
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par client, article ou note..."
            className="w-full pl-9 pr-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Filtres & Exportations */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          
          {/* Filtre de Date */}
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            className="px-3 py-1.5 bg-[#141210] border border-gray-800 rounded-xl text-xs text-gray-300 font-mono focus:outline-none"
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
            className="px-3 py-1.5 bg-[#141210] border border-gray-800 rounded-xl text-xs text-gray-300 font-mono focus:outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="paid">Encaissés ✓</option>
            <option value="debt">Dettes ⚠️</option>
            <option value="crossed_out">Rayés ❌</option>
          </select>

          {/* Boutons d'export */}
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="p-2 rounded-xl bg-[#2a2421] text-gray-300 hover:text-white hover:bg-[#342d29] transition-colors border border-gray-800"
              title="Exporter en CSV / Excel"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="p-2 rounded-xl bg-[#2a2421] text-gray-300 hover:text-white hover:bg-[#342d29] transition-colors border border-gray-800"
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
