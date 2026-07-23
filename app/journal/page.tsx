'use client'

import React, { useState, useEffect, useRef } from 'react'
import { SalesHistory } from '@/components/SalesHistory'
import { DebtsBook } from '@/components/DebtsBook'
import { Notebook, BookText, BarChart3, Send, Loader, AlertTriangle, FolderArchive, Wifi, WifiOff, RefreshCw, CheckCircle, Package, Settings, ShoppingCart, Utensils, ChevronUp, ChevronDown, Sparkles, Plus, X } from 'lucide-react'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'
import { ShoppingListManager } from '@/components/ShoppingListManager'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'
import { AuthScreen } from '@/components/AuthScreen'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { StockManager } from '@/components/StockManager'
import { SettingsManager } from '@/components/SettingsManager'
import {
  generateOfflineId,
  getOfflineSales,
  saveOfflineSale,
  replaceOfflineSales,
  getPendingSync,
  markAsSynced,
  markSyncError,
  getOfflineClients,
  replaceOfflineClients,
  getOfflineSuppliers,
  replaceOfflineSuppliers,
  addOrUpdateOfflineClientDebt,
  addOrUpdateOfflineSupplierDebt,
  getOfflineProducts,
  saveOfflineProduct,
} from '@/lib/offlineDb'

const THEMES: Record<string, {
  filters: Array<{ id: string; label: string; emoji: string }>;
}> = {
  resto: {
    filters: [
      { id: 'all', label: 'Tout', emoji: '🌟' },
      { id: 'cuisine', label: 'Cuisiné', emoji: '🍲' },
      { id: 'cafeteria', label: 'Cafétéria', emoji: '☕' },
      { id: 'boisson', label: 'Boissons', emoji: '🥤' }
    ]
  },
  boutique: {
    filters: [
      { id: 'all', label: 'Tout', emoji: '🌟' },
      { id: 'fourniture', label: 'Fournitures', emoji: '📚' },
      { id: 'alimentaire', label: 'Alimentaire', emoji: '🌾' },
      { id: 'boisson', label: 'Boissons', emoji: '🥤' },
      { id: 'autre', label: 'Divers', emoji: '🏷️' }
    ]
  },
  prestations: {
    filters: [
      { id: 'all', label: 'Tout', emoji: '🌟' },
      { id: 'service', label: 'Services', emoji: '✂️' },
      { id: 'produit', label: 'Produits', emoji: '🧴' },
      { id: 'autre', label: 'Divers', emoji: '🏷️' }
    ]
  }
}

const getSmartEmojiAndCategory = (name: string, activity: 'resto' | 'boutique' | 'prestations'): { emoji: string; category: string } => {
  const lower = name.toLowerCase()

  let emoji = '📦'
  if (/cahier|registre|carnet|livre/i.test(lower)) emoji = '📖'
  else if (/stylo|crayon|bic|feutre|craie/i.test(lower)) emoji = '🖋️'
  else if (/colgate|dentifrice|brosse/i.test(lower)) emoji = '🪥'
  else if (/savon|omo|lessive|shampoing|shampoo/i.test(lower)) emoji = '🧼'
  else if (/pain|baguette|croissant/i.test(lower)) emoji = '🥖'
  else if (/sardine|thon|conserve|crabe/i.test(lower)) emoji = '🐟'
  else if (/lait|yaourt|creme|crème/i.test(lower)) emoji = '🥛'
  else if (/sucre|bonbon|chocolat|miel/i.test(lower)) emoji = '🍬'
  else if (/biere|bierre|beaufort|flag|pils|castel|guinness|heineken/i.test(lower)) emoji = '🍺'
  else if (/eau|possotome|fifa/i.test(lower)) emoji = '💧'
  else if (/coca|fanta|sprite|jus|bissap|gingembre|soda/i.test(lower)) emoji = '🥤'
  else if (/riz|atassi|plat|repas|poulet|poisson|viande/i.test(lower)) emoji = '🍛'
  else if (/huile|beurre/i.test(lower)) emoji = '🫗'
  else if (/sac|sachet/i.test(lower)) emoji = '🛍️'
  else if (/coiffure|coupe|barbe|rasage|tresse/i.test(lower)) emoji = '✂️'
  else if (/gel|pommade|parfum|creme/i.test(lower)) emoji = '🧴'

  let category = 'autre'
  if (activity === 'resto') {
    if (/riz|atassi|spaghetti|igname|poulet|poisson|viande|plat|repas/i.test(lower)) {
      category = 'cuisine'
      if (emoji === '📦') emoji = '🍲'
    } else if (/café|cafe|pain|bouillie|lait|sandwich|thé/i.test(lower)) {
      category = 'cafeteria'
      if (emoji === '📦') emoji = '☕'
    } else if (/biere|eau|jus|coca|bissap|soda/i.test(lower)) {
      category = 'boisson'
      if (emoji === '📦') emoji = '🥤'
    }
  } else if (activity === 'boutique') {
    if (/cahier|stylo|crayon|bic|feutre|registre|papier/i.test(lower)) {
      category = 'fourniture'
    } else if (/pain|lait|sardine|tomate|sucre|riz|huile|nourriture/i.test(lower)) {
      category = 'alimentaire'
    } else if (/eau|coca|jus|biere|bissap/i.test(lower)) {
      category = 'boisson'
    }
  } else if (activity === 'prestations') {
    if (/coiffure|coupe|rasage|barbe|tresse|lavage|shampoing/i.test(lower)) {
      category = 'service'
    } else if (/gel|huile|pommade|shampoing|produit/i.test(lower)) {
      category = 'produit'
    }
  }

  return { emoji, category }
}

export interface ParsedSaleArticle {
  name: string
  quantity: number
  unit_price: number
  category?: string
}

export interface Sale {
  id: string
  date: string
  time: string
  client: string
  articles: Array<{
    name: string;
    quantity: number;
    unit_price: number;
  }>
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt' | 'crossed_out'
  type: string
  pen_color: string
  notes: string
  category?: string
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(price) + ' FCFA'
}

const PENS = [
  {
    id: 'blue',
    name: 'ENTRÉE',
    color: '#1d4ed8',
    bg: 'bg-blue-600',
    border: 'border-blue-600',
    textClass: 'ink-blue',
    dotBg: 'bg-[#1d4ed8]',
    placeholder: 'Stylo Bleu : Écrivez une vente cash... (ex: 2 sacs de riz à 22000)'
  },
  {
    id: 'red',
    name: 'DÉPENSE',
    color: '#e11d48',
    bg: 'bg-rose-600',
    border: 'border-rose-600',
    textClass: 'ink-red',
    dotBg: 'bg-[#e11d48]',
    placeholder: 'Stylo Rouge : Écrivez une dépense... (ex: achat emballages plastiques 2500)'
  },
  {
    id: 'green',
    name: 'STOCK CASH',
    color: '#047857',
    bg: 'bg-emerald-700',
    border: 'border-emerald-700',
    textClass: 'ink-green',
    dotBg: 'bg-[#047857]',
    placeholder: 'Stylo Vert : Écrivez un achat de stock payé cash... (ex: 5 cartons lait à 15000)'
  },
  {
    id: 'purple',
    name: 'STOCK CRÉDIT',
    color: '#701a75',
    bg: 'bg-fuchsia-800',
    border: 'border-fuchsia-800',
    textClass: 'ink-purple',
    dotBg: 'bg-[#701a75]',
    placeholder: 'Stylo Violet : Écrivez un achat à crédit fournisseur... (ex: Grossiste Chantal carton peak credit 35000)'
  },
  {
    id: 'yellow',
    name: 'CRÉDIT CLIENT',
    color: '#b45309',
    bg: 'bg-amber-600',
    border: 'border-amber-600',
    textClass: 'ink-yellow',
    dotBg: 'bg-[#b45309]',
    placeholder: 'Stylo Jaune : Écrivez un crédit donné à un client... (ex: Koffi prend 2 sacs de riz crédit 12000)'
  },
]

type FilterId = 'all' | 'blue' | 'red' | 'green' | 'purple' | 'yellow'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'TOUT' },
  { id: 'blue', label: 'ENTRÉES' },
  { id: 'red', label: 'DÉPENSES' },
  { id: 'green', label: 'STOCK CASH' },
  { id: 'purple', label: 'STOCK CRÉDIT' },
  { id: 'yellow', label: 'CRÉDIT CLIENT' },
]

