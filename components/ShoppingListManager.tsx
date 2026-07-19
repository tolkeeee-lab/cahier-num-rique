'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Plus, Trash2, CheckSquare, Square, Share2, AlertTriangle, Check, Sparkles, RefreshCw } from 'lucide-react'

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unitCost: number
  isAutoSuggested?: boolean
  isChecked: boolean
}

interface Product {
  id: string
  name: string
  initial_stock: number
  alert_threshold: number
  unit_cost: number
  category?: string
  unit?: string
}

interface ShoppingListManagerProps {
  shopId?: string
  onConvertToStockPurchase?: (text: string) => Promise<void>
  onError?: (err: string) => void
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(price) + ' F'
}

export function ShoppingListManager({ 
  shopId = 'default-shop', 
  onConvertToStockPurchase,
  onError 
}: ShoppingListManagerProps) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  // Formulaire ajout manuel
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState('')
  const [converting, setConverting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Clé localStorage pour la liste de courses
  const storageKey = `cahier_shopping_list_${shopId}`

  // Charger les données de stock et la liste de courses enregistrée
  const loadData = useCallback(async () => {
    try {
      // 1. Charger le stock pour trouver les alertes
      const response = await fetch('/api/stock', {
        headers: { 'x-shop-id': shopId }
      })
      if (response.ok) {
        const data = await response.json()
        const productsList: Product[] = data.products || []
        // Filtrer les produits sous ou au niveau du seuil d'alerte
        const alerts = productsList.filter(p => p.initial_stock <= p.alert_threshold)
        setLowStockProducts(alerts)
      }
    } catch (err) {
      console.error('Erreur chargement stock alertes:', err)
    }

    // 2. Charger les items enregistrés dans le localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          setItems(JSON.parse(saved))
        } catch (e) {
          setItems([])
        }
      }
    }
  }, [shopId, storageKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Sauvegarder dans localStorage à chaque modification
  const saveItems = (newItems: ShoppingItem[]) => {
    setItems(newItems)
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(newItems))
    }
  }

  // Ajouter un item manuellement
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const qtyNum = Math.max(1, parseInt(quantity) || 1)
    const costNum = Math.max(0, parseInt(unitCost) || 0)

    const newItem: ShoppingItem = {
      id: `shop_item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      quantity: qtyNum,
      unitCost: costNum,
      isChecked: false
    }

    saveItems([...items, newItem])
    setName('')
    setQuantity('1')
    setUnitCost('')
  }

  // Ajouter une suggestion d'alerte de stock à la liste de courses
  const handleAddAlertProduct = (prod: Product) => {
    // Vérifier s'il est déjà dans la liste
    if (items.some(i => i.name.toLowerCase() === prod.name.toLowerCase())) {
      return
    }

    const recommendedQty = Math.max(5, (prod.alert_threshold * 2) - prod.initial_stock)

    const newItem: ShoppingItem = {
      id: `auto_item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: prod.name,
      quantity: recommendedQty,
      unitCost: prod.unit_cost || 0,
      isAutoSuggested: true,
      isChecked: false
    }

    saveItems([...items, newItem])
  }

  // Tout ajouter depuis les alertes de stock
  const handleAddAllAlerts = () => {
    const existingNames = new Set(items.map(i => i.name.toLowerCase()))
    const newItemsToAdd: ShoppingItem[] = []

    lowStockProducts.forEach(prod => {
      if (!existingNames.has(prod.name.toLowerCase())) {
        const recommendedQty = Math.max(5, (prod.alert_threshold * 2) - prod.initial_stock)
        newItemsToAdd.push({
          id: `auto_item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: prod.name,
          quantity: recommendedQty,
          unitCost: prod.unit_cost || 0,
          isAutoSuggested: true,
          isChecked: false
        })
      }
    })

    if (newItemsToAdd.length > 0) {
      saveItems([...items, ...newItemsToAdd])
    }
  }

  // Cocher / Décocher
  const toggleCheck = (id: string) => {
    saveItems(items.map(i => i.id === id ? { ...i, isChecked: !i.isChecked } : i))
  }

  // Supprimer un item
  const handleDelete = (id: string) => {
    saveItems(items.filter(i => i.id !== id))
  }

  // Vider la liste
  const handleClearAll = () => {
    if (confirm("Voulez-vous réinitialiser votre liste de courses ?")) {
      saveItems([])
    }
  }

  // Partager sur WhatsApp
  const handleShareWhatsApp = () => {
    if (items.length === 0) return

    let msg = `🛒 *LISTE DE COURSES - RAVITAILLEMENT BOUTIQUE*\n`
    msg += `📅 *Date :* ${new Date().toLocaleDateString('fr-FR')}\n\n`
    
    let totalEst = 0
    items.forEach((item) => {
      const status = item.isChecked ? '✅' : '⏳'
      const itemTotal = item.quantity * item.unitCost
      totalEst += itemTotal

      msg += `${status} *${item.name}* : ${item.quantity} ${item.unitCost > 0 ? `à ${formatPrice(item.unitCost)} (Total: ${formatPrice(itemTotal)})` : ''}\n`
    })

    if (totalEst > 0) {
      msg += `\n💰 *Budget estimé total :* ${formatPrice(totalEst)}\n`
    }
    msg += `\n_Envoyé depuis le Cahier Numérique_`

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  // Convertir les items cochés en écriture d'achat stock au Stylo Vert
  const handleConvertToPurchase = async () => {
    const checkedItems = items.filter(i => i.isChecked)
    if (checkedItems.length === 0) {
      onError?.("Veuillez cocher au moins un article acheté dans votre liste.")
      return
    }

    setConverting(true)
    setSuccessMsg(null)
    try {
      // Générer le texte au format vert (ex: "achat 10 riz à 12000, 5 huile à 1500")
      const textParts = checkedItems.map(item => {
        if (item.unitCost > 0) {
          return `${item.quantity} ${item.name} à ${item.unitCost}`
        }
        return `${item.quantity} ${item.name}`
      })

      const textToSubmit = `achat ${textParts.join(', ')}`

      if (onConvertToStockPurchase) {
        await onConvertToStockPurchase(textToSubmit)
        // Retirer les items cochés de la liste
        const remaining = items.filter(i => !i.isChecked)
        saveItems(remaining)
        setSuccessMsg("✓ Achats enregistrés avec succès au Stylo Vert et stock mis à jour !")
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Erreur lors de la conversion des achats")
    } finally {
      setConverting(false)
    }
  }

  // Calcul du total de la liste
  const totalEstimatedBudget = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitCost), 0)
  const checkedBudget = items.filter(i => i.isChecked).reduce((acc, curr) => acc + (curr.quantity * curr.unitCost), 0)
  const checkedCount = items.filter(i => i.isChecked).length

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fbf9f4] font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-[#f5f1e8] flex items-center justify-between select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-emerald-700" />
          <div>
            <h2 className="font-handwritten text-2xl font-bold text-gray-900">
              Liste de Courses à Faire
            </h2>
            <p className="text-[9px] font-mono uppercase text-gray-400 tracking-wider">
              RAVITAILLEMENT DU STOCK ET ACHATS DE BOUTIQUE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <>
              <button
                onClick={handleShareWhatsApp}
                title="Envoyer la liste par WhatsApp"
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                onClick={handleClearAll}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Vider la liste"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
        {/* En-tête avec message de succès */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Section 1 : Suggestions d'Alerte de Stock */}
        {lowStockProducts.length > 0 && (
          <div className="bg-[#fffdf9] border border-amber-250 rounded-[28px] p-5 shadow-sm space-y-3 select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-handwritten text-lg font-bold">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Ravitaillement Recommandé ({lowStockProducts.length} produits en alerte)</span>
              </div>
              <button
                onClick={handleAddAllAlerts}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-1 transition-all"
              >
                <Sparkles className="w-3 h-3" /> Tout ajouter
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {lowStockProducts.map(prod => {
                const isAlreadyInList = items.some(i => i.name.toLowerCase() === prod.name.toLowerCase())
                return (
                  <button
                    key={prod.id}
                    disabled={isAlreadyInList}
                    onClick={() => handleAddAlertProduct(prod)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-sans font-semibold flex items-center gap-2 border transition-all ${
                      isAlreadyInList 
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default' 
                        : 'bg-white text-gray-800 border-amber-300 hover:border-amber-500 hover:shadow-sm'
                    }`}
                  >
                    <span>⚠️ {prod.name}</span>
                    <span className="text-[10px] font-mono text-amber-700 font-bold">({prod.initial_stock} u)</span>
                    {!isAlreadyInList && <Plus className="w-3.5 h-3.5 text-amber-600" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Section 2 : Formulaire d'ajout rapide d'un article */}
        <div className="bg-white border border-gray-200 rounded-[28px] p-5 shadow-sm">
          <h3 className="font-handwritten text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            ✏️ Ajouter un article à la liste
          </h3>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-[9px] uppercase font-bold text-gray-400 font-sans tracking-wider mb-1">
                Article / Produit
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Sacs emballage 10kg, Huile Dinor..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#faf7f0] border border-gray-200 rounded-xl text-xs outline-none focus:border-gray-400"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[9px] uppercase font-bold text-gray-400 font-sans tracking-wider mb-1">
                Quantité
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#faf7f0] border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-gray-400"
              />
            </div>

            <div className="sm:col-span-4 flex gap-2">
              <div className="flex-grow">
                <label className="block text-[9px] uppercase font-bold text-gray-400 font-sans tracking-wider mb-1">
                  Prix unit. (Estimé)
                </label>
                <input
                  type="number"
                  placeholder="0 F"
                  value={unitCost}
                  onChange={e => setUnitCost(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#faf7f0] border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-gray-400"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Section 3 : La Liste de Courses (Checklist) */}
        <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-handwritten text-xl font-bold text-gray-800 flex items-center gap-2">
              📋 Ma Liste d'Achats ({items.length} article{items.length > 1 ? 's' : ''})
            </h3>
            {totalEstimatedBudget > 0 && (
              <div className="text-right">
                <span className="text-[9px] font-bold uppercase text-gray-400 font-sans block">Budget estimé</span>
                <span className="text-sm font-bold font-mono text-gray-800">{formatPrice(totalEstimatedBudget)}</span>
              </div>
            )}
          </div>

          {items.length > 0 ? (
            <div className="divide-y divide-gray-150">
              {items.map(item => {
                const itemTotal = item.quantity * item.unitCost
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`py-3.5 px-3 flex items-center justify-between cursor-pointer rounded-xl transition-colors select-none ${
                      item.isChecked ? 'bg-emerald-50 bg-opacity-40' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleCheck(item.id) }}
                        className="text-gray-400 hover:text-emerald-600 transition-colors"
                      >
                        {item.isChecked ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-300" />
                        )}
                      </button>

                      <div className={item.isChecked ? 'line-through text-gray-400' : 'text-gray-800'}>
                        <span className="font-bold text-xs">{item.name}</span>
                        {item.isAutoSuggested && (
                          <span className="ml-2 text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-sans font-bold no-underline inline-block">
                            Alerte Stock
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono text-xs">
                        <span className="font-bold text-gray-900">{item.quantity} u</span>
                        {item.unitCost > 0 && (
                          <span className="text-gray-500 block text-[10px]">
                            à {formatPrice(item.unitCost)} = <strong className="text-gray-800">{formatPrice(itemTotal)}</strong>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                        className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <ShoppingBag className="w-10 h-10 text-gray-300 mb-2" />
              <p className="font-handwritten text-xl text-gray-500 font-bold">Votre liste de courses est vide.</p>
              <p className="text-xs text-gray-400 mt-1">
                Ajoutez des articles ci-dessus ou cliquez sur les suggestions d'alerte de stock.
              </p>
            </div>
          )}

          {/* Action de Validation de la Liste */}
          {items.length > 0 && (
            <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#fdfaf2] p-4 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-gray-700 block">
                  {checkedCount} article{checkedCount > 1 ? 's' : ''} coché{checkedCount > 1 ? 's' : ''} (Acheté{checkedCount > 1 ? 's' : ''})
                </span>
                {checkedBudget > 0 && (
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    Total des achats faits : {formatPrice(checkedBudget)}
                  </span>
                )}
              </div>

              {onConvertToStockPurchase && (
                <button
                  disabled={checkedCount === 0 || converting}
                  onClick={handleConvertToPurchase}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all ${
                    checkedCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {converting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>🖊️ Saisir au Stylo Vert (Valider Achats)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
