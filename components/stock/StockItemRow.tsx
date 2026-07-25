'use client'

import React from 'react'
import {
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Plus, Edit3, Trash2,
} from 'lucide-react'
import { StockItem } from './types'
import { getStockStatus, getStatusColors, getBarWidth, formatPrice } from './stockUtils'
import { canViewFinancialMargins } from '@/lib/roleUtils'

interface StockItemRowProps {
  item: StockItem
  isExpanded: boolean
  userRole?: string
  onToggleExpand: () => void
  onEnableTracking: (item: StockItem) => void
  onOpenExpressAdjust: (item: StockItem, type: 'in' | 'out') => void
  onEdit: (item: StockItem) => void
  onDelete: (item: StockItem) => void
}

export function StockItemRow({
  item,
  isExpanded,
  userRole,
  onToggleExpand,
  onEnableTracking,
  onOpenExpressAdjust,
  onEdit,
  onDelete,
}: StockItemRowProps) {
  const status = getStockStatus(item)
  const colors = getStatusColors(status)
  const barWidth = getBarWidth(item)

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${colors.bg} ${colors.border}`}>
      {/* Product row header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        <div className={`w-3 h-3 rounded-full flex-shrink-0 shadow-sm ${colors.dot}`} />

        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-handwritten text-lg font-bold text-gray-800 leading-tight">{item.name}</span>
            {item.category && (
              <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 bg-white bg-opacity-70 border border-gray-200 rounded-md text-gray-500 flex-shrink-0">
                {item.category}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-grow h-1.5 bg-white bg-opacity-60 rounded-full overflow-hidden border border-white border-opacity-80">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs font-bold flex-shrink-0 ${colors.text}`}>
                {status === 'untracked'
                  ? '📋 Non suivi'
                  : item.current_stock <= 0
                  ? '⚠️ RUPTURE'
                  : `${item.current_stock} ${item.unit} ${item.multiplier && item.multiplier > 1 ? `(${Math.floor(item.current_stock / item.multiplier)} ${item.packaging_name || 'lots'})` : ''}`}
              </span>
              {status === 'untracked' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEnableTracking(item)
                  }}
                  className="px-2 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[9px] font-bold rounded-full transition-colors flex items-center gap-1"
                  title="Activer le suivi du stock pour ce produit"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Activer suivi</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Boutons Ajustement Express */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenExpressAdjust(item, 'in')
              }}
              className="w-7 h-7 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg flex items-center justify-center text-xs transition-colors shadow-xs"
              title="Ajouter du stock (+ Entrée)"
            >
              +
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenExpressAdjust(item, 'out')
              }}
              className="w-7 h-7 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg flex items-center justify-center text-xs transition-colors shadow-xs"
              title="Retirer du stock (- Sortie)"
            >
              -
            </button>
          </div>

          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-mono font-bold">
              <TrendingUp className="w-2.5 h-2.5" /> +{item.total_in}
            </div>
            <div className="flex items-center gap-1 text-[9px] text-red-600 font-mono font-bold">
              <TrendingDown className="w-2.5 h-2.5" /> -{item.total_out}
            </div>
          </div>
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-white border-opacity-60 px-4 py-3 bg-white bg-opacity-40">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: 'Initial', value: item.initial_stock, color: 'text-gray-700' },
              { label: 'Entrées', value: `+${item.total_in}`, color: 'text-emerald-700' },
              { label: 'Sorties', value: `-${item.total_out}`, color: 'text-red-600' },
              { label: 'Actuel', value: `${item.current_stock} ${item.unit}`, color: colors.text },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-[8px] uppercase font-bold text-gray-400">{s.label}</div>
                <div className={`font-mono text-xs font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Profitabilité & Marge (Masqué pour les employés) */}
          {canViewFinancialMargins(userRole) && item.unit_price > 0 && item.unit_cost > 0 && (
            <div className="mb-3 p-2 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-amber-800">
                💰 Marge Unitaire: <strong>{formatPrice(item.unit_price - item.unit_cost)}</strong> ({Math.round(((item.unit_price - item.unit_cost) / item.unit_cost) * 100)}%)
              </span>
              {item.current_stock > 0 && (
                <span className="text-amber-900 font-bold">
                  Profit Potentiel: {formatPrice((item.unit_price - item.unit_cost) * item.current_stock)}
                </span>
              )}
            </div>
          )}

          {/* Seuil + Prix */}
          <div className="flex gap-4 text-[10px] font-mono mb-3 text-gray-500 flex-wrap">
            <span>Seuil: <strong className="text-gray-700">{item.alert_threshold} {item.unit}</strong></span>
            {item.unit_cost > 0 && <span>Achat: <strong className="text-gray-700">{formatPrice(item.unit_cost)}</strong></span>}
            {item.unit_price > 0 && <span>Vente: <strong className="text-gray-700">{formatPrice(item.unit_price)}</strong></span>}
            {item.multiplier && item.multiplier > 1 && (
              <span>Conditionnement: <strong className="text-gray-700">1 {item.packaging_name || 'lot'} = {item.multiplier} {item.unit}</strong></span>
            )}
            {item.current_stock > 0 && (
              <>
                {item.unit_cost > 0 && (
                  <span className="text-emerald-700">Valeur Achat: <strong>{formatPrice(Math.max(0, item.current_stock) * item.unit_cost)}</strong></span>
                )}
                {item.unit_price > 0 && (
                  <span className="text-indigo-700">Valeur Vente: <strong>{formatPrice(Math.max(0, item.current_stock) * item.unit_price)}</strong></span>
                )}
              </>
            )}
          </div>

          {/* Historique mouvements */}
          {item.movements && item.movements.length > 0 && (
            <div className="mb-3">
              <div className="text-[9px] uppercase font-bold text-gray-400 mb-1.5 tracking-wider">Derniers mouvements</div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {item.movements.slice(0, 8).map((mv, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[10px] font-mono py-0.5 border-b border-white border-opacity-40 last:border-0">
                    <span className="text-gray-400 flex-shrink-0">{mv.date}</span>
                    <span className="text-gray-500 truncate flex-grow">{mv.notes?.slice(0, 35) || '—'}</span>
                    <span className={`font-bold flex-shrink-0 ${mv.type === 'in' ? 'text-emerald-700' : 'text-red-600'}`}>
                      {mv.type === 'in' ? '+' : '-'}{mv.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {!item.is_orphan && (
            <div className="flex gap-2">
              <button
                onClick={e => { e.stopPropagation(); onEdit(item) }}
                className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-full text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Edit3 className="w-2.5 h-2.5" /> Modifier
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(item) }}
                className="flex items-center gap-1 px-3 py-1 bg-red-50 border border-red-200 rounded-full text-[10px] font-bold text-red-600 hover:bg-red-100 transition-all"
              >
                <Trash2 className="w-2.5 h-2.5" /> Supprimer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
