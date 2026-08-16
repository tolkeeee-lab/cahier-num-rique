'use client'

import React from 'react'
import { X, Calculator, TrendingUp, TrendingDown, ShoppingBag, CreditCard } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface SaleItem {
  id: string
  date: string
  time: string
  client: string
  articles: Array<{
    name: string
    quantity: number
    unit_price: number
  }>
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt' | 'crossed_out'
  type: string
  pen_color: string
  notes: string
}

interface CategoryBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  categoryType: 'all' | 'blue' | 'red' | 'green' | 'purple' | 'yellow' | 'total'
  sales: SaleItem[]
}

export const CategoryBreakdownModal: React.FC<CategoryBreakdownModalProps> = ({
  isOpen,
  onClose,
  categoryType,
  sales = [],
}) => {
  if (!isOpen) return null

  const validSales = sales.filter(s => s.status !== 'crossed_out')

  // Calculs détaillés
  const blueSales = validSales.filter(s => s.pen_color === 'blue' || s.type === 'cash_in' || s.type === 'sale_credit')
  const redSales = validSales.filter(s => s.pen_color === 'red' || s.type === 'cash_out')
  const greenSales = validSales.filter(s => s.pen_color === 'green' || s.type === 'stock_cash')
  const purpleSales = validSales.filter(s => s.pen_color === 'purple' || s.type === 'stock_credit')
  const yellowSales = validSales.filter(s => s.pen_color === 'yellow' || s.type === 'sale_credit')

  const blueTotal = blueSales.reduce((sum, s) => sum + (s.total || 0), 0)
  const redTotal = redSales.reduce((sum, s) => sum + (s.total || 0), 0)
  const greenTotal = greenSales.reduce((sum, s) => sum + (s.total || 0), 0)
  const purpleTotal = purpleSales.reduce((sum, s) => sum + (s.total || 0), 0)
  const yellowDebtTotal = yellowSales.reduce((sum, s) => sum + (s.debt || s.total || 0), 0)

  const netCash = blueTotal - redTotal - greenTotal

  let title = 'Détails & Calculs de la Caisse'
  let icon = <Calculator className="w-5 h-5 text-amber-700" />
  let targetSales: SaleItem[] = validSales
  let totalAmount = netCash

  if (categoryType === 'blue') {
    title = 'Chiffre d\'Affaires (Entrées Cash & Ventes)'
    icon = <TrendingUp className="w-5 h-5 text-blue-600" />
    targetSales = blueSales
    totalAmount = blueTotal
  } else if (categoryType === 'red') {
    title = 'Dépenses & Frais Généraux'
    icon = <TrendingDown className="w-5 h-5 text-rose-600" />
    targetSales = redSales
    totalAmount = redTotal
  } else if (categoryType === 'green') {
    title = 'Achats de Stock (Payés Cash)'
    icon = <ShoppingBag className="w-5 h-5 text-emerald-600" />
    targetSales = greenSales
    totalAmount = greenTotal
  } else if (categoryType === 'purple') {
    title = 'Achats de Stock à Crédit (Fournisseurs)'
    icon = <CreditCard className="w-5 h-5 text-fuchsia-600" />
    targetSales = purpleSales
    totalAmount = purpleTotal
  } else if (categoryType === 'yellow') {
    title = 'Ventes à Crédit (Dettes Clients)'
    icon = <CreditCard className="w-5 h-5 text-amber-600" />
    targetSales = yellowSales
    totalAmount = yellowDebtTotal
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-[#fffdf2] border-2 border-amber-400 rounded-2xl shadow-2xl overflow-hidden font-mono flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-3.5 bg-gradient-to-r from-amber-100 to-amber-200/90 border-b border-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/90 rounded-xl shadow-xs border border-amber-300">
              {icon}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-tight">
                {title}
              </h3>
              <p className="text-[10px] text-amber-800 font-bold">
                {targetSales.length} opération(s) • Total : <span className="font-mono font-black text-amber-950">{categoryType === 'red' && totalAmount > 0 ? `-${formatPrice(totalAmount)}` : formatPrice(totalAmount)}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl bg-white/80 hover:bg-white text-gray-700 hover:text-gray-950 border border-amber-300 cursor-pointer shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formule de Calcul en Page */}
        <div className="p-3 bg-amber-50/80 border-b border-amber-200 space-y-2">
          <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
            📊 Formule de Calcul du Solde Réel :
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
              <div className="text-[10px] text-blue-700 font-black">ENTRÉES / CA (+)</div>
              <div className="text-xs font-black">+{formatPrice(blueTotal)}</div>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-950">
              <div className="text-[10px] text-rose-700 font-black">DÉPENSES (-)</div>
              <div className="text-xs font-black">-{formatPrice(redTotal)}</div>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
              <div className="text-[10px] text-emerald-700 font-black">ACHATS STOCK (-)</div>
              <div className="text-xs font-black">-{formatPrice(greenTotal)}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-100 to-amber-200 border-2 border-amber-400 flex items-center justify-between">
            <span className="text-xs font-black text-amber-950">💰 BÉNÉFICE / SOLDE NET :</span>
            <span className={`text-sm font-black ${netCash >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
              {netCash >= 0 ? `+${formatPrice(netCash)}` : `-${formatPrice(Math.abs(netCash))}`}
            </span>
          </div>
        </div>

        {/* Liste détaillée des transactions */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
          <div className="text-[11px] font-black text-gray-800 uppercase tracking-wider mb-1">
            Détail des lignes :
          </div>

          {targetSales.length === 0 ? (
            <div className="py-6 text-center text-gray-500 italic text-xs">
              Aucune écriture dans cette catégorie pour le moment.
            </div>
          ) : (
            targetSales.map((sale) => (
              <div
                key={sale.id}
                className="p-2 rounded-xl bg-white border border-amber-200/80 shadow-2xs flex items-center justify-between gap-2"
              >
                <div className="flex flex-col min-w-0">
                  <div className="font-bold text-gray-900 truncate">
                    {sale.client || 'Client anonyme'}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {sale.articles && sale.articles.length > 0
                      ? sale.articles.map(a => `${a.quantity}x ${a.name}`).join(', ')
                      : sale.notes || 'Sans détail'}
                  </div>
                </div>

                <div className="flex flex-col items-end flex-shrink-0 font-mono">
                  <span className={`font-black text-xs px-2 py-0.5 rounded-md ${
                    sale.pen_color === 'red'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {sale.pen_color === 'red' ? `-${formatPrice(sale.total)}` : `+${formatPrice(sale.total)}`}
                  </span>
                  <span className="text-[9px] text-gray-400">{sale.time}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-amber-100/80 border-t border-amber-300 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-900 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
