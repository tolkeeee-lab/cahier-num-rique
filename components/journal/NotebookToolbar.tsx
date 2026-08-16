import React, { useState } from 'react'
import { Pen, formatPrice } from '@/lib/penUtils'
import { Calculator } from 'lucide-react'
import { CategoryBreakdownModal } from './CategoryBreakdownModal'

interface SaleItem {
  id: string
  date: string
  time?: string
  client?: string
  articles?: Array<{
    name: string
    quantity: number
    unit_price: number
  }>
  notes?: string
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt' | 'crossed_out'
  type: string
  pen_color: string
}

interface NotebookToolbarProps {
  pens: Pen[]
  selectedPen: string
  onSelectPen: (penId: string) => void
  sales?: SaleItem[]
  activeFilter?: string
  onSelectFilter?: (filterId: string) => void
}

export const NotebookToolbar: React.FC<NotebookToolbarProps> = ({
  pens,
  selectedPen,
  onSelectPen,
  sales = [],
  activeFilter = 'all',
  onSelectFilter,
}) => {
  const [breakdownType, setBreakdownType] = useState<'all' | 'blue' | 'red' | 'green' | 'purple' | 'yellow' | 'total' | null>(null)

  // Calcul des totaux par stylo / catégorie
  const validSales = sales.filter(s => s.status !== 'crossed_out')

  const getPenAmount = (penId: string) => {
    switch (penId) {
      case 'blue':
        return validSales
          .filter(s => s.pen_color === 'blue' || s.type === 'cash_in' || s.type === 'sale_credit')
          .reduce((sum, s) => sum + (s.total || 0), 0)
      case 'red':
        return validSales
          .filter(s => s.pen_color === 'red' || s.type === 'cash_out')
          .reduce((sum, s) => sum + (s.total || 0), 0)
      case 'green':
        return validSales
          .filter(s => s.pen_color === 'green' || s.type === 'stock_cash')
          .reduce((sum, s) => sum + (s.total || 0), 0)
      case 'purple':
        return validSales
          .filter(s => s.pen_color === 'purple' || s.type === 'stock_credit')
          .reduce((sum, s) => sum + (s.total || 0), 0)
      case 'yellow':
        return validSales
          .filter(s => s.pen_color === 'yellow' || s.type === 'sale_credit')
          .reduce((sum, s) => sum + (s.debt || s.total || 0), 0)
      default:
        return 0
    }
  }

  const blueTotal = getPenAmount('blue')
  const redTotal = getPenAmount('red')
  const greenTotal = getPenAmount('green')
  const netTotal = blueTotal - redTotal - greenTotal

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none w-full select-none text-xs font-mono">
        {/* ── AU DÉBUT : TOUS ── */}
        <button
          type="button"
          onClick={() => {
            if (onSelectFilter) onSelectFilter('all')
            onSelectPen('blue')
          }}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-black transition-all duration-150 flex-shrink-0 border cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-amber-950 text-amber-100 border-amber-950 shadow-xs scale-102 ring-2 ring-amber-400/80'
              : 'bg-white/90 text-gray-800 border-amber-300/80 hover:bg-amber-100 shadow-2xs'
          }`}
          title="Afficher toutes les écritures"
        >
          <span>📋 TOUS</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
            activeFilter === 'all' ? 'bg-amber-800 text-white' : 'bg-amber-200/80 text-amber-950'
          }`}>
            {validSales.length}
          </span>
        </button>

        {/* ── AU MILIEU : Les 5 Stylos ── */}
        {pens.map((pen) => {
          const isSelected = selectedPen === pen.id

          return (
            <button
              key={pen.id}
              type="button"
              onClick={() => {
                onSelectPen(pen.id)
                if (onSelectFilter) onSelectFilter(pen.id)
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-extrabold transition-all duration-150 flex-shrink-0 border cursor-pointer ${
                isSelected
                  ? 'text-white shadow-xs scale-102 ring-2 ring-amber-400/80 border-white/60'
                  : 'bg-white/90 text-gray-800 border-amber-300/80 hover:bg-amber-50 shadow-2xs'
              }`}
              style={
                isSelected
                  ? { backgroundColor: pen.color, borderColor: pen.color, color: '#ffffff' }
                  : {}
              }
            >
              {/* Pastille de couleur du stylo */}
              <span
                className={`w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs border ${
                  isSelected ? 'border-white/80 ring-1 ring-white/60 bg-white' : 'border-black/20'
                }`}
                style={{ backgroundColor: isSelected ? '#ffffff' : pen.color }}
              >
                {isSelected && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: pen.color }}
                  />
                )}
              </span>
              <span className="text-[11px] sm:text-xs font-extrabold tracking-wide">{pen.name}</span>
            </button>
          )
        })}

        {/* ── À LA FIN : BOUTON CALCUL & SOLDE NET (Ouvre le Cadre de Calcul) ── */}
        <button
          type="button"
          onClick={() => setBreakdownType('total')}
          className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-950 border border-emerald-300 rounded-full font-mono text-xs font-black shadow-xs flex-shrink-0 ml-auto hover:bg-emerald-200 transition-colors cursor-pointer"
          title="Ouvrir le cadre des calculs et du solde net"
        >
          <Calculator className="w-3.5 h-3.5 text-emerald-800" />
          <span>SOLDE :</span>
          <span className="text-emerald-800 font-extrabold">
            {netTotal >= 0 ? `+${formatPrice(netTotal)}` : `-${formatPrice(Math.abs(netTotal))}`}
          </span>
        </button>
      </div>

      {/* Cadre Modal des Calculs et Détails */}
      {breakdownType && (
        <CategoryBreakdownModal
          isOpen={!!breakdownType}
          onClose={() => setBreakdownType(null)}
          categoryType={breakdownType}
          sales={sales as any}
        />
      )}
    </>
  )
}
