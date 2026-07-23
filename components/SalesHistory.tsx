'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Trash2, PlusCircle, Check, X, Loader, FileText, Printer, Share2, Edit3, RefreshCw, Minus, Plus, MoreVertical } from 'lucide-react'

interface MenuItem {
  id: string
  name: string
  price: number
  emoji: string
  category?: string
}


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
  category?: string
}

interface SalesHistoryProps {
  sales: Sale[]
  onSaleCrossedOut?: (id: string) => void
  onAddArticle?: (saleId: string, text: string) => Promise<void>
  onUpdateSale?: (saleId: string, updatedArticles: Article[], clientName?: string) => Promise<void>
  onUpdateCategory?: (saleId: string, category: string) => Promise<void>
  onError?: (err: string) => void
  shopId?: string
  isEmployee?: boolean
  showExpenseStats?: boolean
  // Contrôle externe (depuis page.tsx) pour connecter le menu du bas
  externalAddingToId?: string | null
  externalAddInput?: string
  onExternalAddInputChange?: (val: string) => void
  onExternalStartAdd?: (saleId: string) => void
  onExternalCancelAdd?: () => void
  onExternalConfirmAdd?: (saleId: string) => Promise<void>
}

export const CATEGORY_INFOS: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  'Loyer': { label: 'Loyer & Boutique', emoji: '🏠', color: 'text-orange-700 border-orange-200 bg-orange-50', bg: 'bg-orange-500' },
  'Factures': { label: 'Factures (Élec, CIE, Net...)', emoji: '⚡', color: 'text-blue-700 border-blue-200 bg-blue-50', bg: 'bg-blue-500' },
  'Transport': { label: 'Transport & Livraisons', emoji: '🚗', color: 'text-indigo-700 border-indigo-200 bg-indigo-50', bg: 'bg-indigo-500' },
  'Salaires': { label: 'Salaires & Personnel', emoji: '👥', color: 'text-teal-700 border-teal-200 bg-teal-50', bg: 'bg-teal-500' },
  'Fournitures': { label: 'Fournitures & Lots', emoji: '📦', color: 'text-purple-700 border-purple-200 bg-purple-50', bg: 'bg-purple-500' },
  'Repas': { label: 'Repas & Alimentation', emoji: '🍔', color: 'text-amber-700 border-amber-200 bg-amber-50', bg: 'bg-amber-500' },
  'Divers': { label: 'Divers & Autres', emoji: '🏷️', color: 'text-gray-700 border-gray-200 bg-gray-50', bg: 'bg-gray-500' }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(price) + ' F'
}

