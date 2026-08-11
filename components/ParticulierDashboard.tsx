'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Notebook, BarChart3, Send, Loader, AlertTriangle,
  FolderArchive, Wifi, WifiOff, RefreshCw, CheckCircle, Package,
  Settings, ShoppingCart, ChevronUp, ChevronDown,
  ClipboardList, Home, TrendingDown, TrendingUp, PiggyBank, HandCoins, X,
  Share2, Download, FileText, Target, PieChart
} from 'lucide-react'
import { SalesHistory } from '@/components/SalesHistory'
import { DebtsBook } from '@/components/DebtsBook'
import { ShoppingListManager } from '@/components/ShoppingListManager'
import { RequestedProductsManager } from '@/components/RequestedProductsManager'
import { StockManager } from '@/components/StockManager'
import { SettingsManager } from '@/components/SettingsManager'
import { CashClosingModal } from '@/components/CashClosingModal'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'
import { exportSalesToCSV, exportSalesToPDF, generateWhatsAppHouseholdReport } from '@/lib/exportUtils'
import type { Sale } from '@/app/journal/page'


// ── Postes de budget rapides pour particuliers (au lieu des raccourcis produits)
const BUDGET_POSTES = [
  { id: 'loyer', label: 'Loyer', emoji: '🏠', color: 'blue', amount: 0 },
  { id: 'cie', label: 'CIE / Électricité', emoji: '💡', color: 'blue', amount: 0 },
  { id: 'sodeci', label: 'SODECI / Eau', emoji: '💧', color: 'blue', amount: 0 },
  { id: 'marche', label: 'Marché', emoji: '🛒', color: 'red', amount: 0 },
  { id: 'ecole', label: 'École / Scolarité', emoji: '📚', color: 'red', amount: 0 },
  { id: 'sante', label: 'Santé / Médicaments', emoji: '🏥', color: 'red', amount: 0 },
  { id: 'carburant', label: 'Carburant / Transport', emoji: '⛽', color: 'red', amount: 0 },
  { id: 'salaire', label: 'Salaire / Revenu', emoji: '💰', color: 'blue', amount: 0 },
  { id: 'tontine', label: 'Tontine', emoji: '🤝', color: 'blue', amount: 0 },
  { id: 'pret_donne', label: 'Prêt accordé', emoji: '🫴', color: 'yellow', amount: 0 },
  { id: 'boutiquier', label: 'Pris à crédit', emoji: '🛍️', color: 'purple', amount: 0 },
]

const PENS_PARTICULIER = [
  {
    id: 'blue',
    name: 'REVENU / ENTRÉE',
    color: '#1d4ed8',
    bg: 'bg-blue-600',
    border: 'border-blue-600',
    textClass: 'ink-blue',
    dotBg: 'bg-[#1d4ed8]',
    placeholder: 'Stylo Bleu : Entrée d\'argent, Salaire, Tontine... (ex: Salaire mois 150000, Tontine 20000)'
  },
  {
    id: 'red',
    name: 'DÉPENSE FOYER',
    color: '#e11d48',
    bg: 'bg-rose-600',
    border: 'border-rose-600',
    textClass: 'ink-red',
    dotBg: 'bg-[#e11d48]',
    placeholder: 'Stylo Rouge : Dépense cash de la maison... (ex: Marché 5000, Loyer 35000, CIE 12000)'
  },
  {
    id: 'green',
    name: 'RÉSERVE FOYER',
    color: '#047857',
    bg: 'bg-emerald-700',
    border: 'border-emerald-700',
    textClass: 'ink-green',
    dotBg: 'bg-[#047857]',
    placeholder: 'Stylo Vert : Achat de réserve maison payé cash... (ex: 2 sacs de riz 50kg à 45000)'
  },
  {
    id: 'purple',
    name: 'CARNET BOUTIQUIER',
    color: '#701a75',
    bg: 'bg-fuchsia-800',
    border: 'border-fuchsia-800',
    textClass: 'ink-purple',
    dotBg: 'bg-[#701a75]',
    placeholder: 'Stylo Violet : Achat pris à crédit chez le boutiquier... (ex: Pris 2 pains et 1 lait chez Maman Rose)'
  },
  {
    id: 'yellow',
    name: 'PRÊT À UN PROCHE',
    color: '#b45309',
    bg: 'bg-amber-600',
    border: 'border-amber-600',
    textClass: 'ink-yellow',
    dotBg: 'bg-[#b45309]',
    placeholder: 'Stylo Jaune : Argent prêté à un ami ou proche... (ex: Prêté 10000 à Marc)'
  },
]

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(price) + ' FCFA'
}

// ── Types de props ──────────────────────────────────────────────────────────
interface ParticulierDashboardProps {
  // User
  mappedUser: { id: string; email: string; name: string; role: string; shop_id: string } | null
  shopId: string
  userShops: Array<{ id: string; name: string; activity: string }>
  currentShop: { id: string; name: string; activity: string } | undefined
  selectedShopId: string
  setSelectedShopId: (id: string) => void
  setShowNewShopModal: (v: boolean) => void

  // Data
  sales: Sale[]
  allSales: Sale[]
  tiroirCaisse: number
  argentDehors: number
  nosDettes: number
  soldeDuJour: number

  // Network
  isOnline: boolean
  pendingCount: number
  syncStatus: string
  currentTime: string

