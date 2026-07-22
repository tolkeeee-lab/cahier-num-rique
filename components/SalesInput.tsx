'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader, AlertTriangle, Utensils, Plus, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

interface Sale {
  id: string
  date: string
  time: string
  client: string
  articles: Array<{
    name: string
    quantity: number
    unit_price: number
  }>
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt' | 'crossed_out'
  type: string
  pen_color: string
  notes: string
}

interface SalesInputProps {
  onSaleRecorded: (sale: Sale) => void
  onError: (error: string) => void
  shopId?: string
}

interface MenuItem {
  id: string
  name: string
  price: number
  category: 'cuisine' | 'cafeteria' | 'boisson' | 'autre'
  emoji: string
}

const PENS = [
  { 
    id: 'blue', 
    name: 'Bleu (Vente / Cash In)', 
    color: '#1d4ed8', 
    bg: 'bg-blue-700', 
    border: 'border-blue-700', 
    textClass: 'ink-blue', 
    placeholder: 'Stylo Bleu : Cliquez sur les plats du menu ou tapez une vente cash (ex: 2 Atassi Poulet à 1500)' 
  },
  { 
    id: 'red', 
    name: 'Rouge (Dépense / Cash Out)', 
    color: '#e11d48', 
    bg: 'bg-rose-600', 
    border: 'border-rose-600', 
    textClass: 'ink-red', 
    placeholder: 'Stylo Rouge : Écrivez une dépense... (ex: Achat ingrédients marché 15000 ou Électricité 8000)' 
  },
  { 
    id: 'green', 
    name: 'Vert (Achat Stock Cash)', 
    color: '#047857', 
    bg: 'bg-emerald-700', 
    border: 'border-emerald-700', 
    textClass: 'ink-green', 
    placeholder: 'Stylo Vert : Écrivez un achat de stock payé cash... (ex: 2 cartons bière à 18000)' 
  },
  { 
    id: 'purple', 
    name: 'Violet (Crédit Grossiste)', 
    color: '#701a75', 
    bg: 'bg-fuchsia-800', 
    border: 'border-fuchsia-800', 
    textClass: 'ink-purple', 
    placeholder: 'Stylo Violet : Écrivez un achat à crédit chez un fournisseur... (ex: Brasserie 5 casiers crédit 45000)' 
  },
  { 
    id: 'yellow', 
    name: 'Jaune (Crédit Client)', 
    color: '#b45309', 
    bg: 'bg-amber-600', 
    border: 'border-amber-600', 
    textClass: 'ink-yellow', 
    placeholder: 'Stylo Jaune : Écrivez un crédit accordé à un client... (ex: Koffi prend 2 repas crédit 3000)' 
  },
]

// Menu modèle par défaut pour Resto & Cafétéria au Bénin
const DEFAULT_MENU_ITEMS: MenuItem[] = [
  // Plats Cuisinés
  { id: 'm1', name: 'Atassi Viande / Poulet', price: 1500, category: 'cuisine', emoji: '🍲' },
  { id: 'm2', name: 'Riz au Gras Poisson', price: 1500, category: 'cuisine', emoji: '🍛' },
  { id: 'm3', name: 'Spaghetti Omelette', price: 1000, category: 'cuisine', emoji: '🍝' },
  { id: 'm4', name: 'Igname Pilée Sauce', price: 2500, category: 'cuisine', emoji: '🍠' },
  { id: 'm5', name: 'Poulet Braisé / Frit', price: 2000, category: 'cuisine', emoji: '🍗' },

  // Cafétéria & Petit-Déjeuner
  { id: 'm6', name: 'Café au Lait', price: 500, category: 'cafeteria', emoji: '☕' },
  { id: 'm7', name: 'Pain Omelette Avocat', price: 800, category: 'cafeteria', emoji: '🥖' },
  { id: 'm8', name: 'Bouillie de Millet', price: 300, category: 'cafeteria', emoji: '🥣' },
  { id: 'm9', name: 'Sandwich Viande Hachée', price: 1200, category: 'cafeteria', emoji: '🥪' },

  // Boissons & Rafraîchissements
  { id: 'm10', name: 'Jus de Bissap Maison', price: 300, category: 'boisson', emoji: '🥤' },
  { id: 'm11', name: 'Bière Beaufort / Sobebra', price: 800, category: 'boisson', emoji: '🍺' },
  { id: 'm12', name: 'Eau Possotomè 1.5L', price: 400, category: 'boisson', emoji: '💧' },
  { id: 'm13', name: 'Coca-Cola / Sucrerie', price: 500, category: 'boisson', emoji: '🥤' },
  { id: 'm14', name: 'Jus de Gingembre (Gnamakoudji)', price: 400, category: 'boisson', emoji: '🍹' },
]

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(price) + ' F'
}