export function SalesHistory({ sales, onSaleCrossedOut, onAddArticle, onUpdateSale, onUpdateCategory, showExpenseStats, shopId, isEmployee,
  externalAddingToId, externalAddInput, onExternalAddInputChange, onExternalStartAdd, onExternalCancelAdd, onExternalConfirmAdd
}: SalesHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [internalAddingToId, setInternalAddingToId] = useState<string | null>(null)
  const [internalAddInput, setInternalAddInput] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [editingCategorySaleId, setEditingCategorySaleId] = useState<string | null>(null)
  const [activeMobileActionsSaleId, setActiveMobileActionsSaleId] = useState<string | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const addInputRef = useRef<HTMLInputElement>(null)

  // Valeurs effectives : externes si fournies, sinon internes
  const addingToId = externalAddingToId !== undefined ? externalAddingToId : internalAddingToId
  const addInput = externalAddInput !== undefined ? externalAddInput : internalAddInput
  const setAddInput = onExternalAddInputChange ?? setInternalAddInput

  // Charger les produits du stock (localStorage + Supabase)
  const loadMenuItems = useCallback(async () => {
    const sId = shopId || 'default-shop'
    // 1. D'abord depuis le cache local
    try {
      const cached = localStorage.getItem(`cahier_menu_items_${sId}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) setMenuItems(parsed)
      }
    } catch {}

    // 2. Puis depuis l'API (si en ligne)
    try {
      const res = await fetch('/api/stock', { headers: { 'x-shop-id': sId } })
      if (res.ok) {
        const data = await res.json()
        const products: MenuItem[] = (data.products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.unit_price || 0,
          emoji: p.emoji || '📦',
          category: p.category,
        }))
        if (products.length > 0) {
          setMenuItems(products)
          localStorage.setItem(`cahier_menu_items_${sId}`, JSON.stringify(products))
        }
      }
    } catch {}
  }, [shopId])

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
    setInternalAddingToId(id)
    setAddInput('')
    if (onExternalStartAdd) onExternalStartAdd(id)
    loadMenuItems()
    setTimeout(() => addInputRef.current?.focus(), 50)
  }

  const handleCancelAdd = () => {
    setInternalAddingToId(null)
    setAddInput('')
    if (onExternalCancelAdd) onExternalCancelAdd()
  }

  const handleConfirmAdd = async (id: string) => {
    const text = addInput.trim()
    if (!text || !onAddArticle) return
    setSavingId(id)
    try {
      if (onExternalConfirmAdd) {
        await onExternalConfirmAdd(id)
      } else {
        await onAddArticle(id, text)
      }
      setInternalAddingToId(null)
      setAddInput('')
      if (onExternalCancelAdd) onExternalCancelAdd()
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

  // Calculs pour les statistiques de dépenses
  const expenseSales = sales.filter(s => s.type === 'cash_out' && s.status !== 'crossed_out')
  const totalExpenseAmount = expenseSales.reduce((acc, curr) => acc + curr.total, 0)
  
  const expenseCategories: Record<string, number> = {}
  expenseSales.forEach(s => {
    const cat = s.category || 'Divers'
    expenseCategories[cat] = (expenseCategories[cat] || 0) + s.total
  })
  
  const sortedCategories = Object.entries(expenseCategories)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpenseAmount > 0 ? Math.round((amount / totalExpenseAmount) * 100) : 0,
      info: CATEGORY_INFOS[name] || CATEGORY_INFOS['Divers']
    }))
    .sort((a, b) => b.amount - a.amount)

  return (
    <div className="relative pl-6 sm:pl-12 md:pl-24 pr-4 py-4 min-h-[300px] w-full">
      {/* Red vertical margin line */}
      <div className="absolute left-[24px] sm:left-[40px] md:left-[80px] top-0 bottom-0 w-[2px] bg-red-400 bg-opacity-40"></div>

      {showExpenseStats && totalExpenseAmount > 0 && (
        <div className="mb-6 mr-4 bg-[#fffdf9] border border-gray-200 rounded-[28px] p-6 shadow-sm z-10 relative select-none">
          <h4 className="font-handwritten text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            📊 Répartition des Dépenses ({formatPrice(totalExpenseAmount)})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedCategories.map((c, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] md:text-xs">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <span>{c.info.emoji}</span>
                    <span>{c.info.label}</span>
                  </span>
                  <span className="font-mono font-bold text-gray-600">
                    {formatPrice(c.amount)} ({c.percentage}%)
                  </span>
                </div>
                {/* Horizontal progress bar */}
                <div className="h-2.5 w-full bg-gray-150 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${c.info.bg}`}
                    style={{ width: `${c.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  className="lined-item group relative flex flex-col border-b border-transparent hover:bg-gray-50 hover:bg-opacity-40 px-1 md:px-2 rounded-lg transition-all"
                  style={{ minHeight: '44px', paddingBottom: '4px', paddingTop: '4px' }}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    {/* Timestamp */}
                    <div className="absolute left-[-22px] sm:left-[-38px] md:left-[-68px] w-5 sm:w-8 md:w-14 text-right font-mono text-[9px] md:text-[10px] text-gray-400 font-bold select-none pr-0.5 md:pr-1 pt-0.5 no-underline">
                      {sale.time}
                    </div>

                    {/* Main text */}
                    <div className="flex-grow pl-1 md:pl-2 pr-1 min-w-0">
                      <div className="flex items-start md:items-center gap-1.5 flex-col md:flex-row md:flex-wrap w-full">
                        {sale.articles && sale.articles.length > 0 ? (
                          <>
                            {/* Mobile vertical list */}
                            <div className="flex flex-col gap-0.5 md:hidden">
                              {sale.articles.map((art, idx) => (
                                <span key={idx} className={`font-semibold leading-tight text-[11px] sm:text-xs block ${penClass}`}>
                                  • {art.quantity} × {art.name} {art.unit_price > 0 ? `à ${formatPrice(art.unit_price)}` : ''}
                                </span>
                              ))}
                            </div>
                            {/* Desktop inline notes */}
                            <span className={`hidden md:inline font-semibold leading-tight text-base md:text-lg ${penClass}`}>
                              {sale.notes}
                            </span>
                          </>
                        ) : (
                          <span className={`font-semibold leading-tight text-xs sm:text-sm md:text-lg ${penClass}`}>
                            {sale.notes}
                          </span>
                        )}

                        <span className={`text-[7.5px] md:text-[8px] font-bold border px-1 py-0.2 rounded-md font-sans tracking-wide ${typeBadge} no-underline flex-shrink-0`}>
                          {typeText}
                        </span>

                        {/* Catégorie de dépense cliquable */}
                        {sale.type === 'cash_out' && !isCrossed && (
                          <div className="relative inline-block select-none z-20">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isEmployee) return
                                setEditingCategorySaleId(editingCategorySaleId === sale.id ? null : sale.id)
                              }}
                              className={`text-[8px] font-bold border px-1.5 py-0.5 rounded-md font-sans tracking-wide flex items-center gap-1 transition-all ${
                                CATEGORY_INFOS[sale.category || 'Divers']?.color || CATEGORY_INFOS['Divers'].color
                              } ${!isEmployee ? 'hover:scale-105 active:scale-95 cursor-pointer' : ''}`}
                              title={!isEmployee ? "Changer la catégorie" : undefined}
                            >
                              <span>{CATEGORY_INFOS[sale.category || 'Divers']?.emoji || '🏷️'}</span>
                              <span>{sale.category || 'Divers'}</span>
                            </button>
                            
                            {editingCategorySaleId === sale.id && onUpdateCategory && (
                              <div className="absolute left-0 mt-1 bg-[#fdfaf2] border border-gray-300 rounded-2xl shadow-xl p-1.5 z-30 min-w-[150px] space-y-0.5">
                                {Object.keys(CATEGORY_INFOS).map((catName) => {
                                  const info = CATEGORY_INFOS[catName]
                                  const isSelected = sale.category === catName
                                  return (
                                    <button
                                      key={catName}
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        setEditingCategorySaleId(null)
                                        if (onUpdateCategory) {
                                          await onUpdateCategory(sale.id, catName)
                                        }
                                      }}
                                      className={`w-full text-left text-[9px] px-2.5 py-1.5 rounded-xl font-sans font-semibold flex items-center gap-1.5 transition-colors ${
                                        isSelected ? 'bg-gray-200 text-gray-900 border border-gray-300' : 'hover:bg-gray-100 text-gray-600 border border-transparent'
                                      }`}
                                    >
                                      <span>{info.emoji}</span>
                                      <span>{info.label}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount + action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5 relative z-20">
                      <div className={`font-mono text-xs font-bold border rounded-lg px-2.5 py-1 ${amountBadge}`}>
                        {sale.type === 'cash_out' || sale.type === 'purchase_cash' || sale.type === 'payment_supplier' ? '-' : '+'}
                        {formatPrice(sale.total)}
                      </div>

                      {/* Desktop actions list (always visible or on hover) */}
                      <div className="hidden md:flex items-center gap-1">
                        {/* Émettre un reçu */}
                        {!isCrossed && canAddArticle(sale.type) && (
                          <button
                            onClick={() => setActiveReceiptSale(sale)}
                            title="Émettre un reçu"
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* + Ajouter article */}
                        {!isCrossed && !isEmployee && canAddArticle(sale.type) && onAddArticle && (
                          <button
                            onClick={() => handleStartAdd(sale.id)}
                            title="Ajouter rapidement un article"
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* ✏️ Modifier l'ensemble des articles (remplacer, quantités...) */}
                        {!isCrossed && !isEmployee && canAddArticle(sale.type) && onUpdateSale && (
                          <button
                            onClick={() => {
                              loadMenuItems()
                              setEditingSale(sale)
                            }}
                            title="Modifier les articles (remplacer, quantités...)"
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Rayer (Accessible à tous, y compris les employés) */}
                        {!isCrossed && (
                          <button
                            onClick={() => handleCrossOut(sale.id)}
                            disabled={deletingId === sale.id}
                            title="Rayer cette écriture (Annulation)"
                            className="opacity-100 p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Mobile Actions Menu (Trigger Button + Dropdown Popover) */}
                      {!isCrossed && (
                        <div className="flex md:hidden relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveMobileActionsSaleId(activeMobileActionsSaleId === sale.id ? null : sale.id)
                            }}
                            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMobileActionsSaleId === sale.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 shadow-2xl rounded-2xl p-1.5 z-40 min-w-[160px] flex flex-col gap-0.5 animate-scale-in">
                              {/* Option: Émettre un reçu */}
                              {canAddArticle(sale.type) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveReceiptSale(sale)
                                    setActiveMobileActionsSaleId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl flex items-center gap-2 transition-colors"
                                >
                                  <FileText className="w-4 h-4 text-blue-500" />
                                  <span>Émettre un reçu</span>
                                </button>
                              )}

                              {/* Option: + Ajouter article */}
                              {!isEmployee && canAddArticle(sale.type) && onAddArticle && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleStartAdd(sale.id)
                                    setActiveMobileActionsSaleId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl flex items-center gap-2 transition-colors"
                                >
                                  <PlusCircle className="w-4 h-4 text-emerald-500" />
                                  <span>Ajouter un article</span>
                                </button>
                              )}

                              {/* Option: Modifier articles */}
                              {!isEmployee && canAddArticle(sale.type) && onUpdateSale && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    loadMenuItems()
                                    setEditingSale(sale)
                                    setActiveMobileActionsSaleId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl flex items-center gap-2 transition-colors"
                                >
                                  <Edit3 className="w-4 h-4 text-amber-500" />
                                  <span>Modifier la vente</span>
                                </button>
                              )}

                              {/* Option: Rayer */}
                              <button
                                type="button"
                                onClick={() => {
                                  handleCrossOut(sale.id)
                                  setActiveMobileActionsSaleId(null)
                                }}
                                disabled={deletingId === sale.id}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 hover:text-red-800 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                                <span>Rayer l'écriture</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rayer pour mobile si déjà raturé */}
                      {isCrossed && (
                        <div className="md:hidden w-7"></div>
                      )}
                    </div>
                  </div>

                  {/* Champ d'ajout inline — saisie libre + suggestions en dessous si on tape */}
                  {isAddingHere && (() => {
                    const query = addInput.trim().toLowerCase()
                    const suggestions = query.length >= 1
                      ? menuItems.filter(m => m.name.toLowerCase().includes(query)).slice(0, 6)
                      : []

                    return (
                      <div className="mt-2 ml-2 space-y-1">
                        {/* Input principal */}
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 text-xs font-bold select-none">+</span>
                          <input
                            ref={addInputRef}
                            type="text"
                            value={addInput}
                            onChange={e => setAddInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleConfirmAdd(sale.id)
                              if (e.key === 'Escape') handleCancelAdd()
                            }}
                            placeholder="Taper un produit ou une quantité..."
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

                        {/* Suggestions — apparaissent seulement si on tape */}
                        {suggestions.length > 0 && (
                          <div className="ml-4 flex flex-wrap gap-1.5 py-1">
                            {suggestions.map(item => (
                              <button
                                key={item.id}
                                type="button"
                                onMouseDown={e => e.preventDefault()} // éviter blur sur l'input
                                onClick={() => {
                                  setAddInput(`1 ${item.name} à ${item.price}`)
                                  addInputRef.current?.focus()
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 rounded-xl text-[11px] font-semibold text-gray-800 transition-all active:scale-95 shadow-sm"
                              >
                                <span>{item.emoji}</span>
                                <span>{item.name}</span>
                                <span className="font-mono text-emerald-700 text-[9px]">
                                  {new Intl.NumberFormat('fr-FR').format(item.price)} F
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                </div>
              )
            })}

          </div>
        ))}
      </div>

      {activeReceiptSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print select-none">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl flex flex-col max-h-[90vh] border border-gray-200">
            {/* Titre et fermeture */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-150 flex-shrink-0">
              <span className="font-handwritten text-lg font-bold text-gray-800">Aperçu du Reçu</span>
              <button
                onClick={() => setActiveReceiptSale(null)}
                className="p-1 hover:bg-gray-150 rounded-full text-gray-400 hover:text-gray-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Zone du ticket de caisse à imprimer */}
            <div className="flex-1 overflow-y-auto py-6" id="receipt-print-area">
              <div className="flex flex-col items-center text-center font-mono text-xs text-gray-800 w-full max-w-[80mm] mx-auto p-4 bg-[#fffdf9] border border-gray-100 shadow-sm rounded-lg">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-1">Cahier de Caisse Intelligent</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Compagnon de Cuisine</p>
                
                <div className="w-full border-b border-dashed border-gray-300 my-3"></div>

                <div className="w-full text-left space-y-1 text-[10px] text-gray-600">
                  <div className="flex justify-between">
                    <span>Date : {activeReceiptSale.date}</span>
                    <span>Heure : {activeReceiptSale.time}</span>
                  </div>
                  <div>Client : <span className="font-bold text-gray-800">{activeReceiptSale.client}</span></div>
                  <div>ID Vente : <span className="text-[8px]">{activeReceiptSale.id.slice(0, 8)}...</span></div>
                </div>

                <div className="w-full border-b border-dashed border-gray-300 my-3"></div>

                {/* Liste des articles */}
                <div className="w-full space-y-2">
                  {activeReceiptSale.articles && activeReceiptSale.articles.length > 0 ? (
                    activeReceiptSale.articles.map((art, idx) => (
                      <div key={idx} className="flex justify-between items-start text-left text-[11px]">
                        <div className="pr-2">
                          <div className="font-bold">{art.name}</div>
                          <div className="text-[9px] text-gray-500">{art.quantity} x {formatPrice(art.unit_price)}</div>
                        </div>
                        <span className="font-bold whitespace-nowrap">{formatPrice(art.quantity * art.unit_price)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between text-left text-[11px]">
                      <div className="pr-2">
                        <div className="font-bold">Transaction Générale</div>
                        <div className="text-[9px] text-gray-500">1 x {formatPrice(activeReceiptSale.total)}</div>
                      </div>
                      <span className="font-bold whitespace-nowrap">{formatPrice(activeReceiptSale.total)}</span>
                    </div>
                  )}
                </div>

                <div className="w-full border-b border-dashed border-gray-300 my-3"></div>

                {/* Récapitulatif financier */}
                <div className="w-full space-y-1.5 text-[11px]">
                  <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL FACTURÉ</span>
                    <span>{formatPrice(activeReceiptSale.total)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>MONTANT PAYÉ</span>
                    <span>{formatPrice(activeReceiptSale.paid)}</span>
                  </div>
                  {activeReceiptSale.debt > 0 && (
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>RESTE À PAYER (DETTE)</span>
                      <span>{formatPrice(activeReceiptSale.debt)}</span>
                    </div>
                  )}
                </div>

                <div className="w-full border-b border-dashed border-gray-300 my-3"></div>

                <p className="text-[10px] text-gray-500 italic mt-1 leading-relaxed">
                  Merci pour votre confiance et à bientôt !
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-150 flex-shrink-0">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer
              </button>
              <button
                onClick={() => {
                  const itemsText = activeReceiptSale.articles && activeReceiptSale.articles.length > 0
                    ? activeReceiptSale.articles.map(a => `• ${a.quantity}x ${a.name} ➔ ${formatPrice(a.quantity * a.unit_price)}`).join('\n')
                    : `• Transaction Générale ➔ ${formatPrice(activeReceiptSale.total)}`
                  const whatsappText = `🧾 *TICKET DE CAISSE ÉLECTRONIQUE*\n═════════════════════════\n👤 *Client* : ${activeReceiptSale.client}\n📅 *Date*   : ${activeReceiptSale.date} à ${activeReceiptSale.time}\n🆔 *Réf*    : #${activeReceiptSale.id.slice(0, 8)}\n═════════════════════════\n🛍️ *DÉTAILS DES ARTICLES* :\n${itemsText}\n\n═════════════════════════\n💰 *TOTAL FACTURÉ* : ${formatPrice(activeReceiptSale.total)}\n✅ *MONTANT PAYÉ*  : ${formatPrice(activeReceiptSale.paid)}\n${activeReceiptSale.debt > 0 ? `⚠️ *RESTE À PAYER*  : ${formatPrice(activeReceiptSale.debt)}\n` : ''}═════════════════════════\n\n✨ *Merci pour votre confiance !*\n_Cahier de Caisse Intelligent_`
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`, '_blank')
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition de la vente */}
      {editingSale && onUpdateSale && (
        <EditSaleModal
          sale={editingSale}
          menuItems={menuItems}
          onClose={() => setEditingSale(null)}
          onSave={onUpdateSale}
        />
      )}
    </div>
  )
}

interface EditSaleModalProps {
  sale: Sale
  menuItems: MenuItem[]
  onClose: () => void
  onSave: (saleId: string, articles: Article[], clientName?: string) => Promise<void>
}

function EditSaleModal({ sale, menuItems, onClose, onSave }: EditSaleModalProps) {
  const [articles, setArticles] = useState<Article[]>(
    sale.articles && sale.articles.length > 0
      ? sale.articles.map(a => ({ name: a.name, quantity: a.quantity || 1, unit_price: a.unit_price || 0 }))
      : [{ name: sale.notes || 'Article', quantity: 1, unit_price: sale.total }]
  )
  const [clientName, setClientName] = useState<string>(sale.client || '')
  const [saving, setSaving] = useState<boolean>(false)
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')

  const handleUpdateArticle = (idx: number, field: keyof Article, val: any) => {
    setArticles(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }

  const handleRemoveArticle = (idx: number) => {
    if (articles.length <= 1) {
      alert("La vente doit contenir au moins un article.")
      return
    }
    setArticles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleAddBlankArticle = () => {
    setArticles(prev => [...prev, { name: '', quantity: 1, unit_price: 0 }])
  }

  const handleSelectProductSuggestion = (idx: number, item: MenuItem) => {
    setArticles(prev => {
      const next = [...prev]
      next[idx] = {
        name: item.name,
        quantity: next[idx].quantity || 1,
        unit_price: item.price || next[idx].unit_price || 0
      }
      return next
    })
    setActiveSearchIdx(null)
    setSearchTerm('')
  }

  const totalCalculated = articles.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0)

  const handleConfirmSave = async () => {
    const validArticles = articles.filter(a => a.name.trim().length > 0)
    if (validArticles.length === 0) {
      alert("Veuillez renseigner au moins un nom d'article.")
      return
    }
    setSaving(true)
    try {
      await onSave(sale.id, validArticles, clientName)
      onClose()
    } catch (e: any) {
      alert(e.message || "Erreur lors de la sauvegarde.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 select-none">
      <div className="bg-[#fefdfa] border-2 border-amber-400 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm md:text-base font-sans">
            <Edit3 className="w-4 h-4 text-amber-600" />
            <span>Éditer la Vente du {sale.time}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold transition-all"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 md:p-5 overflow-y-auto space-y-4 flex-1">
          {sale.type === 'sale_credit' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nom du client :</label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Ex: Koffi, Chantal..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-amber-500 focus:outline-none bg-white font-medium"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider font-sans">
                Articles de la vente ({articles.length})
              </span>
              <span className="text-[10px] text-gray-500">Remplacer un produit, ajuster les quantités</span>
            </div>

            <div className="space-y-3">
              {articles.map((art, idx) => (
                <div key={idx} className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3 space-y-2 relative">
                  
                  {/* Ligne 1 : Nom du produit + Autocomplétion / Remplacer */}
                  <div className="relative">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={art.name}
                        onChange={e => {
                          handleUpdateArticle(idx, 'name', e.target.value)
                          setActiveSearchIdx(idx)
                          setSearchTerm(e.target.value)
                        }}
                        onFocus={() => {
                          setActiveSearchIdx(idx)
                          setSearchTerm(art.name)
                        }}
                        placeholder="Nom de l'article (ex: Flag, Beaufort...)"
                        className="flex-1 px-3 py-1.5 text-sm font-handwritten font-bold text-blue-900 border border-amber-300 rounded-xl bg-white focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateArticle(idx, 'name', '')
                          setActiveSearchIdx(idx)
                          setSearchTerm('')
                        }}
                        title="Remplacer ce produit"
                        className="px-2 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all flex-shrink-0"
                      >
                        <RefreshCw className="w-3 h-3 text-amber-800" />
                        <span>Changer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveArticle(idx)}
                        title="Supprimer cet article"
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-xl transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Bulle d'autocomplétion prédictive pour remplacer */}
                    {activeSearchIdx === idx && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#fefdfa] border-2 border-amber-400 rounded-2xl shadow-xl p-2 max-h-40 overflow-y-auto space-y-1">
                        <div className="text-[9px] font-bold text-amber-900 px-1 pb-1 border-b border-amber-200">
                          Sélectionnez un produit du stock à remplacer :
                        </div>
                        {menuItems
                          .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase().trim()))
                          .slice(0, 8)
                          .map((m, mIdx) => (
                            <button
                              key={mIdx}
                              type="button"
                              onClick={() => handleSelectProductSuggestion(idx, m)}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-amber-100 rounded-xl text-xs font-bold flex items-center justify-between text-amber-950 transition-colors"
                            >
                              <span className="flex items-center gap-1.5">
                                <span>{m.emoji || '📦'}</span>
                                <span className="font-handwritten text-blue-900">{m.name}</span>
                              </span>
                              <span className="font-mono text-[10px] bg-amber-200 px-1.5 py-0.5 rounded font-extrabold">
                                {formatPrice(m.price)}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Ligne 2 : Quantité (- / +) & Prix Unitaire & Sous-total */}
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    {/* Selecteur de Quantite */}
                    <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateArticle(idx, 'quantity', Math.max(1, art.quantity - 1))}
                        className="w-6 h-6 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold flex items-center justify-center text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={art.quantity}
                        onChange={e => handleUpdateArticle(idx, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-10 text-center text-xs font-mono font-extrabold focus:outline-none bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateArticle(idx, 'quantity', art.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold flex items-center justify-center text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Prix unitaire */}
                    <div className="flex items-center gap-1 text-xs font-mono">
                      <span className="text-gray-500 text-[10px]">à</span>
                      <input
                        type="number"
                        min="0"
                        value={art.unit_price}
                        onChange={e => handleUpdateArticle(idx, 'unit_price', Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-16 px-2 py-1 border border-amber-300 rounded-lg text-xs font-mono font-bold bg-white text-right focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-gray-600 font-bold">F</span>
                    </div>

                    {/* Sous-total de la ligne */}
                    <div className="font-mono text-xs font-extrabold text-amber-900 bg-amber-200/80 px-2 py-1 rounded-lg">
                      {formatPrice(art.quantity * art.unit_price)}
                    </div>
                  </div>

                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddBlankArticle}
              className="mt-3 w-full py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-amber-700" />
              <span>+ Ajouter un autre produit à la vente</span>
            </button>
          </div>

        </div>

        {/* Footer avec Récapitulatif Total & Bouton Valider */}
        <div className="bg-amber-100/50 border-t border-amber-200 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nouveau Total</div>
            <div className="text-lg md:text-xl font-mono font-black text-emerald-800">
              {formatPrice(totalCalculated)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={saving}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Enregistrer</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
