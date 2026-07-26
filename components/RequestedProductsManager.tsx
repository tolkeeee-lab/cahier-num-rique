import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Share2, Sparkles, Check, Search, Send } from 'lucide-react'
import { formatCurrency } from '@/lib/currencyUtils'
import { recordRequestedProductInStorage, RequestedProduct } from '@/lib/requestedProductsUtils'

interface RequestedProductsManagerProps {
  shopId: string
  userRole?: string
}

export function RequestedProductsManager({
  shopId
}: RequestedProductsManagerProps) {
  const [items, setItems] = useState<RequestedProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [quickInput, setQuickInput] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Alimentation')
  const [estimatedPrice, setEstimatedPrice] = useState('')
  const [notes, setNotes] = useState('')

  // Storage key
  const storageKey = `cahier_requested_products_${shopId}`

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        setItems(JSON.parse(stored))
      } else {
        setItems([])
      }
    } catch { }
  }, [storageKey])

  const saveItems = (updated: RequestedProduct[]) => {
    setItems(updated)
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
    } catch { }
  }

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  const handleQuickAddHandwritten = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim()) return

    // Auto-detect price or clean text
    let cleanName = quickInput.trim()
    let price: number | undefined = undefined
    const priceMatch = cleanName.match(/(?:à\s*|:\s*)?(\d+)\s*(?:f|fcfa)?$/i)
    if (priceMatch) {
      price = parseInt(priceMatch[1], 10)
      cleanName = cleanName.replace(priceMatch[0], '').trim()
    }

    const updated = recordRequestedProductInStorage(shopId, cleanName, price)
    setItems(updated)
    setFeedbackMsg(`✓ Demande client « ${cleanName} » inscrite dans votre cahier !`)
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
      date: new Date().toISOString().slice(0, 10),
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
    if (!confirm("Supprimer cette demande de produit ?")) return
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

    let msg = `🛒 *LISTE DE PRODUITS RÉCLAMÉS PAR LES CLIENTS*\n`
    msg += `📍 *Point de Vente* : ${shopId}\n`
    msg += `📅 *Date* : ${new Date().toLocaleDateString('fr-FR')}\n`
    msg += `═════════════════════════\n`
    pendingItems.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.name}* (${item.requestCount} demandes clients)\n`
      if (item.estimatedPrice) msg += `   Prix estimé : ${formatCurrency(item.estimatedPrice)}\n`
    })
    msg += `═════════════════════════\n`
    msg += `✨ _À ajouter d'urgence au stock de la boutique !_`

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.requestCount - a.requestCount)

  const totalRequestsCount = items.reduce((sum, i) => sum + i.requestCount, 0)

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fbf9f4] p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 border border-amber-200 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700 animate-pulse" />
            <h2 className="font-handwritten text-2xl font-bold text-gray-900">
              Produits Demandés par les Clients
            </h2>
          </div>
          <p className="text-xs text-gray-500 font-sans mt-0.5">
            Notez ici les marchandises réclamées par vos clients que votre boutique ne vend pas encore.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Noter une Demande</span>
          </button>
          
          <a
            href={generateWhatsAppOrderLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Envoyer WhatsApp ({items.filter(i => i.status === 'pending').length})</span>
          </a>
        </div>
      </div>

      {/* Saisie Manuscrite au Cahier (Signature Stylo & Effet Papier) */}
      <div className="bg-[#fefcf6] border-2 border-amber-300 rounded-2xl p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🖊️</span>
            <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Saisie Manuscrite au Cahier des Demandes
            </span>
          </div>
          {feedbackMsg ? (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full animate-bounce">
              {feedbackMsg}
            </span>
          ) : (
            <span className="text-[9px] font-mono text-amber-800 bg-amber-100/70 border border-amber-200 px-2.5 py-0.5 rounded-full">
              Écriture libre • Détection automatique
            </span>
          )}
        </div>

        <form onSubmit={handleQuickAddHandwritten} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Écrivez directement ici comme dans votre cahier... (ex: Eau Possotomè 1.5L à 400 ou 2 Sacs de Riz 25kg)"
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            className="flex-1 px-4 py-2.5 text-base font-handwritten text-purple-950 bg-white border border-amber-300 rounded-xl outline-none focus:border-amber-500 shadow-inner placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={!quickInput.trim()}
            className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-md active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Écrire au Cahier</span>
          </button>
        </form>

        <p className="text-[10px] text-amber-800/80 font-sans italic flex items-center gap-1">
          <span>💡</span>
          <span>Astuce : Vous pouvez aussi écrire vos demandes depuis l'onglet principal <strong>Mon Cahier</strong> en tapant <code>demande client [nom du produit]</code>.</span>
        </p>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block">Articles Réclamés</span>
            <span className="text-xl font-bold font-mono text-gray-900">{items.length} références</span>
          </div>
          <div className="p-2 bg-amber-50 rounded-xl text-amber-700">📋</div>
        </div>

        <div className="bg-white border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] font-bold text-rose-800 uppercase tracking-wider block">Total Demandes Clients</span>
            <span className="text-xl font-bold font-mono text-rose-900">{totalRequestsCount} réclamations</span>
          </div>
          <div className="p-2 bg-rose-50 rounded-xl text-rose-700">🔥</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">À Commander</span>
            <span className="text-xl font-bold font-mono text-emerald-900">{items.filter(i => i.status === 'pending').length} articles</span>
          </div>
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">🛒</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un produit réclamé..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-250 rounded-xl text-xs outline-none focus:border-amber-500 font-sans shadow-xs"
        />
      </div>

      {/* Grid of Requested Products */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map(item => {
          const isHighDemand = item.requestCount >= 5
          return (
            <div
              key={item.id}
              className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3 transition-all ${
                isHighDemand ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200 hover:border-amber-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-sm text-gray-900 leading-snug">{item.name}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 whitespace-nowrap ${
                      isHighDemand
                        ? 'bg-rose-100 text-rose-800 border border-rose-250'
                        : 'bg-amber-100 text-amber-900 border border-amber-250'
                    }`}
                  >
                    🔥 {item.requestCount} demande{item.requestCount > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                  <span className="bg-gray-100 px-2 py-0.5 rounded-md font-semibold text-gray-700">{item.category}</span>
                  {item.estimatedPrice && (
                    <span className="text-emerald-800 font-bold">Prix : {formatCurrency(item.estimatedPrice)}</span>
                  )}
                </div>

                {item.notes && (
                  <p className="text-xs text-gray-600 bg-amber-50/60 p-2.5 border border-amber-150 rounded-xl font-sans leading-relaxed">
                    💡 {item.notes}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleIncrementCount(item.id)}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Ajouter 1 demande client supplémentaire"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+1 Demande</span>
                </button>

                <div className="flex items-center gap-1">
                  {item.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => handleMarkAsOrdered(item.id)}
                      className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Marquer comme commandé au fournisseur"
                    >
                      <Check className="w-3 h-3" />
                      <span>Commander</span>
                    </button>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-bold uppercase">
                      ✓ Commandé
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center space-y-2 bg-white rounded-2xl border border-gray-200">
            <span className="text-4xl">📋</span>
            <h3 className="font-handwritten text-xl font-bold text-gray-700">Aucune demande enregistrée</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Quand des clients demandent un produit non disponible en rayon, notez-le ici pour l'ajouter à votre prochain réapprovisionnement.
            </p>
          </div>
        )}
      </div>

      {/* Modal Ajout */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-xs">
          <div className="bg-[#fbf9f4] border border-amber-300 rounded-[28px] max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <span>📋 Enregistrer un Produit Réclamé par un Client</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <form onSubmit={handleAddRequestedProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1 uppercase text-[9px] tracking-wider">
                  Nom du Produit Réclamé *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Eau Possotomè 1.5L, Biscuit Oreos..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1 uppercase text-[9px] tracking-wider">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-semibold text-gray-800 outline-none"
                  >
                    <option value="Alimentation">Alimentation</option>
                    <option value="Boissons">Boissons</option>
                    <option value="Hygiène">Hygiène</option>
                    <option value="Détail">Détail</option>
                    <option value="Divers">Divers</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1 uppercase text-[9px] tracking-wider">
                    Prix Estimé (FCFA)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 500"
                    value={estimatedPrice}
                    onChange={e => setEstimatedPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 uppercase text-[9px] tracking-wider">
                  Notes / Remarques Client
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: 3 clients différents sont venus en réclamer ce matin"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-800 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-md"
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