export function SalesInput({ onSaleRecorded, onError, shopId = 'default-shop' }: SalesInputProps) {
  const [input, setInput] = useState('')
  const [selectedPen, setSelectedPen] = useState('blue')
  const [loading, setLoading] = useState(false)
  const [postItWarning, setPostItWarning] = useState<string | null>(null)
  
  // États Menu Tactile
  const [showMenuGrid, setShowMenuGrid] = useState(true)
  const [menuFilter, setMenuFilter] = useState<'all' | 'cuisine' | 'cafeteria' | 'boisson'>('all')
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS)

  // Formulaire d'ajout rapide d'un plat au menu carte
  const [showAddMenuForm, setShowAddMenuForm] = useState(false)
  const [newPlatName, setNewPlatName] = useState('')
  const [newPlatPrice, setNewPlatPrice] = useState('')
  const [newPlatCat, setNewPlatCat] = useState<'cuisine' | 'cafeteria' | 'boisson'>('cuisine')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  // Charger le stock réel de la boutique pour fusionner avec le menu s'il existe
  const fetchStockMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/stock', {
        headers: { 'x-shop-id': shopId }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.products && data.products.length > 0) {
          const loadedMenu: MenuItem[] = data.products.map((p: any, idx: number) => ({
            id: p.id || `stk_${idx}`,
            name: p.name,
            price: p.unit_price || 1000,
            category: p.category === 'Boisson' || p.category === 'Boissons' ? 'boisson' : p.category === 'Cuisine' || p.category === 'Plats' ? 'cuisine' : 'cafeteria',
            emoji: p.category === 'Boissons' ? '🥤' : p.category === 'Cuisine' ? '🍲' : '🍽️'
          }))
          setMenuItems(loadedMenu)
        }
      }
    } catch (e) {
      console.warn('Fallback au menu modèle démo:', e)
    }
  }, [shopId])

  // Fonction d'ajout rapide d'un nouveau plat/boisson au menu carte
  const handleCreateQuickMenuItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlatName.trim()) return

    const priceNum = Math.max(0, parseInt(newPlatPrice) || 0)
    const emojiSymbol = newPlatCat === 'boisson' ? '🥤' : newPlatCat === 'cuisine' ? '🍲' : '☕'

    const newItem: MenuItem = {
      id: `menu_custom_${Date.now()}`,
      name: newPlatName.trim(),
      price: priceNum,
      category: newPlatCat,
      emoji: emojiSymbol
    }

    setMenuItems(prev => [newItem, ...prev])

    // Essayer de persister dans la table des produits / stock
    try {
      await fetch('/api/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shopId
        },
        body: JSON.stringify({
          name: newPlatName.trim(),
          unit_price: priceNum,
          unit_cost: Math.round(priceNum * 0.6),
          initial_stock: 100,
          alert_threshold: 5,
          category: newPlatCat === 'boisson' ? 'Boissons' : newPlatCat === 'cuisine' ? 'Cuisine' : 'Cafétéria'
        })
      })
    } catch (err) {
      console.warn('Sauvegarde stock non bloquante:', err)
    }

    setNewPlatName('')
    setNewPlatPrice('')
    setShowAddMenuForm(false)
  }

  useEffect(() => {
    fetchStockMenu()
  }, [fetchStockMenu])

  const currentPen = PENS.find(p => p.id === selectedPen) || PENS[0]

  // Fonction Tactile "1-Tap" : Ajouter ou incrémenter un plat du menu dans la commande
  const handleTapMenuItem = (item: MenuItem) => {
    // Si un autre stylo était sélectionné, rebasculer sur le Stylo Bleu (Vente Cash)
    if (selectedPen !== 'blue') {
      setSelectedPen('blue')
    }

    const itemName = item.name
    const itemPrice = item.price

    if (!input.trim()) {
      // Premier article de la commande
      setInput(`1 ${itemName} à ${itemPrice}`)
    } else {
      // Vérifier si cet article figure déjà dans le texte actuel
      const regex = new RegExp(`(\\d+)\\s+${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+à\\s+${itemPrice}`, 'i')
      const match = input.match(regex)

      if (match) {
        // Incrémenter la quantité existante
        const currentQty = parseInt(match[1]) || 1
        const newQty = currentQty + 1
        const updatedInput = input.replace(regex, `${newQty} ${itemName} à ${itemPrice}`)
        setInput(updatedInput)
      } else {
        // Ajouter à la suite avec une virgule
        setInput(`${input.trim()}, 1 ${itemName} à ${itemPrice}`)
      }
    }

    textareaRef.current?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) {
      onError('Veuillez entrer une transaction')
      return
    }

    setLoading(true)
    setPostItWarning(null)

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: input.trim(),
          penColor: selectedPen 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.isSafeguardTriggered) {
          setPostItWarning(data.error)
        } else {
          throw new Error(data.error || 'Erreur lors de l\'enregistrement')
        }
        return
      }

      onSaleRecorded(data.sale)
      setInput('')
      textareaRef.current?.focus()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      onError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const filteredMenuItems = menuItems.filter(item => {
    if (menuFilter === 'all') return true
    return item.category === menuFilter
  })

  // Auto-suggestions dynamiques des déclinaisons lors de la frappe
  const lastTypedSegment = input.split(/[,;\n]/).pop()?.trim() || ''
  const searchWords = lastTypedSegment.toLowerCase().split(/\s+/).filter(w => w.length >= 2)

  const matchingSuggestions = lastTypedSegment.length >= 2 && searchWords.length > 0
    ? menuItems.filter(item => {
        const itemLower = item.name.toLowerCase()
        return searchWords.some(w => itemLower.includes(w))
      }).slice(0, 6)
    : []

  const handleSelectSuggestion = (item: MenuItem) => {
    const segments = input.split(/[,;\n]/)
    segments.pop() // Enlever le segment incomplet
    const prefix = segments.length > 0 ? segments.join(', ') + ', ' : ''
    setInput(`${prefix}1 ${item.name} à ${item.price}`)
    textareaRef.current?.focus()
  }

  return (
    <div className="relative space-y-4 font-sans select-none">
      {/* ── 1. Sélection du Stylo Bic 4-Couleurs ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
          🖊️ Choisir le stylo de caisse :
        </span>
        <div className="flex flex-wrap gap-2">
          {PENS.map((pen) => (
            <button
              key={pen.id}
              type="button"
              onClick={() => {
                setSelectedPen(pen.id)
                textareaRef.current?.focus()
              }}
              style={{ color: selectedPen === pen.id ? '#ffffff' : pen.color }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                selectedPen === pen.id 
                  ? `${pen.bg} ${pen.border} shadow-sm scale-105 text-white` 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${pen.bg}`}></span>
              {pen.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Zone d'Écriture Manuscrite du Cahier avec Suggestions Intelligentes ── */}
      <form onSubmit={handleSubmit} className="relative">
        {matchingSuggestions.length > 0 && (
          <div className="mb-2 p-2 bg-[#fffdf2] border border-amber-300 rounded-2xl shadow-md animate-fade-in">
            <div className="flex items-center gap-1.5 text-amber-900 text-[10px] font-bold mb-1.5 px-1">
              <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
              <span>Préciser le format / la déclinaison ({matchingSuggestions.length} trouvés) :</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
              {matchingSuggestions.map(sugg => (
                <button
                  key={sugg.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(sugg)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 hover:border-amber-500 rounded-xl text-xs font-bold text-gray-800 flex-shrink-0 transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  <span>{sugg.emoji}</span>
                  <span>{sugg.name}</span>
                  <span className="font-mono text-amber-800 text-[10px] bg-amber-50 px-1 rounded">{formatPrice(sugg.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white p-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentPen.placeholder}
            disabled={loading}
            className={`w-full px-4 py-4 min-h-24 bg-transparent text-lg placeholder-gray-400 border-0 focus:ring-0 leading-relaxed font-handwritten transition-colors ${currentPen.textClass}`}
          />

          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowMenuGrid(!showMenuGrid)}
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 transition-all flex items-center gap-1.5"
            >
              <Utensils className="w-3.5 h-3.5 text-amber-700" />
              <span>{showMenuGrid ? 'Masquer le Menu Carte' : '🍽️ Afficher Menu Carte & Touches Rapides'}</span>
              {showMenuGrid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <div className="flex items-center gap-2">
              {input.trim() && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-red-600 transition-colors"
                >
                  Effacer
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enregistrer Vente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ── 3. Grille Tactile du Menu (Préréglages Resto, Cafétéria & Buvette) ── */}
      {showMenuGrid && (
        <div className="bg-[#fffdf9] border border-amber-250 rounded-[28px] p-5 shadow-sm space-y-3 animate-fade-in select-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 border-dashed pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h4 className="font-handwritten text-lg font-bold text-gray-800">
                🍽️ Menu Carte & Touches Rapides (1-Tap)
              </h4>
              <span className="text-[9px] bg-amber-100 text-amber-900 font-mono font-bold px-2 py-0.5 rounded-full">
                {filteredMenuItems.length} plats / boissons
              </span>

              <button
                type="button"
                onClick={() => setShowAddMenuForm(!showAddMenuForm)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold uppercase rounded-xl flex items-center gap-1 transition-all shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>{showAddMenuForm ? 'Fermer' : 'Ajouter un Plat au Menu'}</span>
              </button>
            </div>

            {/* Filtres par Catégorie */}
            <div className="flex bg-[#f5f1e8] p-1 rounded-xl border border-gray-250 text-xs select-none self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMenuFilter('all')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  menuFilter === 'all' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🌟 Tout le Menu
              </button>
              <button
                type="button"
                onClick={() => setMenuFilter('cuisine')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  menuFilter === 'cuisine' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🍲 Cuisiné
              </button>
              <button
                type="button"
                onClick={() => setMenuFilter('cafeteria')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  menuFilter === 'cafeteria' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ☕ Cafétéria
              </button>
              <button
                type="button"
                onClick={() => setMenuFilter('boisson')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  menuFilter === 'boisson' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🥤 Boissons
              </button>
            </div>
          </div>

          {/* Formulaire d'ajout rapide d'un plat au menu carte */}
          {showAddMenuForm && (
            <form onSubmit={handleCreateQuickMenuItem} className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex flex-wrap items-end gap-3 animate-fade-in">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[9px] uppercase font-bold text-amber-900 mb-1 font-mono">
                  Nom du Plat / Boisson
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amonso, Bière Castel..."
                  value={newPlatName}
                  onChange={e => setNewPlatName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:border-amber-500"
                />
              </div>

              <div className="w-28">
                <label className="block text-[9px] uppercase font-bold text-amber-900 mb-1 font-mono">
                  Prix Vente (F)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Ex: 1500"
                  value={newPlatPrice}
                  onChange={e => setNewPlatPrice(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-amber-950 outline-none focus:border-amber-500"
                />
              </div>

              <div className="w-36">
                <label className="block text-[9px] uppercase font-bold text-amber-900 mb-1 font-mono">
                  Catégorie
                </label>
                <select
                  value={newPlatCat}
                  onChange={(e: any) => setNewPlatCat(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-800 outline-none"
                >
                  <option value="cuisine">🍲 Cuisiné / Repas</option>
                  <option value="cafeteria">☕ Cafétéria / Ptis dej</option>
                  <option value="boisson">🥤 Boisson / Rafraîchissement</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enregistrer</span>
              </button>
            </form>
          )}

          {/* Grille des Touches Tactiles (Buttons) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTapMenuItem(item)}
                className="p-3 bg-white hover:bg-amber-50 border border-gray-200 hover:border-amber-400 rounded-2xl shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-95 border-b-2 hover:border-b-amber-500"
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-base group-hover:scale-125 transition-transform">{item.emoji}</span>
                  <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-250">
                    {formatPrice(item.price)}
                  </span>
                </div>
                <div className="font-sans text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-amber-950">
                  {item.name}
                </div>
                <div className="text-[8px] font-mono text-gray-400 mt-1 flex items-center gap-1">
                  <Plus className="w-2.5 h-2.5 text-amber-600" />
                  <span>Ajouter au cahier</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Post-it Alerte de Sécurité ── */}
      {postItWarning && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 w-80 bg-amber-200 border-2 border-amber-300 shadow-2xl p-6 rotate-2 transition-all flex flex-col items-center text-center">
          <div className="absolute -top-3 w-16 h-6 bg-gray-300 bg-opacity-70 -rotate-3"></div>
          
          <AlertTriangle className="w-8 h-8 text-amber-700 mb-2" />
          <h4 className="font-bold text-amber-900 text-lg uppercase tracking-wide handwritten mb-2">
            ⚠️ Opération Bloquée !
          </h4>
          <p className="text-amber-850 text-sm font-medium handwritten leading-relaxed">
            {postItWarning}
          </p>
          <button
            type="button"
            onClick={() => setPostItWarning(null)}
            className="mt-4 px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs rounded shadow handwritten"
          >
            Fermer l'alerte
          </button>
        </div>
      )}
    </div>
  )
}
