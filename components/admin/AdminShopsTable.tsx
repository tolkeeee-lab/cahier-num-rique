'use client'

import React from 'react'
import { formatPrice } from '@/lib/penUtils'
import { Search, Eye, Users } from 'lucide-react'

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
      {/* Barre de Recherche */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher par nom de boutique, e-mail gérant ou ID..."
          className="w-full pl-9 pr-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono"
        />
      </div>

      {/* Tableau des Boutiques */}
      <div className="bg-[#1e1a18] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#141210] border-b border-gray-800 text-[11px] font-mono text-gray-400 uppercase">
                <th className="p-4">Boutique / Gérant</th>
                <th className="p-4 text-center">Transactions</th>
                <th className="p-4 text-right">Ventes Cumulées</th>
                <th className="p-4 text-right">Tiroir Cash</th>
                <th className="p-4 text-center">Équipe</th>
                <th className="p-4 text-right">Inspecter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-xs font-mono">
              {filteredShops.map((shop) => (
                <tr key={shop.shop_id} className="hover:bg-[#25201d] transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-white text-sm">{shop.name}</p>
                    <p className="text-[11px] text-gray-400">{shop.owner_email || 'Boutique sans e-mail'}</p>
                  </td>

                  <td className="p-4 text-center text-gray-300">
                    <span className="px-2 py-0.5 rounded-lg bg-[#141210] border border-gray-800">
                      {shop.transactions_count}
                    </span>
                  </td>

                  <td className="p-4 text-right font-bold text-amber-400">
                    {formatPrice(shop.total_sales)}
                  </td>

                  <td className="p-4 text-right text-emerald-400 font-bold">
                    {formatPrice(shop.cash_balance)}
                  </td>

                  <td className="p-4 text-center text-gray-400">
                    <span className="flex items-center justify-center gap-1">
                      <Users className="w-3.5 h-3.5 text-gray-500" />
                      <span>{shop.employees_count}</span>
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <button
                      onClick={() => onInspectShop(shop.shop_id, shop.name)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all font-mono font-bold text-[11px] inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Voir Cahier</span>
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
