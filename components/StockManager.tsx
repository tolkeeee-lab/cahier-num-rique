'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Package, Plus, AlertTriangle, TrendingUp, TrendingDown,
  X, Search, RefreshCw, Edit3, Trash2, ChevronDown, ChevronUp, WifiOff,
} from 'lucide-react'
import {
  getOfflineProducts, replaceOfflineProducts, saveOfflineProduct,
  deleteOfflineProduct, computeOfflineStock, generateOfflineId,
  type OfflineProduct,
} from '@/lib/offlineDb'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Movement {
  date: string
  type: 'in' | 'out'
  quantity: number
  unit_price: number
  notes: string
  sale_type?: string
}

interface StockItem extends OfflineProduct {
  total_in: number
  total_out: number
  current_stock: number
  movements: Movement[]
  is_orphan?: boolean
}

interface StockManagerProps {
  shopId?: string
  onError?: (err: string) => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIES = ['Général', 'Alimentation', 'Boissons', 'Hygiène', 'Électronique', 'Textile', 'Autre']
const UNITS = ['unité', 'pièce', 'kg', 'g', 'litre', 'cl', 'carton', 'sac', 'colis', 'boîte', 'bouteille']

const EMPTY_FORM = {
  name: '',
  category: 'Général',
  unit: 'unité',
  alert_threshold: 5,
  initial_stock: 0,
  unit_cost: 0,
  unit_price: 0,
  multiplier: 1,
  packaging_name: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR').format(price) + ' F'
}

function getStockStatus(item: StockItem): 'ok' | 'low' | 'out' {
  if (item.current_stock <= 0) return 'out'
  if (item.current_stock <= item.alert_threshold) return 'low'
  return 'ok'
}

function getStatusColors(status: 'ok' | 'low' | 'out') {
  switch (status) {
    case 'ok':  return { dot: 'bg-emerald-500', bar: 'bg-emerald-400', text: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50' }
    case 'low': return { dot: 'bg-amber-500',   bar: 'bg-amber-400',   text: 'text-amber-700',   border: 'border-amber-200',   bg: 'bg-amber-50'   }
    case 'out': return { dot: 'bg-red-500',      bar: 'bg-red-400',     text: 'text-red-700',     border: 'border-red-200',     bg: 'bg-red-50'     }
  }
}

function getBarWidth(item: StockItem): number {
  if (item.current_stock <= 0) return 0
  const max = Math.max(item.initial_stock + item.total_in, item.alert_threshold * 3, item.current_stock * 2, 1)
  return Math.min(100, (item.current_stock / max) * 100)
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function StockManager({ shopId = 'default-shop', onError }: StockManagerProps) {
  const [items, setItems] = useState<StockItem[]>([])
  const [orphans, setOrphans] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('TOUT')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showOrphans, setShowOrphans] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deductPastSales, setDeductPastSales] = useState(false)
  const [orphanPastSales, setOrphanPastSales] = useState(0)

  // ── Chargement ──────────────────────────────────────────────────────────────

  const buildFromOffline = useCallback(() => {
    const offlineProducts = getOfflineProducts(shopId)
    const stockMap = computeOfflineStock(shopId)
    const catalogNames = new Set(offlineProducts.map(p => p.name.toLowerCase().trim()))

    const stockItems: StockItem[] = offlineProducts.map(p => {
      const key = p.name.toLowerCase().trim()
      const data = stockMap[key] || { total_in: 0, total_out: 0, movements: [] }
      
      // Filtrer les mouvements pour n'inclure que ceux après ou égal à la date de création du produit (moins 1 minute de marge)
      const prodTime = p.created_at ? new Date(p.created_at).getTime() - 60000 : 0
      const filteredMovements = data.movements.filter((m: any) => {
        const mTime = m.created_at ? new Date(m.created_at).getTime() : new Date(m.date).getTime()
        return mTime >= prodTime
      })

      const totalIn = filteredMovements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.quantity, 0)
      const totalOut = filteredMovements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.quantity, 0)

      const mult = p.multiplier || 1
      return { 
        ...p, 
        total_in: totalIn, 
        total_out: totalOut, 
        current_stock: ((p.initial_stock || 0) * mult) + totalIn - totalOut, 
        movements: filteredMovements 
      }
    })

    const orphanItems: StockItem[] = Object.entries(stockMap)
      .filter(([name]) => !catalogNames.has(name))
      .map(([name, data]) => ({
        id: `orphan_${name}`, shop_id: shopId, name, category: '', unit: 'unité',
        alert_threshold: 0, initial_stock: 0, unit_cost: 0, unit_price: 0,
        created_at: '', total_in: data.total_in, total_out: data.total_out,
        current_stock: data.total_in - data.total_out, movements: data.movements, is_orphan: true,
      }))

    setItems(stockItems)
    setOrphans(orphanItems)
  }, [shopId])

  const loadStock = useCallback(async () => {
    setLoading(true)
    const online = typeof window !== 'undefined' ? window.navigator.onLine : true
    setIsOffline(!online)

    if (!online) {
      buildFromOffline()
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/stock', { headers: { 'x-shop-id': shopId } })
      if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`)
      const data = await response.json()

      if (data.offline) {
        buildFromOffline()
      } else {
        setItems(data.products || [])
        setOrphans(data.orphans || [])
        // Mettre en cache pour le mode hors-ligne
        replaceOfflineProducts(shopId, (data.products || []).map((p: any) => ({
          id: p.id, shop_id: p.shop_id, name: p.name, category: p.category,
          unit: p.unit, alert_threshold: p.alert_threshold, initial_stock: p.initial_stock,
          unit_cost: p.unit_cost, unit_price: p.unit_price, created_at: p.created_at || '',
          multiplier: p.multiplier || 1, packaging_name: p.packaging_name || '',
        })))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      onError?.(msg)
      buildFromOffline()
    } finally {
      setLoading(false)
    }
  }, [shopId, onError, buildFromOffline])

  useEffect(() => { loadStock() }, [loadStock])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const openAddModal = (prefill?: Partial<typeof EMPTY_FORM>) => {
    const name = prefill?.name || ''
    const matchedOrphan = orphans.find(o => o.name.toLowerCase().trim() === name.toLowerCase().trim())
    if (matchedOrphan && matchedOrphan.total_out > 0) {
      setOrphanPastSales(matchedOrphan.total_out)
      setDeductPastSales(false) // Par défaut, on repart à zéro
    } else {
      setOrphanPastSales(0)
      setDeductPastSales(false)
    }

    setFormData({ ...EMPTY_FORM, ...(prefill || {}) })
    setEditingItem(null)
    setShowAddModal(true)
  }

  const openEditModal = (item: StockItem) => {
    setFormData({
      name: item.name, category: item.category, unit: item.unit,
      alert_threshold: item.alert_threshold, initial_stock: item.initial_stock,
      unit_cost: item.unit_cost, unit_price: item.unit_price,
      multiplier: item.multiplier || 1, packaging_name: item.packaging_name || '',
    })
    setEditingItem(item)
    setShowAddModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return
    setSaving(true)

    const online = typeof window !== 'undefined' ? window.navigator.onLine : true

    try {
      if (online) {
        const method = editingItem ? 'PATCH' : 'POST'
        const now = deductPastSales ? '2000-01-01T00:00:00.000Z' : new Date().toISOString()
        const body = editingItem 
          ? { id: editingItem.id, ...formData } 
          : { ...formData, created_at: now }

        const response = await fetch('/api/stock', {
          method,
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
          body: JSON.stringify(body),
        })
        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.error || `Erreur HTTP ${response.status}`)
        }
      } else {
        // Mode hors-ligne — CRUD local
        const now = deductPastSales ? '2000-01-01T00:00:00.000Z' : new Date().toISOString()
        if (editingItem && !editingItem.is_orphan) {
          saveOfflineProduct(shopId, { ...editingItem, ...formData })
        } else {
          saveOfflineProduct(shopId, {
            id: generateOfflineId(), shop_id: shopId, created_at: now, ...formData,
          })
        }
      }

      setShowAddModal(false)
      await loadStock()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: StockItem) => {
    if (!confirm(`Supprimer « ${item.name} » du catalogue ?`)) return

    const online = typeof window !== 'undefined' ? window.navigator.onLine : true

    try {
      if (online) {
        const response = await fetch(`/api/stock?id=${item.id}&shopId=${shopId}`, {
          method: 'DELETE',
          headers: { 'x-shop-id': shopId },
        })
        if (!response.ok) throw new Error('Erreur lors de la suppression')
      } else {
        deleteOfflineProduct(shopId, item.id)
      }
      await loadStock()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  // ── Données dérivées ─────────────────────────────────────────────────────────

  const allCategories = ['TOUT', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))]
  const filteredItems = items.filter(i => {
    const matchSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = categoryFilter === 'TOUT' || i.category === categoryFilter
    return matchSearch && matchCat
  })
  const alertCount = items.filter(i => getStockStatus(i) !== 'ok').length
  const stockValue = items.reduce((sum, i) => sum + Math.max(0, i.current_stock) * (i.unit_cost || 0), 0)
  const stockValueSale = items.reduce((sum, i) => sum + Math.max(0, i.current_stock) * (i.unit_price || 0), 0)
  const totalIn = items.reduce((s, i) => s + i.total_in, 0)
  const totalOut = items.reduce((s, i) => s + i.total_out, 0)

  // ── Rendu ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Package className="w-8 h-8 animate-pulse" />
          <p className="font-mono text-xs uppercase tracking-widest">Chargement du stock...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 py-2.5 border-b border-gray-200 bg-[#f5f1e8] flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="w-4 h-4 text-gray-700 flex-shrink-0" />
          <h2 className="font-handwritten text-xl font-bold text-gray-800 truncate">Gestionnaire de Stock</h2>
          {alertCount > 0 && (
            <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-red-100 border border-red-200 rounded-full text-[9px] font-bold text-red-700 uppercase">
              <AlertTriangle className="w-2.5 h-2.5" />
              {alertCount} alertes
            </span>
          )}
          {isOffline && (
            <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-orange-100 border border-orange-200 rounded-full text-[9px] font-bold text-orange-700 uppercase">
              <WifiOff className="w-2.5 h-2.5" />
              Hors-ligne
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={loadStock} title="Rafraîchir" className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-3 h-3" />
            Produit
          </button>
        </div>
      </div>

      {/* ── KPI bar ── */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-100 overflow-x-auto scrollbar-hide flex-shrink-0 bg-white bg-opacity-50">
        {[
          { label: 'Produits', value: items.length, color: 'border-gray-200 text-gray-800' },
          { label: 'Alertes', value: alertCount, color: 'border-red-200 text-red-700' },
          { label: 'Valeur Achat', value: formatPrice(stockValue), color: 'border-emerald-200 text-emerald-800' },
          { label: 'Valeur Vente', value: formatPrice(stockValueSale), color: 'border-indigo-200 text-indigo-800' },
          { label: 'Total entrées', value: totalIn, color: 'border-blue-200 text-blue-800' },
          { label: 'Total sorties', value: totalOut, color: 'border-rose-200 text-rose-800' },
        ].map(kpi => (
          <div key={kpi.label} className={`flex-shrink-0 text-center px-3 py-1 bg-[#fffdf9] border rounded-xl ${kpi.color}`}>
            <div className="text-[8px] font-bold uppercase opacity-70">{kpi.label}</div>
            <div className={`font-mono text-sm font-bold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── Search + Category filter ── */}
      <div className="px-4 py-2 border-b border-gray-100 flex flex-col gap-2 bg-[#faf7f0] flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Chercher un produit..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-mono outline-none focus:border-gray-400 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex-shrink-0 transition-all ${
                categoryFilter === cat
                  ? 'bg-gray-800 border-gray-800 text-white scale-105'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product list ── */}
      <div className="flex-1 overflow-y-auto pb-6">

        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center min-h-[280px]">
            <Package className="w-10 h-10 text-gray-200 mb-4" />
            <p className="font-handwritten text-2xl text-gray-400">
              {items.length === 0 ? 'Catalogue vide' : 'Aucun produit trouvé'}
            </p>
            <p className="text-xs text-gray-400 mt-2 font-mono">
              {items.length === 0
                ? 'Ajoutez vos produits pour suivre leur niveau de stock.'
                : 'Essayez un autre filtre ou terme de recherche.'}
            </p>
            {items.length === 0 && (
              <button
                onClick={() => openAddModal()}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-full text-xs font-bold hover:bg-black transition-all hover:scale-105"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter mon premier produit
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {filteredItems.map(item => {
              const status = getStockStatus(item)
              const colors = getStatusColors(status)
              const barWidth = getBarWidth(item)
              const isExpanded = expandedId === item.id

              return (
                <div
                  key={item.id}
                  className={`border rounded-xl overflow-hidden transition-all ${colors.bg} ${colors.border}`}
                >
                  {/* Product row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
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
                        <span className={`font-mono text-xs font-bold flex-shrink-0 ${colors.text}`}>
                          {item.current_stock <= 0
                            ? '⚠️ RUPTURE'
                            : `${item.current_stock} ${item.unit} ${item.multiplier && item.multiplier > 1 ? `(${Math.floor(item.current_stock / item.multiplier)} ${item.packaging_name || 'lots'})` : ''}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
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
                            onClick={e => { e.stopPropagation(); openEditModal(item) }}
                            className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-full text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
                          >
                            <Edit3 className="w-2.5 h-2.5" /> Modifier
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(item) }}
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
            })}
          </div>
        )}

        {/* Articles hors-catalogue */}
        {orphans.length > 0 && (
          <div className="px-3 mt-1">
            <button
              onClick={() => setShowOrphans(!showOrphans)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 hover:text-gray-600 transition-colors"
            >
              {showOrphans ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {orphans.length} article(s) hors catalogue détecté(s)
            </button>
            {showOrphans && (
              <div className="space-y-1.5 mb-4">
                {orphans.map((orphan, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                    <div>
                      <span className="font-handwritten text-sm font-bold text-gray-700">{orphan.name}</span>
                      <div className="flex gap-2 text-[9px] font-mono text-gray-400 mt-0.5">
                        <span className="text-emerald-600">+{orphan.total_in} entrée(s)</span>
                        <span className="text-red-500">-{orphan.total_out} sortie(s)</span>
                        <span className="font-bold text-gray-600">= {orphan.current_stock}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => openAddModal({ name: orphan.name })}
                      className="flex-shrink-0 text-[9px] font-bold text-blue-600 hover:text-blue-800 underline ml-3"
                    >
                      + Catalogue
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Ajouter / Modifier ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="w-full max-w-sm bg-[#fdfaf2] border border-gray-300 shadow-2xl rounded-2xl overflow-hidden">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-[#f5f1e8]">
              <h3 className="font-handwritten text-xl font-bold text-gray-800">
                {editingItem ? 'Modifier le produit' : 'Nouveau produit'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">

              {/* Nom */}
              <div>
                <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Nom du produit *</label>
                <input
                  type="text"
                  placeholder="ex: Riz 25kg, Huile palme 5L, Savon Lux..."
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-handwritten outline-none focus:border-gray-400 transition-colors"
                  autoFocus
                />
              </div>

              {/* Ventes antérieures détectées (Orphelin) */}
              {orphanPastSales > 0 && !editingItem && (
                <div className="bg-[#fffdf2] border border-amber-250 rounded-2xl p-3.5 text-xs space-y-2 select-none shadow-sm">
                  <div className="flex gap-2 items-start text-amber-800">
                    <span className="text-base flex-shrink-0">⚠️</span>
                    <div className="leading-snug">
                      <p className="font-bold text-[11px]">Ventes passées détectées :</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Ce produit a été vendu <strong className="text-amber-900 font-mono">{orphanPastSales} fois</strong> avant d'être officiellement ajouté au catalogue.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t border-amber-100 font-sans text-gray-700">
                    <label className="flex items-center gap-2 cursor-pointer text-[10px] font-medium">
                      <input
                        type="radio"
                        name="deductPastSales"
                        checked={!deductPastSales}
                        onChange={() => setDeductPastSales(false)}
                        className="text-gray-800 focus:ring-gray-800"
                      />
                      <span>Repartir à zéro (Ignorer les ventes passées)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[10px] font-medium">
                      <input
                        type="radio"
                        name="deductPastSales"
                        checked={deductPastSales}
                        onChange={() => setDeductPastSales(true)}
                        className="text-gray-800 focus:ring-gray-800"
                      />
                      <span>Déduire du stock initial ({orphanPastSales} ventes)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Catégorie + Unité */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-gray-400"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Unité</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-gray-400"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Stock initial + Seuil alerte */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Stock initial</label>
                  <input
                    type="number" min="0"
                    value={formData.initial_stock}
                    onChange={e => setFormData(p => ({ ...p, initial_stock: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-gray-400"
                  />
                  <p className="text-[8px] text-gray-400 mt-0.5">Ce que tu as déjà</p>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Seuil d'alerte</label>
                  <input
                    type="number" min="0"
                    value={formData.alert_threshold}
                    onChange={e => setFormData(p => ({ ...p, alert_threshold: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-gray-400"
                  />
                  <p className="text-[8px] text-gray-400 mt-0.5">Alerte en dessous de</p>
                </div>
              </div>

              {/* Prix */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Prix achat (F)</label>
                  <input
                    type="number" min="0"
                    value={formData.unit_cost || ''}
                    onChange={e => setFormData(p => ({ ...p, unit_cost: parseInt(e.target.value) || 0 }))}
                    placeholder="Optionnel"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">Prix vente (F)</label>
                  <input
                    type="number" min="0"
                    value={formData.unit_price || ''}
                    onChange={e => setFormData(p => ({ ...p, unit_price: parseInt(e.target.value) || 0 }))}
                    placeholder="Optionnel"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              {/* Conditionnement / Multiplicateur */}
              <div className="border-t border-dashed border-gray-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">📦 Conditionnement / Lots</span>
                  <input
                    type="checkbox"
                    checked={formData.multiplier > 1}
                    onChange={e => {
                      setFormData(p => ({
                        ...p,
                        multiplier: e.target.checked ? 50 : 1,
                        packaging_name: e.target.checked ? 'sac' : '',
                      }))
                    }}
                    className="rounded text-gray-800 focus:ring-gray-800"
                  />
                </div>

                {formData.multiplier > 1 && (
                  <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-gray-200 rounded-xl shadow-inner">
                    <div>
                      <label className="text-[8px] uppercase font-bold text-gray-500 block mb-0.5">Nom du lot</label>
                      <input
                        type="text"
                        placeholder="ex: sac, carton, pack"
                        value={formData.packaging_name}
                        onChange={e => setFormData(p => ({ ...p, packaging_name: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none focus:border-gray-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] uppercase font-bold text-gray-500 block mb-0.5">Contenance (Multiplicateur)</label>
                      <input
                        type="number"
                        min="2"
                        value={formData.multiplier}
                        onChange={e => setFormData(p => ({ ...p, multiplier: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none focus:border-gray-400 font-mono"
                      />
                    </div>
                    <div className="col-span-2 text-[8px] text-gray-400 leading-tight">
                      Chaque entrée/sortie de ce produit comptée dans le journal fera automatiquement <strong>+{formData.multiplier} / -{formData.multiplier} {formData.unit}</strong>.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-200 bg-[#f5f1e8]">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || saving}
                className="flex-1 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-full text-xs font-bold disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
              >
                {saving ? 'Sauvegarde...' : editingItem ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
