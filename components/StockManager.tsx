'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Package, AlertTriangle, WifiOff, Download, RefreshCw, Plus, ChevronUp, ChevronDown
} from 'lucide-react'
import {
  getOfflineProducts, replaceOfflineProducts, saveOfflineProduct,
  deleteOfflineProduct, computeOfflineStock, generateOfflineId,
} from '@/lib/offlineDb'
import { findDuplicateCandidates, type DuplicatePair } from '@/lib/productUtils'

// Subcomponents & Utilities
import { StockItem, StockManagerProps } from './stock/types'
import { EMPTY_FORM, getStockStatus, exportStockToCSV } from './stock/stockUtils'
import { StockKpiBar } from './stock/StockKpiBar'
import { StockFilterBar } from './stock/StockFilterBar'
import { StockItemRow } from './stock/StockItemRow'
import { ProductModal } from './stock/ProductModal'
import { ExpressAdjustmentModal } from './stock/ExpressAdjustmentModal'
import { WhatsAppPOModal } from './stock/WhatsAppPOModal'
import { ProductMergeModal } from './stock/ProductMergeModal'

export function StockManager({ shopId = 'default-shop', userRole, onError }: StockManagerProps) {
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

  // Déduplication & Fusion
  const [duplicatePairs, setDuplicatePairs] = useState<DuplicatePair[]>([])
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [activePairIndex, setActivePairIndex] = useState(0)
  const [merging, setMerging] = useState(false)

  // Ajustement Express & WhatsApp
  const [expressItem, setExpressItem] = useState<StockItem | null>(null)
  const [expressType, setExpressType] = useState<'in' | 'out'>('in')
  const [expressQty, setExpressQty] = useState(1)
  const [expressReason, setExpressReason] = useState('purchase')
  const [expressUnitCost, setExpressUnitCost] = useState('')
  const [expressNotes, setExpressNotes] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    if (expressItem) {
      setExpressUnitCost(expressItem.unit_cost ? expressItem.unit_cost.toString() : '')
    }
  }, [expressItem])

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [supplierPhone, setSupplierPhone] = useState('')

  const handleExpressAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expressItem || expressQty <= 0) return
    setAdjusting(true)

    try {
      const response = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shopId,
        },
        body: JSON.stringify({
          productId: expressItem.id,
          quantity: expressQty,
          type: expressType,
          reason: expressReason,
          unitCost: parseInt(expressUnitCost) || 0,
          notes: expressNotes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'ajustement')
      }

      setExpressItem(null)
      setExpressQty(1)
      setExpressUnitCost('')
      setExpressNotes('')
      await loadStock()
    } catch (err: any) {
      onError?.(err?.message || 'Erreur lors de l\'ajustement')
    } finally {
      setAdjusting(false)
    }
  }

  const generateWhatsAppUrl = () => {
    const alertItems = items.filter(i => getStockStatus(i) === 'low' || getStockStatus(i) === 'out')
    if (alertItems.length === 0) return '#'
    
    let text = `📑 *BON DE COMMANDE - REAPPROVISIONNEMENT*\n📅 Date: ${new Date().toLocaleDateString('fr-FR')}\n\n`
    text += `Bonjour, veuillez me préparer le réapprovisionnement suivant :\n\n`
    
    alertItems.forEach((item, idx) => {
      const neededQty = Math.max(item.alert_threshold * 2 - Math.max(0, item.current_stock), 10)
      text += `${idx + 1}. *${item.name}* : ${neededQty} ${item.unit} (Stock restant: ${item.current_stock})\n`
    })

    text += `\nMerci de me confirmer la disponibilité et le tarif ! 🙏`

    const phoneClean = supplierPhone.replace(/[^0-9]/g, '')
    const baseUrl = phoneClean ? `https://wa.me/${phoneClean}` : `https://wa.me/`
    return `${baseUrl}?text=${encodeURIComponent(text)}`
  }

  // Recalculer les doublons dès que les items changent
  useEffect(() => {
    if (items.length > 0) {
      const candidates = findDuplicateCandidates(items, 0.75)
      setDuplicatePairs(candidates)
    } else {
      setDuplicatePairs([])
    }
  }, [items])

  const handleMergeProducts = async (sourceId: string, targetId: string) => {
    setMerging(true)
    try {
      const response = await fetch('/api/stock/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
        body: JSON.stringify({ sourceProductId: sourceId, targetProductId: targetId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la fusion')
      }

      await loadStock()

      if (activePairIndex < duplicatePairs.length - 1) {
        setActivePairIndex(prev => prev + 1)
      } else {
        setShowMergeModal(false)
      }
    } catch (err: any) {
      onError?.(err?.message || 'Impossible de fusionner les produits')
    } finally {
      setMerging(false)
    }
  }

  const handleEnableTracking = (item: StockItem) => {
    // Ouvrir directement la modale d'édition pour saisir le stock physique réel compté aujourd'hui
    openEditModal(item)
  }

  // ── Chargement ──────────────────────────────────────────────────────────────

  const buildFromOffline = useCallback(() => {
    const offlineProducts = getOfflineProducts(shopId)
    const stockMap = computeOfflineStock(shopId)
    const catalogKeys = new Set(offlineProducts.map(p => normalizeProductName(p.name).toLowerCase().trim()))

    const stockItems: StockItem[] = offlineProducts.map(p => {
      const cleanName = normalizeProductName(p.name)
      const key = cleanName.toLowerCase().trim()
      const data = stockMap[key] || { total_in: 0, total_out: 0, movements: [] }
      
      const prodTime = p.created_at ? new Date(p.created_at).getTime() - 60000 : 0
      const filteredMovements = data.movements.filter((m: any) => {
        const mTime = m.created_at ? new Date(m.created_at).getTime() : new Date(m.date).getTime()
        return mTime >= prodTime
      })

      const totalIn = filteredMovements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.quantity, 0)
      const totalOut = filteredMovements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.quantity, 0)

      const mult = p.multiplier || 1
      const hasInitial = (p.initial_stock || 0) > 0
      const hasPurchases = totalIn > 0
      const stockTracked = p.stock_tracked === true || (p.stock_tracked !== false && (hasInitial || hasPurchases))
      const currentStock = stockTracked ? Math.max(0, ((p.initial_stock || 0) * mult) + totalIn - totalOut) : 0

      return { 
        ...p, 
        name: cleanName,
        total_in: totalIn, 
        total_out: totalOut, 
        stock_tracked: stockTracked,
        current_stock: currentStock, 
        movements: filteredMovements 
      }
    })

    const orphanItems: StockItem[] = Object.entries(stockMap)
      .filter(([rawKey]) => !catalogKeys.has(normalizeProductName(rawKey).toLowerCase().trim()))
      .map(([rawKey, data]) => {
        const cleanName = normalizeProductName(rawKey)
        return {
          id: `orphan_${rawKey}`, shop_id: shopId, name: cleanName, category: '', unit: 'unité',
          alert_threshold: 0, initial_stock: 0, unit_cost: 0, unit_price: 0,
          created_at: '', total_in: data.total_in, total_out: data.total_out,
          stock_tracked: false,
          current_stock: 0, movements: data.movements, is_orphan: true,
        }
      })

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
      setDeductPastSales(false)
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

  const [trackModeFilter, setTrackModeFilter] = useState<'ALL' | 'TRACKED' | 'UNTRACKED'>('ALL')

  const defaultCategories = ['TOUT', 'Général', '🍲 Cuisiné / Plats', '☕ Cafétéria / Ptis-dej', '🥤 Boissons & Bar', '🥬 Matières Premières / Ingrédients', '✂️ Prestations & Services']
  const existingCategories = Array.from(new Set(items.map(i => i.category).filter(Boolean)))
  const allCategories = Array.from(new Set([...defaultCategories, ...existingCategories]))

  const trackedCount = items.filter(i => i.stock_tracked).length
  const untrackedCount = items.filter(i => !i.stock_tracked).length

  const filteredItems = items.filter(i => {
    const matchSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = categoryFilter === 'TOUT' || i.category === categoryFilter
    const matchTrack = trackModeFilter === 'ALL'
      ? true
      : trackModeFilter === 'TRACKED'
        ? i.stock_tracked
        : !i.stock_tracked
    return matchSearch && matchCat && matchTrack
  })

  const alertCount = items.filter(i => i.stock_tracked && (getStockStatus(i) === 'out' || getStockStatus(i) === 'low')).length
  const stockValue = items.filter(i => i.stock_tracked).reduce((sum, i) => sum + Math.max(0, i.current_stock) * (i.unit_cost || 0), 0)
  const stockValueSale = items.filter(i => i.stock_tracked).reduce((sum, i) => sum + Math.max(0, i.current_stock) * (i.unit_price || 0), 0)
  const totalIn = items.filter(i => i.stock_tracked).reduce((s, i) => s + i.total_in, 0)
  const totalOut = items.filter(i => i.stock_tracked).reduce((s, i) => s + i.total_out, 0)

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
          <h2 className="font-handwritten text-xl font-bold text-gray-800 truncate">Gestionnaire de Stock & Cartes</h2>
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
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => exportStockToCSV(items, shopId)}
            title="Exporter le stock en Excel/CSV"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[9px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Download className="w-3 h-3" />
            <span>Exporter</span>
          </button>
          <button onClick={loadStock} title="Rafraîchir" className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setFormData({ ...EMPTY_FORM, category: '🍲 Cuisiné / Plats' })
              setEditingItem(null)
              setShowAddModal(true)
            }}
            className="flex items-center gap-1 px-2 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-full text-[9px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>🍽️ Carte Menu</span>
          </button>
          <button
            onClick={() => {
              setFormData({ ...EMPTY_FORM, category: '✂️ Prestations & Services' })
              setEditingItem(null)
              setShowAddModal(true)
            }}
            className="flex items-center gap-1 px-2 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-full text-[9px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>✂️ Prestation</span>
          </button>
          <button
            onClick={() => setShowWhatsAppModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[9px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <span>📲 Bon WhatsApp</span>
          </button>
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-1 px-2 py-1.5 bg-gray-900 hover:bg-black text-white rounded-full text-[9px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>📦 Carte Stock</span>
          </button>
        </div>
      </div>

      {/* ── KPI bar ── */}
      <StockKpiBar
        items={items.filter(i => i.stock_tracked)}
        alertCount={alertCount}
        stockValue={stockValue}
        stockValueSale={stockValueSale}
        totalIn={totalIn}
        totalOut={totalOut}
      />

      {/* ── Search + Mode de Suivi + Category filter + Duplicate alert ── */}
      <StockFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        trackModeFilter={trackModeFilter}
        setTrackModeFilter={setTrackModeFilter}
        allCategories={allCategories}
        duplicatePairsCount={duplicatePairs.length}
        firstDuplicatePairNames={
          duplicatePairs.length > 0
            ? { name1: duplicatePairs[0].item1.name, name2: duplicatePairs[0].item2.name }
            : undefined
        }
        onOpenMergeModal={() => {
          setActivePairIndex(0)
          setShowMergeModal(true)
        }}
        trackedCount={trackedCount}
        untrackedCount={untrackedCount}
        totalCount={items.length}
      />

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
            {filteredItems.map(item => (
              <StockItemRow
                key={item.id}
                item={item}
                isExpanded={expandedId === item.id}
                userRole={userRole}
                onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onEnableTracking={handleEnableTracking}
                onOpenExpressAdjust={(targetItem, type) => {
                  setExpressItem(targetItem)
                  setExpressType(type)
                  setExpressQty(1)
                }}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Articles hors-catalogue (Orphelins) */}
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

      {/* ── Modales ── */}
      <ProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        onSave={handleSave}
        orphanPastSales={orphanPastSales}
        deductPastSales={deductPastSales}
        setDeductPastSales={setDeductPastSales}
      />

      <ProductMergeModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        duplicatePairs={duplicatePairs}
        activePairIndex={activePairIndex}
        merging={merging}
        onMergeProducts={handleMergeProducts}
      />

      <ExpressAdjustmentModal
        expressItem={expressItem}
        expressType={expressType}
        expressQty={expressQty}
        setExpressQty={setExpressQty}
        expressReason={expressReason}
        setExpressReason={setExpressReason}
        expressNotes={expressNotes}
        setExpressNotes={setExpressNotes}
        adjusting={adjusting}
        onClose={() => setExpressItem(null)}
        onSubmit={handleExpressAdjust}
      />

      <WhatsAppPOModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        supplierPhone={supplierPhone}
        setSupplierPhone={setSupplierPhone}
        items={items}
        generateWhatsAppUrl={generateWhatsAppUrl}
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

              {/* Adaptateur dynamique Menu Carte vs Stock Physique */}
              {formData.category.includes('Cuisiné') || formData.category.includes('Cafétéria') ? (
                <div className="bg-amber-50 border border-amber-250 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900">
                    <span className="text-base">🍽️</span>
                    <div>
                      <h4 className="font-bold text-xs">Mode Plat / Menu Carte</h4>
                      <p className="text-[10px] text-amber-700">Plat cuisiné ou servi à la demande. Aucun stock physique d'alerte ni prix d'achat grossiste requis.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-amber-950 tracking-wider font-sans block mb-1">Catégorie Carte</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-800 outline-none"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-amber-950 tracking-wider font-sans block mb-1">Prix Vente (FCFA) *</label>
                      <input
                        type="number" min="0" required
                        value={formData.unit_price || ''}
                        onChange={e => setFormData(p => ({ ...p, unit_price: parseInt(e.target.value) || 0 }))}
                        placeholder="Ex: 1500"
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono font-bold text-amber-950 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {formData.category.includes('Prestations') && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 flex items-center gap-2 text-purple-900 text-[10px] mb-3">
                      <span className="text-sm">✂️</span>
                      <p><strong>Carte Prestation / Service :</strong> Main d'œuvre ou service rendu (Coiffure, Couture, Réparation, Nettoyage). Aucun stock physique requis.</p>
                    </div>
                  )}
                  {formData.category.includes('Matières') && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-emerald-900 text-[10px] mb-3">
                      <span className="text-sm">🥬</span>
                      <p><strong>Matière Première / Cuisine :</strong> Ingrédients achetés au marché (sacs de riz, huile, viandes, condiments) pour préparer les plats et calculer le bénéfice brut global de la cuisine.</p>
                    </div>
                  )}
                  {formData.category.includes('Boissons') && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center gap-2 text-blue-900 text-[10px] mb-3">
                      <span className="text-sm">🥤</span>
                      <p><strong>Boisson / Bar en Stock :</strong> Produit acheté tout fait et revendu (avec suivi du nombre de bouteilles/casiers, prix d'achat grossiste et alerte de rupture).</p>
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
                      <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-gray-200 rounded-xl shadow-inner mt-2">
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
                </>
              )}
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

      {/* ── Modal de Fusion de Doublons ── */}
      {showMergeModal && duplicatePairs.length > 0 && activePairIndex < duplicatePairs.length && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#fbf9f4] border-2 border-amber-300 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-amber-200 bg-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <GitMerge className="w-5 h-5 text-amber-700" />
                <span>Fusionner les doublons ({activePairIndex + 1}/{duplicatePairs.length})</span>
              </div>
              <button
                onClick={() => setShowMergeModal(false)}
                className="p-1 text-amber-800 hover:text-amber-950 rounded-full hover:bg-amber-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-gray-700">
              <p className="text-gray-600">
                Ces deux articles semblent identiques. Choisissez le nom canonique à conserver :
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Choix 1 */}
                <button
                  onClick={() => handleMergeProducts(
                    duplicatePairs[activePairIndex].item2.id,
                    duplicatePairs[activePairIndex].item1.id
                  )}
                  disabled={merging}
                  className="p-3.5 bg-white border border-amber-200 hover:border-amber-500 hover:bg-amber-50/50 rounded-2xl text-left transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-gray-900 group-hover:text-amber-900">
                      « {duplicatePairs[activePairIndex].item1.name} »
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-1">Conserver ce nom</span>
                  </div>
                  <div className="mt-3 px-2 py-1 bg-amber-600 text-white text-[9px] font-bold uppercase rounded-lg text-center">
                    Garder celui-ci
                  </div>
                </button>

                {/* Choix 2 */}
                <button
                  onClick={() => handleMergeProducts(
                    duplicatePairs[activePairIndex].item1.id,
                    duplicatePairs[activePairIndex].item2.id
                  )}
                  disabled={merging}
                  className="p-3.5 bg-white border border-amber-200 hover:border-amber-500 hover:bg-amber-50/50 rounded-2xl text-left transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-gray-900 group-hover:text-amber-900">
                      « {duplicatePairs[activePairIndex].item2.name} »
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-1">Conserver ce nom</span>
                  </div>
                  <div className="mt-3 px-2 py-1 bg-amber-600 text-white text-[9px] font-bold uppercase rounded-lg text-center">
                    Garder celui-ci
                  </div>
                </button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-[10px] text-amber-800">
                ℹ️ <strong>Remarque :</strong> La fusion transférera automatiquement l'historique complet des ventes et mouvements sous le nom sélectionné et supprimera l'autre version.
              </div>
            </div>

            <div className="px-5 py-3 border-t border-amber-200 bg-amber-100/50 flex justify-between items-center">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-3 py-1.5 text-xs text-amber-900 hover:text-black font-semibold"
              >
                Passer
              </button>
              {merging && <span className="text-xs font-mono text-amber-700 animate-pulse">Fusion en cours...</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ajustement Express (+ / -) ── */}
      {expressItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#fbf9f4] border border-gray-200 rounded-[28px] max-w-sm w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              expressType === 'in' ? 'bg-emerald-100 border-emerald-200 text-emerald-900' : 'bg-rose-100 border-rose-200 text-rose-900'
            }`}>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>{expressType === 'in' ? '⚡ Entrée de Stock (+)' : '⚡ Sortie de Stock (-)'}</span>
              </div>
              <button onClick={() => setExpressItem(null)} className="p-1 rounded-full hover:bg-black/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExpressAdjust} className="p-5 space-y-4 text-xs">
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <div className="text-[10px] text-gray-400 font-mono uppercase">Produit sélectionné</div>
                <div className="font-handwritten text-lg font-bold text-gray-800">{expressItem.name}</div>
                <div className="text-[11px] text-gray-500 font-mono">Stock actuel : {expressItem.current_stock} {expressItem.unit}</div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Quantité à {expressType === 'in' ? 'ajouter' : 'retirer'}</label>
                <input
                  type="number"
                  min="1"
                  value={expressQty}
                  onChange={e => setExpressQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-sm font-bold text-gray-800 outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Motif de l'ajustement</label>
                <select
                  value={expressReason}
                  onChange={e => setExpressReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-xs text-gray-800 outline-none focus:border-gray-900 bg-white"
                >
                  {expressType === 'in' ? (
                    <>
                      <option value="purchase">📦 Achat / Reconstitution de stock</option>
                      <option value="inventory_correction">⚖️ Ajustement d'inventaire (+)</option>
                    </>
                  ) : (
                    <>
                      <option value="damage">⚠️ Casse / Perte / Produit périmé</option>
                      <option value="personal_use">🥤 Consommation personnelle / Équipe</option>
                      <option value="inventory_correction">⚖️ Ajustement d'inventaire (-)</option>
                    </>
                  )}
                </select>
              </div>

              {expressType === 'in' && expressReason === 'purchase' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <label className="block text-[10px] font-bold text-amber-900 uppercase">
                    Prix d'Achat unitaire (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Ex: 450"
                    value={expressUnitCost}
                    onChange={e => setExpressUnitCost(e.target.value)}
                    className="w-full px-3 py-1.5 border border-amber-300 rounded-xl font-mono text-xs font-bold text-amber-950 outline-none focus:border-amber-500 bg-white"
                  />
                  <p className="text-[9px] font-mono text-amber-800">
                    Saisissez le prix exact payé au grossiste pour 1 unité.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Notes optionnelles</label>
                <input
                  type="text"
                  placeholder="ex: Carton cassé lors du déchargement"
                  value={expressNotes}
                  onChange={e => setExpressNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-mono text-xs outline-none focus:border-gray-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpressItem(null)}
                  className="flex-1 py-2 border border-gray-300 rounded-full font-bold text-gray-600 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className={`flex-1 py-2 text-white font-bold rounded-full transition-transform hover:scale-105 active:scale-95 ${
                    expressType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {adjusting ? 'Validation...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Bon de Commande WhatsApp ── */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#fbf9f4] border border-emerald-300 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-emerald-200 bg-emerald-100 flex items-center justify-between text-emerald-950">
              <div className="font-bold text-sm flex items-center gap-2">
                <span>📲 Bon de Commande WhatsApp</span>
              </div>
              <button onClick={() => setShowWhatsAppModal(false)} className="p-1 rounded-full hover:bg-emerald-200/60">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Numéro WhatsApp du Grossiste / Fournisseur (Optionnel)</label>
                <input
                  type="tel"
                  placeholder="ex: +22997000000 ou laisser vide"
                  value={supplierPhone}
                  onChange={e => setSupplierPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div className="bg-white p-3.5 border border-gray-200 rounded-2xl max-h-48 overflow-y-auto space-y-2">
                <div className="font-bold text-gray-800 text-[11px] uppercase tracking-wider mb-1">Articles en alerte de rupture :</div>
                {items.filter(i => getStockStatus(i) === 'low' || getStockStatus(i) === 'out').length === 0 ? (
                  <p className="text-gray-400 italic py-2 text-center">Aucun produit en alerte de rupture pour le moment !</p>
                ) : (
                  items.filter(i => getStockStatus(i) === 'low' || getStockStatus(i) === 'out').map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-0 font-mono">
                      <span className="font-bold text-gray-800">{item.name}</span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                        A commander: {Math.max(item.alert_threshold * 2 - Math.max(0, item.current_stock), 10)} {item.unit}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-full font-bold text-gray-600 hover:bg-gray-100"
                >
                  Fermer
                </button>
                <a
                  href={generateWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-center transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                >
                  <span>Envoyer WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
>>>>>>> e69e8ce (fix: unified product catalog, clean canonical normalization and exact stock adjustment cash calculations)
    </div>
  )
}
