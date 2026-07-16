'use client'

import React, { useState } from 'react'
import { Trash2, PlusCircle, Check, X, Loader } from 'lucide-react'

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
  onAddArticle?: (saleId: string, text: string) => Promise<void>
  onError?: (err: string) => void
  shopId?: string
  isEmployee?: boolean
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(price) + ' F'
}

export function SalesHistory({ sales, onSaleCrossedOut, onAddArticle, shopId, isEmployee }: SalesHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addingToId, setAddingToId] = useState<string | null>(null)
  const [addInput, setAddInput] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  if (sales.length === 0) return null

  const handleCrossOut = async (id: string) => {
    if (isEmployee) return

    if (!window.confirm('Voulez-vous vraiment rayer cette écriture de votre cahier ?')) {
      return
    }

    setDeletingId(id)
    const online = typeof window !== 'undefined' ? window.navigator.onLine : false
    const sId = shopId || 'default-shop'

    try {
      if (online) {
        const response = await fetch('/api/sales', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': sId
          },
          body: JSON.stringify({ id, action: 'cross_out' }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de la suppression')
        }
      } else {
        const offlineSales = JSON.parse(localStorage.getItem(`cahier_offline_sales_${sId}`) || '[]')
        const idx = offlineSales.findIndex((s: any) => s.id === id)
        if (idx > -1) {
          offlineSales[idx].status = 'crossed_out'
          localStorage.setItem(`cahier_offline_sales_${sId}`, JSON.stringify(offlineSales))
        }
      }

      if (onSaleCrossedOut) {
        onSaleCrossedOut(id)
      }
    } catch (err) {
      console.warn("Échec réseau, rature locale appliquée :", err)
      const offlineSales = JSON.parse(localStorage.getItem(`cahier_offline_sales_${sId}`) || '[]')
      const idx = offlineSales.findIndex((s: any) => s.id === id)
      if (idx > -1) {
        offlineSales[idx].status = 'crossed_out'
        localStorage.setItem(`cahier_offline_sales_${sId}`, JSON.stringify(offlineSales))
      }
      if (onSaleCrossedOut) {
        onSaleCrossedOut(id)
      }
    } finally {
      setDeletingId(null)
    }
  }

  const handleStartAdd = (id: string) => {
    setAddingToId(id)
    setAddInput('')
  }

  const handleCancelAdd = () => {
    setAddingToId(null)
    setAddInput('')
  }

  const handleConfirmAdd = async (id: string) => {
    const text = addInput.trim()
    if (!text || !onAddArticle) return
    setSavingId(id)
    try {
      await onAddArticle(id, text)
      setAddingToId(null)
      setAddInput('')
    } catch (err) {
      console.error('Erreur ajout article:', err)
    } finally {
      setSavingId(null)
    }
  }

  // Grouper les écritures par date
  const groupedSales: { [dateStr: string]: Sale[] } = {}
  sales.forEach((sale) => {
    const dateObj = new Date(sale.date)
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    let formattedDate = dateObj.toLocaleDateString('fr-FR', options)
    formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

    if (!groupedSales[formattedDate]) {
      groupedSales[formattedDate] = []
    }
    groupedSales[formattedDate].push(sale)
  })

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
      case 'cash_in': return 'VENTE'
      case 'cash_out': return 'DÉPENSE'
      case 'purchase_cash': return 'STOCK CASH'
      case 'purchase_credit': return 'STOCK CRÉDIT'
      case 'sale_credit': return 'CRÉDIT CLIENT'
      case 'payment_client': return 'PAIEMENT CLIENT'
      case 'payment_supplier': return 'PAIEMENT GROSSISTE'
      default: return 'VENTE'
    }
  }

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'cash_in':
      case 'payment_client':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cash_out':
      case 'payment_supplier':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'purchase_cash':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'purchase_credit':
        return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200'
      case 'sale_credit':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getAmountBadgeStyle = (type: string, isCrossed: boolean) => {
    if (isCrossed) return 'border-gray-200 text-gray-400 opacity-40 bg-gray-50'
    switch (type) {
      case 'cash_in':
      case 'payment_client':
        return 'border-emerald-300 text-emerald-700 bg-emerald-50'
      case 'cash_out':
      case 'payment_supplier':
      case 'purchase_cash':
        return 'border-red-300 text-red-700 bg-red-50'
      case 'purchase_credit':
        return 'border-fuchsia-300 text-fuchsia-700 bg-fuchsia-50'
      case 'sale_credit':
        return 'border-amber-300 text-amber-700 bg-amber-50'
      default:
        return 'border-emerald-300 text-emerald-700 bg-emerald-50'
    }
  }

  // Types de ventes où on peut ajouter des articles
  const canAddArticle = (type: string) => ['cash_in', 'sale_credit'].includes(type)

  return (
    <div className="relative pl-12 md:pl-24 pr-4 py-4 min-h-[300px] w-full">
      {/* Red vertical margin line */}
      <div className="absolute left-[40px] md:left-[80px] top-0 bottom-0 w-[2px] bg-red-400 bg-opacity-40"></div>

      <div className="lined-text-container space-y-0 text-lg">
        {Object.entries(groupedSales).map(([dateStr, salesList]) => (
          <div key={dateStr} className="space-y-0">

            {/* Date badge */}
            <div className="lined-item justify-center my-2" style={{ minHeight: '54px' }}>
              <span className="bg-[#fffbeb] border border-amber-200 text-gray-700 font-handwritten text-sm px-4 py-1 rounded-2xl shadow-sm select-none z-10 no-underline">
                📅 {dateStr}
              </span>
            </div>

            {salesList.map((sale) => {
              const isCrossed = sale.status === 'crossed_out'
              const penClass = getPenClass(sale.pen_color, sale.status)
              const typeText = getTransactionTypeText(sale.type)
              const typeBadge = getTypeBadgeStyle(sale.type)
              const amountBadge = getAmountBadgeStyle(sale.type, isCrossed)
              const isAddingHere = addingToId === sale.id
              const isSavingHere = savingId === sale.id

              return (
                <div
                  key={sale.id}
                  className="lined-item group relative flex flex-col border-b border-transparent hover:bg-gray-50 hover:bg-opacity-40 px-2 rounded-lg transition-all"
                  style={{ minHeight: '80px', paddingBottom: '8px', paddingTop: '8px' }}
                >
                  <div className="flex items-start justify-between w-full">
                    {/* Timestamp */}
                    <div className="absolute left-[-38px] md:left-[-68px] w-8 md:w-14 text-right font-mono text-[10px] text-gray-400 font-bold select-none pr-1.5 md:pr-1 pt-1.5 no-underline">
                      {sale.time}
                    </div>

                    {/* Main text */}
                    <div className="flex-grow pl-2 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold leading-relaxed ${penClass}`}>
                          {sale.notes}
                        </span>
                        <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded-md font-sans tracking-wide ${typeBadge} no-underline`}>
                          {typeText}
                        </span>
                      </div>

                      {/* Articles */}
                      {sale.articles && sale.articles.length > 0 && (
                        <div className="text-xs text-gray-500 font-handwritten mt-1 space-y-0.5 ml-2 no-underline">
                          {sale.articles.map((a, idx) => (
                            <div key={idx} className="flex items-center gap-1 opacity-80">
                              <span>📦</span>
                              <span>{a.quantity}x {a.name} à {a.unit_price} F</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Amount + action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                      <div className={`font-mono text-xs font-bold border rounded-lg px-2.5 py-1 ${amountBadge}`}>
                        {sale.type === 'cash_out' || sale.type === 'purchase_cash' || sale.type === 'payment_supplier' ? '-' : '+'}
                        {formatPrice(sale.total)}
                      </div>

                      {/* + Ajouter article */}
                      {!isCrossed && !isEmployee && canAddArticle(sale.type) && onAddArticle && (
                        <button
                          onClick={() => handleStartAdd(sale.id)}
                          title="Ajouter un article à cette vente"
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Rayer */}
                      {!isCrossed && !isEmployee && (
                        <button
                          onClick={() => handleCrossOut(sale.id)}
                          disabled={deletingId === sale.id}
                          title="Rayer cette écriture"
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Champ d'ajout inline */}
                  {isAddingHere && (
                    <div className="mt-2 ml-2 flex items-center gap-2">
                      <span className="text-emerald-500 text-xs font-bold select-none">+</span>
                      <input
                        autoFocus
                        type="text"
                        value={addInput}
                        onChange={e => setAddInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleConfirmAdd(sale.id)
                          if (e.key === 'Escape') handleCancelAdd()
                        }}
                        placeholder="ex: 1 lb  ou  2 beaufort à 350"
                        className="flex-1 text-xs border border-emerald-300 rounded-lg px-2.5 py-1.5 font-handwritten focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white placeholder:text-gray-300"
                      />
                      <button
                        onClick={() => handleConfirmAdd(sale.id)}
                        disabled={isSavingHere || !addInput.trim()}
                        title="Confirmer l'ajout"
                        className="p-1.5 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {isSavingHere ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={handleCancelAdd}
                        title="Annuler"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                </div>
              )
            })}

          </div>
        ))}
      </div>
    </div>
  )
}
