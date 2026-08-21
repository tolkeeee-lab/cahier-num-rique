'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { StockAlertBanner } from '@/components/stock/StockAlertBanner'
import { StockToolbar } from '@/components/stock/StockToolbar'
import { StockTable } from '@/components/stock/StockTable'
import { ProductModal } from '@/components/stock/ProductModal'
import { RestockAdvisorModal } from '@/components/stock/RestockAdvisorModal'
import { StockFormState } from '@/components/stock/types'
import { exportSalesToCSV } from '@/lib/exportUtils'
import { clearOfflineProducts, saveOfflineProduct, getOfflineSales } from '@/lib/offlineDb'

interface Product {
  id: string
  name: string
  initial_stock: number
  current_stock?: number
  alert_threshold: number
  unit_cost: number
  unit_price: number
  category?: string
  unit?: string
  multiplier?: number
  packaging_name?: string
  lot_quantity?: number
  lot_price?: number
  trade_type?: 'retail' | 'semi_wholesale' | 'wholesale'
}

interface StockManagerProps {
  shopId?: string
  isEmployee?: boolean
  onError?: (err: string) => void
}

const defaultFormData: StockFormState = {
  name: '',
  initial_stock: 0,
  unit_cost: 0,
  unit_price: 0,
  alert_threshold: 5,
  category: 'Divers',
  unit: 'unité',
  multiplier: 1,
  packaging_name: '',
  lot_quantity: 0,
  lot_price: 0,
  trade_type: 'retail',
}