  // Handlers
  handleSubmit: (e: React.FormEvent) => Promise<void>
  handleLogout: () => void
  handleSaleCrossedOut: () => void
  handleAddArticle: (saleId: string, text: string) => Promise<void>
  handleUpdateSale: (saleId: string, updatedArticles: Array<{ name: string; quantity: number; unit_price: number }>, clientName?: string) => Promise<void>
  handleUpdateCategory: (saleId: string, category: string) => Promise<void>
  handleError: (msg: string) => void
  loadFinancialData: () => Promise<void>
  syncOfflineData: () => Promise<void>
  handleConvertToStockPurchase: (item: any) => Promise<void>
  setUserShops: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; activity: string }>>>

  // Input
  input: string
  setInput: (v: string) => void
  selectedPen: string
  setSelectedPen: (v: string) => void
  loading: boolean

  // Modal states
  postItWarning: string | null
  setPostItWarning: (v: string | null) => void
  showCashClosing: boolean
  setShowCashClosing: (v: boolean) => void
}

// ── Composant ──────────────────────────────────────────────────────────────
export function ParticulierDashboard({
  mappedUser,
  shopId,
  userShops,
  currentShop,
  setSelectedShopId,
  setShowNewShopModal,
  sales,
  allSales,
  tiroirCaisse,
  argentDehors,
  nosDettes,
  soldeDuJour: _soldeDuJour,
  isOnline,
  pendingCount,
  syncStatus,
  currentTime,
  handleSubmit,
  handleLogout,
  handleSaleCrossedOut,
  handleAddArticle,
  handleUpdateSale,
  handleUpdateCategory,
  handleError,
  loadFinancialData,
  syncOfflineData,
  handleConvertToStockPurchase,
  setUserShops,
  input,
  setInput,
  selectedPen,
  setSelectedPen,
  loading,
  postItWarning,
  setPostItWarning,
  showCashClosing,
  setShowCashClosing,
}: ParticulierDashboardProps) {

  type TabId = 'foyer' | 'prets' | 'analyses' | 'historique' | 'reserve' | 'marche' | 'souhaits' | 'compte'
  const [activeTab, setActiveTab] = useState<TabId>('foyer')
  const [journalFilter, setJournalFilter] = useState<string>('all')
  const [archiveFilter, setArchiveFilter] = useState<string>('all')
  const [showPostesRapides, setShowPostesRapides] = useState(false)
  const [showBilanMensuel, setShowBilanMensuel] = useState(false)
  const [addingToSaleId, setAddingToSaleId] = useState<string | null>(null)
  const [addArticleInput, setAddArticleInput] = useState('')
  const [targetBudget, setTargetBudget] = useState<number>(200000)
  const [editingTargetBudget, setEditingTargetBudget] = useState(false)
  const [tempTargetInput, setTempTargetInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(`cahier_target_budget_${shopId}`)
    if (saved) {
      setTargetBudget(Number(saved) || 200000)
    }
  }, [shopId])

  const saveTargetBudget = (val: number) => {
    const clean = Math.max(0, val)
    setTargetBudget(clean)
    localStorage.setItem(`cahier_target_budget_${shopId}`, clean.toString())
    setEditingTargetBudget(false)
  }

  const currentPen = PENS_PARTICULIER.find(p => p.id === selectedPen) || PENS_PARTICULIER[0]

  // Spirales du cahier
  const spiralRings = Array.from({ length: 20 })

  const filteredSales = journalFilter === 'all' ? sales : sales.filter(s => s.pen_color === journalFilter)
  const filteredAllSales = archiveFilter === 'all' ? allSales : allSales.filter(s => s.pen_color === archiveFilter)

  // ── Calculs budget mensuel ─────────────────────────────────────────────
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthSales = allSales.filter(s => s.date && s.date.startsWith(currentMonth))
  const revenueMonth = monthSales.filter(s => s.pen_color === 'blue').reduce((sum, s) => sum + (s.total || 0), 0)
  const depenseMonth = monthSales.filter(s => s.pen_color === 'red').reduce((sum, s) => sum + (s.total || 0), 0)
  const reserveMonth = monthSales.filter(s => s.pen_color === 'green').reduce((sum, s) => sum + (s.total || 0), 0)
  const totalDepensesPlusReserve = depenseMonth + reserveMonth
  const bilanMois = revenueMonth - depenseMonth - reserveMonth

  // Ventilation des dépenses du foyer par catégorie
  const categoriesBreakdown = React.useMemo(() => {
    const cats: Record<string, { id: string; label: string; emoji: string; amount: number; color: string }> = {
      marche: { id: 'marche', label: 'Marché & Nourriture', emoji: '🛒', amount: 0, color: 'bg-rose-500' },
      loyer: { id: 'loyer', label: 'Logement & Loyer', emoji: '🏠', amount: 0, color: 'bg-blue-500' },
      energie: { id: 'energie', label: 'Électricité & Eau (CIE/SODECI)', emoji: '💡', amount: 0, color: 'bg-amber-500' },
      ecole: { id: 'ecole', label: 'École & Scolarité', emoji: '📚', amount: 0, color: 'bg-purple-500' },
      sante: { id: 'sante', label: 'Santé & Médicaments', emoji: '🏥', amount: 0, color: 'bg-emerald-500' },
      transport: { id: 'transport', label: 'Transport & Carburant', emoji: '⛽', amount: 0, color: 'bg-indigo-500' },
      tontine: { id: 'tontine', label: 'Tontine & Épargne', emoji: '🤝', amount: 0, color: 'bg-teal-500' },
      autre: { id: 'autre', label: 'Divers & Autres', emoji: '🏷️', amount: 0, color: 'bg-gray-400' }
    }

    monthSales.forEach(s => {
      if (s.pen_color === 'red' || s.pen_color === 'green' || s.type === 'expense' || s.type === 'stock_purchase') {
        const text = (s.client || '') + ' ' + (s.articles?.map(a => a.name).join(' ') || '') + ' ' + (s.notes || '')
        const lower = text.toLowerCase()
        const amt = s.total || 0

        if (/loyer|loi|maison/i.test(lower)) cats.loyer.amount += amt
        else if (/cie|électricité|electricite|sodeci|eau|courant|facture/i.test(lower)) cats.energie.amount += amt
        else if (/marché|marche|nourriture|viande|poisson|riz|huile|pain|manger|piment|sachet|sardine|lait/i.test(lower)) cats.marche.amount += amt
        else if (/école|ecole|scolarité|scolarite|fourniture|livre|tenue|cahier/i.test(lower)) cats.ecole.amount += amt
        else if (/santé|sante|pharma|médicament|medicament|docteur|hopital|soin|dentifrice/i.test(lower)) cats.sante.amount += amt
        else if (/carburant|essence|transport|taxi|gbaka|woro/i.test(lower)) cats.transport.amount += amt
        else if (/tontine|épargne|epargne|cotisation/i.test(lower)) cats.tontine.amount += amt
        else cats.autre.amount += amt
      }
    })

    return Object.values(cats).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)
  }, [monthSales])

  // Handlers pour exports
  const handleExportCSV = () => {
    exportSalesToCSV(allSales.map(s => ({
      id: s.id,
      date: s.date,
      time: s.time,
      client: s.client,
      total: s.total,
      paid: s.paid,
      debt: s.debt,
      status: s.status,
      type: s.type,
      notes: s.notes,
      articles: s.articles
    })), `Bilan_Foyer_${currentMonth}`, currentShop?.name || 'Mon_Foyer')
  }

  const handleExportPDF = () => {
    exportSalesToPDF(monthSales.map(s => ({
      id: s.id,
      date: s.date,
      time: s.time,
      client: s.client,
      total: s.total,
      paid: s.paid,
      debt: s.debt,
      status: s.status,
      type: s.type,
      notes: s.notes,
      articles: s.articles
    })), `Bilan_Mois_${currentMonth}`, currentShop?.name || 'Mon Foyer')
  }

  const handleShareWhatsApp = () => {
    const url = generateWhatsAppHouseholdReport(monthSales.map(s => ({
      id: s.id,
      date: s.date,
      time: s.time,
      client: s.client,
      total: s.total,
      paid: s.paid,
      debt: s.debt,
      status: s.status,
      type: s.type,
      notes: s.notes,
      articles: s.articles
    })), currentMonth, currentShop?.name || 'Mon Foyer')
    window.open(url, '_blank')
  }


  // ── Raccourcis postes de budget ────────────────────────────────────────
  const handlePosteRapide = (poste: typeof BUDGET_POSTES[0]) => {
    const penMap: Record<string, string> = {
      blue: 'blue',
      red: 'red',
      yellow: 'yellow',
      purple: 'purple',
    }
    const newPen = penMap[poste.color] || 'red'
    setSelectedPen(newPen)
    setInput(input ? `${input}, ${poste.label} ` : `${poste.label} `)
    // Focus the input
    setTimeout(() => {
      const inp = document.querySelector<HTMLInputElement>('input[data-cahier-input]')
      inp?.focus()
    }, 50)
  }

  return (
    <main className="min-h-dvh md:min-h-screen md:py-8 md:px-4 max-w-7xl mx-auto flex flex-col md:gap-6 relative overflow-x-hidden">

      {/* Lampe ambiance */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-400 opacity-[0.03] rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="flex-grow flex flex-col relative z-10 max-w-5xl mx-auto w-full h-full">
        <div className="bg-[#fdfaf2] md:rounded-3xl border-0 md:border border-gray-300 shadow-none md:shadow-2xl flex relative z-0 h-dvh md:h-[720px] overflow-hidden w-full max-w-full">

          {/* Reliure gauche */}
          <div className="hidden sm:flex w-6 sm:w-10 md:w-16 notebook-cover-left flex-col items-center justify-between py-6 md:py-12 z-10 flex-shrink-0 select-none">
            <div className="brass-screw" />
            <div className="font-extrabold text-[7px] md:text-[9px] text-[#f59e0b] font-sans tracking-[0.2em] md:tracking-[0.4em] uppercase select-none my-auto whitespace-nowrap [writing-mode:vertical-lr] rotate-180 text-center opacity-85">
              CAHIER DU FOYER &amp; BUDGET
            </div>
            <div className="w-7 h-7 md:w-10 md:h-10 rounded-full brass-medallion flex flex-col items-center justify-center text-[7px] md:text-[9px] font-bold font-mono my-2 md:my-4 shadow-md">
              <span className="scale-[0.8] md:scale-100">🏠</span>
            </div>
            <div className="brass-screw" />
          </div>

          {/* Anneaux spirale */}
          <div className="hidden sm:flex absolute left-[18px] sm:left-[32px] md:left-[54px] top-0 bottom-0 w-4 md:w-5 flex-col items-center justify-around py-4 md:py-6 z-20 pointer-events-none">
            {spiralRings.map((_, i) => (
              <div key={i} className="w-5 md:w-8 h-2 md:h-3.5 spiral-ring" />
            ))}
          </div>

          {/* Page droite */}
          <div className="flex-1 min-w-0 flex flex-col h-full bg-[#fdfaf2] relative">

            {/* ── Header ── */}
            <div className="px-3 py-2 md:p-6 md:pb-4 border-b border-dashed border-indigo-300 border-opacity-40 select-none">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="hidden md:inline text-xl md:text-3xl">🏠</span>
                  <h1 className="hidden md:block text-base md:text-2xl font-bold text-gray-900 font-handwritten truncate">
                    Cahier du Foyer &amp; Budget
                  </h1>

                  {/* Sélecteur point de vente/foyer */}
                  <div className="flex items-center gap-1 bg-indigo-100 bg-opacity-80 border border-indigo-300 rounded-2xl px-2 py-0.5 select-none flex-shrink-0 shadow-sm relative z-10">
                    <span className="text-xs">🏠</span>
                    <select
                      value={shopId}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW_SHOP') {
                          setShowNewShopModal(true)
                        } else {
                          setSelectedShopId(e.target.value)
                        }
                      }}
                      className="bg-transparent text-xs font-bold text-indigo-950 outline-none cursor-pointer py-0.5 max-w-[120px] md:max-w-none"
                    >
                      {userShops.map(s => (
                        <option key={s.id} value={s.id} className="bg-white text-gray-900 font-sans">
                          {s.name} ({s.activity === 'particulier' ? '🏠 Foyer' : s.activity === 'resto' ? '🍲 Resto' : s.activity === 'prestations' ? '✂️ Service' : '🏬 Boutique'})
                        </option>
                      ))}
                      <option value="ADD_NEW_SHOP" className="bg-indigo-50 font-bold text-indigo-900">
                        ➕ Ajouter un Foyer / Point de Vente...
                      </option>
                    </select>
                  </div>

                  <span className="hidden sm:inline text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 bg-indigo-50 text-indigo-700 border-indigo-200">
                    🏠 {mappedUser?.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Statut réseau */}
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
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-full">
                      <WifiOff className="w-3 h-3 text-red-500" />
                      <span className="text-[9px] font-bold text-red-600 uppercase tracking-wide">
                        Hors-ligne{pendingCount > 0 ? ` · ${pendingCount}` : ''}
                      </span>
                    </div>
                  )}
                  {syncStatus === 'idle' && isOnline && pendingCount > 0 && (
                    <div
                      className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-full cursor-pointer hover:bg-amber-100 transition-colors"
                      onClick={() => syncOfflineData().then(() => loadFinancialData())}
                    >
                      <RefreshCw className="w-3 h-3 text-amber-500" />
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wide">{pendingCount} en attente</span>
                    </div>
                  )}
                  {syncStatus === 'idle' && isOnline && pendingCount === 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full opacity-60">
                      <Wifi className="w-3 h-3 text-emerald-500" />
                      <span className="hidden sm:inline text-[9px] font-bold text-emerald-600 uppercase tracking-wide">En ligne</span>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider border border-red-200 rounded-full px-2 py-1 transition-colors flex-shrink-0"
                  >
                    <span>🚪</span>
                    <span className="hidden sm:inline">Quitter</span>
                  </button>
                </div>
              </div>

              {/* ── KPIs Foyer ── */}
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                {/* Portefeuille / Budget dispo */}
                <div className="bg-[#fffdf9] border border-emerald-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm flex-shrink-0">
                  <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wide whitespace-nowrap">💰 Mon Portefeuille</span>
                  <span className="font-mono text-sm font-bold text-emerald-950 mt-0.5 whitespace-nowrap">{formatPrice(tiroirCaisse)}</span>
                </div>

                {/* Bilan Mensuel */}
                <button
                  type="button"
                  onClick={() => setShowBilanMensuel(true)}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-md flex-shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer text-xs"
                  title="Voir le bilan du mois en cours"
                >
                  <span>📅</span>
                  <span className="font-bold uppercase tracking-wider text-[10px]">Bilan Mois</span>
                </button>

                {/* Prêts accordés */}
                <div className="bg-[#fffdf9] border border-amber-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm flex-shrink-0">
                  <span className="text-[8px] font-bold text-amber-700 uppercase tracking-wide whitespace-nowrap">🤲 Prêts accordés</span>
                  <span className="font-mono text-sm font-bold text-amber-950 mt-0.5 whitespace-nowrap">{formatPrice(argentDehors)}</span>
                </div>

                {/* Mes dettes */}
                <div className="bg-[#fffdf9] border border-purple-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm flex-shrink-0">
                  <span className="text-[8px] font-bold text-purple-700 uppercase tracking-wide whitespace-nowrap">🟣 Mes Dettes</span>
                  <span className="font-mono text-sm font-bold text-purple-950 mt-0.5 whitespace-nowrap">{formatPrice(nosDettes)}</span>
                </div>
              </div>
            </div>

            {/* ── Barre d'onglets (adaptée particulier) ── */}
            <div className="flex overflow-x-auto border-b border-gray-200 bg-[#f7f3ea] select-none flex-shrink-0 px-1 py-0.5 space-x-1 scrollbar-hide">
              {([
                { id: 'foyer', icon: <Notebook className="w-3.5 h-3.5" />, label: 'Mon Foyer' },
                { id: 'prets', icon: <HandCoins className="w-3.5 h-3.5" />, label: 'Prêts & Dettes' },
                { id: 'analyses', icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Analyse Budget' },
                { id: 'historique', icon: <FolderArchive className="w-3.5 h-3.5" />, label: 'Historique' },
                { id: 'reserve', icon: <Package className="w-3.5 h-3.5" />, label: 'Réserve Foyer' },
                { id: 'marche', icon: <ShoppingCart className="w-3.5 h-3.5" />, label: 'Liste de Marché' },
                { id: 'souhaits', icon: <ClipboardList className="w-3.5 h-3.5" />, label: 'Achats Souhaités' },
                { id: 'compte', icon: <Settings className="w-3.5 h-3.5" />, label: 'Mon Compte' },
              ] as Array<{ id: TabId; icon: React.ReactNode; label: string }>).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-2.5 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-indigo-700 text-indigo-900 bg-[#fdfaf2] rounded-t-lg'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Contenu des onglets ── */}
            <div className="flex-1 overflow-hidden flex flex-col">

              {/* ════════════ ONGLET FOYER (CAHIER DU JOUR) ════════════ */}
              {activeTab === 'foyer' && (
                <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">

                  {/* Filtres stylos */}
                  <div className="px-3 md:px-6 py-1.5 border-b border-gray-200 flex items-center gap-2 bg-[#f5f1e8] select-none overflow-x-auto scrollbar-hide flex-shrink-0">
                    <span className="hidden md:block text-[10px] font-bold text-gray-400 font-mono tracking-wider flex-shrink-0 uppercase">Voir :</span>
                    <div className="flex gap-1.5 flex-nowrap">
                      {[
                        { id: 'all', label: 'TOUT' },
                        ...PENS_PARTICULIER.map(p => ({ id: p.id, label: p.name }))
                      ].map((f) => {
                        const isActive = journalFilter === f.id
                        const pen = PENS_PARTICULIER.find(p => p.id === f.id)
                        const count = f.id === 'all' ? sales.length : sales.filter(s => s.pen_color === f.id).length
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setJournalFilter(f.id)
                              if (f.id !== 'all') setSelectedPen(f.id)
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all flex-shrink-0 ${
                              isActive
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
                              <span className={`px-1 rounded-full text-[8px] font-mono font-bold min-w-[14px] text-center ${isActive ? 'bg-white bg-opacity-30 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Zone des écritures */}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto lined-paper scroll-smooth pb-16">
                    {filteredSales.length > 0 ? (
                      <SalesHistory
                        sales={filteredSales}
                        onSaleCrossedOut={(_id: string) => handleSaleCrossedOut()}
                        onAddArticle={handleAddArticle}
                        onUpdateSale={handleUpdateSale}
                        onError={handleError}
                        shopId={shopId}
                        isEmployee={false}
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
                          {journalFilter === 'all' ? 'Cahier vierge pour aujourd\'hui' : `Aucune écriture « ${PENS_PARTICULIER.find(p => p.id === journalFilter)?.name || journalFilter} » aujourd'hui`}
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-mono">Sélectionnez une couleur d'encre et tapez une écriture ci-dessous.</p>
                      </div>
                    )}
                  </div>

                  {/* ── Postes Budget Rapides (remplace les raccourcis produits) ── */}
                  <div className="bg-[#f5f1e8] border-t border-gray-200 p-2 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none flex-shrink-0">
                    <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setShowPostesRapides(!showPostesRapides)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                      >
                        <Home className="w-3.5 h-3.5" />
                        <span>{showPostesRapides ? 'Masquer' : '🏠 Postes Budget Rapides'}</span>
                        {showPostesRapides ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Panneau des postes rapides */}
                  {showPostesRapides && (
                    <div className="bg-[#fffdf9] border-t border-b border-indigo-200 p-3 shadow-inner flex-shrink-0 animate-fade-in">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider font-sans mb-2 border-b border-indigo-100 pb-1.5">
                        <Home className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Cliquez pour pré-remplir l'écriture avec le bon stylo :</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-0.5 w-full">
                        {BUDGET_POSTES.map(poste => {
                          const colorStyles: Record<string, string> = {
                            blue: 'bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-900',
                            red: 'bg-rose-50 border-rose-300 hover:bg-rose-100 text-rose-900',
                            green: 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-900',
                            yellow: 'bg-amber-50 border-amber-300 hover:bg-amber-100 text-amber-900',
                            purple: 'bg-fuchsia-50 border-fuchsia-300 hover:bg-fuchsia-100 text-fuchsia-900',
                          }
                          return (
                            <button
                              key={poste.id}
                              type="button"
                              onClick={() => handlePosteRapide(poste)}
                              className={`px-3 py-2 border rounded-2xl shadow-sm hover:shadow transition-all text-left flex items-center gap-2 active:scale-95 border-b-2 flex-shrink-0 ${colorStyles[poste.color] || colorStyles.red}`}
                            >
                              <span className="text-base flex-shrink-0">{poste.emoji}</span>
                              <span className="font-sans text-xs font-bold truncate max-w-[100px]">{poste.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Zone de saisie ── */}
                  <form
                    onSubmit={handleSubmit}
                    className="relative bg-[#fefdfa] border-t border-gray-200 py-3 pl-8 sm:pl-12 md:pl-24 pr-3 md:pr-6 flex items-center gap-2 md:gap-4 z-10 shadow-lg"
                  >
                    {/* Ligne de marge rouge */}
                    <div className="absolute left-[24px] sm:left-[40px] md:left-[80px] top-0 bottom-0 w-[2px] bg-red-400 bg-opacity-40" />

                    {/* Horloge */}
                    <div className="absolute left-0.5 sm:left-1 md:left-4 font-mono text-[9px] md:text-xs text-gray-400 font-bold select-none w-5 sm:w-8 md:w-14 text-right pr-0.5 md:pr-2">
                      ⏰ {currentTime}
                    </div>

                    {/* Sélecteur de stylo (inline pour particulier) */}
                    <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                      {PENS_PARTICULIER.map(pen => (
                        <button
                          key={pen.id}
                          type="button"
                          onClick={() => setSelectedPen(pen.id)}
                          title={pen.name}
                          className={`w-5 h-5 rounded-full border-2 transition-all ${selectedPen === pen.id ? 'scale-125 shadow-md' : 'opacity-50 hover:opacity-80'}`}
                          style={{ backgroundColor: pen.color, borderColor: selectedPen === pen.id ? '#000' : 'transparent' }}
                        />
                      ))}
                    </div>

                    <input
                      type="text"
                      data-cahier-input
                      placeholder={currentPen.placeholder}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={loading}
                      className={`flex-grow bg-transparent text-lg border-0 outline-none focus:ring-0 font-handwritten px-2 ${currentPen.textClass}`}
                    />

                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="w-10 h-10 rounded-full bg-indigo-800 hover:bg-indigo-900 disabled:opacity-40 text-white flex items-center justify-center transition-all flex-shrink-0 hover:scale-105 active:scale-95"
                    >
                      {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>

                    {/* Widget Budget du mois (remplace calculette de monnaie) */}
                    <div
                      className="absolute right-2 md:right-4 bottom-full mb-2 z-30 w-10 h-10 md:w-auto md:h-auto rounded-full md:rounded-sm bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 shadow-md p-0 md:p-2 cursor-pointer flex items-center justify-center md:block select-none"
                      onClick={() => setShowBilanMensuel(true)}
                      title="Voir le bilan du mois"
                    >
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-12 h-4 bg-gray-300 bg-opacity-60 -rotate-2 hidden md:block" />
                      <span className="text-xl md:hidden">📅</span>
                      <div className="hidden md:block pt-1">
                        <span className="text-lg">📅</span>
                        <p className="font-handwritten font-bold text-indigo-900 text-xs mt-0.5">Bilan du mois</p>
                        <p className={`font-mono font-bold text-xs ${bilanMois >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {bilanMois >= 0 ? '+' : ''}{formatPrice(bilanMois)}
                        </p>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* ════════════ ONGLET PRÊTS & DETTES ════════════ */}
              {activeTab === 'prets' && (
                <div className="flex-1 overflow-hidden p-3 md:p-6 flex flex-col pb-16 md:pb-0">
                  <div className="border-b border-dashed border-indigo-300 border-opacity-40 pb-4 mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 font-handwritten">🤝 Prêts &amp; Emprunts</h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-wider">CARNET DE PRÊTS À DES PROCHES ET DE DETTES CHEZ LE BOUTIQUIER</p>
                  </div>
                  <DebtsBook onRefreshTotals={loadFinancialData} onError={handleError} shopId={shopId} />
                </div>
              )}

              {/* ════════════ ONGLET ANALYSE BUDGET ════════════ */}
              {activeTab === 'analyses' && (
                <div className="flex-grow p-3 md:p-6 overflow-y-auto flex flex-col h-full pb-16 md:pb-0 space-y-6">
                  <div className="border-b border-dashed border-indigo-300 border-opacity-40 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 font-handwritten">📈 Analyse Budget Foyer</h2>
                      <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-wider">SUIVI DES DÉPENSES ET DU BUDGET DU MÉNAGE</p>
                    </div>

                    {/* Boutons d'exportation rapide */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                        title="Partager le bilan sur WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportPDF}
                        className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                        title="Imprimer / Télécharger le PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Rapport PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                        title="Télécharger les données CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Bilan mensuel inline */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col">
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">💰 Revenus du mois</span>
                      <span className="font-mono text-xl font-bold text-blue-900 mt-1">{formatPrice(revenueMonth)}</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col">
                      <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">🔴 Dépenses du mois</span>
                      <span className="font-mono text-xl font-bold text-rose-900 mt-1">{formatPrice(depenseMonth)}</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">🟢 Réserves constituées</span>
                      <span className="font-mono text-xl font-bold text-emerald-900 mt-1">{formatPrice(reserveMonth)}</span>
                    </div>
                    <div className={`border rounded-2xl p-4 flex flex-col ${bilanMois >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'}`}>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${bilanMois >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                        {bilanMois >= 0 ? '✅ Bilan positif' : '⚠️ Bilan négatif'}
                      </span>
                      <span className={`font-mono text-xl font-bold mt-1 ${bilanMois >= 0 ? 'text-indigo-900' : 'text-red-900'}`}>
                        {bilanMois >= 0 ? '+' : ''}{formatPrice(bilanMois)}
                      </span>
                    </div>
                  </div>

                  {/* ── Suivi du Plafond / Objectif de Budget Mensuel ── */}
                  <div className="bg-[#fffdf9] border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-700" />
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">Plafond de Budget du Foyer</h3>
                          <p className="text-[10px] text-gray-400 font-mono">Limite maximale de dépenses recommandée pour ce mois</p>
                        </div>
                      </div>

                      {editingTargetBudget ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={tempTargetInput}
                            onChange={(e) => setTempTargetInput(e.target.value)}
                            placeholder="ex: 250000"
                            className="w-28 px-2 py-1 text-xs border border-indigo-300 rounded-lg outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => saveTargetBudget(Number(tempTargetInput))}
                            className="px-2.5 py-1 bg-indigo-700 text-white text-xs font-bold rounded-lg"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTargetBudget(false)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setTempTargetInput(targetBudget.toString()); setEditingTargetBudget(true) }}
                          className="text-xs text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer"
                        >
                          Changer la limite ({formatPrice(targetBudget)})
                        </button>
                      )}
                    </div>

                    {/* Barre de progression */}
                    {(() => {
                      const pct = Math.min(100, Math.round((totalDepensesPlusReserve / (targetBudget || 1)) * 100))
                      const isOver = totalDepensesPlusReserve > targetBudget
                      const isWarning = pct >= 80 && !isOver

                      return (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-gray-600">
                              Engagé : <strong>{formatPrice(totalDepensesPlusReserve)}</strong> / {formatPrice(targetBudget)}
                            </span>
                            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                              isOver ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              isWarning ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                              {pct}% consommé
                            </span>
                          </div>

                          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isOver ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-600'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          {isOver && (
                            <p className="text-[11px] text-rose-700 font-bold flex items-center gap-1 pt-1">
                              ⚠️ Dépassement de {formatPrice(totalDepensesPlusReserve - targetBudget)} sur votre limite mensuelle !
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* ── Ventilation des Dépenses par Catégorie ── */}
                  <div className="bg-[#fffdf9] border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-indigo-100 pb-3">
                      <PieChart className="w-5 h-5 text-indigo-700" />
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Ventilation par Poste de Dépense</h3>
                        <p className="text-[10px] text-gray-400 font-mono">Répartition de vos achats et charges ce mois-ci</p>
                      </div>
                    </div>

                    {categoriesBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {categoriesBreakdown.map(cat => {
                          const pctCat = totalDepensesPlusReserve > 0
                            ? Math.round((cat.amount / totalDepensesPlusReserve) * 100)
                            : 0

                          return (
                            <div key={cat.id} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{cat.emoji}</span>
                                  <span className="font-bold text-gray-800">{cat.label}</span>
                                </div>
                                <div className="flex items-center gap-2 font-mono">
                                  <span className="font-bold text-gray-900">{formatPrice(cat.amount)}</span>
                                  <span className="text-[10px] text-gray-500 font-sans">({pctCat}%)</span>
                                </div>
                              </div>
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${cat.color} transition-all duration-500`}
                                  style={{ width: `${pctCat}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic text-center py-4 font-mono">
                        Aucune dépense enregistrée pour le moment ce mois-ci.
                      </p>
                    )}
                  </div>

                  {/* Analyse IA globale */}
                  <AnalyticsDashboard
                    sales={allSales}
                    userShops={userShops}
                    shopId={shopId}
                    userRole="owner"
                    currentShopActivity="particulier"
                    onRefreshData={loadFinancialData}
                  />
                </div>
              )}

              {/* ════════════ ONGLET HISTORIQUE ════════════ */}
              {activeTab === 'historique' && (
                <div className="flex-grow p-3 md:p-6 overflow-y-auto flex flex-col h-full pb-16 md:pb-0">
                  <div className="border-b border-dashed border-indigo-300 border-opacity-40 pb-4 mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 font-handwritten">📖 Historique du Cahier</h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-wider">TOUTES LES PAGES ÉCRITES DEPUIS LE DÉBUT</p>
                  </div>

                  {/* Filtres */}
                  <div className="px-0 py-1.5 border-b border-gray-200 flex items-center gap-2 bg-[#f5f1e8] select-none overflow-x-auto scrollbar-hide flex-shrink-0 rounded-xl mb-3">
                    <div className="flex gap-1.5 flex-nowrap p-1">
                      {[{ id: 'all', label: 'TOUT' }, ...PENS_PARTICULIER.map(p => ({ id: p.id, label: p.name }))].map((f) => {
                        const isActive = archiveFilter === f.id
                        const pen = PENS_PARTICULIER.find(p => p.id === f.id)
                        const count = f.id === 'all' ? allSales.length : allSales.filter(s => s.pen_color === f.id).length
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setArchiveFilter(f.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all flex-shrink-0 ${
                              isActive
                                ? pen ? `${pen.bg} ${pen.border} text-white shadow-sm scale-105` : 'bg-gray-800 border-gray-800 text-white shadow-sm scale-105'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pen ? <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pen.dotBg}`} /> : <span>📖</span>}
                            <span>{f.label}</span>
                            {count > 0 && <span className={`px-1 rounded-full text-[8px] font-mono font-bold ${isActive ? 'bg-white bg-opacity-30 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex-grow overflow-y-auto lined-paper pb-20 scroll-smooth rounded-xl">
                    {filteredAllSales.length > 0 ? (
                      <SalesHistory
                        sales={filteredAllSales}
                        onSaleCrossedOut={(_id: string) => handleSaleCrossedOut()}
                        onAddArticle={handleAddArticle}
                        onUpdateCategory={handleUpdateCategory}
                        showExpenseStats={archiveFilter === 'red'}
                        onError={handleError}
                        shopId={shopId}
                        isEmployee={false}
                        externalAddingToId={addingToSaleId}
                        externalAddInput={addArticleInput}
                        onExternalAddInputChange={setAddArticleInput}
                        onExternalStartAdd={id => { setAddingToSaleId(id); setAddArticleInput('') }}
                        onExternalCancelAdd={() => { setAddingToSaleId(null); setAddArticleInput('') }}
                        onExternalConfirmAdd={async (id) => { await handleAddArticle(id, addArticleInput); setAddingToSaleId(null); setAddArticleInput('') }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-24 text-center min-h-[350px]">
                        <p className="font-handwritten text-3xl text-gray-400">Aucun historique trouvé.</p>
                        <p className="text-xs text-gray-400 mt-2 font-mono">Les écritures de votre foyer s'afficheront ici.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ════════════ ONGLET RÉSERVE FOYER ════════════ */}
              {activeTab === 'reserve' && (
                <div className="flex-grow overflow-hidden flex flex-col h-full pb-16 md:pb-0">
                  <div className="px-4 py-3 border-b border-indigo-100">
                    <h2 className="text-lg font-bold text-gray-900 font-handwritten">🏠 Réserve du Foyer</h2>
                    <p className="text-[10px] text-gray-400 font-mono">Gérez vos stocks de réserves alimentaires, produits d'entretien, etc.</p>
                  </div>
                  <StockManager shopId={shopId} userRole="owner" onError={handleError} />
                </div>
              )}

              {/* ════════════ ONGLET LISTE DE MARCHÉ ════════════ */}
              {activeTab === 'marche' && (
                <div className="flex-grow overflow-hidden flex flex-col h-full pb-16 md:pb-0">
                  <div className="px-4 py-3 border-b border-indigo-100">
                    <h2 className="text-lg font-bold text-gray-900 font-handwritten">🛒 Liste de Marché</h2>
                    <p className="text-[10px] text-gray-400 font-mono">Préparez votre liste de courses avant d'aller au marché.</p>
                  </div>
                  <ShoppingListManager
                    shopId={shopId}
                    onConvertToStockPurchase={handleConvertToStockPurchase}
                    onError={handleError}
                  />
                </div>
              )}

              {/* ════════════ ONGLET ACHATS SOUHAITÉS ════════════ */}
              {activeTab === 'souhaits' && (
                <div className="flex-grow overflow-hidden flex flex-col h-full pb-16 md:pb-0">
                  <div className="px-4 py-3 border-b border-indigo-100">
                    <h2 className="text-lg font-bold text-gray-900 font-handwritten">💡 Achats Souhaités</h2>
                    <p className="text-[10px] text-gray-400 font-mono">Notez les achats que vous souhaitez faire quand vous aurez les moyens.</p>
                  </div>
                  <RequestedProductsManager
                    shopId={shopId}
                    userRole="owner"
                  />
                </div>
              )}

              {/* ════════════ ONGLET MON COMPTE ════════════ */}
              {activeTab === 'compte' && (
                <div className="flex-grow overflow-hidden flex flex-col h-full pb-16 md:pb-0">
                  <SettingsManager
                    shopId={shopId}
                    userEmail={mappedUser?.email}
                    userShops={userShops}
                    onError={handleError}
                    onUpdateShopActivity={(sId, newActivity) => {
                      setUserShops(prev => {
                        const updated = prev.map(s => s.id === sId ? { ...s, activity: newActivity } : s)
                        if (mappedUser?.id) {
                          localStorage.setItem(`cahier_user_shops_${mappedUser.id}`, JSON.stringify(updated))
                        }
                        return updated
                      })
                    }}
                    onResetShopData={() => { window.location.reload() }}
                  />
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── Post-it Avertissement ── */}
      {postItWarning && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm bg-amber-200 border-2 border-amber-300 shadow-2xl p-6 rotate-2 flex flex-col items-center text-center">
          <div className="absolute -top-3 w-16 h-6 bg-gray-300 bg-opacity-70 -rotate-3" />
          <AlertTriangle className="w-8 h-8 text-amber-700 mb-2" />
          <h4 className="font-bold text-amber-900 text-lg uppercase tracking-wide handwritten mb-2">⚠️ Opération Bloquée !</h4>
          <p className="text-amber-850 text-sm font-medium handwritten leading-relaxed">{postItWarning}</p>
          <button
            type="button"
            onClick={() => setPostItWarning(null)}
            className="mt-4 px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs rounded shadow"
          >
            Fermer l'alerte
          </button>
        </div>
      )}

      {/* ── Modal Bilan Mensuel ── */}
      {showBilanMensuel && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fffdf2] border border-indigo-300 rounded-[28px] p-6 max-w-md w-full shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-indigo-200 pb-3">
              <div>
                <h3 className="font-handwritten text-2xl font-bold text-gray-900">📅 Bilan du Mois</h3>
                <p className="text-[10px] text-indigo-800 font-mono">{new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
              </div>
              <button onClick={() => setShowBilanMensuel(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-900">Revenus (Stylo Bleu)</span>
                </div>
                <span className="font-mono font-bold text-blue-900">{formatPrice(revenueMonth)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <span className="text-sm font-bold text-rose-900">Dépenses (Stylo Rouge)</span>
                </div>
                <span className="font-mono font-bold text-rose-900">-{formatPrice(depenseMonth)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-900">Réserves (Stylo Vert)</span>
                </div>
                <span className="font-mono font-bold text-emerald-900">-{formatPrice(reserveMonth)}</span>
              </div>

              <div className={`flex justify-between items-center p-4 rounded-2xl border-2 ${bilanMois >= 0 ? 'bg-indigo-50 border-indigo-300' : 'bg-red-50 border-red-300'}`}>
                <div className="flex items-center gap-2">
                  <PiggyBank className={`w-5 h-5 ${bilanMois >= 0 ? 'text-indigo-700' : 'text-red-700'}`} />
                  <span className={`text-base font-bold ${bilanMois >= 0 ? 'text-indigo-900' : 'text-red-900'}`}>
                    {bilanMois >= 0 ? '✅ Solde positif' : '⚠️ Solde négatif'}
                  </span>
                </div>
                <span className={`font-mono text-xl font-bold ${bilanMois >= 0 ? 'text-indigo-900' : 'text-red-900'}`}>
                  {bilanMois >= 0 ? '+' : ''}{formatPrice(bilanMois)}
                </span>
              </div>

              {bilanMois < 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-sans">
                  <strong>💡 Conseil :</strong> Vos dépenses dépassent vos revenus ce mois-ci. Identifiez les postes à réduire dans l'onglet "Analyse Budget".
                </div>
              )}
              {bilanMois >= 0 && bilanMois > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-sans">
                  <strong>🎉 Bravo !</strong> Vous avez dégagé {formatPrice(bilanMois)} d'excédent ce mois-ci. Pensez à mettre de côté ou à renforcer votre tontine.
                </div>
              )}
            </div>

            {/* Boutons d'exportation / partage */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Partager le Bilan sur WhatsApp</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Imprimer PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              <button
                onClick={() => setShowBilanMensuel(false)}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold uppercase rounded-2xl transition-all mt-1"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Clôture (conservée pour compat, mais non exposée dans les KPIs particulier) */}
      <CashClosingModal
        isOpen={showCashClosing}
        onClose={() => setShowCashClosing(false)}
        sales={sales}
        shopName={currentShop?.name || 'Mon Foyer'}
      />

      <footer className="text-center text-[10px] text-[#8e857b]/60 font-mono py-2 uppercase tracking-widest mt-auto z-10 select-none">
        CAHIER DU FOYER • GESTION BUDGET PERSONNEL
      </footer>
    </main>
  )
}
