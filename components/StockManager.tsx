'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { StockAlertBanner } from '@/components/stock/StockAlertBanner'
import { StockToolbar } from '@/components/stock/StockToolbar'
import { StockTable } from '@/components/stock/StockTable'
import { ProductModal } from '@/components/stock/ProductModal'
import { RestockAdvisorModal } from '@/components/stock/RestockAdvisorModal'
import { ProductMergeModal } from '@/components/stock/ProductMergeModal'
import { SmartProductQuickAdd, FinancialImpactOption } from '@/components/stock/SmartProductQuickAdd'
import { RealValueCalculatorModal } from '@/components/stock/RealValueCalculatorModal'
import { ExpressAdjustmentModal } from '@/components/stock/ExpressAdjustmentModal'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'
import { StockFormState } from '@/components/stock/types'
import { exportProductsToCSV } from '@/lib/exportUtils'
import {
  clearOfflineProducts,
  saveOfflineProduct,
  deleteOfflineProduct,
  getOfflineSales,
  getOfflineProducts,
  replaceOfflineProducts,
  saveOfflineSale,
  generateOfflineId,
  OfflineSale,
} from '@/lib/offlineDb'
import { getTodayDateString } from '@/lib/dateUtils'
import { audioFeedback } from '@/lib/audioFeedback'
import { findDuplicateCandidates } from '@/lib/productUtils'

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
  barcode?: string
  trade_type?: 'retail' | 'semi_wholesale' | 'wholesale'
  wholesale_price?: number
  half_package_price?: number
  quarter_package_price?: number
  package_cost?: number
  shop_id?: string
  stock_tracked?: boolean
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
  barcode: '',
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
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [calculatorProduct, setCalculatorProduct] = useState<Product | null>(null)
  const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState(false)
  const [activePairIndex, setActivePairIndex] = useState(0)
  const [merging, setMerging] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<StockFormState>(defaultFormData)
  const [saving, setSaving] = useState(false)
  const [deductPastSales, setDeductPastSales] = useState(false)

  // États pour l'Ajustement Express (Casse, Perte, Conso perso, Achat carton)
  const [expressItem, setExpressItem] = useState<any | null>(null)
  const [expressType, setExpressType] = useState<'in' | 'out'>('out')
  const [expressQty, setExpressQty] = useState<number>(1)
  const [expressReason, setExpressReason] = useState<string>('damage')
  const [expressUnitCost, setExpressUnitCost] = useState<string>('')
  const [expressNotes, setExpressNotes] = useState<string>('')
  const [isAdjustingExpress, setIsAdjustingExpress] = useState<boolean>(false)

  // Références anti-rebond par produit pour ajustements de stock sur réseaux instables
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const productsRef = useRef<Product[]>(products)

  useEffect(() => {
    return () => {
      debounceTimersRef.current.forEach((t) => clearTimeout(t))
      debounceTimersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    productsRef.current = products
  }, [products])

  const loadStock = useCallback(async () => {
    try {
      const res = await fetch('/api/stock', {
        headers: { 'x-shop-id': shopId },
      })
      if (res.ok) {
        const data = await res.json()
        const prods = data.products || []
        setProducts(prods)
        if (prods.length > 0) {
          replaceOfflineProducts(shopId, prods as any)
        }
        return
      }
      // Si la réponse n'est pas ok, repli sur le cache local
      const local = getOfflineProducts(shopId)
      if (local && local.length > 0) setProducts(local as any)
    } catch (err: any) {
      console.warn('Erreur chargement stock distant, repli sur le stockage local:', err)
      const local = getOfflineProducts(shopId)
      if (local && local.length > 0) {
        setProducts(local as any)
      } else if (onError) {
        onError(err.message)
      }
    }
  }, [shopId, onError])

  useEffect(() => {
    loadStock()
  }, [loadStock])

  const handleOpenAddModal = () => {
    const input = document.getElementById('smart-product-quick-add-input') as HTMLInputElement | null
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' })
      input.focus()
    }
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
      barcode: p.barcode || '',
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
        barcode: formData.barcode?.trim() || undefined,
        trade_type: formData.trade_type,
      }

      const finalProduct: Product = {
        ...body,
        id: editingProduct?.id || `stk_${Date.now()}`,
        shop_id: shopId,
        stock_tracked: true,
        current_stock: stockVal,
      }

      // 1. Sauvegarde locale immédiate (Offline-First garanti même sans réseau)
      saveOfflineProduct(shopId, finalProduct as any)

      // 2. Mise à jour optimiste immédiate dans la liste affichée
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cahier_stock_updated'))
      }

      setIsProductModalOpen(false)
      setEditingProduct(null)

      // 3. Synchronisation serveur en arrière-plan si réseau disponible
      try {
        const res = await fetch('/api/stock', {
          method: editingProduct ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const savedData = await res.json()
          if (savedData?.product) {
            saveOfflineProduct(shopId, savedData.product as any)
          }
        }
      } catch (netErr) {
        console.warn('Mode hors-ligne : produit enregistré localement, synchronisation en attente.', netErr)
      }
      } catch (err) {
      console.error('Erreur sauvegarde produit:', err)
    } finally {
      setSaving(false)
    }
  }

  // Gestion de la détection de code-barres caméra
  const handleBarcodeDetected = (codeOrText: string) => {
    setShowBarcodeScannerModal(false)
    const cleanCode = codeOrText.trim()
    if (!cleanCode) return

    // 1. Chercher si un produit en stock a déjà ce code-barres
    const foundByBarcode = products.find(p => p.barcode && p.barcode.trim() === cleanCode)
    if (foundByBarcode) {
      setSearchQuery(foundByBarcode.name)
      audioFeedback.playInkStamp()
      return
    }

    // 2. Chercher par nom si le texte scanné correspond à un produit connu
    const foundByName = products.find(p => p.name.toLowerCase().trim() === cleanCode.toLowerCase())
    if (foundByName) {
      setSearchQuery(foundByName.name)
      audioFeedback.playInkStamp()
      return
    }

    // 3. Produit inconnu : filtrer la liste avec le code pour faciliter l'ajout
    setSearchQuery(cleanCode)
    audioFeedback.playTick()
  }

  // Association rapide d'un code-barres à un produit existant
  const handleAssociateBarcode = (productId: string, barcode: string) => {
    const target = products.find(p => p.id === productId)
    if (!target) return
    const updated = { ...target, barcode }
    setProducts(prev => prev.map(p => p.id === productId ? updated : p))
    saveOfflineProduct(shopId, updated as any)
    try {
      fetch('/api/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
        body: JSON.stringify({ id: productId, barcode }),
      }).catch(() => {})
    } catch {}
    setShowBarcodeScannerModal(false)
    audioFeedback.playInkStamp()
  }

  // Ajout rapide magique (1 phrase) avec détection de réapprovisionnement automatique et liaison trésorerie
  const handleSmartAddProduct = async (
    productData: StockFormState,
    existingIdToRestock?: string,
    financialImpact?: FinancialImpactOption
  ) => {
    try {
      const existing = existingIdToRestock ? products.find(p => p.id === existingIdToRestock) : null
      const currentStock = existing ? (existing.current_stock ?? existing.initial_stock ?? 0) : 0
      const addedStock = Number(productData.initial_stock) || 0
      const newTotalStock = existing ? currentStock + addedStock : addedStock

      const body = {
        id: existing?.id,
        name: productData.name,
        initial_stock: newTotalStock,
        current_stock: newTotalStock,
        unit_cost: Number(productData.unit_cost) || (existing?.unit_cost || 0),
        unit_price: Number(productData.unit_price) || (existing?.unit_price || 0),
        alert_threshold: Number(productData.alert_threshold) || (existing?.alert_threshold || 5),
        category: productData.category || existing?.category || 'Divers',
        unit: productData.unit || existing?.unit || 'unité',
        multiplier: Number(productData.multiplier) || (existing?.multiplier || 1),
        packaging_name: productData.packaging_name || existing?.packaging_name || '',
        lot_quantity: Number(productData.lot_quantity) || (existing?.lot_quantity || 0),
        lot_price: Number(productData.lot_price) || (existing?.lot_price || 0),
        trade_type: productData.trade_type || existing?.trade_type || 'retail',
        wholesale_price: productData.wholesale_price || existing?.wholesale_price || 0,
        half_package_price: productData.half_package_price || existing?.half_package_price || 0,
        quarter_package_price: productData.quarter_package_price || existing?.quarter_package_price || 0,
      }

      const finalProduct: Product = {
        ...body,
        id: existing?.id || `stk_${Date.now()}`,
        shop_id: shopId,
        stock_tracked: true,
        current_stock: newTotalStock,
      }

      // 1. Sauvegarde locale immédiate (Offline-First)
      saveOfflineProduct(shopId, finalProduct as any)

      // 2. Mise à jour optimiste immédiate dans la liste affichée
      setProducts(prev => {
        const targetId = existing?.id || finalProduct.id
        const index = prev.findIndex(p => p.id === targetId || p.name.toLowerCase() === finalProduct.name.toLowerCase())
        if (index >= 0) {
          const next = [...prev]
          next[index] = { ...next[index], ...finalProduct, current_stock: newTotalStock }
          return next
        }
        return [finalProduct, ...prev]
      })

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cahier_stock_updated'))
      }

      // 3. Liaison automatique Trésorerie : Sortie de Caisse ou Crédit Fournisseur
      if (financialImpact && financialImpact.type !== 'none' && financialImpact.amount > 0) {
        const isCredit = financialImpact.type === 'supplier_credit'
        const supplier = financialImpact.supplierName?.trim() || 'Fournisseur Grossiste'
        const now = new Date()

        const finSale: OfflineSale = {
          id: generateOfflineId(),
          shop_id: shopId,
          date: getTodayDateString(),
          time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          client: supplier,
          articles: [
            {
              name: productData.name,
              quantity: productData.packages_count || productData.initial_stock,
              unit_price:
                productData.multiplier > 1 && productData.package_cost
                  ? productData.package_cost
                  : productData.unit_cost,
              category: productData.category || 'Approvisionnement',
              packaging_type: productData.multiplier > 1 ? 'carton' : 'unit',
              pieces_count: productData.initial_stock,
            },
          ],
          total: financialImpact.amount,
          paid: isCredit ? 0 : financialImpact.amount,
          debt: isCredit ? financialImpact.amount : 0,
          status: isCredit ? 'debt' : 'paid',
          type: isCredit ? 'purchase_credit' : 'purchase_cash',
          pen_color: isCredit ? 'purple' : 'green',
          notes: isCredit
            ? `Achat Crédit Fournisseur (${supplier}) : ${productData.name} (${productData.initial_stock} pcs)`
            : `Achat Stock Cash : ${productData.name} (${productData.initial_stock} pcs)`,
          category: 'Approvisionnement Stock',
          created_at: now.toISOString(),
          is_synced: false,
        }

        saveOfflineSale(shopId, finSale)

        try {
          fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
            body: JSON.stringify(finSale),
          }).catch(() => {})
        } catch {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cahier_sale_created'))
          window.dispatchEvent(new CustomEvent('cahier_sales_updated'))
        }
      }

      // 4. Synchronisation serveur du produit en arrière-plan
      try {
        const res = await fetch('/api/stock', {
          method: existing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const savedData = await res.json()
          if (savedData?.product) {
            saveOfflineProduct(shopId, savedData.product as any)
          }
        }
      } catch (netErr) {
        console.warn('Mode hors-ligne : produit enregistré localement, synchronisation en attente.', netErr)
      }
    } catch (err) {
      console.error('Erreur ajout rapide produit:', err)
      if (onError && err instanceof Error) onError(err.message)
    }
  }

  // Ajustement optimiste fluide avec debounce anti-rebond et ref synchronisée
  const handleAdjustStock = useCallback((id: string, delta: number) => {
    const currentProds = productsRef.current
    const targetProd = currentProds.find(p => p.id === id)
    if (!targetProd) return

    const curr = targetProd.current_stock ?? targetProd.initial_stock ?? 0
    const nextStock = Math.max(0, curr + delta)
    const updatedProd = { ...targetProd, current_stock: nextStock }

    // 1. Mise à jour immédiate de la ref et du state
    productsRef.current = productsRef.current.map(p => p.id === id ? updatedProd : p)
    setProducts(prev => prev.map(p => p.id === id ? updatedProd : p))

    // 2. Sauvegarde immédiate dans le cache local
    saveOfflineProduct(shopId, updatedProd as any)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cahier_stock_updated'))
    }

    // 3. Debounce individuel par produit pour éviter l'écrasement multi-articles
    const existingTimer = debounceTimersRef.current.get(id)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(async () => {
      debounceTimersRef.current.delete(id)
      const latestProd = productsRef.current.find(p => p.id === id)
      const stockToSend = latestProd?.current_stock ?? nextStock
      try {
        await fetch('/api/stock', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
          body: JSON.stringify({ id, name: targetProd.name, current_stock: stockToSend }),
        })
      } catch (err) {
        console.warn('Mode hors-ligne : ajustement stock enregistré localement.', err)
      }
    }, 400)

    debounceTimersRef.current.set(id, timer)
  }, [shopId])

  const handleOpenExpressAdjustment = (product: Product, type: 'in' | 'out') => {
    setExpressItem(product)
    setExpressType(type)
    setExpressQty(1)
    setExpressReason(type === 'in' ? 'purchase' : 'damage')
    setExpressUnitCost(product.unit_cost ? String(product.unit_cost) : '')
    setExpressNotes('')
  }

  const handleSubmitExpressAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expressItem || expressQty <= 0) return
    setIsAdjustingExpress(true)

    try {
      const isOut = expressType === 'out'
      const delta = isOut ? -expressQty : expressQty
      const currentStock = expressItem.current_stock ?? expressItem.initial_stock ?? 0
      const nextStock = Math.max(0, currentStock + delta)
      const costNum = parseFloat(expressUnitCost) || expressItem.unit_cost || 0

      // 1. Mise à jour immédiate du produit en local
      const updatedProduct = { ...expressItem, current_stock: nextStock }
      saveOfflineProduct(shopId, updatedProduct as any)
      setProducts(prev => prev.map(p => p.id === expressItem.id ? updatedProduct : p))
      productsRef.current = productsRef.current.map(p => p.id === expressItem.id ? updatedProduct : p)

      // 2. Création de l'écriture comptable correspondante
      let saleType = 'stock_in'
      let penColor = 'green'
      let totalAmount = 0
      let paidAmount = 0

      if (isOut) {
        if (expressReason === 'personal_use') {
          saleType = 'personal_use'
          penColor = 'red'
        } else {
          saleType = 'stock_damage'
          penColor = 'red'
        }
      } else {
        if (expressReason === 'purchase') {
          saleType = 'purchase_cash'
          penColor = 'green'
          totalAmount = Math.round(costNum * expressQty)
          paidAmount = totalAmount
        } else {
          saleType = 'stock_in'
          penColor = 'green'
        }
      }

      const todayIso = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
      const currentTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Porto-Novo', hour: '2-digit', minute: '2-digit' }).format(new Date())

      const reasonLabel = expressReason === 'purchase'
        ? 'Achat / Reconstitution de stock'
        : expressReason === 'damage'
        ? 'Casse / Perte / Produit périmé'
        : expressReason === 'personal_use'
        ? 'Consommation personnelle / Équipe'
        : 'Ajustement d\'inventaire'

      const noteFull = `${reasonLabel} : ${expressItem.name} x${expressQty}${expressNotes ? ` (${expressNotes})` : ''}`

      const offlineSaleRecord: OfflineSale = {
        id: generateOfflineId(),
        shop_id: shopId,
        date: todayIso,
        time: currentTime,
        client: isOut ? (expressReason === 'personal_use' ? 'Consommation interne' : 'Avarie / Perte') : 'Fournisseur Stock',
        total: totalAmount,
        paid: paidAmount,
        debt: 0,
        status: 'paid',
        type: saleType,
        pen_color: penColor,
        notes: noteFull,
        category: expressItem.category || 'Stock',
        articles: [{
          name: expressItem.name,
          quantity: expressQty,
          unit_price: costNum || expressItem.unit_price || 0,
          category: expressItem.category
        }],
        created_at: new Date().toISOString(),
        is_synced: false
      }

      saveOfflineSale(shopId, offlineSaleRecord)

      // Déclenchement des événements réactifs
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cahier_stock_updated'))
        window.dispatchEvent(new CustomEvent('cahier_sales_updated'))
      }

      try {
        audioFeedback.playInkStamp()
      } catch {}

      // 3. Synchronisation distante non-bloquante
      fetch('/api/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
        body: JSON.stringify({ id: expressItem.id, name: expressItem.name, current_stock: nextStock }),
      }).catch(err => console.warn('Sync stock hors ligne:', err))

      if (totalAmount > 0 || isOut) {
        fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
          body: JSON.stringify({
            shop_id: shopId,
            type: saleType,
            pen_color: penColor,
            overrideData: {
              articles: [{ name: expressItem.name, quantity: expressQty, unit_price: costNum }],
              total_amount: totalAmount,
              paid_amount: paidAmount,
              debt_amount: 0,
              client_name: offlineSaleRecord.client,
              category: expressItem.category || 'Stock',
              type: saleType
            },
            notes: noteFull
          })
        }).catch(err => console.warn('Sync vente ajustement hors ligne:', err))
      }

      setExpressItem(null)
    } catch (err: any) {
      console.error('Erreur ajustement express:', err)
      if (onError) onError(err.message)
    } finally {
      setIsAdjustingExpress(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
    deleteOfflineProduct(shopId, id)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cahier_stock_updated'))
    }
    try {
      await fetch(`/api/stock?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-shop-id': shopId },
      })
    } catch (err) {
      console.error('Erreur suppression produit distante:', err)
    }
  }

  const handleClearAllStock = async () => {
    if (!window.confirm('Êtes-vous certain de vouloir supprimer TOUS les produits du stock ? Cette action est irréversible et remettra le stock à zéro.')) {
      return
    }
    setProducts([])
    clearOfflineProducts(shopId)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cahier_stock_updated'))
    }
    try {
      await fetch('/api/stock/reset', {
        method: 'POST',
        headers: { 'x-shop-id': shopId },
      })
    } catch (err) {
      console.error('Erreur reset stock:', err)
    }
  }

  const handleOpenCalculator = (prod?: Product) => {
    setCalculatorProduct(prod || products[0] || null)
    setIsCalculatorOpen(true)
  }

  const handleSaveCalculator = async (updated: any) => {
    if (!calculatorProduct) return
    const updatedProd: Product = {
      ...calculatorProduct,
      ...updated,
    }

    // 1. Sauvegarde locale
    saveOfflineProduct(shopId, updatedProd as any)

    // 2. Mise à jour de la liste
    setProducts((prev) => prev.map((p) => (p.id === calculatorProduct.id ? updatedProd : p)))

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cahier_stock_updated'))
    }

    // 3. Sync distante
    try {
      await fetch('/api/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
        body: JSON.stringify(updatedProd),
      })
    } catch (err) {
      console.warn('Mode hors-ligne : tarification enregistrée localement', err)
    }

    setIsCalculatorOpen(false)
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

  const duplicatePairs = useMemo(() => {
    return findDuplicateCandidates(products.map(p => ({ id: p.id, name: p.name, category: p.category })))
  }, [products])

  const handleMergeProducts = async (sourceId: string, targetId: string) => {
    setMerging(true)
    try {
      // 1. Consolidation locale immédiate (Offline-First garanti)
      const sourceProd = products.find(p => p.id === sourceId)
      const targetProd = products.find(p => p.id === targetId)
      if (sourceProd && targetProd) {
        const combinedStock = (targetProd.current_stock ?? targetProd.initial_stock ?? 0) + (sourceProd.current_stock ?? sourceProd.initial_stock ?? 0)
        saveOfflineProduct(shopId, { ...targetProd, current_stock: combinedStock } as any)
        deleteOfflineProduct(shopId, sourceId)
        setProducts(prev => prev.filter(p => p.id !== sourceId).map(p => p.id === targetId ? { ...p, current_stock: combinedStock } : p))
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cahier_stock_updated'))
      }

      // 2. Synchronisation distante
      try {
        const res = await fetch('/api/stock/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': shopId },
          body: JSON.stringify({ sourceProductId: sourceId, targetProductId: targetId }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.warn('Sync fusion serveur échouée ou hors-ligne:', err?.error)
        }
      } catch (netErr) {
        console.warn('Mode hors-ligne : fusion effectuée localement.', netErr)
      }

      await loadStock()
      if (activePairIndex + 1 < duplicatePairs.length) {
        setActivePairIndex(prev => prev + 1)
      } else {
        setIsMergeModalOpen(false)
        setActivePairIndex(0)
      }
    } catch (err: any) {
      console.error('Erreur fusion doublons:', err)
      if (onError) onError(err.message)
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="space-y-4">
      <StockAlertBanner
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        onFilterLowStock={() => setIsLowStockOnly((prev) => !prev)}
      />

      {/* Saisie Magique de Produit en 1 seule ligne */}
      {!isEmployee && (
        <SmartProductQuickAdd
          existingProducts={products}
          onAddProduct={handleSmartAddProduct}
          onOpenBarcodeScanner={() => setShowBarcodeScannerModal(true)}
          disabled={saving}
        />
      )}

      <StockToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categories={categories}
        onAddProduct={handleOpenAddModal}
        onOpenBarcodeScanner={() => setShowBarcodeScannerModal(true)}
        onOpenRestockAdvisor={() => setIsRestockModalOpen(true)}
        onOpenCalculator={() => handleOpenCalculator()}
        onExportCSV={() => exportProductsToCSV(filteredProducts, `Stock_${shopId}`)}
        onClearAllStock={handleClearAllStock}
        hasProducts={products.length > 0}
        isEmployee={isEmployee}
        duplicateCount={duplicatePairs.length}
        onOpenMergeModal={() => {
          setActivePairIndex(0)
          setIsMergeModalOpen(true)
        }}
      />

      <StockTable
        products={filteredProducts}
        onAdjustStock={handleAdjustStock}
        onEditProduct={handleOpenEditModal}
        onDeleteProduct={handleDeleteProduct}
        onOpenCalculator={handleOpenCalculator}
        onOpenExpressAdjustment={handleOpenExpressAdjustment}
        isEmployee={isEmployee}
      />

      {isCalculatorOpen && (
        <RealValueCalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => {
            setIsCalculatorOpen(false)
            setCalculatorProduct(null)
          }}
          product={calculatorProduct as any}
          onSaveProduct={handleSaveCalculator}
        />
      )}

      {showBarcodeScannerModal && (
        <BarcodeScannerModal
          isOpen={showBarcodeScannerModal}
          onClose={() => setShowBarcodeScannerModal(false)}
          onDetected={handleBarcodeDetected}
          products={products as any}
          onAssociateBarcode={handleAssociateBarcode}
        />
      )}

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

      {isMergeModalOpen && (
        <ProductMergeModal
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          duplicatePairs={duplicatePairs}
          activePairIndex={activePairIndex}
          merging={merging}
          onMergeProducts={handleMergeProducts}
        />
      )}

      {expressItem && (
        <ExpressAdjustmentModal
          expressItem={expressItem}
          expressType={expressType}
          expressQty={expressQty}
          setExpressQty={setExpressQty}
          expressReason={expressReason}
          setExpressReason={setExpressReason}
          expressUnitCost={expressUnitCost}
          setExpressUnitCost={setExpressUnitCost}
          expressNotes={expressNotes}
          setExpressNotes={setExpressNotes}
          adjusting={isAdjustingExpress}
          onClose={() => setExpressItem(null)}
          onSubmit={handleSubmitExpressAdjustment}
        />
      )}
    </div>
  )
}
