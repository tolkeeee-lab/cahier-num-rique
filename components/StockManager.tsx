'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { StockAlertBanner } from '@/components/stock/StockAlertBanner'
import { StockToolbar } from '@/components/stock/StockToolbar'
import { StockTable } from '@/components/stock/StockTable'
import { ProductModal } from '@/components/stock/ProductModal'
import { StockFormState } from '@/components/stock/types'
import { exportSalesToCSV } from '@/lib/exportUtils'

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
  packaging_name: 'carton',
  lot_quantity: 0,
  lot_price: 0,
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<StockFormState>(defaultFormData)
  const [saving, setSaving] = useState(false)
  const [deductPastSales, setDeductPastSales] = useState(false)

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
  }, [loadStock])

  const handleOpenAddModal = () => {
    setEditingProduct(null)
    setFormData(defaultFormData)
    setIsProductModalOpen(true)
  }

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p)
    setFormData({
      name: p.name,
      initial_stock: p.initial_stock || 0,
      unit_cost: p.unit_cost || 0,
      unit_price: p.unit_price || 0,
      alert_threshold: p.alert_threshold || 5,
      category: p.category || 'Divers',
      unit: p.unit || 'unité',
      multiplier: 1,
      packaging_name: 'carton',
      lot_quantity: 0,
      lot_price: 0,
    })
    setIsProductModalOpen(true)
  }

  const handleSaveProduct = async () => {
    setSaving(true)
    try {
      const body = {
        id: editingProduct?.id,
        name: formData.name,
        initial_stock: Number(formData.initial_stock) || 0,
        unit_cost: Number(formData.unit_cost) || 0,
        unit_price: Number(formData.unit_price) || 0,
        alert_threshold: Number(formData.alert_threshold) || 5,
        category: formData.category,
        unit: formData.unit,
      }

      await fetch('/api/stock', {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
        body: JSON.stringify(body),
      })

      setIsProductModalOpen(false)
      loadStock()
    } catch (err) {
      console.error('Erreur sauvegarde produit:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleAdjustStock = async (id: string, delta: number) => {
    const updated = products.map((p) => {
      if (p.id === id) {
        const curr = p.current_stock ?? p.initial_stock ?? 0
        return { ...p, current_stock: Math.max(0, curr + delta) }
      }
      return p
    })
    setProducts(updated)

    try {
      const p = updated.find((item) => item.id === id)
      if (p) {
        await fetch('/api/stock', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
          body: JSON.stringify({ id, current_stock: p.current_stock }),
        })
      }
    } catch (err) {
      console.error('Erreur mise à jour stock:', err)
    }
  }

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

  const categories = Array.from(new Set(products.map((p) => p.category || 'Divers')))

  const filteredProducts = products.filter((p) => {
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

  const lowStockCount = products.filter((p) => {
    const curr = p.current_stock ?? p.initial_stock ?? 0
    return curr > 0 && curr <= (p.alert_threshold ?? 5)
  }).length

  const outOfStockCount = products.filter((p) => {
    const curr = p.current_stock ?? p.initial_stock ?? 0
    return curr <= 0
  }).length

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
        onExportCSV={() => exportSalesToCSV(filteredProducts as any, `Inventaire_Stock_${shopId}`)}
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
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
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
    </div>
  )
}
