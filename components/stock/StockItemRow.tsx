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
            {item.stock_tracked && (
              <div className="flex-grow h-1.5 bg-white bg-opacity-60 rounded-full overflow-hidden border border-white border-opacity-80">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs font-bold flex-shrink-0 ${colors.text}`}>
                {!item.stock_tracked
                  ? '📝 Ventes seules (Cahier)'
                  : item.current_stock <= 0
                  ? '⚠️ RUPTURE'
                  : `${item.current_stock} ${item.unit} ${item.multiplier && item.multiplier > 1 ? `(${Math.floor(item.current_stock / item.multiplier)} ${item.packaging_name || 'lots'})` : ''}`}
              </span>
              {!item.stock_tracked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEnableTracking(item)
                  }}
                  className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded-full transition-all shadow-xs flex items-center gap-1"
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
          {/* Boutons Ajustement Express (Uniquement si le stock est suivi) */}
          {item.stock_tracked ? (
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
          ) : (
            <div className="text-right font-mono text-xs font-bold text-gray-700">
              {item.unit_price > 0 ? formatPrice(item.unit_price) : ''}
            </div>
          )}

          {item.stock_tracked && (
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-mono font-bold">
                <TrendingUp className="w-2.5 h-2.5" /> +{item.total_in}
              </div>
              <div className="flex items-center gap-1 text-[9px] text-red-600 font-mono font-bold">
                <TrendingDown className="w-2.5 h-2.5" /> -{item.total_out}
              </div>
            </div>
          )}
          {!item.is_orphan && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item)
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title={`Supprimer « ${item.name} »`}
            >
              <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
            </button>
          )}

          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-white border-opacity-60 px-4 py-3 bg-white bg-opacity-40">

          {/* Stats ou Message d'explication Ventes seules */}
          {item.stock_tracked ? (
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
          ) : (
            <div className="mb-3 p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-blue-900 font-sans">
                <span className="font-bold block">💡 Article en vente directe au cahier</span>
                <span className="text-[11px] text-blue-700">Vous pouvez continuer à le vendre directement. Aucun inventaire n'est obligatoire !</span>
              </div>
              <button
                onClick={() => onEnableTracking(item)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all self-start sm:self-auto flex-shrink-0"
              >
                + Activer le suivi de stock
              </button>
            </div>
          )}

          {/* Profitabilité & Marge (Masqué pour les employés ou si stock non suivi) */}
          {canViewFinancialMargins(userRole) && item.stock_tracked && item.unit_price > 0 && item.unit_cost > 0 && item.unit_cost !== Math.round(item.unit_price * 0.6) && item.unit_cost !== Math.round(item.unit_price * 0.7) && (
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
            {item.stock_tracked && item.unit_cost > 0 && item.unit_cost !== Math.round(item.unit_price * 0.6) && item.unit_cost !== Math.round(item.unit_price * 0.7) ? (
              <span>Achat: <strong className="text-gray-700">{formatPrice(item.unit_cost)}</strong></span>
            ) : (
              <span className="text-gray-400 italic">Achat: Non renseigné</span>
            )}
            {item.unit_price > 0 && <span>Vente: <strong className="text-gray-700">{formatPrice(item.unit_price)}</strong></span>}
            {item.lot_quantity && item.lot_quantity > 1 && item.lot_price && item.lot_price > 0 ? (
              <span className="bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5 rounded-md font-bold">
                🎁 Lot de {item.lot_quantity} à {formatPrice(item.lot_price)}
              </span>
            ) : null}
            {item.multiplier && item.multiplier > 1 && (
              <>
                <span className="bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold">
                  📦 1 {item.packaging_name || 'lot'} = {item.multiplier} {item.unit}s
                </span>
                {item.unit_cost > 0 && (
                  <span className="text-amber-800 font-bold">
                    Prix Gros ({item.packaging_name || 'Carton'}): <strong>{formatPrice(item.unit_cost * item.multiplier)}</strong>
                  </span>
                )}
              </>
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
