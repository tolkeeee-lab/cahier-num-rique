'use client'

import React, { useState } from 'react'
import { ShoppingBag, Truck, CheckCircle2, Clock, XCircle, Search, Plus, Package, Phone, MapPin } from 'lucide-react'

export interface OrderItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerCity: string
  items: OrderItem[]
  totalAmount: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
  trackingNumber?: string
  paymentMethod: 'Carte Bancaire' | 'Paiement à la livraison' | 'Wave / Mobile Money'
}

const INITIAL_ORDERS: Order[] = [
  {
    id: '1',
    orderNumber: 'CMD-8492',
    customerName: 'Amina Diallo',
    customerPhone: '+221 77 123 45 67',
    customerCity: 'Dakar',
    items: [
      { id: 'p1', name: 'Brosse Soufflante Ionique 5-en-1', quantity: 1, unitPrice: 44.99 },
    ],
    totalAmount: 44.99,
    status: 'shipped',
    createdAt: '21/08/2026 14:30',
    trackingNumber: 'DKR-EXP-9021',
    paymentMethod: 'Paiement à la livraison',
  },
  {
    id: '2',
    orderNumber: 'CMD-8493',
    customerName: 'Thomas Leroy',
    customerPhone: '+33 6 45 89 12 34',
    customerCity: 'Paris',
    items: [
      { id: 'p2', name: 'Mini Imprimante Thermique Portable', quantity: 2, unitPrice: 29.99 },
    ],
    totalAmount: 59.98,
    status: 'processing',
    createdAt: '21/08/2026 15:10',
    paymentMethod: 'Carte Bancaire',
  },
  {
    id: '3',
    orderNumber: 'CMD-8494',
    customerName: 'Fatou Sow',
    customerPhone: '+221 78 654 32 10',
    customerCity: 'Saint-Louis',
    items: [
      { id: 'p3', name: 'Correcteur Posture Intelligent', quantity: 1, unitPrice: 34.9 },
    ],
    totalAmount: 34.9,
    status: 'pending',
    createdAt: '21/08/2026 16:45',
    paymentMethod: 'Wave / Mobile Money',
  },
  {
    id: '4',
    orderNumber: 'CMD-8495',
    customerName: 'Marc Dubois',
    customerPhone: '+33 7 98 76 54 32',
    customerCity: 'Lyon',
    items: [
      { id: 'p4', name: 'Mélangeur Électrique Magnétique', quantity: 1, unitPrice: 24.99 },
    ],
    totalAmount: 24.99,
    status: 'delivered',
    createdAt: '20/08/2026 11:20',
    trackingNumber: 'FR-COL-44321',
    paymentMethod: 'Carte Bancaire',
  },
]

export const OrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Modal création commande rapide
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerCity, setNewCustomerCity] = useState('')
  const [newProductName, setNewProductName] = useState('Brosse Soufflante Ionique 5-en-1')
  const [newQuantity, setNewQuantity] = useState(1)
  const [newPrice, setNewPrice] = useState(44.99)
  const [newPayment, setNewPayment] = useState<'Carte Bancaire' | 'Paiement à la livraison' | 'Wave / Mobile Money'>('Paiement à la livraison')

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )
  }

  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomerName.trim()) return

    const newOrder: Order = {
      id: Date.now().toString(),
      orderNumber: `CMD-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: newCustomerName,
      customerPhone: newCustomerPhone,
      customerCity: newCustomerCity || 'Non spécifié',
      items: [{ id: 'p-new', name: newProductName, quantity: newQuantity, unitPrice: newPrice }],
      totalAmount: newQuantity * newPrice,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentMethod: newPayment,
    }

    setOrders([newOrder, ...orders])
    setShowAddModal(false)
    setNewCustomerName('')
    setNewCustomerPhone('')
    setNewCustomerCity('')
  }

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerCity.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    return matchSearch && matchStatus
  })

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> En attente
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <Package className="w-3 h-3" /> En préparation
          </span>
        )
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Truck className="w-3 h-3" /> Expédiée
          </span>
        )
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Livrée
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Annulée
          </span>
        )
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border border-cyan-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
              <ShoppingBag className="w-3.5 h-3.5" />
              Centre des Ventes & Expéditions
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Gestionnaire de Commandes & Vitrine
            </h1>
            <p className="text-sm text-gray-300">
              Suivez vos commandes clients en temps réel, synchronisez vos stocks et traitez les expéditions en un clic.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Commande</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par client, ville, n° de commande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterStatus === st
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-950/80 text-gray-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'all'
                ? 'Toutes'
                : st === 'pending'
                ? 'En attente'
                : st === 'processing'
                ? 'En prépa'
                : st === 'shipped'
                ? 'Expédiées'
                : st === 'delivered'
                ? 'Livrées'
                : 'Annulées'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-gray-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Commande</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Articles</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Paiement</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-gray-300">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-bold text-white whitespace-nowrap">
                    <div>{order.orderNumber}</div>
                    <span className="text-[10px] text-gray-500 font-normal">{order.createdAt}</span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-200">{order.customerName}</div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-cyan-400" /> {order.customerPhone}
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-400" /> {order.customerCity}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="text-gray-200">
                        <span className="font-bold text-cyan-300">{item.quantity}x</span> {item.name}
                      </div>
                    ))}
                  </td>

                  <td className="px-6 py-4 font-extrabold text-sm text-emerald-400 whitespace-nowrap">
                    {order.totalAmount.toFixed(2)} €
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-[11px] text-gray-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                      {order.paymentMethod}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(order.status)}</td>

                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 transition"
                    >
                      <option value="pending">En attente</option>
                      <option value="processing">En préparation</option>
                      <option value="shipped">Expédiée</option>
                      <option value="delivered">Livrée</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ajout Commande */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-white text-base">Ajouter une commande manuelle</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 font-medium mb-1">Nom complet du client *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Amina Diallo"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Téléphone</label>
                  <input
                    type="text"
                    placeholder="+221..."
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Ville</label>
                  <input
                    type="text"
                    placeholder="Dakar, Abidjan, Paris..."
                    value={newCustomerCity}
                    onChange={(e) => setNewCustomerCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Produit commandé</label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Prix Unitaire (€)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Méthode de Paiement</label>
                <select
                  value={newPayment}
                  onChange={(e) => setNewPayment(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="Paiement à la livraison">Paiement à la livraison</option>
                  <option value="Carte Bancaire">Carte Bancaire</option>
                  <option value="Wave / Mobile Money">Wave / Mobile Money</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition"
              >
                Enregistrer la commande
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
