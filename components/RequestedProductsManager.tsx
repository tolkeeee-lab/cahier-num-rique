import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Share2, Check, Search, Send, PenTool, Lightbulb, ClipboardList, Flame, X } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'
import { recordRequestedProductInStorage, RequestedProduct } from '@/lib/requestedProductsUtils'
import { getOfflineSales } from '@/lib/offlineDb'
import { getTodayDateString } from '@/lib/dateUtils'

interface RequestedProductsManagerProps {
  shopId: string
  userRole?: string
  sales?: any[]
}

export function RequestedProductsManager({
  shopId,
  sales
}: RequestedProductsManagerProps) {
  const [items, setItems] = useState<RequestedProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [quickInput, setQuickInput] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('Alimentation')
  const [estimatedPrice, setEstimatedPrice] = useState('')
  const [notes, setNotes] = useState('')

  const storageKey = `cahier_requested_products_${shopId}`

  const loadItems = React.useCallback(() => {
    try {
      let localItems: RequestedProduct[] = []
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) localItems = parsed
        } catch {}
      }

      const salesSource = sales || getOfflineSales(shopId)
      const requestSales = salesSource.filter((s: any) => s.type === 'client_request' && s.status !== 'crossed_out')

      const mergedMap = new Map<string, RequestedProduct>()
      for (const item of localItems) {
        const k = (item?.name || '').toLowerCase().trim()
        if (k) mergedMap.set(k, { ...item })
      }

      const saleCountMap = new Map<string, { count: number; lastSale: any; lastPrice?: number }>()
      for (const s of requestSales) {
        const art = s.articles?.[0]
        const prodName = (art?.name || s.notes || '').replace(/^(demande|client demande|manque|demande client)\s*:?\s*/i, '').trim()
        if (!prodName) continue
        const key = prodName.toLowerCase()
        const current = saleCountMap.get(key) || { count: 0, lastSale: s, lastPrice: art?.unit_price }
        current.count += 1
        current.lastSale = s
        if (art?.unit_price) current.lastPrice = art.unit_price
        saleCountMap.set(key, current)
      }

      for (const [key, { count, lastSale, lastPrice }] of saleCountMap.entries()) {
        const art = lastSale.articles?.[0]
        const prodName = (art?.name || lastSale.notes || '').replace(/^(demande|client demande|manque|demande client)\s*:?\s*/i, '').trim()
        const existing = mergedMap.get(key)
        if (existing) {
          existing.requestCount = Math.max(existing.requestCount, count)
          if (!existing.estimatedPrice && lastPrice) existing.estimatedPrice = lastPrice
        } else {
          mergedMap.set(key, {
            id: lastSale.id || `req_${Date.now()}`,
            name: prodName.charAt(0).toUpperCase() + prodName.slice(1),
            category: lastSale.category || 'Alimentation',
            requestCount: count,
            estimatedPrice: lastPrice || undefined,
            notes: lastSale.notes,
            date: lastSale.date || getTodayDateString(),
            status: 'pending'
          })
        }
      }

      const mergedList = Array.from(mergedMap.values())
      setItems(mergedList)
      localStorage.setItem(storageKey, JSON.stringify(mergedList))
    } catch {}
  }, [storageKey, sales, shopId])

  useEffect(() => {
    loadItems()

    const handleUpdate = () => {
      loadItems()
    }

    window.addEventListener('cahier_sale_created', handleUpdate)
    window.addEventListener('cahier_requested_products_updated', handleUpdate)
    return () => {
      window.removeEventListener('cahier_sale_created', handleUpdate)
      window.removeEventListener('cahier_requested_products_updated', handleUpdate)
    }
  }, [loadItems])

  useEffect(() => {
    if (!showAddModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddModal(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAddModal])

  const saveItems = (updated: RequestedProduct[]) => {
    setItems(updated)
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cahier_requested_products_updated'))
      }
    } catch {}
  }

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  const handleQuickAddHandwritten = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim()) return

    let cleanName = quickInput.trim()
    let price: number | undefined = undefined
    const priceMatch = cleanName.match(/(?:à\s*|:\s*)?(\d+)\s*(?:f|fcfa)?$/i)
    if (priceMatch) {
      price = parseInt(priceMatch[1], 10)
      cleanName = cleanName.replace(priceMatch[0], '').trim()
    }

    const updated = recordRequestedProductInStorage(shopId, cleanName, price)
    setItems(updated)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cahier_requested_products_updated'))
    }
    setFeedbackMsg(`Demande « ${cleanName} » enregistrée`)
    setTimeout(() => setFeedbackMsg(null), 3500)
    setQuickInput('')
  }

  const handleAddRequestedProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const newReq: RequestedProduct = {
      id: `req_${Date.now()}`,
      name: name.trim(),
      category,
      requestCount: 1,
      estimatedPrice: estimatedPrice ? parseInt(estimatedPrice, 10) : undefined,
      notes: notes.trim() || undefined,
      date: getTodayDateString(),
      status: 'pending'
    }

    saveItems([newReq, ...items])
    setName('')
    setEstimatedPrice('')
    setNotes('')
    setShowAddModal(false)
  }

  const handleIncrementCount = (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, requestCount: item.requestCount + 1 }
      }
      return item
    })
    saveItems(updated)
  }

  const handleDeleteItem = (id: string) => {
    if (!confirm('Supprimer cette demande de produit ?')) return
    const updated = items.filter(item => item.id !== id)
    saveItems(updated)
  }

  const handleMarkAsOrdered = (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, status: 'ordered' as const }
      }
      return item
    })
    saveItems(updated)
  }

  const generateWhatsAppOrderLink = () => {
    const pendingItems = items.filter(i => i.status === 'pending')
    if (pendingItems.length === 0) return '#'

    let msg = `*LISTE DE PRODUITS RÉCLAMÉS PAR LES CLIENTS*\n`
    msg += `Point de vente : ${shopId}\n`
    msg += `Date : ${new Date().toLocaleDateString('fr-FR')}\n`
    msg += `─────────────────────\n`
    pendingItems.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.name}* (${item.requestCount} demande${item.requestCount > 1 ? 's' : ''})\n`
      if (item.estimatedPrice) msg += `   Prix estimé : ${formatPrice(item.estimatedPrice)}\n`
    })

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.requestCount - a.requestCount)

  const totalRequestsCount = items.reduce((sum, i) => sum + i.requestCount, 0)

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto space-y-4 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#faf5e8] p-4 border border-[#e2d6be] rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-700 flex-shrink-0" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-stone-900">
              Produits demandés par les clients
            </h2>
          </div>
          <p className="text-xs text-stone-600 mt-0.5">
            Notez les marchandises réclamées par vos clients que vous ne vendez pas encore.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 active:scale-[0.97] text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            <span>Noter une demande</span>
          </button>

          <a
            href={generateWhatsAppOrderLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.97] text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" strokeWidth={1.5} />
            <span>Envoyer WhatsApp (<span className="font-mono tabular-nums">{items.filter(i => i.status === 'pending').length}</span>)</span>
          </a>
        </div>
      </div>

      <div className="bg-[#faf5e8] border border-[#e2d6be] rounded-2xl p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-stone-600" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-stone-900">
              Saisie rapide au cahier des demandes
            </span>
          </div>
          {feedbackMsg ? (
            <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
              {feedbackMsg}
            </span>
          ) : (
            <span className="text-[11px] text-stone-500">
              Écriture libre · Détection automatique du prix
            </span>
          )}
        </div>

        <form onSubmit={handleQuickAddHandwritten} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            placeholder="ex : Eau Possotomè 1.5L à 400 ou 2 sacs de riz 25 kg"
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            className="flex-1 px-3 py-2 text-xs text-stone-900 bg-white border border-stone-200 rounded-xl outline-none focus:border-emerald-700 placeholder-stone-400 min-w-0"
          />
          <button
            type="submit"
            disabled={!quickInput.trim()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer active:scale-[0.97] flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Ajouter</span>
          </button>
        </form>

        <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" strokeWidth={1.5} />
          <span>Astuce : vous pouvez aussi noter une demande depuis Mon Cahier en tapant <code className="font-mono text-stone-700">demande client [produit]</code>.</span>
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-[#faf5e8] border border-[#e2d6be] p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            <span>Articles réclamés</span>
          </div>
          <p className="text-xl font-semibold font-mono text-stone-900 tabular-nums">{items.length}</p>
        </div>

        <div className="bg-[#faf5e8] border border-[#e2d6be] p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span>Total demandes</span>
          </div>
          <p className="text-xl font-semibold font-mono text-stone-900 tabular-nums">{totalRequestsCount}</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#faf5e8] border border-[#e2d6be] p-4 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>À commander</span>
          </div>
          <p className="text-xl font-semibold font-mono text-emerald-800 tabular-nums">{items.filter(i => i.status === 'pending').length}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Rechercher un produit réclamé"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') setSearchTerm('')
          }}
          className="w-full pl-9 pr-9 py-2.5 bg-[#faf5e8] border border-[#e2d6be] rounded-xl text-xs text-stone-900 placeholder-stone-400 outline-none focus:border-emerald-700"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700 rounded-md transition-colors cursor-pointer"
            title="Effacer la recherche"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map(item => {
          const isHighDemand = item.requestCount >= 5
          return (
            <div
              key={item.id}
              className={`bg-[#faf5e8] border rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors ${
                isHighDemand ? 'border-rose-300' : 'border-[#e2d6be] hover:bg-white'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm text-stone-900 leading-snug">{item.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex-shrink-0 whitespace-nowrap flex items-center gap-1 border ${
                      isHighDemand
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <Flame className={`w-3 h-3 ${isHighDemand ? 'text-rose-600' : 'text-amber-600'}`} strokeWidth={1.5} />
                    <span className="font-mono tabular-nums">{item.requestCount}</span>
                    <span>demande{item.requestCount > 1 ? 's' : ''}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <span className="bg-white border border-stone-200 px-2 py-0.5 rounded-md font-medium text-stone-700">{item.category}</span>
                  {item.estimatedPrice && (
                    <span className="text-emerald-800 font-mono font-semibold tabular-nums">{formatPrice(item.estimatedPrice)}</span>
                  )}
                </div>

                {item.notes && (
                  <p className="text-xs text-stone-600 bg-white p-2.5 border border-stone-200 rounded-lg leading-relaxed">
                    {item.notes}
                  </p>
                )}
              </div>

              <div className="pt-2.5 border-t border-[#e2d6be]/70 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleIncrementCount(item.id)}
                  className="px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer active:scale-[0.97]"
                  title="Ajouter 1 demande client supplémentaire"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>+1 demande</span>
                </button>

                <div className="flex items-center gap-1">
                  {item.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => handleMarkAsOrdered(item.id)}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer active:scale-[0.97]"
                      title="Marquer comme commandé au fournisseur"
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Commander</span>
                    </button>
                  ) : (
                    <span className="px-2 py-1 bg-stone-100 text-stone-500 rounded-md text-[11px] font-medium">
                      Commandé
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors active:scale-[0.97] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-14 text-center space-y-2 bg-[#faf5e8] rounded-2xl border border-[#e2d6be]">
            <ClipboardList className="w-8 h-8 text-stone-400 mx-auto" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-stone-900">Aucune demande enregistrée</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Quand des clients demandent un produit non disponible en rayon, notez-le ici pour votre prochain réapprovisionnement.
            </p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false)
          }}
        >
          <div className="bg-[#faf5e8] border border-[#e2d6be] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-semibold text-sm text-stone-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-700" strokeWidth={1.5} />
                <span>Noter un produit réclamé</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 transition-colors cursor-pointer rounded-lg"
                title="Fermer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleAddRequestedProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Nom du produit réclamé *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex : Eau Possotomè 1.5L, Biscuit Oreos"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 outline-none focus:border-emerald-700"
                  >
                    <option value="Alimentation">Alimentation</option>
                    <option value="Boissons">Boissons</option>
                    <option value="Hygiène">Hygiène</option>
                    <option value="Détail">Détail</option>
                    <option value="Divers">Divers</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Prix estimé (FCFA)
                  </label>
                  <input
                    type="number"
                    placeholder="ex : 500"
                    value={estimatedPrice}
                    onChange={e => setEstimatedPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 font-mono tabular-nums outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Notes / remarques
                </label>
                <textarea
                  rows={2}
                  placeholder="ex : 3 clients en ont demandé ce matin"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-800 outline-none focus:border-emerald-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl font-medium active:scale-[0.97] transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-medium active:scale-[0.97] transition-colors cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
