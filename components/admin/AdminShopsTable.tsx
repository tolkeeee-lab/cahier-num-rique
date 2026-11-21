'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Search, Eye, Users, X } from 'lucide-react'

interface AdminShop {
  shop_id: string
  name: string
  owner_email: string
  transactions_count: number
  total_sales: number
  cash_balance: number
  employees_count: number
  created_at: string
}

interface AdminShopsTableProps {
  shops: AdminShop[]
  searchQuery: string
  onSearchChange: (q: string) => void
  onInspectShop: (shopId: string, shopName: string) => void
}

export const AdminShopsTable: React.FC<AdminShopsTableProps> = ({
  shops,
  searchQuery,
  onSearchChange,
  onInspectShop,
}) => {
  const filteredShops = shops.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return s.name.toLowerCase().includes(q) || (s.owner_email || '').toLowerCase().includes(q) || s.shop_id.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onSearchChange('')
            }
          }}
          placeholder="Rechercher par boutique, e-mail ou ID"
          className="w-full pl-9 pr-9 py-2 bg-[#faf5e8] border border-[#e2d6be] rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            title="Effacer la recherche"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="bg-[#faf5e8] rounded-2xl border border-[#e2d6be] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f5efe0] border-b border-[#e2d6be] text-xs font-medium text-stone-600">
                <th className="px-4 py-3">Boutique / Gérant</th>
                <th className="px-4 py-3 text-center">Transactions</th>
                <th className="px-4 py-3 text-right">Ventes cumulées</th>
                <th className="px-4 py-3 text-right">Tiroir caisse</th>
                <th className="px-4 py-3 text-center">Équipe</th>
                <th className="px-4 py-3 text-right">Inspecter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2d6be]/60 text-xs">
              {filteredShops.map((shop) => (
                <tr key={shop.shop_id} className="hover:bg-white/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-stone-900 text-sm">{shop.name}</p>
                    <p className="text-[11px] text-stone-500">{shop.owner_email || 'Boutique sans e-mail'}</p>
                  </td>

                  <td className="px-4 py-3 text-center text-stone-700">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-stone-200 font-mono tabular-nums">
                      {shop.transactions_count}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right font-semibold text-stone-900 font-mono tabular-nums">
                    {formatPrice(shop.total_sales)}
                  </td>

                  <td className="px-4 py-3 text-right text-emerald-700 font-semibold font-mono tabular-nums">
                    {formatPrice(shop.cash_balance)}
                  </td>

                  <td className="px-4 py-3 text-center text-stone-600">
                    <span className="inline-flex items-center justify-center gap-1 font-mono tabular-nums">
                      <Users className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.5} />
                      <span>{shop.employees_count}</span>
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onInspectShop(shop.shop_id, shop.name)}
                      className="px-3 py-1.5 rounded-lg bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 active:scale-[0.97] transition-colors font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.5} />
                      <span>Voir cahier</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
