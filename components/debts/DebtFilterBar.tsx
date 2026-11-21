'use client'

import React from 'react'
import { Search, X, Plus, ArrowUpDown } from 'lucide-react'

export type DebtSortOption = 'amount_desc' | 'recent' | 'name_asc'

interface DebtFilterBarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  debtTypeFilter: 'all' | 'client' | 'supplier'
  onDebtTypeFilterChange: (type: 'all' | 'client' | 'supplier') => void
  statusFilter: 'all' | 'pending' | 'settled'
  onStatusFilterChange: (status: 'all' | 'pending' | 'settled') => void
  sortBy?: DebtSortOption
  onSortChange?: (sort: DebtSortOption) => void
  onOpenNewDebt?: () => void
  isEmployee?: boolean
}

export const DebtFilterBar: React.FC<DebtFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  debtTypeFilter,
  onDebtTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortBy = 'amount_desc',
  onSortChange,
  onOpenNewDebt,
  isEmployee = false,
}) => {
  return (
    <div className="bg-[#faf5e8] p-3 rounded-xl border border-stone-900/10 space-y-2.5">
      {/* Ligne 1 : Recherche + Bouton Nouvelle dette */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.75} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onSearchChange('')
            }}
            placeholder="Rechercher un client ou un numÃ©ro..."
            className="w-full pl-9 pr-8 py-2 bg-[#faf5e8] border border-stone-900/15 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700 rounded cursor-pointer transition-colors"
              title="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {onOpenNewDebt && (
          <button
            type="button"
            onClick={onOpenNewDebt}
            className="px-3.5 py-2 bg-[#064e3b] hover:bg-[#075e47] text-[#f59e0b] text-xs font-semibold rounded-lg transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Nouvelle dette</span>
          </button>
        )}
      </div>

      {/* Ligne 2 : Onglets segmentÃ©s Type + Statut + Tri */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type (masquÃ© pour employÃ© qui ne voit que les clients) */}
          {!isEmployee && (
            <div className="inline-flex bg-[#f3ecda] p-0.5 rounded-lg border border-stone-900/10 text-[11px]">
              {(
                [
                  { id: 'all', label: 'Tous' },
                  { id: 'client', label: 'Clients' },
                  { id: 'supplier', label: 'Grossistes' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onDebtTypeFilterChange(opt.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    debtTypeFilter === opt.id
                      ? 'bg-[#faf5e8] text-stone-950 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Statut */}
          <div className="inline-flex bg-[#f3ecda] p-0.5 rounded-lg border border-stone-900/10 text-[11px]">
            {(
              [
                { id: 'pending', label: 'En cours' },
                { id: 'settled', label: 'SoldÃ©s' },
                { id: 'all', label: 'Tout' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onStatusFilterChange(opt.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === opt.id
                    ? 'bg-[#faf5e8] text-stone-950 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tri */}
        {onSortChange && (
          <div className="inline-flex items-center gap-1.5 text-[11px] text-stone-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.75} />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as DebtSortOption)}
              className="bg-[#faf5e8] border border-stone-900/15 rounded-lg px-2 py-1 text-[11px] font-medium text-stone-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
            >
              <option value="amount_desc">Plus gros solde</option>
              <option value="recent">Plus rÃ©cent</option>
              <option value="name_asc">Nom Aâ€“Z</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
