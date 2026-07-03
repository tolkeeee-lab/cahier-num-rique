'use client'

import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'

interface Article {
  name: string
  quantity: number
  unit_price: number
}

interface Sale {
  id: string
  date: string
  time: string
  client: string
  articles: Article[]
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt' | 'crossed_out'
  type: string
  pen_color: string
  notes: string
}

interface SalesHistoryProps {
  sales: Sale[]
  onSaleCrossedOut?: (id: string) => void
  onError?: (err: string) => void
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(price) + ' FCFA'
}

export function SalesHistory({ sales, onSaleCrossedOut, onError }: SalesHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (sales.length === 0) return null

  const handleCrossOut = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment rayer cette écriture de votre cahier ?')) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'cross_out' }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (onError) {
          onError(data.error || 'Erreur lors de la suppression')
        } else {
          alert(data.error || 'Erreur')
        }
        return
      }

      if (onSaleCrossedOut) {
        onSaleCrossedOut(id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau'
      if (onError) onError(msg)
    } finally {
      setDeletingId(null)
    }
  }

  // Obtenir la classe de couleur de stylo appropriée
  const getPenClass = (penColor: string, status: string) => {
    if (status === 'crossed_out') {
      return 'line-through opacity-30 decoration-red-600 decoration-2 select-none'
    }
    switch (penColor) {
      case 'red': return 'ink-red'
      case 'green': return 'ink-green'
      case 'purple': return 'ink-purple'
      case 'yellow': return 'ink-yellow'
      case 'blue':
      default:
        return 'ink-blue'
    }
  }

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'cash_in': return 'Vente Cash'
      case 'cash_out': return 'Dépense'
      case 'purchase_cash': return 'Achat Stock Cash'
      case 'purchase_credit': return 'Achat Crédit (Grossiste)'
      case 'sale_credit': return 'Vente Crédit (Client)'
      case 'payment_client': return 'Remboursement reçu d\'un Client'
      case 'payment_supplier': return 'Remboursement versé à un Grossiste'
      default: return 'Transaction'
    }
  }

  return (
    <div className="relative lined-paper rounded-2xl border border-gray-200 shadow-md p-2 pl-24 pr-4 py-6 overflow-hidden min-h-[300px]">
      {/* Red vertical margin line represented in absolute coordinates */}
      <div className="absolute left-[80px] top-0 bottom-0 w-[2px] bg-red-400 bg-opacity-40"></div>

      <div className="lined-text-container space-y-0 text-lg">
        {sales.map((sale) => {
          const isCrossed = sale.status === 'crossed_out'
          const penClass = getPenClass(sale.pen_color, sale.status)
          const typeText = getTransactionTypeText(sale.type)

          return (
            <div 
              key={sale.id} 
              className="lined-item group relative flex items-center justify-between border-b border-transparent hover:bg-gray-50 hover:bg-opacity-50 px-2 rounded-lg transition-all"
              style={{ minHeight: '54px' }}
            >
              {/* Contenu textuel rédigé */}
              <div className="flex-1 pr-4 py-1">
                <div className={`leading-relaxed ${penClass}`}>
                  <span className="text-xs uppercase tracking-wider font-mono mr-2 bg-gray-100 bg-opacity-70 px-1.5 py-0.5 rounded text-gray-500 font-sans border border-gray-200 no-underline select-none">
                    {sale.time} • {typeText}
                  </span>
                  <span className="font-semibold">{sale.client}</span> : {sale.notes}
                  {sale.articles && sale.articles.length > 0 && (
                    <span className="text-sm opacity-85 block ml-14 font-handwritten no-underline">
                      └─ {sale.articles.map(a => `${a.quantity}x ${a.name} (@${a.unit_price} F)`).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Montant financier & bouton d'action */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className={`font-mono text-base font-bold whitespace-nowrap ${isCrossed ? 'line-through opacity-30' : 'text-gray-900'}`}>
                  {sale.type === 'cash_out' || sale.type === 'purchase_cash' || sale.type === 'payment_supplier' ? '-' : '+'}
                  {formatPrice(sale.total)}
                </div>

                {!isCrossed && (
                  <button
                    onClick={() => handleCrossOut(sale.id)}
                    disabled={deletingId === sale.id}
                    title="Rayer cette écriture"
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