export function StockManager({
  shopId = 'default-shop',
  isEmployee = false,
  onError,
}: StockManagerProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('TOUT')
  const [isLowStockOnly, setIsLowStockOnly] = useState(false)

  // State pour ProductModal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<StockFormState>(defaultFormData)
  const [saving, setSaving] = useState(false)
  const [deductPastSales, setDeductPastSales] = useState(false)

  // Référence anti-rebond pour ajustements de stock sur réseaux instables
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const loadStock = useCallback(async () => {
    try {
      const res = await fetch('/api/stock', {
        headers: { 'x-shop-id': shopId },
      })
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (err: any) {
      console.error('Erreur chargement stock:', err)
      if (onError) onError(err.message)
    }
  }, [shopId, onError])

  useEffect(() => {
    loadStock()
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [loadStock])

  const handleOpenAddModal = () => {
    setEditingProduct(null)
    setFormData(defaultFormData)
    setIsProductModalOpen(true)
  }

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p)
    const currentOrInitial = p.current_stock ?? p.initial_stock ?? 0
    setFormData({
      name: p.name,
      initial_stock: currentOrInitial,
      unit_cost: p.unit_cost || 0,
      unit_price: p.unit_price || 0,
      alert_threshold: p.alert_threshold || 5,
      category: p.category || 'Divers',
      unit: p.unit || 'unité',
      multiplier: p.multiplier || 1,
      packaging_name: p.packaging_name || '',
      lot_quantity: p.lot_quantity || 0,
      lot_price: p.lot_price || 0,
      trade_type: p.trade_type || (
        (p.lot_quantity && p.lot_quantity > 1) || p.packaging_name === 'pack' || p.packaging_name === 'fardeau'
          ? 'semi_wholesale'
          : (p.multiplier && p.multiplier > 1) || p.unit === 'carton' || p.unit === 'sac' || p.packaging_name === 'carton' || p.packaging_name === 'sac'
          ? 'wholesale'
          : 'retail'
      ),
    })
    setIsProductModalOpen(true)
  }

  const handleSaveProduct = async () => {
    setSaving(true)
    try {
      const stockVal = Number(formData.initial_stock) || 0
      const body = {
        id: editingProduct?.id,
        name: formData.name,
        initial_stock: stockVal,
        current_stock: stockVal,
        unit_cost: Number(formData.unit_cost) || 0,
        unit_price: Number(formData.unit_price) || 0,
        alert_threshold: Number(formData.alert_threshold) || 5,
        category: formData.category,
        unit: formData.unit,
        multiplier: Number(formData.multiplier) || 1,
        packaging_name: formData.packaging_name || '',
        lot_quantity: Number(formData.lot_quantity) || 0,
        lot_price: Number(formData.lot_price) || 0,
        trade_type: formData.trade_type,
      }

      const res = await fetch('/api/stock', {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
        body: JSON.stringify(body),
      })

      const savedData = res.ok ? await res.json() : null
      const finalProduct: Product = savedData?.product || {
        ...body,
        id: editingProduct?.id || `stk_${Date.now()}`,
        shop_id: shopId,
        stock_tracked: true,
        current_stock: stockVal,
      }

      // Mise à jour optimiste immédiate dans la liste affichée
      setProducts(prev => {
        const targetId = editingProduct?.id || finalProduct.id
        const index = prev.findIndex(p => p.id === targetId || (editingProduct && p.name.toLowerCase() === editingProduct.name.toLowerCase()))
        if (index >= 0) {
          const next = [...prev]
          next[index] = { ...next[index], ...finalProduct, current_stock: stockVal }
          return next
        }
        return [finalProduct, ...prev]
      })

      saveOfflineProduct(shopId, finalProduct as any)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cahier_stock_updated'))
      }

      setIsProductModalOpen(false)
      setEditingProduct(null)
      loadStock()
    } catch (err) {
      console.error('Erreur sauvegarde produit:', err)
    } finally {
      setSaving(false)
    }
  }

  // Ajustement optimiste fluide avec debounce anti-rebond
  const handleAdjustStock = useCallback((id: string, delta: number) => {
    let nextStock = 0
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const curr = p.current_stock ?? p.initial_stock ?? 0
          nextStock = Math.max(0, curr + delta)
          return { ...p, current_stock: nextStock }
        }
        return p
      })
    )

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/stock', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
          body: JSON.stringify({ id, current_stock: nextStock }),
        })
      } catch (err) {
        console.error('Erreur mise à jour stock:', err)
        loadStock()
      }
    }, 400)
  }, [shopId, loadStock])

  const handleDeleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
    try {
      await fetch(`/api/stock?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-shop-id': shopId },
      })
    } catch (err) {
      console.error('Erreur suppression produit:', err)
    }
  }

  const handleClearAllStock = async () => {
    if (!window.confirm('⚠️ Êtes-vous certain de vouloir supprimer TOUS les produits du stock ? Cette action est irréversible et remettra le stock à zéro.')) {
      return
    }
    setProducts([])
    clearOfflineProducts(shopId)
    try {
      await fetch('/api/stock/reset', {
        method: 'POST',
        headers: { 'x-shop-id': shopId },
      })
    } catch (err) {
      console.error('Erreur reset stock:', err)
    }
  }

  // ── Valeurs mémorisées (Zero lag sur mobile) ──
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category || 'Divers')))
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim() && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (categoryFilter !== 'TOUT' && (p.category || 'Divers') !== categoryFilter) {
        return false
      }
      if (isLowStockOnly) {
        const curr = p.current_stock ?? p.initial_stock ?? 0
        if (curr > (p.alert_threshold ?? 5)) return false
      }
      return true
    })
  }, [products, searchQuery, categoryFilter, isLowStockOnly])

  const lowStockCount = useMemo(() => {
    return products.filter((p) => {
      const curr = p.current_stock ?? p.initial_stock ?? 0
      return curr > 0 && curr <= (p.alert_threshold ?? 5)
    }).length
  }, [products])

  const outOfStockCount = useMemo(() => {
    return products.filter((p) => {
      const curr = p.current_stock ?? p.initial_stock ?? 0
      return curr <= 0
    }).length
  }, [products])

  return (
    <div className="space-y-4">
      <StockAlertBanner
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        onFilterLowStock={() => setIsLowStockOnly((prev) => !prev)}
      />

      <StockToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categories={categories}
        onAddProduct={handleOpenAddModal}
        onOpenRestockAdvisor={() => setIsRestockModalOpen(true)}
        onExportCSV={() => exportSalesToCSV(filteredProducts as any, `Inventaire_Stock_${shopId}`)}
        onClearAllStock={handleClearAllStock}
        hasProducts={products.length > 0}
        isEmployee={isEmployee}
      />

      <StockTable
        products={filteredProducts}
        onAdjustStock={handleAdjustStock}
        onEditProduct={handleOpenEditModal}
        onDeleteProduct={handleDeleteProduct}
        isEmployee={isEmployee}
      />

      {isProductModalOpen && (
        <ProductModal
          key={editingProduct ? `edit_${editingProduct.id}` : 'new_product_modal'}
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false)
            setEditingProduct(null)
          }}
          editingItem={editingProduct as any}
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          onSave={handleSaveProduct}
          orphanPastSales={0}
          deductPastSales={deductPastSales}
          setDeductPastSales={setDeductPastSales}
        />
      )}

      {isRestockModalOpen && (
        <RestockAdvisorModal
          isOpen={isRestockModalOpen}
          onClose={() => setIsRestockModalOpen(false)}
          products={products}
          sales={getOfflineSales(shopId)}
          shopName="Ma Boutique"
        />
      )}
    </div>
  )
}