export default function JournalPage() {
  const isConfigured = isSupabaseClientConfigured()
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const loggedOut = localStorage.getItem('cahier_logged_out_flag') === 'true'
      if (!loggedOut) {
        const cached = localStorage.getItem('cahier_last_active_user') || localStorage.getItem('cahier_mock_session')
        if (cached) {
          try {
            return JSON.parse(cached)
          } catch {
            return null
          }
        }
      }
    }
    return null
  })

  const getMappedUser = (rawUser: any) => {
    if (!rawUser) return null
    const meta = rawUser.user_metadata || {}
    return {
      id: rawUser.id,
      email: rawUser.email,
      name: meta.full_name || rawUser.full_name || 'Utilisateur',
      role: meta.role || rawUser.role || 'owner',
      shop_id: meta.shop_id || rawUser.shop_id || rawUser.id || 'default-shop'
    }
  }

  const mappedUser = React.useMemo(() => getMappedUser(user), [user])
  const [authLoading, setAuthLoading] = useState(true)
  const [demoRole, setDemoRole] = useState<'owner' | 'employee' | null>(null)
  // localDemo kept for backward compat - true when using demo bypass
  const localDemo = demoRole !== null

  // ── Multi-Boutiques / Réseau Fondateur ──────────────────────────────────────
  const [selectedShopId, setSelectedShopId] = useState<string>('')
  const [userShops, setUserShops] = useState<Array<{ id: string; name: string; activity: string }>>([])

  // Synchroniser la boutique initiale dès que l'utilisateur est chargé
  useEffect(() => {
    if (mappedUser?.id) {
      const uId = mappedUser.id
      const uShopId = mappedUser.shop_id || `${uId}-main`

      // Récupérer les boutiques stockées localement pour ce propriétaire
      const stored = localStorage.getItem(`cahier_user_shops_${uId}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (JSON.stringify(userShops) !== JSON.stringify(parsed)) {
              setUserShops(parsed)
            }
            if (!selectedShopId) {
              setSelectedShopId(parsed[0].id)
            }
            return
          }
        } catch { }
      }

      // Si aucune boutique n'est enregistrée localement, initialiser uniquement avec sa boutique principale
      const defaultShops = [
        { id: uShopId, name: 'Mon Point de Vente', activity: 'boutique' }
      ]
      if (JSON.stringify(userShops) !== JSON.stringify(defaultShops)) {
        setUserShops(defaultShops)
      }
      localStorage.setItem(`cahier_user_shops_${uId}`, JSON.stringify(defaultShops))
      if (!selectedShopId) {
        setSelectedShopId(uShopId)
      }
    }
  }, [mappedUser?.id, mappedUser?.shop_id, selectedShopId, userShops])

  const shopId = selectedShopId || mappedUser?.shop_id || 'default-shop'
  const currentShop = userShops.find(s => s.id === shopId)
  const shopActivity = currentShop?.activity || 'boutique'
  const theme = THEMES[shopActivity] || THEMES.boutique

  const { isOnline, pendingCount, syncStatus, setSyncStatus, refreshPendingCount } = useNetworkStatus(shopId)

  // Modal de création d'une nouvelle boutique / point de vente
  const [showNewShopModal, setShowNewShopModal] = useState(false)
  const [newShopName, setNewShopName] = useState('')
  const [newShopActivity, setNewShopActivity] = useState<'boutique' | 'resto' | 'prestations'>('boutique')

  const [sales, setSales] = useState<Sale[]>([])
  const [tiroirCaisse, setTiroirCaisse] = useState(0)
  const [argentDehors, setArgentDehors] = useState(0)
  const [nosDettes, setNosDettes] = useState(0)
  const [soldeDuJour, setSoldeDuJour] = useState(0)

  const [activeTab, setActiveTab] = useState<'cahier' | 'dettes' | 'trends' | 'archives' | 'stock' | 'settings' | 'analytics' | 'shopping'>('cahier')
  const [allSales, setAllSales] = useState<Sale[]>([])
  const [journalFilter, setJournalFilter] = useState<FilterId>('all')
  const [archiveFilter, setArchiveFilter] = useState<FilterId>('all')

  // Sales Input fields inside page context
  const [input, setInput] = useState('')
  const [selectedPen, setSelectedPen] = useState('blue')
  const [loading, setLoading] = useState(false)
  const [postItWarning, setPostItWarning] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')


  const [showChangeCalc, setShowChangeCalc] = useState(false)
  const [changeTotal, setChangeTotal] = useState('')
  const [changeReceived, setChangeReceived] = useState('')

  // Cash drawer manual adjustment states
  const [showCashAdjustment, setShowCashAdjustment] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState<'flow' | 'count'>('flow')
  const [flowAmount, setFlowAmount] = useState('')
  const [flowDirection, setFlowDirection] = useState<'in' | 'out'>('in')
  const [physicalCash, setPhysicalCash] = useState('')
  const [adjustmentNote, setAdjustmentNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  // Auto-apprentissage & mémorisation au vol des nouveaux produits
  const [autoLearnData, setAutoLearnData] = useState<{
    name: string
    price: number
  } | null>(null)
  const [showAutoLearnModal, setShowAutoLearnModal] = useState(false)

  // Stock guided wizard states
  const [showStockWizard, setShowStockWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardProductName, setWizardProductName] = useState('')
  const [wizardQuantity, setWizardQuantity] = useState('1')
  const [wizardPackaging, setWizardPackaging] = useState('unité')
  const [wizardMultiplier, setWizardMultiplier] = useState('1')
  const [wizardUnit, setWizardUnit] = useState('pièce')
  const [wizardAlertThreshold, setWizardAlertThreshold] = useState('5')
  const [wizardPurchasePrice, setWizardPurchasePrice] = useState('')
  const [wizardSalePrice, setWizardSalePrice] = useState('')

  // ── Ajout article à vente existante — état partagé avec SalesHistory + menu du bas ──
  const [addingToSaleId, setAddingToSaleId] = useState<string | null>(null)
  const [addArticleInput, setAddArticleInput] = useState('')

  // 🍽️ États & Touches Tactiles du Menu Dynamique (1-Tap)
  const [showJournalMenuGrid, setShowJournalMenuGrid] = useState(false)
  const [journalMenuFilter, setJournalMenuFilter] = useState<string>('all')
  const [journalMenuItems, setJournalMenuItems] = useState<Array<{
    id: string
    name: string
    price: number
    category: string
    emoji: string
  }>>([])

  // Formulaire d'ajout rapide d'un plat au menu dans le journal
  const [showQuickAddMenuForm, setShowQuickAddMenuForm] = useState(false)
  const [quickPlatName, setQuickPlatName] = useState('')
  const [quickPlatPrice, setQuickPlatPrice] = useState('')
  const [quickPlatCat, setQuickPlatCat] = useState<string>('')

  // Charger le stock réel et les produits pour fusionner avec le menu (avec normalisation et dédoublonnement canonique)
  useEffect(() => {
    if (!shopId) return
    const fetchStockMenu = async () => {
      try {
        const res = await fetch('/api/stock', {
          headers: { 'x-shop-id': shopId }
        })
        if (res.ok) {
          const data = await res.json()
          const rawItems = data.products || []

          // 1. Charger les exclusions locales pour cette boutique
          let excludedNames: string[] = []
          try {
            const stored = localStorage.getItem(`cahier_deleted_menu_items_${shopId}`)
            if (stored) {
              excludedNames = JSON.parse(stored)
            }
          } catch (e) {
            console.warn('Erreur lecture exclusions:', e)
          }

          if (rawItems.length > 0) {
            const uniqueMap = new Map<string, {
              id: string
              name: string
              price: number
              category: string
              emoji: string
            }>()

            rawItems.forEach((p: any, idx: number) => {
              const rawName = p.name || ''
              if (!rawName.trim()) return

              let cleanName = rawName.trim()
              const lowerName = cleanName.toLowerCase()

              if (/^lb(\s*600)?$/i.test(lowerName)) cleanName = 'LB'
              else if (/^flag(\s*6002?\s*lb)?$/i.test(lowerName)) cleanName = 'Flag'
              else if (/^beufort$/i.test(lowerName) || /^beaufort$/i.test(lowerName)) cleanName = 'Beaufort'
              else if (/^coca(-cola)?$/i.test(lowerName)) cleanName = 'Coca-Cola'
              else if (/^possotome|possotomè$/i.test(lowerName)) cleanName = 'Eau Possotomè'
              else if (/^colgate|brosse colgate$/i.test(lowerName)) cleanName = 'Colgate'
              else if (/^boites?\s+de\s+sardines?$/i.test(lowerName)) cleanName = 'Boîte de Sardines'
              else if (/^boites?\s+de\s+tomates?$/i.test(lowerName)) cleanName = 'Boîte de Tomate'
              else {
                cleanName = cleanName.split(/\s+/)
                  .map((w: string) => w.length <= 2 && w.toUpperCase() === w ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                  .join(' ')
              }

              // Si ce nom de produit normalisé est dans la liste d'exclusion, on ne l'affiche pas dans le menu tactile
              const cleanLower = cleanName.toLowerCase().trim()
              if (excludedNames.some(name => name.toLowerCase().trim() === cleanLower)) {
                return
              }

              const priceVal = p.unit_price || p.price || 1000
              const dedupeKey = `${cleanName.toLowerCase().trim()}_${priceVal}`
              if (uniqueMap.has(dedupeKey)) return

              const { emoji, category } = getSmartEmojiAndCategory(cleanName, shopActivity as any)

              uniqueMap.set(dedupeKey, {
                id: p.id || `stk_${idx}`,
                name: cleanName,
                price: priceVal,
                category,
                emoji
              })
            })

            setJournalMenuItems(Array.from(uniqueMap.values()))
          } else {
            setJournalMenuItems([])
          }
        }
      } catch (e) {
        console.warn('Erreur chargement stock menu, repli sur local:', e)
        try {
          const localProducts = getOfflineProducts(shopId)
          if (localProducts && localProducts.length > 0) {
            const uniqueMap = new Map<string, any>()
            let excludedNames: string[] = []
            try {
              const stored = localStorage.getItem(`cahier_deleted_menu_items_${shopId}`)
              if (stored) excludedNames = JSON.parse(stored)
            } catch { }

            localProducts.forEach((p: any, idx: number) => {
              const rawName = p.name || ''
              if (!rawName.trim()) return
              let cleanName = rawName.trim()
              const lowerName = cleanName.toLowerCase()

              if (/^lb(\s*600)?$/i.test(lowerName)) cleanName = 'LB'
              else if (/^flag(\s*6002?\s*lb)?$/i.test(lowerName)) cleanName = 'Flag'
              else if (/^beufort$/i.test(lowerName) || /^beaufort$/i.test(lowerName)) cleanName = 'Beaufort'
              else if (/^coca(-cola)?$/i.test(lowerName)) cleanName = 'Coca-Cola'
              else if (/^possotome|possotomè$/i.test(lowerName)) cleanName = 'Eau Possotomè'
              else if (/^colgate|brosse colgate$/i.test(lowerName)) cleanName = 'Colgate'
              else if (/^boites?\s+de\s+sardines?$/i.test(lowerName)) cleanName = 'Boîte de Sardines'
              else if (/^boites?\s+de\s+tomates?$/i.test(lowerName)) cleanName = 'Boîte de Tomate'
              else {
                cleanName = cleanName.split(/\s+/)
                  .map((w: string) => w.length <= 2 && w.toUpperCase() === w ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                  .join(' ')
              }

              if (excludedNames.some(name => name.toLowerCase().trim() === cleanName.toLowerCase().trim())) return

              const priceVal = p.unit_price || p.price || 1000
              const dedupeKey = `${cleanName.toLowerCase().trim()}_${priceVal}`
              if (uniqueMap.has(dedupeKey)) return

              const { emoji, category } = getSmartEmojiAndCategory(cleanName, shopActivity as any)
              uniqueMap.set(dedupeKey, {
                id: p.id || `stk_${idx}`,
                name: cleanName,
                price: priceVal,
                category,
                emoji
              })
            })
            setJournalMenuItems(Array.from(uniqueMap.values()))
          } else {
            setJournalMenuItems([])
          }
        } catch (localErr) {
          setJournalMenuItems([])
        }
      }
    }
    fetchStockMenu()
  }, [shopId, shopActivity])

  // Tap 1-Click sur un plat du menu
  const handleTapMenuItemInJournal = (item: { name: string; price: number }) => {
    const itemName = item.name
    const itemPrice = item.price
    const escName = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(\\d+)\\s+${escName}\\s+à\\s+${itemPrice}`, 'i')

    // ── MODE AJOUT ARTICLE : même logique que la saisie normale (append / incrément) ──
    if (addingToSaleId) {
      if (!addArticleInput.trim()) {
        setAddArticleInput(`1 ${itemName} à ${itemPrice}`)
      } else {
        const match = addArticleInput.match(regex)
        if (match) {
          const currentQty = parseInt(match[1]) || 1
          setAddArticleInput(addArticleInput.replace(regex, `${currentQty + 1} ${itemName} à ${itemPrice}`))
        } else {
          setAddArticleInput(`${addArticleInput.trim()}, 1 ${itemName} à ${itemPrice}`)
        }
      }
      return
    }

    // ── MODE NORMAL : écriture dans le cahier ──
    if (selectedPen !== 'blue') {
      setSelectedPen('blue')
      setJournalFilter('blue')
    }

    if (!input.trim()) {
      setInput(`1 ${itemName} à ${itemPrice}`)
    } else {
      const match = input.match(regex)
      if (match) {
        const currentQty = parseInt(match[1]) || 1
        setInput(input.replace(regex, `${currentQty + 1} ${itemName} à ${itemPrice}`))
      } else {
        setInput(`${input.trim()}, 1 ${itemName} à ${itemPrice}`)
      }
    }
  }

  // Supprimer un produit directement depuis le menu tactile du bas
  const handleDeleteMenuItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const targetItem = journalMenuItems.find(item => item.id === id)
    if (!targetItem) return

    if (!window.confirm(`Voulez-vous masquer "${targetItem.name}" définitivement du menu ?`)) return

    // 1. Ajouter à la liste d'exclusion locale
    try {
      const storedExclusions = localStorage.getItem(`cahier_deleted_menu_items_${shopId}`)
      const excludedNames: string[] = storedExclusions ? JSON.parse(storedExclusions) : []
      if (!excludedNames.some(name => name.toLowerCase().trim() === targetItem.name.toLowerCase().trim())) {
        excludedNames.push(targetItem.name)
        localStorage.setItem(`cahier_deleted_menu_items_${shopId}`, JSON.stringify(excludedNames))
      }
    } catch (err) {
      console.warn('Erreur stockage exclusion:', err)
    }

    // 2. Retirer de l'état local
    setJournalMenuItems(prev => prev.filter(item => item.id !== id))

    // 3. Supprimer de la DB si c'est un produit du catalogue réel (non virtuel ni orphelin)
    try {
      if (id && !id.startsWith('stk_') && !id.startsWith('orphan_')) {
        await fetch(`/api/stock?id=${id}`, {
          method: 'DELETE',
          headers: { 'x-shop-id': shopId }
        })
      }
    } catch (err) {
      console.warn('Erreur suppression menu DB:', err)
    }
  }

  // Ajout rapide d'un plat au menu

  const handleAddQuickMenuItemInJournal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickPlatName.trim()) return

    const currentShop = userShops.find(s => s.id === shopId)
    const shopActivity = currentShop?.activity || 'boutique'
    const theme = THEMES[shopActivity] || THEMES.boutique

    const categoryToSave = quickPlatCat || theme.filters.filter(f => f.id !== 'all')[0]?.id || 'autre'
    const emojiSymbol = getSmartEmojiAndCategory(quickPlatName, shopActivity as any).emoji

    // Retirer des exclusions locales au cas où le produit y était
    try {
      const storedExclusions = localStorage.getItem(`cahier_deleted_menu_items_${shopId}`)
      if (storedExclusions) {
        let excludedNames: string[] = JSON.parse(storedExclusions)
        if (excludedNames.some(name => name.toLowerCase().trim() === quickPlatName.trim().toLowerCase())) {
          excludedNames = excludedNames.filter(name => name.toLowerCase().trim() !== quickPlatName.trim().toLowerCase())
          localStorage.setItem(`cahier_deleted_menu_items_${shopId}`, JSON.stringify(excludedNames))
        }
      }
    } catch {}

    const priceNum = Math.max(0, parseInt(quickPlatPrice) || 0)

    const newItem = {
      id: `menu_custom_${Date.now()}`,
      name: quickPlatName.trim(),
      price: priceNum,
      category: categoryToSave,
      emoji: emojiSymbol
    }

    setJournalMenuItems(prev => [newItem, ...prev])

    try {
      let dbCategory = 'Divers'
      if (shopActivity === 'resto') {
        dbCategory = categoryToSave === 'boisson' ? 'Boissons' : categoryToSave === 'cuisine' ? 'Cuisine' : 'Cafétéria'
      } else if (shopActivity === 'boutique') {
        dbCategory = categoryToSave === 'fourniture' ? 'Fournitures' : categoryToSave === 'alimentaire' ? 'Alimentation' : categoryToSave === 'boisson' ? 'Boissons' : 'Divers'
      } else if (shopActivity === 'prestations') {
        dbCategory = categoryToSave === 'service' ? 'Services' : categoryToSave === 'produit' ? 'Produits' : 'Divers'
      }

      await fetch('/api/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shopId || 'default-shop'
        },
        body: JSON.stringify({
          name: quickPlatName.trim(),
          unit_price: priceNum,
          unit_cost: Math.round(priceNum * 0.6),
          initial_stock: 100,
          alert_threshold: 5,
          category: dbCategory
        })
      })
    } catch (err) {
      console.warn('Erreur non bloquante sauvegarde stock:', err)
    }

    setQuickPlatName('')
    setQuickPlatPrice('')
    setQuickPlatCat('')
    setShowQuickAddMenuForm(false)
  }


  // Context-aware stock confirmation & price mismatch alert states
  const [showStockConfirmation, setShowStockConfirmation] = useState(false)
  const [stockConfirmationData, setStockConfirmationData] = useState<{
    product: any
    quantity: number
    packaging: string
    multiplier: number
    unit: string
  } | null>(null)

  const [showPriceChangeDialog, setShowPriceChangeDialog] = useState(false)
  const [priceChangeData, setPriceChangeData] = useState<{
    product: any
    newLotPrice: number
    oldLotPrice: number
    rawText: string
    penColor: string
  } | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Essayer de récupérer la session Supabase avec timeout
        const sessionPromise = supabaseClient.auth.getSession()
        const timeoutPromise = new Promise<{ data: { session: null } }>(resolve =>
          setTimeout(() => resolve({ data: { session: null } }), 4000)
        )
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any

        if (session?.user) {
          setUser(session.user)
          setAuthLoading(false)
          return
        }

        // Si pas de session Cloud active, conserver la session locale de secours si disponible
        const cached = localStorage.getItem('cahier_last_active_user') || localStorage.getItem('cahier_mock_session')
        if (cached) {
          try {
            setUser(JSON.parse(cached))
          } catch { }
          setAuthLoading(false)
          return
        }

        // Vraiment pas de session → montrer l'écran de login
        setUser(null)
        setAuthLoading(false)
      } catch (err) {
        console.error('[Auth] Erreur d\'initialisation:', err)
        // En cas d'erreur de chargement (ex: réseau coupé en plein init), s'assurer de garder le cache local s'il existe
        const cached = localStorage.getItem('cahier_last_active_user') || localStorage.getItem('cahier_mock_session')
        if (cached) {
          try { setUser(JSON.parse(cached)) } catch { }
        } else {
          setUser(null)
        }
        setAuthLoading(false)
      }
    }

    initAuth()

    // Écouter les changements d'état Supabase
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        // ⚠️ Ignorer la déconnexion automatique si on a un cache local de secours
        // sauf si un flag 'cahier_logged_out_flag' confirme que c'est un logout volontaire.
        const hasLoggedOut = localStorage.getItem('cahier_logged_out_flag') === 'true'
        if (hasLoggedOut) {
          setUser(null)
        } else {
          const cached = localStorage.getItem('cahier_last_active_user') || localStorage.getItem('cahier_mock_session')
          if (cached) {
            console.info('[Auth] Session conservée en cache local de secours')
            try { setUser(JSON.parse(cached)) } catch { }
          } else {
            setUser(null)
          }
        }
      }
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('cahier_last_active_user', JSON.stringify(user))
      localStorage.removeItem('cahier_logged_out_flag') // Effacer le flag de déconnexion dès qu'on a un utilisateur valide
    }
  }, [user])


  useEffect(() => {
    if (user || localDemo) {
      loadFinancialData()
    }
    // Mettre à jour l'horloge
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [user, localDemo])

  const handleLogout = async () => {
    localStorage.removeItem('cahier_mock_session')
    localStorage.removeItem('cahier_last_active_user')
    localStorage.setItem('cahier_logged_out_flag', 'true') // Signaler une déconnexion volontaire
    if (localDemo) {
      setDemoRole(null)
      setUser(null)
    } else {
      try {
        await supabaseClient.auth.signOut()
      } catch { }
      setUser(null)
    }
  }

  // Faire défiler vers le bas lors de la mise à jour des ventes ou de l'ouverture du calcul de monnaie
  useEffect(() => {
    if (scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
        }
      }, 80)
    }
  }, [sales, activeTab, showChangeCalc])

  // Synchronisation automatique au retour en ligne
  useEffect(() => {
    if (isOnline && mappedUser && isConfigured) {
      syncOfflineData().then(() => loadFinancialData())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  const syncOfflineData = async () => {
    if (!mappedUser) return
    const sid = mappedUser.shop_id
    if (!isOnline) return

    const pending = getPendingSync(sid)
    if (pending.length === 0) return

    setSyncStatus('syncing')
    console.log(`[Offline Sync] Synchronisation de ${pending.length} écriture(s) hors-ligne...`)

    let successCount = 0
    let errorCount = 0

    for (const sale of pending) {
      try {
        const bodyData = {
          text: sale.notes || '',
          penColor: sale.pen_color || 'blue',
          overrideData: {
            articles: (sale.articles || []).map((a: any) => ({
              name: a.name || a.nom,
              quantity: a.quantity || a.quantite,
              unit_price: a.unit_price || a.prix_unitaire,
            })),
            total_amount: sale.total,
            paid_amount: sale.paid,
            debt_amount: sale.debt,
            client_name: sale.client || 'Client anonyme',
          },
        }

        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': sid,
          },
          body: JSON.stringify(bodyData),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData?.error || `Statut HTTP ${response.status}`)
        }

        markAsSynced(sid, sale.id)
        successCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        markSyncError(sid, sale.id, msg)
        console.error(`[Offline Sync] Échec pour la transaction ${sale.id} :`, msg)
        errorCount++
      }
    }

    refreshPendingCount(sid)

    if (errorCount === 0) {
      setSyncStatus('success')
      console.log(`[Offline Sync] ✅ ${successCount} écriture(s) synchronisée(s).`)
      // Réinitialiser le badge après 3 secondes
      setTimeout(() => setSyncStatus('idle'), 3000)
    } else {
      setSyncStatus('error')
      console.warn(`[Offline Sync] ⚠️ ${successCount} réussie(s), ${errorCount} échoué(s).`)
      setTimeout(() => setSyncStatus('idle'), 5000)
    }
  }

  const loadFinancialData = async () => {
    if (!mappedUser) return
    try {
      let salesList: any[] = []
      let clientsList: any[] = []
      let suppliersList: any[] = []

      const sid = mappedUser.shop_id

      if (isConfigured && isOnline) {
        try {
          // En ligne -> charger via le réseau
          const headers = { 'x-shop-id': sid }
          const response = await fetch('/api/sales', { headers })
          if (!response.ok) throw new Error('Erreur lors du chargement des écritures')
          const data = await response.json()
          salesList = data.sales || []

          const clientsRes = await fetch('/api/debts?type=client', { headers })
          const clientsData = await clientsRes.json()
          clientsList = clientsData.clients || []

          const suppliersRes = await fetch('/api/debts?type=supplier', { headers })
          const suppliersData = await suppliersRes.json()
          suppliersList = suppliersData.suppliers || []

          // Mettre en cache via offlineDb pour le mode hors-ligne
          replaceOfflineSales(sid, salesList)
          replaceOfflineClients(sid, clientsList)
          replaceOfflineSuppliers(sid, suppliersList)
          refreshPendingCount(sid)
        } catch (apiError) {
          console.warn('[API Fallback] Échec de chargement réseau, repli sur cache local :', apiError)
          salesList = getOfflineSales(sid)
          clientsList = getOfflineClients(sid)
          suppliersList = getOfflineSuppliers(sid)
        }
      } else {
        // Hors-ligne -> charger le cache offlineDb
        salesList = getOfflineSales(sid)
        clientsList = getOfflineClients(sid)
        suppliersList = getOfflineSuppliers(sid)
      }

      // Calculer le tiroir caisse
      let cash = 0
      for (const item of salesList) {
        if (item.status === 'crossed_out') continue
        const type = item.type
        const paid = item.paid ?? 0
        const total = item.total ?? 0

        if (type === 'cash_in' || type === 'payment_client') {
          cash += paid
        } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
          cash -= total
        }
      }

      const clientDebtsSum = clientsList.reduce((sum: number, c: any) => sum + (c.amount || c.amount_owed || 0), 0)
      const supplierDebtsSum = suppliersList.reduce((sum: number, s: any) => sum + (s.amount || s.amount_owed || 0), 0)

      setTiroirCaisse(cash)
      setArgentDehors(clientDebtsSum)
      setNosDettes(supplierDebtsSum)

      // Filtrer les ventes pour afficher seulement celles d'aujourd'hui dans le journal
      const todayStr = new Date().toISOString().split('T')[0]
      const todaysSales = salesList.filter((s: any) => s.date === todayStr)

      // Solde du jour (uniquement les transactions d'aujourd'hui)
      let cashToday = 0
      for (const item of todaysSales) {
        if (item.status === 'crossed_out') continue
        const type = item.type
        const paid = item.paid ?? 0
        const total = item.total ?? 0
        if (type === 'cash_in' || type === 'payment_client') {
          cashToday += paid
        } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
          cashToday -= total
        }
      }
      setSoldeDuJour(cashToday)

      setSales(todaysSales.reverse())
      setAllSales(salesList)

    } catch (err) {
      console.warn('[loadFinancialData] Repli sur cache hors-ligne :', err)
      const sid = mappedUser.shop_id
      const fallbackSales = getOfflineSales(sid)
      const fallbackClients = getOfflineClients(sid)
      const fallbackSuppliers = getOfflineSuppliers(sid)

      let cash = 0
      for (const item of fallbackSales) {
        if (item.status === 'crossed_out') continue
        const type = item.type
        const paid = item.paid ?? 0
        const total = item.total ?? 0
        if (type === 'cash_in' || type === 'payment_client') {
          cash += paid
        } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
          cash -= total
        }
      }

      setTiroirCaisse(cash)
      setArgentDehors(fallbackClients.reduce((sum: number, c: any) => sum + (c.amount || c.amount_owed || 0), 0))
      setNosDettes(fallbackSuppliers.reduce((sum: number, s: any) => sum + (s.amount || s.amount_owed || 0), 0))

      const todayStr = new Date().toISOString().split('T')[0]
      const todayFallback = fallbackSales.filter((s: any) => s.date === todayStr)

      // Solde du jour — fallback hors-ligne
      let cashTodayFallback = 0
      for (const item of todayFallback) {
        if (item.status === 'crossed_out') continue
        const type = item.type
        const paid = item.paid ?? 0
        const total = item.total ?? 0
        if (type === 'cash_in' || type === 'payment_client') {
          cashTodayFallback += paid
        } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
          cashTodayFallback -= total
        }
      }
      setSoldeDuJour(cashTodayFallback)

      setSales(todayFallback.reverse())
      setAllSales(fallbackSales)
    }
  }



  const getCategoryTotals = () => {
    let alimentation = allSales.filter(s => s.type === 'cash_in' || s.type === 'payment_client').reduce((sum, s) => sum + s.total, 0)
    let stockMarchandise = allSales.filter(s => s.type === 'purchase_cash').reduce((sum, s) => sum + s.total, 0)
    let stockCredit = allSales.filter(s => s.type === 'purchase_credit').reduce((sum, s) => sum + s.total, 0)
    let remboursement = allSales.filter(s => s.type === 'payment_client' || s.type === 'payment_supplier').reduce((sum, s) => sum + s.total, 0)
    let grossiste = allSales.filter(s => s.type === 'payment_supplier').reduce((sum, s) => sum + s.total, 0)
    let energie = allSales.filter(s => s.type === 'cash_out' && (s.notes.toLowerCase().includes('sbee') || s.notes.toLowerCase().includes('courant') || s.notes.toLowerCase().includes('elec') || s.notes.toLowerCase().includes('ampoule') || s.notes.toLowerCase().includes('transport'))).reduce((sum, s) => sum + s.total, 0)

    const total = alimentation + stockMarchandise + stockCredit + remboursement + grossiste + energie

    return [
      { name: 'Alimentation', amount: alimentation, percentage: total > 0 ? Math.round((alimentation / total) * 100) : 0, color: 'bg-blue-600' },
      { name: 'Stock / Marchandise', amount: stockMarchandise, percentage: total > 0 ? Math.round((stockMarchandise / total) * 100) : 0, color: 'bg-emerald-600' },
      { name: 'Stock Crédit', amount: stockCredit, percentage: total > 0 ? Math.round((stockCredit / total) * 100) : 0, color: 'bg-rose-600' },
      { name: 'Remboursement', amount: remboursement, percentage: total > 0 ? Math.round((remboursement / total) * 100) : 0, color: 'bg-teal-600' },
      { name: 'Grossiste', amount: grossiste, percentage: total > 0 ? Math.round((grossiste / total) * 100) : 0, color: 'bg-purple-600' },
      { name: 'Énergie / SBEE', amount: energie, percentage: total > 0 ? Math.round((energie / total) * 100) : 0, color: 'bg-red-500' },
    ]
  }

  const getTopItems = () => {
    const itemMap: { [name: string]: { qty: number; amount: number } } = {}

    allSales.forEach(sale => {
      if (sale.status === 'crossed_out') return
      sale.articles.forEach(art => {
        const name = art.name.trim()
        if (!itemMap[name]) {
          itemMap[name] = { qty: 0, amount: 0 }
        }
        itemMap[name].qty += art.quantity
        itemMap[name].amount += art.quantity * art.unit_price
      })
    })

    return Object.entries(itemMap).map(([name, data]) => ({
      name,
      qty: data.qty,
      amount: data.amount
    })).sort((a, b) => b.amount - a.amount).slice(0, 5)
  }

  const parseTextLocallyClientSide = (text: string, penColor: string) => {
    const articles: any[] = []
    let totalFacture = 0

    const hasExplicitSeparator = /(?:^|\s)(?:à|a|@)(?:\s|$)/i.test(text)
    const articleRegex = hasExplicitSeparator
      ? /(\d+)\s*(.*?)\s*(?:à|a|@)\s*(\d+)/gi
      : /(\d+)\s+(.+?)\s+(\d+)/gi
    let match

    const packRegex = /de\s+(\d+)\s+([A-Za-zÀ-ÿ]+)/i
    const salePriceRegex = /(?:prix de vente|vente|prix de vente a l'unite|prix de vente a l'unité)\s+(?:de\s+|a\s+|à\s+|@\s+|l'unite\s+|l'unité\s+)*(\d+)/i

    while ((match = articleRegex.exec(text)) !== null) {
      const qty = parseInt(match[1], 10)
      const name = match[2].trim() || "Article(s)"
      const price = parseInt(match[3], 10)

      if (qty > 1 && qty >= price) {
        continue
      }

      const packMatch = name.match(packRegex)
      const salePriceMatch = text.match(salePriceRegex)

      let finalQty = qty
      let finalUnitPrice = price
      let uniteAchat = undefined
      let uniteVente = undefined
      let quantiteParBoite = undefined
      let prixVenteUnitaire = salePriceMatch ? parseInt(salePriceMatch[1], 10) : undefined
      let simplifiedName = name

      if (packMatch) {
        const multiplier = parseInt(packMatch[1], 10)
        uniteVente = packMatch[2].trim()
        quantiteParBoite = multiplier

        const firstWord = name.split(/\s+/)[0]
        if (['caissier', 'carton', 'sac', 'boite', 'boîte', 'paquet'].includes(firstWord.toLowerCase())) {
          uniteAchat = firstWord
          simplifiedName = name.replace(new RegExp(`^${firstWord}\\s+(?:de\\s+)?`, 'i'), '')
        }

        simplifiedName = simplifiedName.replace(packRegex, '').replace(/\s+de\s*$/, '').trim()

        finalQty = qty * multiplier
        finalUnitPrice = Math.round(price / multiplier)
      }

      articles.push({
        nom: simplifiedName,
        quantite: finalQty,
        prix_unitaire: finalUnitPrice,
        unite_achat: uniteAchat,
        unite_vente: uniteVente,
        quantite_par_boite: quantiteParBoite,
        prix_vente_unitaire: prixVenteUnitaire
      })
      totalFacture += qty * price
    }

    if (articles.length === 0) {
      const amountRegex = /(?:total|montant|somme|de)?\s*(\d{3,7})(?:\s*f|\s*fcfa|\s*cfa|\s*francs)?/i
      const amountMatch = text.match(amountRegex)
      if (amountMatch) {
        const amount = parseInt(amountMatch[1], 10)
        totalFacture = amount
        articles.push({
          nom: "Transaction générale",
          quantite: 1,
          prix_unitaire: amount
        })
      }
    }

    let nomClient = "Client anonyme"
    const clientRegex = /(?:pour|de|client|grossiste|fournisseur|a)\s+([A-Za-z]+)/i
    const clientMatch = text.match(clientRegex)
    if (clientMatch) {
      nomClient = clientMatch[1].trim()
      nomClient = nomClient.charAt(0).toUpperCase() + nomClient.slice(1)
    }

    let montantPaye = totalFacture
    let montantDette = 0

    const payeRegex = /(?:payé|paye|recu|donne)\s+(\d+)/i
    const payeMatch = text.match(payeRegex)
    if (payeMatch) {
      montantPaye = parseInt(payeMatch[1], 10)
    }

    const resteRegex = /(?:reste|dette|credit|dû|du)\s+(\d+)/i
    const resteMatch = text.match(resteRegex)
    if (resteMatch) {
      montantDette = parseInt(resteMatch[1], 10)
      if (penColor === 'yellow' || penColor === 'purple') {
        montantPaye = totalFacture - montantDette
      }
    }

    if (penColor === 'yellow' || penColor === 'purple') {
      if (!payeMatch && !resteMatch) {
        montantPaye = 0
        montantDette = totalFacture
      } else {
        montantDette = Math.max(0, totalFacture - montantPaye)
      }
    } else {
      montantPaye = totalFacture
      montantDette = 0
    }

    return {
      nom_client: nomClient,
      articles,
      total_facture: totalFacture,
      montant_paye: Math.max(0, montantPaye),
      montant_dette: Math.max(0, montantDette)
    }
  }

  const submitTransaction = async (bodyData: { text: string; penColor: string; overrideData?: any }) => {
    if (!mappedUser) return
    setLoading(true)
    setPostItWarning(null)

    const online = typeof window !== 'undefined' ? window.navigator.onLine : false
    const shopId = mappedUser.shop_id

    let useOfflineFallback = false

    try {
      if (isConfigured && online) {
        try {
          // Mode en ligne -> Envoyer à l'API
          const response = await fetch('/api/sales', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-shop-id': shopId
            },
            body: JSON.stringify(bodyData),
          })

          const data = await response.json()

          if (!response.ok) {
            if (data.isSafeguardTriggered) {
              setPostItWarning(data.error)
              return
            } else {
              throw new Error(data.error || 'Erreur lors de l\'enregistrement')
            }
          }
        } catch (fetchErr: any) {
          console.warn('[Sales API Fallback] Impossible d\'enregistrer en ligne, bascule automatique en local:', fetchErr)
          useOfflineFallback = true
        }
      }

      if (!isConfigured || !online || useOfflineFallback) {
        // Mode hors-ligne -> Enregistrer localement via offlineDb
        let parsed: any = null
        const color = bodyData.penColor
        const text = bodyData.text
        const sid = mappedUser.shop_id

        if (bodyData.overrideData) {
          parsed = {
            nom_client: bodyData.overrideData.client_name || 'Client anonyme',
            articles: bodyData.overrideData.articles.map((a: any) => ({
              nom: a.name || a.nom,
              quantite: a.quantity || a.quantite,
              prix_unitaire: a.unit_price || a.prix_unitaire,
            })),
            total_facture: bodyData.overrideData.total_amount,
            montant_paye: bodyData.overrideData.paid_amount,
            montant_dette: bodyData.overrideData.debt_amount,
          }
        } else {
          parsed = parseTextLocallyClientSide(text, color)
        }

        // Déterminer le type
        let type = 'cash_in'
        if (color === 'red') type = 'cash_out'
        else if (color === 'green') type = 'purchase_cash'
        else if (color === 'purple') type = 'purchase_credit'
        else if (color === 'yellow') type = 'sale_credit'

        // Forcer en Achat Stock (purchase_cash / purchase_credit) si le texte commence par "stock" ou "achat"
        const lowercaseText = text.trim().toLowerCase()
        if (lowercaseText.startsWith('stock') || lowercaseText.startsWith('achat')) {
          if (type === 'cash_in' || type === 'sale_credit') {
            type = 'purchase_cash'
          }
        }

        // Safeguard tiroir caisse
        const isExpense = type === 'cash_out' || type === 'purchase_cash'
        if (isExpense && tiroirCaisse < parsed.total_facture) {
          setPostItWarning(
            `Opération bloquée : Solde insuffisant dans le tiroir-caisse. Il vous manque ${parsed.total_facture - tiroirCaisse} FCFA.`
          )
          return
        }

        // Créer l'objet transaction avec UUID propre
        const now = new Date()
        const newSale = {
          id: generateOfflineId(),
          shop_id: sid,
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          client: parsed.nom_client,
          total: parsed.total_facture,
          paid: parsed.montant_paye,
          debt: parsed.montant_dette,
          status: (parsed.montant_dette > 0 ? 'debt' : 'paid') as 'paid' | 'debt' | 'crossed_out',
          type,
          pen_color: color,
          notes: text,
          articles: parsed.articles.map((a: any) => ({
            name: a.nom,
            quantity: a.quantite,
            unit_price: a.prix_unitaire,
          })),
          created_at: now.toISOString(),
          is_synced: false,
        }

        // Persister via offlineDb
        saveOfflineSale(sid, newSale)

        // Mettre à jour les dettes locales si nécessaire
        if (parsed.montant_dette > 0) {
          if (type === 'sale_credit') {
            addOrUpdateOfflineClientDebt(sid, parsed.nom_client, parsed.montant_dette)
          } else if (type === 'purchase_credit') {
            addOrUpdateOfflineSupplierDebt(sid, parsed.nom_client, parsed.montant_dette)
          }
        }

        // ─── CRÉATION/MISE À JOUR DYNAMIQUE HORS-LIGNE DANS LE CATALOGUE STOCK ───
        const isStockOp = ['purchase_cash', 'purchase_credit', 'cash_in', 'sale_credit'].includes(type)
        if (isStockOp && parsed.articles.length > 0) {
          for (const article of parsed.articles) {
            const prodName = article.nom.trim()
            if (!prodName) continue

            const offlineProducts = getOfflineProducts(sid)
            const existing = offlineProducts.find(p => p.name.toLowerCase().trim() === prodName.toLowerCase().trim())

            const unit = article.unite_vente || 'unité'
            const isPurchase = ['purchase_cash', 'purchase_credit'].includes(type)
            const isSale = ['cash_in', 'sale_credit'].includes(type)

            const unitCost = isPurchase ? article.prix_unitaire : undefined
            const unitPrice = article.prix_vente_unitaire || (isSale ? article.prix_unitaire : undefined)

            if (existing) {
              const updated = { ...existing }
              if (unitCost !== undefined && unitCost > 0) updated.unit_cost = unitCost
              if (unitPrice !== undefined && unitPrice > 0) updated.unit_price = unitPrice
              if (article.unite_vente) updated.unit = article.unite_vente
              if (article.seuil_alerte !== undefined) updated.alert_threshold = article.seuil_alerte
              saveOfflineProduct(sid, updated)
            } else {
              saveOfflineProduct(sid, {
                id: generateOfflineId(),
                shop_id: sid,
                name: prodName,
                category: 'Général',
                unit: unit,
                alert_threshold: article.seuil_alerte ?? 5,
                initial_stock: 0,
                unit_cost: unitCost ?? 0,
                unit_price: unitPrice ?? 0,
                created_at: new Date().toISOString()
              })
            }
          }
        }

        refreshPendingCount(sid)
      }

      setInput('')
      await loadFinancialData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setPostItWarning(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAdjustment = async () => {
    if (adjustmentType === 'flow') {
      const amtVal = parseInt(flowAmount, 10)
      if (isNaN(amtVal) || amtVal <= 0) return

      setActionLoading(true)
      try {
        const type = flowDirection === 'in' ? 'cash_in' : 'cash_out'
        const penColor = flowDirection === 'in' ? 'blue' : 'red'
        const desc = flowDirection === 'in' ? 'Apport caisse' : 'Retrait caisse'
        const noteText = adjustmentNote.trim() ? ` - ${adjustmentNote.trim()}` : ''
        const text = `${desc}: ${flowDirection === 'in' ? '+' : '-'}${amtVal} F${noteText}`

        await submitTransaction({
          text,
          penColor,
          overrideData: {
            articles: [],
            total_amount: amtVal,
            paid_amount: amtVal,
            debt_amount: 0,
            client_name: 'Propriétaire',
            type,
            pen_color: penColor
          }
        })

        setShowCashAdjustment(false)
        setFlowAmount('')
        setAdjustmentNote('')
      } catch (e) {
        console.error(e)
        setPostItWarning("Erreur lors de l'enregistrement de l'opération.")
      } finally {
        setActionLoading(false)
      }
    } else {
      const cashVal = parseInt(physicalCash, 10)
      if (isNaN(cashVal) || cashVal < 0) return

      const diff = cashVal - tiroirCaisse
      if (diff === 0) {
        setShowCashAdjustment(false)
        return
      }

      setActionLoading(true)
      try {
        const type = diff > 0 ? 'cash_in' : 'cash_out'
        const penColor = diff > 0 ? 'blue' : 'red'
        const text = `Ajustement caisse: Physique ${cashVal} F (Calculé: ${tiroirCaisse} F, Écart: ${diff > 0 ? '+' : ''}${diff} F)${adjustmentNote.trim() ? ` - ${adjustmentNote.trim()}` : ''}`

        await submitTransaction({
          text,
          penColor,
          overrideData: {
            articles: [],
            total_amount: Math.abs(diff),
            paid_amount: Math.abs(diff),
            debt_amount: 0,
            client_name: 'Propriétaire',
            type,
            pen_color: penColor
          }
        })

        setShowCashAdjustment(false)
        setPhysicalCash('')
        setAdjustmentNote('')
      } catch (e) {
        console.error(e)
        setPostItWarning("Erreur lors de l'ajustement de caisse.")
      } finally {
        setActionLoading(false)
      }
    }
  }

  const checkIfInputHasPrice = (text: string) => {
    if (text.match(/\b(?:à|a|@)\s*\d+/i) || text.match(/\b\d+\s*(?:à|a|@)\s*\d+/i)) {
      return true
    }
    const parts = text.split(/\s*(?:\+|,|\bet\b)\s*/i)
    return parts.every(part => {
      const match = part.trim().match(/(\d+)\s+(.+?)\s+(\d+)$/)
      if (match) {
        const qty = parseInt(match[1], 10)
        const price = parseInt(match[3], 10)
        if (price >= 10 && price > qty) {
          return true
        }
      }
      return false
    })
  }

  const resolveTransactionPricesFromCatalog = (text: string, penColor: string, sid: string) => {
    // Ne pas intercepter les commandes spéciales
    if (!text.trim()) return null
    if (text.match(/^(?:apport|monnaie|retrait|caisse|ajustement|remboursement|dette)/i)) return null

    // Nettoyer les préfixes de stock/achat pour isoler uniquement les produits et quantités
    const cleanedText = text.replace(/^(?:stock|achat)\s+de\s+/i, '')
      .replace(/^(?:stock|achat)\s+/i, '')
      .trim()

    const hasExplicitPrice = checkIfInputHasPrice(cleanedText)
    const parts = cleanedText.split(/\s*(?:\+|,|\bet\b)\s*/i).map(p => p.trim()).filter(Boolean)
    const isSinglePart = parts.length <= 1

    // Si un seul produit sans prix explicite -> comportement original (retourne null si non trouvé)
    if (isSinglePart && !hasExplicitPrice) {
      const part = parts[0]
      if (!part) return null
      let qty = 1
      let productName = part
      const qtyMatch = part.match(/^(\d+)\s+(.+)$/)
      if (qtyMatch) { qty = parseInt(qtyMatch[1], 10); productName = qtyMatch[2].trim() }
      let searchName = productName
      const packMatch = productName.match(/^(caissier|carton|sac|boite|boîte|paquet|unité|unite)\s+(?:de\s+)?(.+)$/i)
      if (packMatch) searchName = packMatch[2].trim()
      const offlineProducts = getOfflineProducts(sid)
      const product = offlineProducts.find(p => p.name.toLowerCase().trim() === searchName.toLowerCase().trim())
      if (!product) return null
      const isPurchase = ['green', 'purple'].includes(penColor)
      let unitPrice = isPurchase
        ? (packMatch ? product.unit_cost * (product.multiplier || 1) : product.unit_cost)
        : product.unit_price
      if (!unitPrice || unitPrice <= 0) return null
      const textOut = packMatch ? `${qty} ${packMatch[1]} de ${product.name} à ${unitPrice}` : `${qty} ${product.name} à ${unitPrice}`
      return { resolvedText: textOut, articles: [{ nom: product.name, quantite: qty, prix_unitaire: unitPrice }], unresolvedNames: [] as string[] }
    }

    // Multi-produits : si c'est un produit unique avec prix explicite, on laisse faire le flux classique (retourne null)
    if (hasExplicitPrice && isSinglePart) return null

    const resolvedArticles: any[] = []
    const resolvedTextParts: string[] = []
    const unresolvedNames: string[] = []
    const offlineProducts = getOfflineProducts(sid)
    const isPurchase = ['green', 'purple'].includes(penColor)

    for (const part of parts) {
      let qty = 1
      let productName = part
      let explicitPrice: number | null = null

      // Détecter prix explicite dans cette partie (ex: "1 flag à 600")
      const priceSepMatch = part.match(/\s*(?:à|a|@)\s*(\d+)$/i)
      if (priceSepMatch) {
        explicitPrice = parseInt(priceSepMatch[1], 10)
        productName = part.substring(0, priceSepMatch.index).trim()
      } else {
        // Détecter aussi le prix implicite (ex: "2 flag 600")
        const implicitPriceMatch = part.match(/^(\d+)\s+(.+?)\s+(\d+)$/)
        if (implicitPriceMatch) {
          const qtyVal = parseInt(implicitPriceMatch[1], 10)
          const priceVal = parseInt(implicitPriceMatch[3], 10)
          if (priceVal >= 10 && priceVal > qtyVal) {
            explicitPrice = priceVal
            productName = `${qtyVal} ${implicitPriceMatch[2].trim()}`
          }
        }
      }

      const qtyMatch = productName.match(/^(\d+)\s+(.+)$/)
      if (qtyMatch) { qty = parseInt(qtyMatch[1], 10); productName = qtyMatch[2].trim() }

      let searchName = productName
      const packMatch = productName.match(/^(caissier|carton|sac|boite|boîte|paquet|unité|unite)\s+(?:de\s+)?(.+)$/i)
      if (packMatch) searchName = packMatch[2].trim()

      if (explicitPrice !== null) {
        // Prix explicite fourni -> utiliser directement
        const textOut = packMatch ? `${qty} ${packMatch[1]} de ${searchName} à ${explicitPrice}` : `${qty} ${searchName} à ${explicitPrice}`
        resolvedTextParts.push(textOut)
        resolvedArticles.push({ nom: searchName, quantite: qty, prix_unitaire: explicitPrice })
      } else {
        const product = offlineProducts.find(p => p.name.toLowerCase().trim() === searchName.toLowerCase().trim())
        if (product) {
          let unitPrice = isPurchase
            ? (packMatch ? product.unit_cost * (product.multiplier || 1) : product.unit_cost)
            : product.unit_price

          if (unitPrice && unitPrice > 0) {
            const textOut = packMatch ? `${qty} ${packMatch[1]} de ${product.name} à ${unitPrice}` : `${qty} ${product.name} à ${unitPrice}`
            resolvedTextParts.push(textOut)
            resolvedArticles.push({ nom: product.name, quantite: qty, prix_unitaire: unitPrice })
          } else {
            unresolvedNames.push(productName)
          }
        } else {
          unresolvedNames.push(productName)
        }
      }
    }

    if (resolvedTextParts.length === 0 && unresolvedNames.length === 0) return null

    return {
      resolvedText: resolvedTextParts.join(', '),
      articles: resolvedArticles,
      unresolvedNames
    }
  }

  const parseSimpleStockInput = (text: string) => {
    let cleaned = text.replace(/^(?:stock|achat)\s+de\s+/i, '').trim()

    let qty = 1
    let packaging: string | undefined = undefined
    let productName = cleaned

    const qtyMatch = cleaned.match(/^(\d+)\s+(.+)$/)
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1], 10)
      const rest = qtyMatch[2].trim()
      const packMatch = rest.match(/^(caissier|carton|sac|boite|boîte|paquet|unité|unite)\s+(?:de\s+)?(.+)$/i)
      if (packMatch) {
        packaging = packMatch[1].toLowerCase()
        productName = packMatch[2].trim()
      } else {
        productName = rest
      }
    } else {
      const packMatch = cleaned.match(/^(caissier|carton|sac|boite|boîte|paquet|unité|unite)\s+(?:de\s+)?(.+)$/i)
      if (packMatch) {
        packaging = packMatch[1].toLowerCase()
        productName = packMatch[2].trim()
      }
    }

    // Retirer d'éventuels suffixes de prix
    productName = productName.split(/\s+(?:à|a|@|vente|prix)\b/i)[0].trim()

    return { qty, packaging, productName }
  }

  const handleConfirmSimpleStock = async () => {
    if (!stockConfirmationData) return
    const { product, quantity, packaging, multiplier, unit } = stockConfirmationData
    const lotPrice = product.unit_cost * multiplier
    const salePrice = product.unit_price

    let text = ''
    if (packaging === 'unité') {
      text = `stock de ${quantity} ${product.name} à ${lotPrice} prix de vente à l'unité ${salePrice}`
    } else {
      text = `stock de ${quantity} ${packaging} de ${product.name} de ${multiplier} ${unit} à ${lotPrice} prix de vente à l'unité ${salePrice}`
    }

    try {
      await submitTransaction({
        text,
        penColor: 'green'
      })
      setShowStockConfirmation(false)
      setInput('')
    } catch (e) {
      console.error(e)
      setPostItWarning("Erreur lors de l'enregistrement du stock.")
    }
  }

  const handleConfirmPriceChange = async () => {
    if (!priceChangeData) return
    const { rawText, penColor } = priceChangeData
    try {
      await submitTransaction({
        text: rawText,
        penColor
      })
      setShowPriceChangeDialog(false)
      setInput('')
    } catch (e) {
      console.error(e)
      setPostItWarning("Erreur lors de l'enregistrement.")
    }
  }

  const handleRejectPriceChange = async () => {
    if (!priceChangeData || !mappedUser) return
    const { product, rawText, penColor } = priceChangeData
    const sid = mappedUser.shop_id
    const isOnline = typeof window !== 'undefined' ? window.navigator.onLine : false

    try {
      await submitTransaction({
        text: rawText,
        penColor
      })

      const oldUnitCost = product.unit_cost
      const oldUnitPrice = product.unit_price

      if (isConfigured && isOnline) {
        await fetch('/api/stock', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-shop-id': sid },
          body: JSON.stringify({
            id: product.id,
            unit_cost: oldUnitCost,
            unit_price: oldUnitPrice
          })
        })
      } else {
        const updated = { ...product, unit_cost: oldUnitCost, unit_price: oldUnitPrice }
        saveOfflineProduct(sid, updated)
      }

      setShowPriceChangeDialog(false)
      setInput('')
    } catch (e) {
      console.error(e)
      setPostItWarning("Erreur lors de l'enregistrement.")
    }
  }

  const handleConfirmStockWizard = async () => {
    const qty = parseInt(wizardQuantity, 10) || 1
    const mult = parseInt(wizardMultiplier, 10) || 1
    const purchaseP = parseInt(wizardPurchasePrice, 10) || 0
    const saleP = parseInt(wizardSalePrice, 10) || 0

    const finalMult = wizardPackaging === 'unité' ? 1 : mult
    const finalPackaging = wizardPackaging === 'unité' ? 'unité' : wizardPackaging

    let text = ''
    if (finalPackaging === 'unité') {
      text = `stock de ${qty} ${wizardProductName} à ${purchaseP} prix de vente à l'unité ${saleP}`
    } else {
      text = `stock de ${qty} ${finalPackaging} de ${wizardProductName} de ${finalMult} ${wizardUnit} à ${purchaseP} prix de vente à l'unité ${saleP}`
    }

    try {
      await submitTransaction({
        text,
        penColor: 'green'
      })
      setShowStockWizard(false)
      setInput('')
    } catch (e) {
      console.error(e)
      setPostItWarning("Erreur lors de l'enregistrement du stock.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // 1. Nettoyer les espaces, points et virgules uniquement pour les séparateurs de milliers (ex: "12 000" ou "12.000" -> "12000")
    let sanitizedInput = input.trim()
    let prevSanitized = ""
    while (sanitizedInput !== prevSanitized) {
      prevSanitized = sanitizedInput
      sanitizedInput = sanitizedInput.replace(/(\d)[.,\s]+(\d{3})(?!\d)/g, "$1$2")
    }

    // Tenter de résoudre automatiquement les prix depuis le catalogue si aucun prix n'est écrit
    const sid = mappedUser?.shop_id || 'default-shop'
    const resolvedResult = resolveTransactionPricesFromCatalog(sanitizedInput, selectedPen, sid)

    let finalInput = sanitizedInput
    if (resolvedResult) {
      if (resolvedResult.unresolvedNames.length > 0) {
        const productsList = resolvedResult.unresolvedNames.map(n => `« ${n} »`).join(', ')
        setPostItWarning(
          resolvedResult.unresolvedNames.length === 1
            ? `Le produit ${productsList} n'a pas été trouvé dans le catalogue. Veuillez préciser son prix (ex: ${resolvedResult.unresolvedNames[0]} à 600) ou l'ajouter au stock.`
            : `Les produits ${productsList} n'ont pas été trouvés dans le catalogue. Veuillez préciser leurs prix.`
        )
        return
      }
      // Conserver le préfixe "stock (de)" ou "achat (de)" si l'utilisateur l'a tapé à l'origine
      const prefixMatch = sanitizedInput.match(/^(?:stock|achat)\s+(?:de\s+)?/i)
      const prefix = prefixMatch ? prefixMatch[0] : ''
      finalInput = prefix + resolvedResult.resolvedText
    } else {
      // Si l'entrée ressemble à un produit avec quantité (ex: "2 flag") sans prix et qu'on ne l'a pas résolu,
      // c'est qu'il n'est pas dans le catalogue. Pour éviter une écriture à 0 F, on affiche une alerte.
      const qtyProductMatch = sanitizedInput.replace(/^(?:stock|achat)\s+(?:de\s+)?/i, '').trim().match(/^(\d+)\s+(.+)$/)
      const hasPrice = checkIfInputHasPrice(sanitizedInput)

      const isStockOpTemp = sanitizedInput.match(/^(?:stock|achat)\s+/i) || selectedPen === 'green'
      if (qtyProductMatch && !hasPrice && !isStockOpTemp) {
        const productNameClean = qtyProductMatch[2].split(/\s+(?:à|a|@|vente|prix)\b/i)[0].trim()
        setPostItWarning(`Le produit « ${productNameClean} » n'a pas été trouvé dans le catalogue. Veuillez préciser le prix (ex: ${sanitizedInput} à 600) ou l'ajouter au stock.`)
        return
      }
    }

    // Interception et aide à la saisie de stock / achat (produits existants vs nouveaux, avec ou sans prix)
    const isMultiple = finalInput.includes(',') || finalInput.includes('+') || (resolvedResult && resolvedResult.articles.length > 1)
    const isStockOp = (finalInput.match(/^(?:stock|achat)\s+/i) || selectedPen === 'green') && !isMultiple
    if (isStockOp) {
      const { qty, packaging, productName } = parseSimpleStockInput(finalInput)

      if (productName && productName !== 'transaction générale') {
        const offlineProducts = getOfflineProducts(sid)
        const existing = offlineProducts.find(p => p.name.toLowerCase().trim() === productName.toLowerCase().trim())
        const hasPrice = checkIfInputHasPrice(finalInput)

        // On ne confirme rapidement que si le produit existe ET possède un coût d'achat configuré (> 0)
        if (existing && existing.unit_cost > 0) {
          if (!hasPrice) {
            // Cas A : Pas de prix écrit -> Confirmer rapidement avec les tarifs mémorisés
            setStockConfirmationData({
              product: existing,
              quantity: qty,
              packaging: packaging || existing.packaging_name || 'unité',
              multiplier: existing.multiplier || 1,
              unit: existing.unit || 'pièce'
            })
            setShowStockConfirmation(true)
            return
          } else {
            // Cas B : Prix écrit -> Alerte si différence avec le catalogue
            const matchPrice = finalInput.match(/(\d+)\s*(?:à|a|@)\s+(\d+)/i)
            if (matchPrice) {
              const enteredLotPrice = parseInt(matchPrice[2], 10)
              const expectedLotPrice = existing.unit_cost * (existing.multiplier || 1)

              if (Math.abs(enteredLotPrice - expectedLotPrice) > 5) {
                setPriceChangeData({
                  product: existing,
                  newLotPrice: enteredLotPrice,
                  oldLotPrice: expectedLotPrice,
                  rawText: finalInput,
                  penColor: selectedPen === 'green' ? 'green' : 'green' // Achat toujours vert
                })
                setShowPriceChangeDialog(true)
                return
              }
            }
          }
        } else {
          // Produit inexistant
          if (!hasPrice) {
            // Pas de prix, on ouvre l'assistant guidé complet pré-rempli
            setWizardProductName(productName)
            setWizardQuantity(String(qty))
            setWizardPackaging(packaging || 'unité')
            if (packaging === 'caissier') {
              setWizardMultiplier('12')
              setWizardUnit('bouteille')
            } else if (packaging === 'carton') {
              setWizardMultiplier('24')
              setWizardUnit('paquet')
            } else if (packaging === 'sac') {
              setWizardMultiplier('50')
              setWizardUnit('kg')
            } else {
              setWizardMultiplier('1')
              setWizardUnit('pièce')
            }
            setWizardAlertThreshold('5')
            setWizardPurchasePrice('')
            setWizardSalePrice('')
            setWizardStep(2) // Étape 2 directe car le nom du produit est déjà renseigné
            setShowStockWizard(true)
            return
          }
        }
      }
    }

    await submitTransaction({
      text: finalInput,
      penColor: selectedPen
    })
  }

  const handleSaleCrossedOut = () => {
    loadFinancialData()
  }

  const handleAddArticle = async (saleId: string, text: string) => {
    if (!mappedUser) return
    const sid = mappedUser.shop_id
    const online = typeof window !== 'undefined' ? window.navigator.onLine : false

    try {
      if (isConfigured && online) {
        const response = await fetch('/api/sales', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': sid
          },
          body: JSON.stringify({ id: saleId, action: 'add_article', text, penColor: selectedPen })
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Erreur lors de l'ajout de l'article")
        }
      } else {
        // Mode hors-ligne : modifier localement
        const offlineSales = JSON.parse(localStorage.getItem(`cahier_offline_sales_${sid}`) || '[]')
        const idx = offlineSales.findIndex((s: any) => s.id === saleId)
        if (idx > -1) {
          const sale = offlineSales[idx]
          // Résoudre les prix depuis le catalogue hors-ligne local si possible
          const resolved = resolveTransactionPricesFromCatalog(text, selectedPen || sale.pen_color || 'blue', sid)
          let finalNewText = text
          let parsed: any = null
          if (resolved) {
            if (resolved.unresolvedNames.length > 0) {
              throw new Error(`Produit « ${resolved.unresolvedNames[0]} » non trouvé dans le catalogue local.`)
            }
            finalNewText = resolved.resolvedText
            parsed = {
              articles: resolved.articles,
              total_facture: resolved.articles.reduce((sum: number, a: any) => sum + a.quantite * a.prix_unitaire, 0)
            }
          } else {
            const p = parseTextLocallyClientSide(text, selectedPen || sale.pen_color || 'blue')
            parsed = p
          }

          if (parsed && parsed.articles && parsed.articles.length > 0) {
            const addedAmount = parsed.total_facture
            const oldTotal = sale.total ?? 0
            const oldPaid = sale.paid ?? 0
            const newTotal = oldTotal + addedAmount
            const newPaid = sale.type === 'cash_in' ? newTotal : oldPaid
            const newDebt = Math.max(0, newTotal - newPaid)

            sale.total = newTotal
            sale.paid = newPaid
            sale.debt = newDebt
            sale.status = newDebt > 0 ? 'debt' : 'paid'
            sale.notes = sale.notes ? `${sale.notes}, ${finalNewText}` : finalNewText
            sale.articles = [
              ...(sale.articles || []),
              ...parsed.articles.map((a: any) => ({
                name: a.nom,
                quantity: a.quantite,
                unit_price: a.prix_unitaire
              }))
            ]
            sale.is_synced = false
            localStorage.setItem(`cahier_offline_sales_${sid}`, JSON.stringify(offlineSales))
          } else {
            throw new Error("Saisie d'article non reconnue")
          }
        }
      }
      await loadFinancialData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout"
      setPostItWarning(msg)
      throw err
    }
  }

  const handleUpdateCategory = async (saleId: string, category: string) => {
    if (!mappedUser) return
    const sid = mappedUser.shop_id
    const online = typeof window !== 'undefined' ? window.navigator.onLine : false

    try {
      if (isConfigured && online) {
        const response = await fetch('/api/sales', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': sid
          },
          body: JSON.stringify({ id: saleId, action: 'update_category', category })
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Erreur lors de la mise à jour de la catégorie")
        }
      } else {
        // Mode hors-ligne : modifier localement
        const offlineSales = JSON.parse(localStorage.getItem(`cahier_offline_sales_${sid}`) || '[]')
        const idx = offlineSales.findIndex((s: any) => s.id === saleId)
        if (idx > -1) {
          offlineSales[idx].category = category
          offlineSales[idx].is_synced = false
          localStorage.setItem(`cahier_offline_sales_${sid}`, JSON.stringify(offlineSales))
        }
      }
      await loadFinancialData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      setPostItWarning(msg)
      throw err
    }
  }

  const handleConvertToStockPurchase = async (text: string) => {
    await submitTransaction({
      text,
      penColor: 'green'
    })
  }

  const handleError = (err: string) => {
    setPostItWarning(err)
  }

  // Nombre d'anneaux du classeur spiral
  const spiralRings = Array.from({ length: 20 })
  const currentPen = PENS.find(p => p.id === selectedPen) || PENS[0]

  // Écritures filtrées selon l'onglet de filtre actif
  const filteredSales = journalFilter === 'all' ? sales : sales.filter(s => s.pen_color === journalFilter)
  const filteredAllSales = archiveFilter === 'all' ? allSales : allSales.filter(s => s.pen_color === archiveFilter)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#141210] flex items-center justify-center">
        <Loader className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    )
  }

  if (!user && !localDemo) {
    return <AuthScreen
      onBypass={(role) => {
        setDemoRole(role)
        // Create a synthetic demo user so mappedUser resolves correctly
        setUser({
          id: `demo-${role}-001`,
          email: `demo-${role}@cahier.local`,
          full_name: role === 'owner' ? '👑 Démo Propriétaire' : '🙋 Démo Gérant',
          role: role,
          shop_id: role === 'owner' ? 'demo-owner-shop' : 'demo-owner-shop'
        })
      }}
      onLoginSuccess={(usr) => setUser(usr)}
    />
  }

  return (
    <main className="min-h-dvh md:min-h-screen md:py-8 md:px-4 max-w-7xl mx-auto flex flex-col md:gap-6 relative overflow-x-hidden">

      {/* Lamp Highlight overlay for desk immersion */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500 opacity-[0.03] rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Main Tabbed Cahier Layout Container */}
      <div className="flex-grow flex flex-col relative z-10 max-w-5xl mx-auto w-full h-full">

        {/* Notebook Main Open Plate Chassis */}
        <div className="bg-[#fdfaf2] md:rounded-3xl border-0 md:border border-gray-300 shadow-none md:shadow-2xl flex relative z-0 h-dvh md:h-[720px] overflow-hidden w-full max-w-full">

          {/* Left leather cover binder spine */}
          <div className="flex w-10 md:w-16 notebook-cover-left flex-col items-center justify-between py-6 md:py-12 z-10 flex-shrink-0 select-none">
            {/* Top brass screw */}
            <div className="brass-screw"></div>

            {/* Vertical gold letter spine title */}
            <div className="font-extrabold text-[7px] md:text-[9px] text-[#f59e0b] font-sans tracking-[0.2em] md:tracking-[0.4em] uppercase select-none my-auto whitespace-nowrap [writing-mode:vertical-lr] rotate-180 text-center opacity-85">
              Cahier de Caisse Intelligent
            </div>

            {/* Middle brass medallion */}
            <div className="w-7 h-7 md:w-10 md:h-10 rounded-full brass-medallion flex flex-col items-center justify-center text-[7px] md:text-[9px] font-bold font-mono my-2 md:my-4 shadow-md">
              <span className="scale-[0.8] md:scale-100">200</span>
              <span className="text-[4px] md:text-[5px] uppercase tracking-tighter -mt-0.5 md:mt-0 select-none">PAGES</span>
            </div>

            {/* Bottom brass screw */}
            <div className="brass-screw"></div>
          </div>

          {/* Spiral loops */}
          <div className="flex absolute left-[32px] md:left-[54px] top-0 bottom-0 w-4 md:w-5 flex-col items-center justify-around py-4 md:py-6 z-20 pointer-events-none">
            {spiralRings.map((_, i) => (
              <div
                key={i}
                className="w-5 md:w-8 h-2 md:h-3.5 spiral-ring"
              ></div>
            ))}
          </div>

          {/* Right Page ( Ivory Seyes Lined Paper ) */}
          <div className="flex-1 min-w-0 flex flex-col h-full bg-[#fdfaf2] relative">

            {/* Header Area Inside the page */}
            <div className="px-3 py-2 md:p-6 md:pb-4 border-b border-dashed border-sky-300 border-opacity-40 select-none">
              {/* Top row: title + logout */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="hidden md:inline text-xl md:text-3xl">📖</span>
                  <h1 className="hidden md:block text-base md:text-2xl font-bold text-gray-900 font-handwritten truncate">
                    Cahier de Caisse Intelligent
                  </h1>
                  {/* Sélecteur Multi-Boutique / Point de Vente Proprio */}
                  <div className="flex items-center gap-1 bg-amber-100 bg-opacity-80 border border-amber-300 rounded-2xl px-2 py-0.5 select-none flex-shrink-0 shadow-sm relative z-10">
                    <span className="text-xs">🏬</span>
                    <select
                      value={shopId}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW_SHOP') {
                          setShowNewShopModal(true)
                        } else {
                          setSelectedShopId(e.target.value)
                        }
                      }}
                      className="bg-transparent text-xs font-bold text-amber-950 outline-none cursor-pointer py-0.5 max-w-[120px] md:max-w-none"
                    >
                      {userShops.map(s => (
                        <option key={s.id} value={s.id} className="bg-white text-gray-900 font-sans">
                          {s.name} ({s.activity === 'resto' ? '🍲 Resto' : s.activity === 'prestations' ? '✂️ Service' : '🏬 Boutique'})
                        </option>
                      ))}
                      <option value="ADD_NEW_SHOP" className="bg-amber-50 font-bold text-amber-900">
                        ➕ Ajouter un Point de Vente...
                      </option>
                    </select>
                  </div>

                  {/* Role + boutique badge */}
                  <span className={`hidden sm:inline text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${mappedUser?.role === 'employee'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                    {mappedUser?.role === 'employee' ? '🙋' : '👑'} {mappedUser?.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* ── Bandeau de statut réseau ── */}
                  {syncStatus === 'syncing' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-full animate-pulse">
                      <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wide">Sync...</span>
                    </div>
                  )}
                  {syncStatus === 'success' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">Synchronisé</span>
                    </div>
                  )}
                  {syncStatus === 'error' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded-full">
                      <AlertTriangle className="w-3 h-3 text-orange-500" />
                      <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wide">Erreur sync</span>
                    </div>
                  )}
                  {syncStatus === 'idle' && !isOnline && (
                    <div
                      title={`${pendingCount} écriture(s) en attente de synchronisation`}
                      className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-full"
                    >
                      <WifiOff className="w-3 h-3 text-red-500" />
                      <span className="text-[9px] font-bold text-red-600 uppercase tracking-wide">
                        Hors-ligne{pendingCount > 0 ? ` · ${pendingCount}` : ''}
                      </span>
                    </div>
                  )}
                  {syncStatus === 'idle' && isOnline && pendingCount > 0 && (
                    <div
                      title={`${pendingCount} écriture(s) hors-ligne à synchroniser`}
                      className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-full cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => syncOfflineData().then(() => loadFinancialData())}
                    >
                      <RefreshCw className="w-3 h-3 text-amber-500" />
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wide">{pendingCount} en attente</span>
                    </div>
                  )}
                  {syncStatus === 'idle' && isOnline && pendingCount === 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full opacity-60" title="En ligne">
                      <Wifi className="w-3 h-3 text-emerald-500" />
                      <span className="hidden sm:inline text-[9px] font-bold text-emerald-600 uppercase tracking-wide">En ligne</span>
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    title="Déconnexion"
                    className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider border border-red-200 rounded-full px-2 py-1 transition-colors flex-shrink-0"
                  >
                    <span>🚪</span>
                    <span className="hidden sm:inline">Quitter</span>
                  </button>
                </div>
              </div>

              {/* KPIs — horizontal scroll on mobile */}
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                {/* Solde du jour */}
                <div className={`border rounded-xl px-3 py-1.5 flex flex-col shadow-sm flex-shrink-0 ${soldeDuJour >= 0
                    ? 'bg-[#f0f9ff] border-sky-300'
                    : 'bg-[#fff5f5] border-rose-300'
                  }`}>
                  <span className="text-[8px] font-bold text-sky-700 uppercase tracking-wide whitespace-nowrap">☀️ Aujourd'hui</span>
                  <span className={`font-mono text-sm font-bold mt-0.5 whitespace-nowrap ${soldeDuJour >= 0 ? 'text-sky-900' : 'text-rose-700'
                    }`}>
                    {soldeDuJour >= 0 ? '+' : ''}{formatPrice(soldeDuJour)}
                  </span>
                </div>
                {/* Tiroir cash global */}
                <div className="bg-[#fffdf9] border border-emerald-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm flex-shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wide whitespace-nowrap">💰 Tiroir Cash</span>
                    {mappedUser?.role !== 'employee' && (
                      <button
                        type="button"
                        onClick={() => setShowCashAdjustment(true)}
                        className="text-[8px] font-bold text-blue-600 hover:text-blue-855 underline uppercase tracking-wider select-none"
                      >
                        Ajuster
                      </button>
                    )}
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-950 mt-0.5 whitespace-nowrap">{formatPrice(tiroirCaisse)}</span>
                </div>
                <div className="bg-[#fffdf9] border border-rose-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm flex-shrink-0">
                  <span className="text-[8px] font-bold text-rose-700 uppercase tracking-wide whitespace-nowrap">🔴 Crédits dehors</span>
                  <span className="font-mono text-sm font-bold text-rose-950 mt-0.5 whitespace-nowrap">{formatPrice(argentDehors)}</span>
                </div>
                <div className="bg-[#fffdf9] border border-purple-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm flex-shrink-0">
                  <span className="text-[8px] font-bold text-purple-700 uppercase tracking-wide whitespace-nowrap">🟣 Nos Dettes</span>
                  <span className="font-mono text-sm font-bold text-purple-950 mt-0.5 whitespace-nowrap">{formatPrice(nosDettes)}</span>
                </div>
              </div>
            </div>

            {/* In-page horizontal tab bar — scrollable, matches desktop look inside the page */}
            <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200 bg-[#f7f3ea] select-none flex-shrink-0">
              <button
                onClick={() => setActiveTab('cahier')}
                className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === 'cahier'
                    ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                  }`}
              >
                <Notebook className="w-3.5 h-3.5" />
                Mon Cahier
              </button>
              {mappedUser?.role !== 'employee' && (
                <button
                  onClick={() => setActiveTab('dettes')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === 'dettes'
                      ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                    }`}
                >
                  <BookText className="w-3.5 h-3.5" />
                  Livre des Dettes
                </button>
              )}
              {mappedUser?.role !== 'employee' && (
                <button
                  onClick={() => setActiveTab('trends')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === 'trends'
                      ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                    }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Analyse Marché
                </button>
              )}
              {mappedUser?.role !== 'employee' && (
                <button
                  onClick={() => setActiveTab('archives')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === 'archives'
                      ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                    }`}
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  Placard d'Archive
                </button>
              )}
              {mappedUser?.role !== 'employee' && (
                <button
                  onClick={() => setActiveTab('stock')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === 'stock'
                      ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                    }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Stock
                </button>
              )}
              {mappedUser?.role !== 'employee' && (
                <button
                  onClick={() => setActiveTab('shopping')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === 'shopping'
                      ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                    }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Courses
                </button>
              )}
              {mappedUser?.role !== 'employee' && (
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === 'analytics'
                      ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                    }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Analyses
                </button>
              )}
              {mappedUser?.role !== 'employee' && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === 'settings'
                      ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                    }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Paramètres
                </button>
              )}
            </div>

            {/* Content view based on active tab */}
            <div className="flex-1 overflow-hidden flex flex-col">

              {activeTab === 'cahier' && (
                <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">

                  {/* Pen selector — compact circles on mobile, pills on desktop */}
                  <div className="px-3 md:px-6 py-2 md:py-3 border-b border-gray-100 flex items-center gap-2 md:gap-4 bg-white bg-opacity-40 select-none z-10 overflow-x-auto scrollbar-hide">
                    <span className="hidden md:block text-xs font-bold text-gray-500 font-mono tracking-wider flex-shrink-0">
                      🖊️ STYLO BIC :
                    </span>
                    <div className="flex gap-2 md:gap-2 flex-nowrap">
                      {PENS.map((pen) => {
                        const isSelected = selectedPen === pen.id
                        return (
                          <button
                            key={pen.id}
                            type="button"
                            title={pen.name}
                            onClick={() => { setSelectedPen(pen.id); setJournalFilter(pen.id as FilterId) }}
                            className={`flex items-center gap-1.5 transition-all flex-shrink-0 ${isSelected
                                ? `${pen.bg} ${pen.border} text-white shadow-sm scale-105`
                                : 'bg-white bg-opacity-65 border-gray-200 text-gray-600 hover:bg-white'
                              } 
                            md:px-3 md:py-1 md:rounded-full md:border md:text-[10px] md:font-bold md:tracking-wide
                            px-2.5 py-2.5 rounded-full border`}
                          >
                            <span className={`w-2.5 h-2.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${pen.dotBg}`}></span>
                            <span className="hidden md:inline text-[10px] font-bold tracking-wide">{pen.name}</span>
                          </button>
                        )
                      })}
                    </div>
                    {/* Show current pen label on mobile */}
                    <span className="md:hidden text-[10px] font-bold text-gray-600 flex-shrink-0 ml-1">
                      {PENS.find(p => p.id === selectedPen)?.name}
                    </span>
                  </div>

                  {/* ── Barre de filtre par type d'écriture ── */}
                  <div className="px-3 md:px-6 py-1.5 border-b border-gray-200 flex items-center gap-2 bg-[#f5f1e8] select-none overflow-x-auto scrollbar-hide flex-shrink-0">
                    <span className="hidden md:block text-[10px] font-bold text-gray-400 font-mono tracking-wider flex-shrink-0 uppercase">
                      Voir :
                    </span>
                    <div className="flex gap-1.5 flex-nowrap">
                      {FILTERS.map((f) => {
                        const isActive = journalFilter === f.id
                        const pen = PENS.find(p => p.id === f.id)
                        const count = f.id === 'all'
                          ? sales.length
                          : sales.filter(s => s.pen_color === f.id).length
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setJournalFilter(f.id)
                              if (f.id !== 'all') setSelectedPen(f.id)
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all flex-shrink-0 ${isActive
                                ? pen
                                  ? `${pen.bg} ${pen.border} text-white shadow-sm scale-105`
                                  : 'bg-gray-800 border-gray-800 text-white shadow-sm scale-105'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                              }`}
                          >
                            {pen
                              ? <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pen.dotBg}`} />
                              : <span className="text-[10px]">📖</span>
                            }
                            <span className="tracking-wide">{f.label}</span>
                            {count > 0 && (
                              <span className={`px-1 rounded-full text-[8px] font-mono font-bold min-w-[14px] text-center ${isActive ? 'bg-white bg-opacity-30 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Scrollable Seyes lined area inside the page */}
                  <div
                    ref={scrollContainerRef}
                    className={`flex-1 overflow-y-auto lined-paper scroll-smooth ${showChangeCalc ? 'pb-72' : 'pb-16'}`}
                  >
                    {filteredSales.length > 0 ? (
                      <SalesHistory
                        sales={filteredSales}
                        onSaleCrossedOut={handleSaleCrossedOut}
                        onAddArticle={handleAddArticle}
                        onError={handleError}
                        shopId={mappedUser?.shop_id}
                        isEmployee={mappedUser?.role === 'employee'}
                        externalAddingToId={addingToSaleId}
                        externalAddInput={addArticleInput}
                        onExternalAddInputChange={setAddArticleInput}
                        onExternalStartAdd={id => { setAddingToSaleId(id); setAddArticleInput('') }}
                        onExternalCancelAdd={() => { setAddingToSaleId(null); setAddArticleInput('') }}
                        onExternalConfirmAdd={async (id) => { await handleAddArticle(id, addArticleInput); setAddingToSaleId(null); setAddArticleInput('') }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-24 text-center min-h-[350px] no-underline">
                        <p className="font-handwritten text-3xl text-gray-400">
                          {journalFilter === 'all'
                            ? "Cahier vierge pour aujourd'hui"
                            : `Aucune écriture « ${FILTERS.find(f => f.id === journalFilter)?.label} » aujourd'hui`
                          }
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-mono">
                          {journalFilter === 'all'
                            ? "Sélectionnez une couleur d'encre et tapez une écriture ci-dessous."
                            : "Changez de filtre ou tapez une nouvelle écriture avec ce stylo."
                          }
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── 🏬 Barre / Grille Tactile du Menu Dynamique & Touches Rapides ── */}
                  <div className="bg-[#f5f1e8] border-t border-gray-200 p-2 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none flex-shrink-0">
                    <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setShowJournalMenuGrid(!showJournalMenuGrid)
                          setJournalMenuFilter('all')
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>{showJournalMenuGrid ? 'Masquer le Menu' : '🏬 Raccourcis Menu (1-Tap)'}</span>
                        {showJournalMenuGrid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {showJournalMenuGrid && (
                        <button
                          type="button"
                          onClick={() => setShowQuickAddMenuForm(!showQuickAddMenuForm)}
                          className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1 transition-all whitespace-nowrap sm:hidden"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{showQuickAddMenuForm ? 'Fermer' : '➕ Produit'}</span>
                        </button>
                      )}
                    </div>

                    {showJournalMenuGrid && (
                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide whitespace-nowrap w-full sm:w-auto pb-0.5 sm:pb-0">
                        {theme.filters.map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setJournalMenuFilter(f.id)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all flex-shrink-0 ${
                              journalMenuFilter === f.id ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
                            }`}
                          >
                            {f.emoji} {f.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Panneau Dépliable de la Ligne Tactile Continue du Menu */}
                  {showJournalMenuGrid && (
                    <div className="bg-[#fffdf9] border-t border-b border-amber-250 p-3 shadow-inner space-y-2 select-none flex-shrink-0 animate-fade-in relative z-20">
                      <div className="hidden sm:flex items-center justify-between gap-2 border-b border-amber-200 border-dashed pb-1.5">
                        <span className="text-xs font-bold text-amber-900 font-handwritten flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Faites glisser et cliquez pour ajouter instantanément au cahier :</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setShowQuickAddMenuForm(!showQuickAddMenuForm)}
                          className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{showQuickAddMenuForm ? 'Fermer' : '➕ Ajouter un Produit au Menu'}</span>
                        </button>
                      </div>

                      {/* Mini-formulaire rapide d'ajout au menu */}
                      {showQuickAddMenuForm && (
                        <form onSubmit={handleAddQuickMenuItemInJournal} className="p-2.5 bg-amber-100 bg-opacity-70 border border-amber-300 rounded-xl flex flex-wrap items-end gap-2 text-xs font-sans">
                          <div className="flex-1 min-w-[120px]">
                            <label className="block text-[8px] uppercase font-bold text-amber-950 mb-0.5 font-mono">
                              Nom du Produit
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Cahier, Stylo..."
                              value={quickPlatName}
                              onChange={e => setQuickPlatName(e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-semibold outline-none"
                            />
                          </div>

                          <div className="w-24">
                            <label className="block text-[8px] uppercase font-bold text-amber-950 mb-0.5 font-mono">
                              Prix Vente (F)
                            </label>
                            <input
                              type="number"
                              required
                              min="0"
                              placeholder="500"
                              value={quickPlatPrice}
                              onChange={e => setQuickPlatPrice(e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-950 outline-none"
                            />
                          </div>

                          <div className="w-32">
                            <label className="block text-[8px] uppercase font-bold text-amber-950 mb-0.5 font-mono">
                              Catégorie
                            </label>
                            <select
                              value={quickPlatCat || theme.filters.filter(f => f.id !== 'all')[0]?.id || ''}
                              onChange={(e: any) => setQuickPlatCat(e.target.value)}
                              className="w-full px-1.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-gray-800 outline-none"
                            >
                              {theme.filters.filter(f => f.id !== 'all').map(f => (
                                <option key={f.id} value={f.id}>{f.emoji} {f.label}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Enregistrer</span>
                          </button>
                        </form>
                      )}

                      {/* Bandeau mode "Ajout article" — s'affiche quand une vente est en cours d'édition */}
                      {addingToSaleId && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-[10px] font-bold text-emerald-800 mb-1">
                          <span>✏️</span>
                          <span>Mode ajout : cliquer sur un article ci-dessous pour l'ajouter à la vente</span>
                          <button
                            type="button"
                            onClick={() => { setAddingToSaleId(null); setAddArticleInput('') }}
                            className="ml-auto text-emerald-600 hover:text-red-500 transition-colors"
                          >
                            ✕ Annuler
                          </button>
                        </div>
                      )}

                      {/* Touches Tactiles de Plats/Boissons sur une SEULE LIGNE CONTINUE DÉFILANTE */}
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-0.5 select-none w-full">
                        {journalMenuItems.filter(item => journalMenuFilter === 'all' || item.category === journalMenuFilter).length === 0 ? (
                          <div className="text-center py-2 text-gray-500 font-handwritten text-sm w-full">
                            Aucun produit dans cet onglet. Utilisez le bouton <span className="font-bold text-amber-800">"+"</span> ci-dessus pour en ajouter, ou écrivez simplement vos ventes !
                          </div>
                        ) : (
                          journalMenuItems
                            .filter(item => journalMenuFilter === 'all' || item.category === journalMenuFilter)
                            .map((item) => (
                              <div key={item.id} className="relative group flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleTapMenuItemInJournal(item)}
                                  className={`px-3 py-2 border rounded-2xl shadow-sm hover:shadow transition-all text-left flex items-center gap-2 active:scale-95 border-b-2 max-w-[200px] ${!item.id.startsWith('m') ? 'pr-6' : ''
                                    } ${addingToSaleId
                                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 hover:border-emerald-500 hover:border-b-emerald-600'
                                      : 'bg-white hover:bg-amber-100 border-amber-250 hover:border-amber-400 hover:border-b-amber-500'
                                    }`}
                                  title={item.name}
                                >
                                  <span className="text-base flex-shrink-0 group-hover:scale-110 transition-transform">{item.emoji}</span>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-sans text-xs font-bold text-gray-800 truncate">
                                      {item.name}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold text-amber-900">
                                      {formatPrice(item.price)}
                                    </span>
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteMenuItem(item.id, e)}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow transition-all scale-100 sm:scale-0 sm:group-hover:scale-100"
                                  title="Supprimer ce produit"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sticky writing input bar pinned to the bottom of the page */}
                  <form
                    onSubmit={handleSubmit}
                    className="relative bg-[#fefdfa] border-t border-gray-200 py-3 pl-12 md:pl-24 pr-3 md:pr-6 flex items-center gap-2 md:gap-4 z-10 shadow-lg"
                  >
                    {/* Red margin line — responsive */}
                    <div className="absolute left-[40px] md:left-[80px] top-0 bottom-0 w-[2px] bg-red-400 bg-opacity-40"></div>

                    {/* Clock — positioned in left margin */}
                    <div className="absolute left-1 md:left-4 font-mono text-[9px] md:text-xs text-gray-400 font-bold select-none w-8 md:w-14 text-right pr-1 md:pr-2">
                      ⏰ {currentTime}
                    </div>

                    <input
                      type="text"
                      placeholder={currentPen.placeholder}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={loading}
                      className={`flex-grow bg-transparent text-lg border-0 outline-none focus:ring-0 font-handwritten px-2 ${currentPen.textClass}`}
                    />

                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="w-10 h-10 rounded-full bg-gray-900 hover:bg-black disabled:opacity-40 text-white flex items-center justify-center transition-all flex-shrink-0 hover:scale-105 active:scale-95"
                    >
                      {loading ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>

                    {/* Post-it calculette de monnaie — INSIDE the form, s'ouvre vers le haut */}
                    <div className={`absolute right-2 md:right-4 ${showJournalMenuGrid ? 'bottom-full mb-1 z-10 scale-90 sm:scale-100 origin-bottom-right' : 'bottom-full mb-2 z-30'} transition-all duration-300 ${showChangeCalc
                        ? 'w-64 bg-amber-100 border border-amber-300 shadow-xl p-4 rotate-1 rounded-sm'
                        : 'w-28 md:w-36 bg-amber-200 hover:bg-[#fef08a] border border-amber-300 shadow-md p-1.5 md:p-2 cursor-pointer rotate-2 text-center rounded-sm'
                      } select-none`}>
                      {/* Ruban adhésif */}
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-12 h-4 bg-gray-300 bg-opacity-60 -rotate-2"></div>

                      {!showChangeCalc ? (
                        <div onClick={() => {
                          if (sales.length > 0) {
                            setChangeTotal(sales[0].total.toString())
                          }
                          setShowChangeCalc(true)
                        }} className="pt-2">
                          <span className="text-xl">💵</span>
                          <p className="font-handwritten font-bold text-amber-900 text-xs mt-1">Calculer la monnaie</p>
                        </div>
                      ) : (
                        <div className="flex flex-col text-left">
                          <div className="flex justify-between items-center border-b border-amber-200 pb-1 mb-2">
                            <span className="font-handwritten font-bold text-amber-900 text-sm">💵 Rendu de Monnaie</span>
                            <button type="button" onClick={() => setShowChangeCalc(false)} className="text-[10px] text-amber-700 hover:text-amber-900 font-bold font-mono">X</button>
                          </div>

                          {/* Input Total */}
                          <div className="mb-2">
                            <label className="text-[9px] uppercase font-bold text-amber-800 tracking-wider font-sans">À payer (FCFA) :</label>
                            <input
                              type="number"
                              placeholder="Ex: 6000"
                              value={changeTotal}
                              onChange={(e) => setChangeTotal(e.target.value)}
                              className="w-full bg-white bg-opacity-70 border border-amber-300 rounded px-1.5 py-0.5 text-xs font-mono outline-none focus:border-amber-500"
                            />
                            {sales.length > 0 && sales[0].total !== parseInt(changeTotal) && (
                              <button
                                type="button"
                                onClick={() => setChangeTotal(sales[0].total.toString())}
                                className="text-[8px] font-mono text-amber-800 underline mt-0.5 block"
                              >
                                Dernier total ({sales[0].total} F)
                              </button>
                            )}
                          </div>

                          {/* Input Client Paid */}
                          <div className="mb-2">
                            <label className="text-[9px] uppercase font-bold text-amber-800 tracking-wider font-sans">Reçu du client :</label>
                            <input
                              type="number"
                              placeholder="Ex: 10000"
                              value={changeReceived}
                              onChange={(e) => setChangeReceived(e.target.value)}
                              className="w-full bg-white bg-opacity-70 border border-amber-300 rounded px-1.5 py-0.5 text-xs font-mono outline-none focus:border-amber-500"
                            />

                            {/* Quick Cash Buttons */}
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {[1000, 2000, 5000, 10000].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setChangeReceived(val.toString())}
                                  className="text-[8px] font-mono bg-white bg-opacity-90 border border-amber-300 px-1 rounded hover:bg-amber-50 text-amber-950 font-bold"
                                >
                                  {val} F
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Result Section */}
                          {parseInt(changeReceived) > 0 && (
                            <div className="mt-2 pt-2 border-t border-dashed border-amber-300">
                              {parseInt(changeReceived) >= (parseInt(changeTotal) || 0) ? (
                                <div>
                                  <div className="text-[9px] uppercase font-bold text-amber-800 tracking-wider font-sans">À rendre :</div>
                                  <div className="font-handwritten text-xl font-bold text-emerald-800 mt-0.5">
                                    {parseInt(changeReceived) - (parseInt(changeTotal) || 0)} F
                                  </div>
                                  <div className="text-[8px] font-mono text-gray-700 mt-1 leading-tight">
                                    {(() => {
                                      const diff = parseInt(changeReceived) - (parseInt(changeTotal) || 0)
                                      if (diff === 0) return "Compte juste, rien à rendre."
                                      const bills: string[] = []
                                      let rem = diff
                                      const denom = [
                                        { value: 10000, label: '10k F' },
                                        { value: 5000, label: '5k F' },
                                        { value: 2000, label: '2k F' },
                                        { value: 1000, label: '1k F' },
                                        { value: 500, label: '500 F' },
                                      ]
                                      denom.forEach(d => {
                                        const count = Math.floor(rem / d.value)
                                        if (count > 0) {
                                          bills.push(`${count}x ${d.label}`)
                                          rem %= d.value
                                        }
                                      })
                                      if (rem > 0) bills.push(`${rem} F`)
                                      return "💵 Rendre : " + bills.join(" + ")
                                    })()}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[9px] font-sans font-bold text-red-700">
                                  Reçu insuffisant.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </form>

                </div>
              )}

              {activeTab === 'dettes' && (
                <div className="flex-1 overflow-hidden p-3 md:p-6 flex flex-col pb-16 md:pb-0">
                  <DebtsBook onRefreshTotals={loadFinancialData} onError={handleError} shopId={mappedUser?.shop_id} />
                </div>
              )}

              {activeTab === 'trends' && (
                <div className="flex-grow p-3 md:p-6 overflow-y-auto flex flex-col h-full pb-16 md:pb-0">

                  {/* Secondary navigation bar inside the page */}
                  <div className="flex gap-4 mb-6 select-none">
                    <button
                      onClick={() => setActiveTab('trends')}
                      className="px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all bg-[#005f54] text-white shadow"
                    >
                      📝 Analyse des Tendances
                    </button>
                    <button
                      onClick={() => setActiveTab('archives')}
                      className="px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all bg-white bg-opacity-65 text-gray-600 hover:text-gray-900 border border-gray-200"
                    >
                      📁 Placard d'Archives
                    </button>
                  </div>

                  <div className="border-b border-dashed border-sky-300 border-opacity-40 pb-4 mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 font-handwritten">
                      Statistiques du Marché & Éléments Structurés
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-wider">
                      COLLECTE DE TENDANCES (ARRIÈRE-PLAN)
                    </p>
                  </div>

                  {/* Two column grid matching the screenshot */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">

                    {/* Left Column: Répartition de l'activité */}
                    <div className="lg:col-span-6 space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 font-sans">
                          📊 RÉPARTITION DE L'ACTIVITÉ (VOLUME)
                        </h3>
                      </div>

                      <div className="space-y-4 pt-2">
                        {getCategoryTotals().reduce((sum, c) => sum + c.amount, 0) > 0 ? (
                          getCategoryTotals().map((cat) => (
                            <div key={cat.name} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold text-gray-800">
                                <span className="font-handwritten text-lg">{cat.name}</span>
                                <span className="font-mono">{formatPrice(cat.amount)} ({cat.percentage}%)</span>
                              </div>
                              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden border border-gray-300">
                                <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.percentage}%` }}></div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center">
                            <span className="text-3xl mb-2">📊</span>
                            <p className="font-handwritten text-lg text-gray-500 font-bold">Aucune activité enregistrée.</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">Vos statistiques de caisse s'afficheront ici en temps réel.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Top Marchandises Émergentes */}
                    <div className="lg:col-span-6 space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 font-sans">
                          📦 TOP MARCHANDISES ÉMERGENTES
                        </h3>
                      </div>

                      <div className="space-y-3 pt-2">
                        {getTopItems().length > 0 ? (
                          getTopItems().map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 border-b border-gray-100 pb-2">
                              {/* Circular number index */}
                              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 select-none">
                                {idx + 1}
                              </div>
                              {/* Item Name */}
                              <div className="flex-grow">
                                <span className="font-handwritten text-lg text-gray-800 font-bold leading-none block">
                                  {item.name}
                                </span>
                              </div>
                              {/* Price / Qty */}
                              <div className="text-right flex flex-col font-mono">
                                <span className="text-xs font-bold text-emerald-700">{formatPrice(item.amount)}</span>
                                <span className="text-[10px] text-gray-400">Qté : {item.qty} {item.qty > 1 ? 'units' : 'unit'}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center">
                            <span className="text-3xl mb-2">📦</span>
                            <p className="font-handwritten text-lg text-gray-500 font-bold">Aucune vente enregistrée.</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">Les produits vendus avec leur quantité s'afficheront ici.</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* PLACARD D'ARCHIVE */}
              {activeTab === 'archives' && (
                <div className="flex-grow p-3 md:p-6 overflow-y-auto flex flex-col h-full pb-16 md:pb-0">

                  {/* Secondary navigation bar inside the page */}
                  <div className="flex gap-4 mb-6 select-none">
                    <button
                      onClick={() => setActiveTab('trends')}
                      className="px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all bg-white bg-opacity-65 text-gray-600 hover:text-gray-900 border border-gray-200"
                    >
                      📝 Analyse des Tendances
                    </button>
                    <button
                      onClick={() => setActiveTab('archives')}
                      className="px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all bg-[#005f54] text-white shadow"
                    >
                      📁 Placard d'Archives
                    </button>
                  </div>

                  <div className="border-b border-dashed border-sky-300 border-opacity-40 pb-4 mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 font-handwritten">
                      📖 Archives Générales du Cahier
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-wider">
                      HISTORIQUE DE TOUTES LES PAGES ÉCRITES
                    </p>
                  </div>

                  {/* ── Barre de filtre archives ── */}
                  <div className="px-3 md:px-6 py-1.5 border-b border-gray-200 flex items-center gap-2 bg-[#f5f1e8] select-none overflow-x-auto scrollbar-hide flex-shrink-0">
                    <span className="hidden md:block text-[10px] font-bold text-gray-400 font-mono tracking-wider flex-shrink-0 uppercase">
                      Filtrer :
                    </span>
                    <div className="flex gap-1.5 flex-nowrap">
                      {FILTERS.map((f) => {
                        const isActive = archiveFilter === f.id
                        const pen = PENS.find(p => p.id === f.id)
                        const count = f.id === 'all'
                          ? allSales.length
                          : allSales.filter(s => s.pen_color === f.id).length
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setArchiveFilter(f.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all flex-shrink-0 ${isActive
                                ? pen
                                  ? `${pen.bg} ${pen.border} text-white shadow-sm scale-105`
                                  : 'bg-gray-800 border-gray-800 text-white shadow-sm scale-105'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                              }`}
                          >
                            {pen
                              ? <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pen.dotBg}`} />
                              : <span className="text-[10px]">📖</span>
                            }
                            <span className="tracking-wide">{f.label}</span>
                            {count > 0 && (
                              <span className={`px-1 rounded-full text-[8px] font-mono font-bold min-w-[14px] text-center ${isActive ? 'bg-white bg-opacity-30 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Scrollable Seyes lined area showing all historical sales */}
                  <div className="flex-grow overflow-y-auto lined-paper pb-20 scroll-smooth">
                    {filteredAllSales.length > 0 ? (
                      <SalesHistory
                        sales={filteredAllSales}
                        onSaleCrossedOut={handleSaleCrossedOut}
                        onAddArticle={handleAddArticle}
                        onUpdateCategory={handleUpdateCategory}
                        showExpenseStats={archiveFilter === 'red'}
                        onError={handleError}
                        shopId={mappedUser?.shop_id}
                        isEmployee={mappedUser?.role === 'employee'}
                        externalAddingToId={addingToSaleId}
                        externalAddInput={addArticleInput}
                        onExternalAddInputChange={setAddArticleInput}
                        onExternalStartAdd={id => { setAddingToSaleId(id); setAddArticleInput('') }}
                        onExternalCancelAdd={() => { setAddingToSaleId(null); setAddArticleInput('') }}
                        onExternalConfirmAdd={async (id) => { await handleAddArticle(id, addArticleInput); setAddingToSaleId(null); setAddArticleInput('') }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-24 text-center min-h-[350px]">
                        <p className="font-handwritten text-3xl text-gray-400">
                          {archiveFilter === 'all'
                            ? "Placard d'archives vide"
                            : `Aucune archive « ${FILTERS.find(f => f.id === archiveFilter)?.label} »`
                          }
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-mono">
                          {archiveFilter === 'all'
                            ? 'Aucune transaction enregistrée historiquement.'
                            : 'Essayez un autre filtre pour voir les autres types d\'écritures.'
                          }
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {activeTab === 'stock' && (
                <div className="flex-grow overflow-hidden flex flex-col h-full pb-16 md:pb-0">
                  <StockManager shopId={mappedUser?.shop_id} onError={handleError} />
                </div>
              )}

              {activeTab === 'shopping' && (
                <div className="flex-grow overflow-hidden flex flex-col h-full pb-16 md:pb-0">
                  <ShoppingListManager
                    shopId={mappedUser?.shop_id}
                    onConvertToStockPurchase={handleConvertToStockPurchase}
                    onError={handleError}
                  />
                </div>
              )}

              {activeTab === 'settings' && mappedUser?.role !== 'employee' && (
                <div className="flex-grow overflow-hidden flex flex-col h-full pb-16 md:pb-0">
                  <SettingsManager shopId={mappedUser?.shop_id} userEmail={mappedUser?.email} userShops={userShops} onError={handleError} />
                </div>
              )}

              {activeTab === 'analytics' && mappedUser?.role !== 'employee' && (
                <div className="flex-grow overflow-hidden flex flex-col h-full pb-16 md:pb-0">
                  <AnalyticsDashboard sales={allSales} userShops={userShops} />
                </div>
              )}

            </div>

          </div>
        </div>

      </div>

      {/* Sticky warning post-it card rendered over the center of the screen */}
      {postItWarning && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm bg-amber-200 border-2 border-amber-300 shadow-2xl p-6 rotate-2 transition-all flex flex-col items-center text-center">
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



      {/* Cash Drawer Manual Adjustment Post-It Modal */}
      {showCashAdjustment && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm bg-amber-100 border-2 border-amber-300 shadow-2xl p-6 -rotate-1 transition-all flex flex-col max-h-[90vh] overflow-y-auto">
          {/* Ruban adhésif */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-16 h-6 bg-gray-300 bg-opacity-70 rotate-2"></div>

          <div className="flex justify-between items-center border-b border-amber-200 pb-2 mb-3">
            <h4 className="font-bold text-amber-900 text-lg uppercase tracking-wide font-handwritten text-xl">
              💰 Ajuster la Caisse
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowCashAdjustment(false)
                setPhysicalCash('')
                setFlowAmount('')
                setAdjustmentNote('')
              }}
              className="text-xs text-amber-800 hover:text-amber-900 font-bold font-mono"
            >
              X
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-amber-200 mb-4 select-none">
            <button
              type="button"
              onClick={() => setAdjustmentType('flow')}
              className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-center border-b-2 transition-colors ${adjustmentType === 'flow'
                  ? 'border-amber-900 text-amber-900 font-extrabold'
                  : 'border-transparent text-amber-600 hover:text-amber-800'
                }`}
            >
              📥 Apport / Retrait
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType('count')}
              className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-center border-b-2 transition-colors ${adjustmentType === 'count'
                  ? 'border-amber-900 text-amber-900 font-extrabold'
                  : 'border-transparent text-amber-600 hover:text-amber-800'
                }`}
            >
              🧮 Comptage Physique
            </button>
          </div>

          <div className="space-y-4 text-left">
            {adjustmentType === 'flow' ? (
              <>
                {/* Selector for Flow Direction */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFlowDirection('in')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border text-center transition-all ${flowDirection === 'in'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-extrabold shadow-sm scale-[1.02]'
                        : 'bg-white bg-opacity-60 border-gray-250 text-gray-500'
                      }`}
                  >
                    ➕ Apport (+ Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowDirection('out')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border text-center transition-all ${flowDirection === 'out'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 font-extrabold shadow-sm scale-[1.02]'
                        : 'bg-white bg-opacity-60 border-gray-250 text-gray-500'
                      }`}
                  >
                    ➖ Retrait (- Cash)
                  </button>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-amber-850 tracking-wider font-sans block mb-1">
                    Montant de l'opération (FCFA) :
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 40000"
                    value={flowAmount}
                    onChange={(e) => setFlowAmount(e.target.value)}
                    className="w-full bg-white bg-opacity-75 border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-amber-500 text-gray-900"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-850 tracking-wider font-sans">Solde calculé actuel :</span>
                  <div className="font-mono text-lg font-bold text-gray-800 mt-0.5">
                    {formatPrice(tiroirCaisse)}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-amber-850 tracking-wider font-sans block mb-1">
                    Espèces physiques comptées (FCFA) :
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 25000"
                    value={physicalCash}
                    onChange={(e) => setPhysicalCash(e.target.value)}
                    className="w-full bg-white bg-opacity-75 border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-amber-500 text-gray-900"
                  />
                </div>

                {physicalCash !== '' && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-850 tracking-wider font-sans">Écart de caisse :</span>
                    <div className={`font-mono text-base font-bold mt-0.5 ${(parseInt(physicalCash, 10) - tiroirCaisse) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                      {(parseInt(physicalCash, 10) - tiroirCaisse) >= 0 ? '+' : ''}
                      {formatPrice(parseInt(physicalCash, 10) - tiroirCaisse)}
                      <span className="text-[10px] font-sans font-medium block mt-0.5 opacity-80">
                        {(parseInt(physicalCash, 10) - tiroirCaisse) >= 0
                          ? '✓ Excédent : Ajout de cash dans le tiroir'
                          : '⚠️ Déficit : Retrait de cash (perte/charge)'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-[10px] uppercase font-bold text-amber-850 tracking-wider font-sans block mb-1">
                Note d'ajustement / motif (optionnel) :
              </label>
              <input
                type="text"
                placeholder={adjustmentType === 'flow' ? "Ex: Apport personnel, Achat carburant..." : "Ex: Écart comptage de fin..."}
                value={adjustmentNote}
                onChange={(e) => setAdjustmentNote(e.target.value)}
                className="w-full bg-white bg-opacity-75 border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-handwritten outline-none focus:border-amber-500 text-gray-900"
              />
            </div>

            <button
              type="button"
              disabled={actionLoading || (adjustmentType === 'flow' ? flowAmount === '' : physicalCash === '')}
              onClick={handleSaveAdjustment}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gray-950 hover:bg-black text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {actionLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Confirmer l\'opération'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Guided Stock Entry Wizard Post-It Modal */}
      {showStockWizard && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm bg-amber-100 border-2 border-amber-300 shadow-2xl p-6 rotate-1 transition-all flex flex-col max-h-[90vh] overflow-y-auto">
          {/* Ruban adhésif */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-16 h-6 bg-gray-300 bg-opacity-70 -rotate-2"></div>

          <div className="flex justify-between items-center border-b border-amber-200 pb-2 mb-3">
            <h4 className="font-bold text-amber-900 text-base uppercase tracking-wide font-handwritten text-xl flex items-center gap-1.5">
              📦 Nouvel Achat de Stock
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowStockWizard(false)
                setInput('')
              }}
              className="text-xs text-amber-800 hover:text-amber-900 font-bold font-mono"
            >
              X
            </button>
          </div>

          {/* Étape indicateur */}
          <div className="text-[9px] uppercase font-mono font-bold text-amber-700 tracking-widest mb-3 select-none">
            Question {wizardStep} sur 4
          </div>

          <div className="space-y-4 text-left">
            {/* ÉTAPE 1 : Confirmation du produit */}
            {wizardStep === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-amber-850 tracking-wider font-sans block mb-1">
                    Quel produit ajoutez-vous au stock ?
                  </label>
                  <input
                    type="text"
                    value={wizardProductName}
                    onChange={(e) => setWizardProductName(e.target.value)}
                    className="w-full bg-white bg-opacity-75 border border-amber-300 rounded-xl px-3 py-2 text-sm font-handwritten outline-none focus:border-amber-500 text-gray-900 text-lg"
                    placeholder="Ex: Flag, Riz, Spaghetti..."
                    autoFocus
                  />
                </div>
                <div className="text-[9.5px] text-amber-850 leading-tight italic">
                  Nous avons extrait ce nom de votre saisie. Corrigez-le si nécessaire.
                </div>
              </div>
            )}

            {/* ÉTAPE 2 : Quantité & Emballage */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-amber-855 tracking-wider font-sans block mb-1">
                    Combien en achetez-vous ?
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={wizardQuantity}
                    onChange={(e) => setWizardQuantity(e.target.value)}
                    className="w-full bg-white bg-opacity-75 border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-amber-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-amber-855 tracking-wider font-sans block mb-1">
                    Conditionnement (Emballage) :
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {['unité', 'caissier', 'carton', 'sac', 'boîte', 'paquet'].map((pkg) => (
                      <button
                        key={pkg}
                        type="button"
                        onClick={() => {
                          setWizardPackaging(pkg)
                          if (pkg === 'unité') {
                            setWizardMultiplier('1')
                            setWizardUnit('pièce')
                          } else if (pkg === 'caissier') {
                            setWizardMultiplier('12')
                            setWizardUnit('bouteille')
                          } else if (pkg === 'carton') {
                            setWizardMultiplier('24')
                            setWizardUnit('paquet')
                          } else if (pkg === 'sac') {
                            setWizardMultiplier('50')
                            setWizardUnit('kg')
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${wizardPackaging === pkg
                            ? 'bg-amber-250 border-amber-400 text-amber-955 font-extrabold scale-105 shadow-sm'
                            : 'bg-white bg-opacity-75 border-amber-300 text-amber-800'
                          }`}
                      >
                        {pkg}
                      </button>
                    ))}
                  </div>
                </div>

                {wizardPackaging !== 'unité' && (
                  <div className="bg-white bg-opacity-50 p-3 rounded-xl border border-amber-250 space-y-2">
                    <label className="text-[10px] uppercase font-bold text-amber-855 tracking-wider font-sans block">
                      Contenance (Nombre d'unités par {wizardPackaging}) :
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={wizardMultiplier}
                      onChange={(e) => setWizardMultiplier(e.target.value)}
                      className="w-full bg-white bg-opacity-75 border border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none focus:border-amber-500 text-gray-900"
                    />
                    <div className="text-[9px] text-amber-700 leading-tight">
                      Ex: 1 caissier = {wizardMultiplier || '12'} unités. Votre stock augmentera de <strong>{(parseInt(wizardQuantity, 10) || 1) * (parseInt(wizardMultiplier, 10) || 1)}</strong> unités de détail au total.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ÉTAPE 3 : Unités & Alertes */}
            {wizardStep === 3 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-amber-855 tracking-wider font-sans block mb-1">
                    Unité de vente au détail (ex: bouteille, sachet) :
                  </label>
                  <input
                    type="text"
                    value={wizardUnit}
                    onChange={(e) => setWizardUnit(e.target.value)}
                    className="w-full bg-white bg-opacity-75 border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-amber-500 text-gray-900"
                    placeholder="Ex: bouteille, paquet, kg..."
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-amber-855 tracking-wider font-sans block mb-1">
                    Seuil d'alerte de stock (minimum) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={wizardAlertThreshold}
                    onChange={(e) => setWizardAlertThreshold(e.target.value)}
                    className="w-full bg-white bg-opacity-75 border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-amber-500 text-gray-900"
                  />
                </div>
              </div>
            )}

            {/* ÉTAPE 4 : Tarification */}
            {wizardStep === 4 && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-amber-855 tracking-wider font-sans block mb-1">
                    Prix d'achat pour un {wizardPackaging === 'unité' ? 'unité' : `lot (${wizardPackaging})`} (FCFA) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 5900"
                    value={wizardPurchasePrice}
                    onChange={(e) => setWizardPurchasePrice(e.target.value)}
                    className="w-full bg-white bg-opacity-75 border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-amber-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-amber-855 tracking-wider font-sans block mb-1">
                    Prix de vente d'une {wizardUnit} (FCFA) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 600"
                    value={wizardSalePrice}
                    onChange={(e) => setWizardSalePrice(e.target.value)}
                    className="w-full bg-white bg-opacity-75 border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-amber-500 text-gray-900"
                  />
                </div>
              </div>
            )}

            {/* Boutons d'actions du Wizard */}
            <div className="flex gap-2 pt-2 border-t border-amber-200 mt-4 select-none">
              {wizardStep > 1 && (
                <button
                  type="button"
                  onClick={() => setWizardStep(p => p - 1)}
                  className="flex-1 py-2 px-3 border border-amber-350 text-amber-900 text-xs font-bold uppercase rounded-xl hover:bg-amber-50 transition-all active:scale-[0.98]"
                >
                  ⬅️ Retour
                </button>
              )}
              {wizardStep < 4 ? (
                <button
                  type="button"
                  disabled={wizardStep === 1 && !wizardProductName.trim()}
                  onClick={() => setWizardStep(p => p + 1)}
                  className="flex-1 py-2 px-3 bg-gray-950 hover:bg-black text-white text-xs font-bold uppercase rounded-xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Suivant ➡️
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!wizardPurchasePrice || !wizardSalePrice}
                  onClick={handleConfirmStockWizard}
                  className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase rounded-xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Confirmer 💾
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prefilled Stock Confirmation Modal */}
      {showStockConfirmation && stockConfirmationData && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm bg-amber-100 border-2 border-amber-300 shadow-2xl p-6 -rotate-1 transition-all flex flex-col max-h-[90vh] overflow-y-auto">
          {/* Ruban adhésif */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-16 h-6 bg-gray-300 bg-opacity-70 rotate-1"></div>

          <div className="flex justify-between items-center border-b border-amber-200 pb-2 mb-3">
            <h4 className="font-bold text-amber-900 text-base uppercase tracking-wide font-handwritten text-xl flex items-center gap-1.5">
              📦 Valider l'Achat de Stock
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowStockConfirmation(false)
                setInput('')
              }}
              className="text-xs text-amber-800 hover:text-amber-900 font-bold font-mono"
            >
              X
            </button>
          </div>

          <div className="space-y-4 text-left">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-850 tracking-wider font-sans">Produit reconnu :</span>
              <div className="font-mono text-base font-bold text-gray-800 mt-0.5">
                {stockConfirmationData.product.name}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-amber-850 tracking-wider font-sans">Quantité à ajouter :</span>
              <div className="font-mono text-sm text-gray-700 mt-0.5">
                {stockConfirmationData.quantity} {stockConfirmationData.packaging}{stockConfirmationData.quantity > 1 ? 's' : ''}
                {stockConfirmationData.packaging !== 'unité' && (
                  <span className="text-[11px] text-gray-500 block italic">
                    (soit {stockConfirmationData.quantity * stockConfirmationData.multiplier} {stockConfirmationData.unit}s au total)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-white bg-opacity-50 p-3 rounded-xl border border-amber-200">
              <div>
                <span className="text-[9px] uppercase font-bold text-amber-800">Prix d'achat lot :</span>
                <div className="font-mono text-xs font-bold text-gray-900 mt-0.5">
                  {formatPrice(stockConfirmationData.product.unit_cost * stockConfirmationData.multiplier)} / {stockConfirmationData.packaging}
                </div>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-amber-850">Prix de vente détail :</span>
                <div className="font-mono text-xs font-bold text-gray-900 mt-0.5">
                  {formatPrice(stockConfirmationData.product.unit_price)} / {stockConfirmationData.unit}
                </div>
              </div>
            </div>

            <div className="border-t border-dashed border-amber-250 pt-2 text-right">
              <span className="text-[10px] uppercase font-bold text-amber-850">Montant total de l'achat :</span>
              <div className="font-mono text-lg font-bold text-emerald-800">
                {formatPrice((stockConfirmationData.product.unit_cost * stockConfirmationData.multiplier) * stockConfirmationData.quantity)}
              </div>
            </div>

            <div className="flex gap-2 select-none pt-2">
              <button
                type="button"
                onClick={() => {
                  setWizardProductName(stockConfirmationData.product.name)
                  setWizardQuantity(String(stockConfirmationData.quantity))
                  setWizardPackaging(stockConfirmationData.packaging)
                  setWizardMultiplier(String(stockConfirmationData.multiplier))
                  setWizardUnit(stockConfirmationData.unit)
                  setWizardAlertThreshold(String(stockConfirmationData.product.alert_threshold || 5))
                  setWizardPurchasePrice(String(stockConfirmationData.product.unit_cost * stockConfirmationData.multiplier))
                  setWizardSalePrice(String(stockConfirmationData.product.unit_price))
                  setWizardStep(4)
                  setShowStockWizard(true)
                  setShowStockConfirmation(false)
                }}
                className="flex-1 py-2 px-3 border border-amber-350 text-amber-900 text-xs font-bold uppercase rounded-xl hover:bg-amber-50 transition-all active:scale-[0.98]"
              >
                ✏️ Modifier les Tarifs
              </button>
              <button
                type="button"
                onClick={handleConfirmSimpleStock}
                className="flex-grow py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Confirmer l'Achat 💾
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Discrepancy Alert Modal */}
      {showPriceChangeDialog && priceChangeData && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm bg-amber-100 border-2 border-amber-300 shadow-2xl p-6 rotate-1 transition-all flex flex-col max-h-[90vh] overflow-y-auto">
          {/* Ruban adhésif */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-16 h-6 bg-red-300 bg-opacity-70 -rotate-1"></div>

          <div className="flex justify-between items-center border-b border-amber-200 pb-2 mb-3">
            <h4 className="font-bold text-amber-955 text-base uppercase tracking-wide font-handwritten text-xl flex items-center gap-1.5">
              ⚠️ Le prix d'achat a changé !
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowPriceChangeDialog(false)
                setInput('')
              }}
              className="text-xs text-amber-800 hover:text-amber-900 font-bold font-mono"
            >
              X
            </button>
          </div>

          <div className="space-y-4 text-left">
            <p className="text-xs text-amber-900 leading-normal">
              Vous avez saisi un prix d'achat différent de celui enregistré dans votre catalogue pour le produit <strong>{priceChangeData.product.name}</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-amber-200 select-none">
              <div>
                <span className="text-[9px] uppercase font-bold text-amber-600 block">Ancien prix mémorisé :</span>
                <span className="font-mono text-sm font-bold text-gray-500 line-through">
                  {formatPrice(priceChangeData.oldLotPrice)}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-red-600 block">Nouveau prix saisi :</span>
                <span className="font-mono text-sm font-bold text-red-700">
                  {formatPrice(priceChangeData.newLotPrice)}
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 p-2.5 rounded-lg border border-yellow-200 text-[10px] text-amber-850 leading-snug">
              Voulez-vous enregistrer ce nouveau prix comme le prix d'achat par défaut dans votre catalogue de stock ?
            </div>

            <div className="flex gap-2 select-none pt-2">
              <button
                type="button"
                onClick={handleRejectPriceChange}
                className="flex-1 py-2.5 px-3 border border-amber-350 text-amber-950 text-xs font-bold uppercase rounded-xl hover:bg-amber-50 transition-all active:scale-[0.98]"
              >
                Non, juste pour cette fois 👎
              </button>
              <button
                type="button"
                onClick={handleConfirmPriceChange}
                className="flex-grow py-2.5 px-3 bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold uppercase rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Oui, mettre à jour 👍
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Création Nouveau Point de Vente (Multi-Boutiques Proprio) ── */}
      {showNewShopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fdfaf2] border border-amber-300 rounded-[28px] p-6 max-w-md w-full shadow-2xl space-y-4 font-sans animate-scale-in">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏬</span>
                <h3 className="font-handwritten text-xl font-bold text-gray-900">
                  Nouveau Point de Vente
                </h3>
              </div>
              <button
                onClick={() => setShowNewShopModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider block mb-1">
                  Nom de la boutique / Maquis / Point de vente *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Boutique Ganhi, Maquis Fidjrossè..."
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-handwritten outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider block mb-1">
                  Type d'activité principal *
                </label>
                <select
                  value={newShopActivity}
                  onChange={(e: any) => setNewShopActivity(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 outline-none"
                >
                  <option value="boutique">🏬 Boutique / Alimentation Générale / Magasin</option>
                  <option value="resto">🍲 Restaurant / Cafétéria / Maquis / Bar</option>
                  <option value="prestations">✂️ Prestations de Services / Coiffure / Artisanat</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowNewShopModal(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 text-xs font-bold uppercase rounded-xl hover:bg-gray-100 transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!newShopName.trim()}
                onClick={() => {
                  if (!newShopName.trim()) return
                  const newId = `shop_${Date.now()}`
                  const newShopObj = { id: newId, name: newShopName.trim(), activity: newShopActivity }
                  setUserShops(prev => {
                    const updated = [...prev, newShopObj]
                    if (mappedUser?.id) {
                      localStorage.setItem(`cahier_user_shops_${mappedUser.id}`, JSON.stringify(updated))
                    }
                    return updated
                  })
                  setSelectedShopId(newId)
                  setNewShopName('')
                  setShowNewShopModal(false)
                }}
                className="flex-1 py-2.5 px-4 bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold uppercase rounded-xl transition-all disabled:opacity-40"
              >
                Créer le Point de Vente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Auto-Apprentissage & Mémorisation au Vol de Produit ── */}
      {showAutoLearnModal && autoLearnData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fffdf2] border border-amber-300 rounded-[28px] p-6 max-w-md w-full shadow-2xl space-y-4 font-sans animate-scale-in">
            <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-handwritten text-xl font-bold text-gray-900">
                  Enregistrer ce produit au catalogue ?
                </h3>
                <p className="text-[10px] text-amber-800 font-mono">
                  MÉMORISATION AUTOMATIQUE DE VOS SITES ET VENTES HABITUELLES
                </p>
              </div>
            </div>

            <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-800">{autoLearnData.name}</span>
                <span className="text-emerald-700 font-mono">{formatPrice(autoLearnData.price)}</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed font-sans">
                Voulez-vous mémoriser définitivement « <strong>{autoLearnData.name}</strong> » pour que son nom et son tarif soient suggérés automatiquement lors des prochaines écritures au cahier ?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAutoLearnModal(false)
                  setAutoLearnData(null)
                }}
                className="flex-1 py-2.5 px-4 border border-amber-300 text-amber-950 text-xs font-bold uppercase rounded-xl hover:bg-amber-50 transition-all"
              >
                Non, juste pour cette fois ✕
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!mappedUser || !autoLearnData) return
                  const sid = mappedUser.shop_id
                  saveOfflineProduct(sid, {
                    id: generateOfflineId(),
                    shop_id: sid,
                    name: autoLearnData.name,
                    category: 'Général',
                    unit: 'pièce',
                    alert_threshold: 5,
                    initial_stock: 100,
                    unit_cost: Math.round(autoLearnData.price * 0.7),
                    unit_price: autoLearnData.price,
                    created_at: new Date().toISOString()
                  })

                  try {
                    await fetch('/api/stock', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-shop-id': sid },
                      body: JSON.stringify({
                        name: autoLearnData.name,
                        unit_price: autoLearnData.price,
                        unit_cost: Math.round(autoLearnData.price * 0.7),
                        initial_stock: 100,
                        alert_threshold: 5,
                        category: 'Alimentation'
                      })
                    })
                  } catch (e) {
                    console.warn(e)
                  }

                  setShowAutoLearnModal(false)
                  setAutoLearnData(null)
                }}
                className="flex-1 py-2.5 px-4 bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                👍 Oui, Mémoriser !
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notebook Spine Footer */}
      <footer className="text-center text-[10px] text-[#8e857b]/60 font-mono py-2 uppercase tracking-widest mt-auto z-10 select-none">
        CAHIER NO. 200 • WEST AFRICA MARKET RD.
      </footer>

    </main>
  )
}
