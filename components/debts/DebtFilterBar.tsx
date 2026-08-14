'use client'

import React from 'react'
import { Search } from 'lucide-react'

interface DebtFilterBarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  debtTypeFilter: 'all' | 'client' | 'supplier'
  onDebtTypeFilterChange: (type: 'all' | 'client' | 'supplier') => void
  statusFilter: 'all' | 'pending' | 'settled'
  onStatusFilterChange: (status: 'all' | 'pending' | 'settled') => void
}

export const DebtFilterBar: React.FC<DebtFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  debtTypeFilter,
  onDebtTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}) => {
  return (
    <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-300/80 space-y-3 mb-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Champ de recherche */}
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par nom de client ou fournisseur..."
            className="w-full pl-9 pr-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 font-mono shadow-inner font-bold"
          />
        </div>

        {/* Filtres par Type & Statut */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {/* Filtre Type (Client vs Fournisseur) */}
          <select
            value={debtTypeFilter}
            onChange={(e) => onDebtTypeFilterChange(e.target.value as any)}
            className="px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-mono font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">Tous les carnets</option>
            <option value="client">Dettes Clients ⚠️</option>
            <option value="supplier">Dettes Grossistes 📦</option>
          </select>

          {/* Filtre Statut */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as any)}
            className="px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-mono font-bold focus:outline-none cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En cours ⏳</option>
            <option value="settled">Soldés ✓</option>
          </select>
        </div>
      </div>
    </div>
  )
}
