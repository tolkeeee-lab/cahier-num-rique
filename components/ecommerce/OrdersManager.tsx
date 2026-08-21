'use client'

import React, { useState, useEffect } from 'react'
import { PackageCheck, Plus, Sparkles, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface EcomProduct {
  id: string
  name: string
  price: number
  cost: number
  category: string
  stock: number
  status: 'active' | 'draft'
}

interface EcomOrder {
  id: string
  client_name: string
  client_phone: string
  city: string
  product_name: string
  quantity: number
  total_price: number
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled'
  date: string
}

export function OrdersManager() {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'orders'>('products')

  // Produits E-Commerce sauvegardés en localStorage
  const [products, setProducts] = useState<EcomProduct[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('cumulu_ecom_products')
        if (local) return JSON.parse(local)
      } catch {}
    }
    return [
      { id: 'p1', name: 'Mini Hachoir Sans Fil USB', price: 9500, cost: 3500, category: 'Cuisine', stock: 24, status: 'active' },
      { id: 'p2', name: 'Brosse Lissante Chauffante', price: 15000, cost: 5000, category: 'Beauté', stock: 15, status: 'active' },
      { id: 'p3', name: 'Montre Connectée Étanche Ultra', price: 18000, cost: 7000, category: 'High-Tech', stock: 10, status: 'active' },
    ]
  })

  // Commandes E-Commerce
  const [orders, setOrders] = useState<EcomOrder[]>([
    { id: 'CMD-101', client_name: 'M. Kouassi Jean', client_phone: '+225 0707070707', city: 'Abidjan (Cocody)', product_name: 'Mini Hachoir Sans Fil USB', quantity: 2, total_price: 19000, status: 'pending', date: 'Aujourd\'hui 14:30' },
    { id: 'CMD-102', client_name: 'Mme Bamba Awa', client_phone: '+225 0505050505', city: 'Abidjan (Yopougon)', product_name: 'Brosse Lissante Chauffante', quantity: 1, total_price: 15000, status: 'shipped', date: 'Aujourd\'hui 11:15' },
    { id: 'CMD-103', client_name: 'Dr. Touré Ibrahim', client_phone: '+225 0101010101', city: 'Bouaké', product_name: 'Montre Connectée Étanche', quantity: 1, total_price: 18000, status: 'delivered', date: 'Hier 16:45' },
  ])

  // Formulaire d'ajout rapide
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProdName, setNewProdName] = useState('')
  const [newProdPrice, setNewProdPrice] = useState('')
  const [newProdCost, setNewProdCost] = useState('')
  const [newProdCategory, setNewProdCategory] = useState('Divers')
  const [newProdStock, setNewProdStock] = useState('10')

  useEffect(() => {
    try {
      localStorage.setItem('cumulu_ecom_products', JSON.stringify(products))
    } catch {}
  }, [products])

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProdName.trim()) return

    const newP: EcomProduct = {
      id: `p_${Date.now()}`,
      name: newProdName.trim(),
      price: parseFloat(newProdPrice) || 0,
      cost: parseFloat(newProdCost) || 0,
      category: newProdCategory,
      stock: parseInt(newProdStock, 10) || 0,
      status: 'active',
    }

    setProducts(prev => [newP, ...prev])
    setNewProdName('')
    setNewProdPrice('')
    setNewProdCost('')
    setShowAddModal(false)
  }

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const updateOrderStatus = (orderId: string, newStatus: EcomOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  const totalCatalogValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0)
  const totalOrdersAmount = orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + o.total_price : sum, 0)

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-6 animate-in fade-in duration-200">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-indigo-400 fill-indigo-400/20" />
            <span>Catalogue E-Commerce & Suivi des Commandes</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gérez vos fiches produits en ligne et suivez vos livraisons clients.
          </p>
        </div>

        {/* Sous-onglets */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold font-mono">
          <button
            onClick={() => setActiveSubTab('products')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'products' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            📦 Produits ({products.length})
          </button>
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'orders' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            🚚 Commandes ({orders.length})
          </button>
        </div>
      </div>

      {/* VUE 1 : PRODUITS */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 font-mono">
              Valeur marchande du stock : <strong className="text-emerald-400">{formatPrice(totalCatalogValue)}</strong>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Produit E-com</span>
            </button>
          </div>

          {/* Grille des produits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => {
              const profit = p.price - p.cost
              const margin = p.price > 0 ? Math.round((profit / p.price) * 100) : 0

              return (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 space-y-3 transition-all shadow-md group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-full uppercase">
                        {p.category}
                      </span>
                      <h3 className="font-extrabold text-sm text-white mt-1.5">{p.name}</h3>
                    </div>

                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Prix & Marges */}
                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 grid grid-cols-2 gap-2 text-center text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Prix Vente</span>
                      <strong className="text-amber-300 font-bold">{formatPrice(p.price)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Marge Nette</span>
                      <strong className="text-emerald-400 font-bold">+{margin}% ({formatPrice(profit)})</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Stock dispo : <strong className="text-white">{p.stock} unités</strong></span>
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      En ligne
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      )}

      {/* VUE 2 : COMMANDES CLIENTS */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Total des ventes livrées : <strong className="text-emerald-400">{formatPrice(totalOrdersAmount)}</strong></span>
            <span>{orders.length} commande(s) au total</span>
          </div>

          <div className="space-y-3">
            {orders.map(o => (
              <div
                key={o.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-sky-400">{o.id}</span>
                    <span className="text-xs text-slate-400 font-mono">• {o.date}</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-white">{o.client_name} ({o.client_phone})</h4>
                  <p className="text-xs text-slate-400">
                    📍 {o.city} — Article : <strong className="text-slate-200">{o.quantity}x {o.product_name}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-500 block uppercase">Total</span>
                    <strong className="text-sm font-black text-emerald-400">{formatPrice(o.total_price)}</strong>
                  </div>

                  {/* Sélecteur de statut */}
                  <select
                    value={o.status}
                    onChange={e => updateOrderStatus(o.id, e.target.value as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono outline-none cursor-pointer border ${
                      o.status === 'delivered'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : o.status === 'shipped'
                        ? 'bg-sky-950 text-sky-300 border-sky-800'
                        : o.status === 'pending'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-red-950 text-red-300 border-red-800'
                    }`}
                  >
                    <option value="pending">⏳ En attente</option>
                    <option value="shipped">🚚 En livraison</option>
                    <option value="delivered">✅ Livrée & Payée</option>
                    <option value="cancelled">❌ Annulée</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Modale Ajout de Produit */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Ajouter un Produit E-Commerce</span>
            </h3>

            <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">Nom : *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sac à Dos Antivol USB"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">Prix Vente (FCFA) :</label>
                  <input
                    type="number"
                    placeholder="Ex: 12000"
                    value={newProdPrice}
                    onChange={e => setNewProdPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">Coût Achat (FCFA) :</label>
                  <input
                    type="number"
                    placeholder="Ex: 4500"
                    value={newProdCost}
                    onChange={e => setNewProdCost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-300 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">Catégorie :</label>
                  <input
                    type="text"
                    placeholder="Ex: Mode, High-Tech"
                    value={newProdCategory}
                    onChange={e => setNewProdCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">Stock Initial :</label>
                  <input
                    type="number"
                    value={newProdStock}
                    onChange={e => setNewProdStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md"
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
