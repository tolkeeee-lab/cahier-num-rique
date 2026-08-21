'use client'

import React, { useState, useEffect, useMemo } from 'react'

// ── Composants ────────────────────────────────────────────────────────────────
import { DebtsBook } from '@/components/DebtsBook'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'
import { ShoppingListManager } from '@/components/ShoppingListManager'
import { RequestedProductsManager } from '@/components/RequestedProductsManager'
import { AuthScreen } from '@/components/AuthScreen'
import { StockManager } from '@/components/StockManager'
import { SettingsManager } from '@/components/SettingsManager'
import { ParticulierDashboard } from '@/components/ParticulierDashboard'
import { SalesHistory } from '@/components/SalesHistory'

import { JournalHeader } from '@/components/journal/JournalHeader'
import { JournalTabs, JournalTab } from '@/components/journal/JournalTabs'
import { NotebookToolbar } from '@/components/journal/NotebookToolbar'
import { NotebookPage } from '@/components/journal/NotebookPage'
import { NotebookModals } from '@/components/journal/NotebookModals'
import { NewShopModal } from '@/components/journal/NewShopModal'
import { CashAdjustmentModal } from '@/components/journal/CashAdjustmentModal'
import { JournalPostIt } from '@/components/journal/JournalPostIt'
import { StockSuggestionsBubble, StockSuggestionItem } from '@/components/journal/StockSuggestionsBubble'
import { TactileMenuModal } from '@/components/journal/TactileMenuModal'
import { AddToExistingSaleBar } from '@/components/journal/AddToExistingSaleBar'
import { StockWizardModal } from '@/components/journal/StockWizardModal'
import { StockConfirmationModal } from '@/components/journal/StockConfirmationModal'
import { PriceChangeDialog } from '@/components/journal/PriceChangeDialog'
import { EditSaleModal } from '@/components/journal/EditSaleModal'
import { ReceiptShareModal } from '@/components/sales/ReceiptShareModal'

// ── Hooks ─────────────────────────────────────────────────────────────────────
import { useShopManager } from '@/hooks/useShopManager'
import { useJournalData } from '@/hooks/useJournalData'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useSaleCreation } from '@/hooks/useSaleCreation'
import { useTactileMenu } from '@/hooks/useTactileMenu'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useInputPipeline, StockConfirmationData, PriceChangeData, WizardPrefill } from '@/hooks/useInputPipeline'
import { saveOfflineProduct, getOfflineProducts } from '@/lib/offlineDb'

// ── Utils ─────────────────────────────────────────────────────────────────────
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'
import { getPens } from '@/lib/penUtils'
import { getTodayDateString } from '@/lib/dateUtils'
import { isEmployeeRole } from '@/lib/roleUtils'
import { Send, Loader, Zap, ScanLine } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const isConfigured = isSupabaseClientConfigured()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ── Utilisateur connecté & Session Supabase synchronisée ────────────────────
  const [user, setUser] = useState<any>(() => {
    if (typeof window === 'undefined') return null
    const loggedOut = localStorage.getItem('cahier_logged_out_flag') === 'true'
    if (!loggedOut) {
      const cached = localStorage.getItem('cahier_last_active_user') || localStorage.getItem('cahier_mock_session')
      if (cached) { try { return JSON.parse(cached) } catch { return null } }
    }
    return null
  })
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Écoute de session Supabase pour synchronisation cross-device temps réel
  useEffect(() => {
    if (!isConfigured) return

    // 1. Récupération de la session active Supabase
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user
        localStorage.removeItem('cahier_logged_out_flag')
        localStorage.setItem('cahier_last_active_user', JSON.stringify(u))
        setUser(u)
      }
    }).catch(() => {})

    // 2. Écouteur de changement d'état d'authentification
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          const u = session.user
          localStorage.removeItem('cahier_logged_out_flag')
          localStorage.setItem('cahier_last_active_user', JSON.stringify(u))
          setUser(u)
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.setItem('cahier_logged_out_flag', 'true')
        localStorage.removeItem('cahier_last_active_user')
        localStorage.removeItem('cahier_mock_session')
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [isConfigured])

  const handleLogin = async (email: string, password?: string) => {
    setAuthLoading(true)
    setAuthError(null)
    try {
      if (isConfigured && password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        if (data.user) {
          localStorage.removeItem('cahier_logged_out_flag')
          localStorage.setItem('cahier_last_active_user', JSON.stringify(data.user))
          setUser(data.user)
        }
      } else {
        const localUser = { id: email.replace(/[^a-zA-Z0-9]/g, '_'), email, role: 'owner' }
        localStorage.removeItem('cahier_logged_out_flag')
        localStorage.setItem('cahier_last_active_user', JSON.stringify(localUser))
        setUser(localUser)
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Erreur de connexion. Vérifiez vos identifiants.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignup = async (name: string, email: string, password?: string, shopName?: string) => {
    setAuthLoading(true)
    setAuthError(null)
    try {
      if (isConfigured && password) {
        const { data, error } = await supabaseClient.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name,
              shop_name: shopName || 'Mon Point de Vente',
              role: 'owner',
            }
          }
        })
        if (error) throw error
        if (data.user) {
          localStorage.removeItem('cahier_logged_out_flag')
          localStorage.setItem('cahier_last_active_user', JSON.stringify(data.user))
          setUser(data.user)
        }
      } else {
        const localUser = { id: email.replace(/[^a-zA-Z0-9]/g, '_'), email, name, role: 'owner', shop_name: shopName }
        localStorage.removeItem('cahier_logged_out_flag')
        localStorage.setItem('cahier_last_active_user', JSON.stringify(localUser))
        setUser(localUser)
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Erreur lors de la création du compte.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleMagicLink = async (email: string) => {
    setAuthLoading(true)
    setAuthError(null)
    try {
      if (isConfigured) {
        const { error } = await supabaseClient.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/journal' : undefined }
        })
        if (error) throw error
        alert('Un lien de connexion magique a été envoyé à votre adresse e-mail !')
      }
    } catch (err: any) {
      setAuthError(err?.message || "Erreur lors de l'envoi du lien magique.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    if (isConfigured) {
      await supabaseClient.auth.signOut().catch(() => {})
    }
    localStorage.setItem('cahier_logged_out_flag', 'true')
    localStorage.removeItem('cahier_last_active_user')
    localStorage.removeItem('cahier_mock_session')
    setUser(null)
  }

  const mappedUser = useMemo(() => {
    if (!user) return null
    const meta = user.user_metadata || {}
    return {
      id: user.id,
      email: user.email,
      name: meta.full_name || user.full_name || 'Utilisateur',
      role: meta.role || user.role || 'owner',
      shop_id: meta.shop_id || user.shop_id || user.id || 'default-shop',
    }
  }, [user])

  // ── Onglets & UI locale ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<JournalTab>('cahier')
  const [selectedPen, setSelectedPen] = useState('blue')
  const [activeFilter, setActiveFilter] = useState('all')
  const [postItMessage, setPostItMessage] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [receiptSale, setReceiptSale] = useState<any>(null)
  // Mode ajout d'article à une vente existante
  const [addingToSaleId, setAddingToSaleId] = useState<string | null>(null)
  const [addingToSaleClient, setAddingToSaleClient] = useState<string>('')
  const [addArticleInput, setAddArticleInput] = useState('')
  const [isAddingArticle, setIsAddingArticle] = useState(false)

  // Modales secondaires
  const [showCashAdjustment, setShowCashAdjustment] = useState(false)
  const [showCashClosing, setShowCashClosing] = useState(false)
  const [showAssistantModal, setShowAssistantModal] = useState(false)
  const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState(false)
  const [showSyscohadaModal, setShowSyscohadaModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [shareReceiptSale, setShareReceiptSale] = useState<any>(null)
  const [showShareReceiptModal, setShowShareReceiptModal] = useState(false)

  // Pipeline interceptions
  const [stockConfirmationData, setStockConfirmationData] = useState<StockConfirmationData | null>(null)
  const [priceChangeData, setPriceChangeData] = useState<PriceChangeData | null>(null)
  const [wizardPrefill, setWizardPrefill] = useState<WizardPrefill | null>(null)
  const [showStockWizard, setShowStockWizard] = useState(false)

  // État de modification d'une vente & modale menu tactile
  const [editingSale, setEditingSale] = useState<any | null>(null)
  const [showTactileMenuModal, setShowTactileMenuModal] = useState(false)

  // ── Hooks métier ───────────────────────────────────────────────────────────
  const shopManager = useShopManager(mappedUser)
  const effectiveRole = shopManager.employeeRole || mappedUser?.role || 'owner'
  const { isOnline, pendingCount, syncStatus, setSyncStatus, refreshPendingCount } = useNetworkStatus(shopManager.shopId)
  const journalData = useJournalData(shopManager.shopId, isOnline)

  // Synchronisation automatique au retour en ligne
  useOfflineSync({
    shopId: shopManager.shopId,
    shopActivity: shopManager.shopActivity,
    isOnline,
    setSyncStatus,
    refreshPendingCount,
    onSyncComplete: journalData.reloadData,
  })

  const saleCreation = useSaleCreation({
    shopId: shopManager.shopId,
    selectedPen,
    onSaleCreated: journalData.reloadData,
  })

  const tactileMenu = useTactileMenu({
    shopId: shopManager.shopId,
    shopActivity: shopManager.shopActivity,
    input: saleCreation.input,
    setInput: saleCreation.setInput,
  })

  // ── Pipeline de saisie intelligent ────────────────────────────────────────
  const { processInput } = useInputPipeline({
    shopId: shopManager.shopId,
    selectedPen,
    journalMenuItems: tactileMenu.menuItems,
    onSubmit: async (text, penColor) => {
      await saleCreation.submitText(text, penColor)
    },
    onShowStockConfirmation: (data) => setStockConfirmationData(data),
    onShowStockWizard: (prefill) => {
      setWizardPrefill(prefill)
      setShowStockWizard(true)
    },
    onShowPriceChangeDialog: (data) => setPriceChangeData(data),
    onWarning: (msg) => saleCreation.setPostItWarning(msg),
  })

  const handlePipelineSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!saleCreation.input.trim()) return
    const success = await processInput(saleCreation.input)
    if (success) {
      saleCreation.setInput('')
    }
  }

  // ── Suggestions prédictives (dernier fragment tapé) ────────────────────────
  const stockSuggestions = useMemo(() => {
    const text = saleCreation.input
    if (!text.trim()) return []

    const parts = text.split(/(?:,|\+|\bet\b)/i)
    const lastPart = parts[parts.length - 1] || ''
    const cleanTerm = lastPart.replace(/^\s*\d+\s*/, '').trim().toLowerCase()
    if (cleanTerm.length < 2) return []

    return (getOfflineProducts(shopManager.shopId) || [])
      .filter(p => !(p as any).is_orphan && p.name.toLowerCase().includes(cleanTerm))
      .slice(0, 4)
      .map(p => ({
        id: p.id,
        name: p.name,
        price: p.unit_price || 0,
        category: p.category,
        stock: (p as any).current_stock ?? p.initial_stock,
        emoji: '📦',
      }))
  }, [saleCreation.input, shopManager.shopId])

  const activeQty = useMemo(() => {
    const parts = saleCreation.input.split(/(?:,|\+|\bet\b)/i)
    const lastPart = parts[parts.length - 1] || ''
    const m = lastPart.match(/^\s*(\d+)\s*/)
    return m ? parseInt(m[1], 10) : 1
  }, [saleCreation.input])

  const handleAppendStockSuggestion = (item: StockSuggestionItem) => {
    const parts = saleCreation.input.split(/(?:,|\+|\bet\b)/i)
    parts.pop()
    const prefix = parts.join(', ').trim()
    const entry = `${activeQty} ${item.name} à ${item.price}`
    saleCreation.setInput(prefix ? `${prefix}, ${entry}` : entry)
  }

  // ── Horloge ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setCurrentTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    update()
    const t = setInterval(update, 30000)
    return () => clearInterval(t)
  }, [])

  const pens = getPens(shopManager.shopActivity)

  // Handler pour ajouter un article à une vente existante
  const handleAddArticleToSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addArticleInput.trim() || !addingToSaleId || isAddingArticle) return
    setIsAddingArticle(true)
    try {
      await journalData.addArticleToSale(addingToSaleId, addArticleInput.trim(), 'blue')
    } catch (err: any) {
      saleCreation.setPostItWarning(err?.message || "Erreur lors de l'ajout d'article")
    } finally {
      setAddArticleInput('')
      setAddingToSaleId(null)
      setAddingToSaleClient('')
      setIsAddingArticle(false)
    }
  }

  // Handler pour insertion automatique par code-barres
  const handleBarcodeDetected = (barcodeOrName: string) => {
    const products = getOfflineProducts(shopManager.shopId) || []
    const matched = products.find(p => 
      (p as any).barcode === barcodeOrName || 
      p.id === barcodeOrName || 
      p.name.toLowerCase() === barcodeOrName.toLowerCase() ||
      p.name.toLowerCase().includes(barcodeOrName.toLowerCase())
    )
    if (matched) {
      const entry = `1 ${matched.name} à ${matched.unit_price}`
      saleCreation.setInput(prev => prev.trim() ? `${prev}, ${entry}` : entry)
      setPostItMessage(`✅ Article scanné : ${matched.name} (${matched.unit_price} F)`)
    } else {
      const entry = `1 ${barcodeOrName}`
      saleCreation.setInput(prev => prev.trim() ? `${prev}, ${entry}` : entry)
      setPostItMessage(`🔍 Code scanné : ${barcodeOrName}`)
    }
  }

  // Associer un code-barres à un produit du stock
  const handleAssociateBarcode = (productId: string, barcode: string) => {
    const products = getOfflineProducts(shopManager.shopId) || []
    const prod = products.find(p => p.id === productId)
    if (prod) {
      saveOfflineProduct(shopManager.shopId, { ...prod, barcode } as any)
      setPostItMessage(`🔗 Code-barres lié à ${prod.name}`)
    }
  }

  // ── Garde SSR / Hydratation ───────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#141210] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-amber-400 font-mono text-xs">
          <Loader className="w-7 h-7 animate-spin text-amber-500" />
          <span className="font-bold tracking-wider">CHARGEMENT DU CAHIER...</span>
        </div>
      </div>
    )
  }

  // ── Garde d'authentification ───────────────────────────────────────────────
  if (!user && isConfigured) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onSignup={handleSignup}
        onMagicLink={handleMagicLink}
        loading={authLoading}
        error={authError}
        onBypass={(role) => setUser({ id: 'demo', email: 'demo@cahier.app', role })}
        onLoginSuccess={(usr) => setUser(usr)}
      />
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen max-h-screen max-w-screen bg-[#141210] text-[#1e1a18] font-sans p-0 sm:p-2 md:p-2.5 lg:p-3 antialiased flex flex-col justify-between overflow-hidden select-none">

      {/* ── Chassis Principal du Cahier Ouvert ── */}
      <div className="flex-1 min-h-0 bg-[#fdfaf2] rounded-none sm:rounded-2xl md:rounded-3xl border-0 sm:border border-amber-950/20 shadow-2xl flex relative z-0 overflow-hidden w-full max-w-[1550px] mx-auto flex-row">

        {/* Reliure Cuir Émeraude (FIXE) */}
        <div className="hidden sm:flex w-10 md:w-16 notebook-cover-left flex-col items-center justify-between py-6 md:py-10 z-10 flex-shrink-0 select-none h-full">
          <div className="brass-screw" />
          <div className="font-extrabold text-[8px] md:text-[10px] text-[#f59e0b] tracking-[0.3em] uppercase select-none my-auto whitespace-nowrap [writing-mode:vertical-lr] rotate-180 text-center opacity-90">
            CAHIER DE CAISSE INTELLIGENT
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full brass-medallion flex flex-col items-center justify-center text-[8px] md:text-[9px] font-bold font-mono my-2 shadow-md">
            <span className="scale-[0.8] md:scale-100">200</span>
            <span className="text-[5px] uppercase tracking-tighter -mt-0.5">PAGES</span>
          </div>
          <div className="brass-screw" />
        </div>

        {/* Anneaux Spirales (FIXES) */}
        <div className="hidden sm:flex absolute left-[28px] md:left-[48px] top-0 bottom-0 w-4 md:w-5 flex-col items-center justify-around py-4 z-20 pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-5 md:w-7 h-2.5 spiral-ring shadow-md rounded-sm" />
          ))}
        </div>

        {/* ── Page Seyes ── */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-[#fdfaf2] relative overflow-hidden">

          {/* En-tête + KPIs (FIXE) */}
          <div className="flex-shrink-0 z-30 relative">
            <JournalHeader
              user={mappedUser}
              currentShopName={shopManager.currentShop?.name || 'Mon Point de Vente'}
              activity={shopManager.shopActivity}
              shops={shopManager.userShops}
              selectedShopId={shopManager.shopId}
              onSelectShopId={(id) => shopManager.setSelectedShopId(id)}
              onOpenNewShopModal={() => shopManager.setShowNewShopModal(true)}
              soldeDuJour={journalData.soldeDuJour}
              tiroirCaisse={journalData.tiroirCaisse}
              argentDehors={journalData.argentDehors}
              nosDettes={journalData.nosDettes}
              isOnline={isOnline}
              pendingSyncCount={pendingCount}
              isSyncing={syncStatus === 'syncing'}
              onSyncClick={() => setSyncStatus('syncing')}
              onOpenSettings={() => setActiveTab('settings')}
              onOpenCashAdjustment={() => setShowCashAdjustment(true)}
              onOpenCashClosing={() => setShowCashClosing(true)}
              onOpenBarcodeScanner={() => setShowBarcodeScannerModal(true)}
              onOpenBoutiqueAssistant={() => setShowAssistantModal(true)}
              onOpenSyscohada={() => setShowSyscohadaModal(true)}
              onLogout={handleLogout}
            />
          </div>

          {/* Onglets (FIXES) */}
          <div className="flex-shrink-0 z-10">
            <JournalTabs activeTab={activeTab} onTabChange={setActiveTab} activity={shopManager.shopActivity} />
          </div>

          {/* Corps principal — Hauteur Maximisée */}
          <div className="p-1 sm:p-2 md:p-2.5 flex-1 min-h-0 flex flex-col justify-between overflow-hidden space-y-1">
            <JournalPostIt message={postItMessage} onDismiss={() => setPostItMessage(null)} />

            {activeTab === 'cahier' && (
              <div className="flex-1 min-h-0 flex flex-col space-y-1 overflow-hidden">

                {/* Stylos Bic 4-Couleurs avec Totaux (FIXE) */}
                <div className="flex-shrink-0 z-10">
                  <NotebookToolbar
                    pens={pens}
                    selectedPen={selectedPen}
                    onSelectPen={(penId) => {
                      setSelectedPen(penId)
                      setActiveFilter(penId)
                    }}
                    sales={journalData.sales}
                    activeFilter={activeFilter}
                    onSelectFilter={setActiveFilter}
                  />
                </div>

                {/* Page Seyes — SEUL ÉLÉMENT QUI DÉFILE */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <NotebookPage
                    sales={journalData.sales}
                    onCrossOutSale={journalData.crossOutSale}
                    onPrintReceipt={(sale) => { setReceiptSale(sale); setShowReceiptModal(true) }}
                    onShareWhatsAppReceipt={(sale) => { setShareReceiptSale(sale); setShowShareReceiptModal(true) }}
                    onAddArticleToSale={(saleId, clientName) => {
                      setAddingToSaleId(saleId)
                      setAddingToSaleClient(clientName)
                      setAddArticleInput('')
                    }}
                    onEditSale={(sale) => setEditingSale(sale)}
                    currentDateStr={getTodayDateString()}
                    activeFilter={activeFilter}
                  />
                </div>

                {/* Barre ajout à vente existante — remplace la barre normale */}
                {addingToSaleId && (
                  <AddToExistingSaleBar
                    clientName={addingToSaleClient}
                    value={addArticleInput}
                    onChange={setAddArticleInput}
                    onSubmit={handleAddArticleToSale}
                    onCancel={() => { setAddingToSaleId(null); setAddArticleInput('') }}
                    isSubmitting={isAddingArticle}
                  />
                )}

                {/* Barre de saisie WhatsApp (FIXE EN BAS) */}
                {!addingToSaleId && (
                <div className="flex-shrink-0 pt-1 sm:pt-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] sm:pb-0 relative z-20">
                  <form onSubmit={handlePipelineSubmit} className="relative flex items-center gap-1 sm:gap-2 bg-amber-100/50 backdrop-blur-md p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-amber-300/80 shadow-md">
                    <StockSuggestionsBubble
                      suggestions={stockSuggestions}
                      activeQty={activeQty}
                      onSelectSuggestion={handleAppendStockSuggestion}
                    />

                    {/* Bouton Raccourcis ⚡ 1-Tap dédié à la saisie */}
                    <button
                      type="button"
                      onClick={() => setShowTactileMenuModal(true)}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 border border-amber-400 text-amber-950 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1 sm:gap-1.5 flex-shrink-0 cursor-pointer hover:scale-[1.02] active:scale-95"
                      title="Ouvrir le menu des raccourcis 1-tap"
                    >
                      <Zap className="w-3.5 h-3.5 fill-amber-950 text-amber-950" />
                      <span className="hidden sm:inline font-mono text-xs">Raccourcis</span>
                      {tactileMenu.menuItems.length > 0 && (
                        <span className="bg-amber-950 text-amber-100 text-[9px] sm:text-[10px] px-1 py-0.2 rounded-full font-mono font-black">
                          {tactileMenu.menuItems.length}
                        </span>
                      )}
                    </button>

                    {/* Bouton Scanner Code-barres 1-Tap */}
                    <button
                      type="button"
                      onClick={() => setShowBarcodeScannerModal(true)}
                      className="px-2 sm:px-2.5 py-1.5 sm:py-2 bg-amber-200/90 hover:bg-amber-300 border border-amber-400 text-amber-950 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 flex-shrink-0 cursor-pointer hover:scale-[1.02] active:scale-95"
                      title="Scanner un code-barres avec la caméra"
                    >
                      <ScanLine className="w-3.5 h-3.5 text-amber-950" />
                      <span className="hidden md:inline font-mono text-xs">Scanner</span>
                    </button>

                    <div className="hidden sm:inline-block font-mono text-xs font-extrabold text-amber-900 flex-shrink-0 min-w-[45px] text-center bg-amber-200/60 px-2 py-1 rounded-lg">
                      ⏰ {currentTime || '--:--'}
                    </div>

                    <div className="relative flex-grow">
                      <input
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        data-lpignore="true"
                        value={saleCreation.input}
                        onChange={(e) => saleCreation.setInput(e.target.value)}
                        placeholder={pens.find(p => p.id === selectedPen)?.placeholder || 'Écrivez une vente...'}
                        className="w-full pl-3 pr-3 py-2 sm:py-2.5 bg-white border border-amber-300/90 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/40 font-handwritten shadow-inner font-bold"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!saleCreation.input.trim() || saleCreation.isSubmitting}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-40 flex-shrink-0 shadow-md hover:shadow-lg border border-amber-300"
                    >
                      {saleCreation.isSubmitting
                        ? <Loader className="w-3.5 h-3.5 animate-spin" />
                        : <Send className="w-3.5 h-3.5 -mr-0.5 text-white" />
                      }
                    </button>
                  </form>
                </div>
                )}
              </div>
            )}

            {/* Autres onglets */}
            {activeTab === 'history' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <SalesHistory
                  sales={journalData.allSales}
                  shopId={shopManager.shopId}
                  onSaleCrossedOut={journalData.crossOutSale}
                  onUpdateSale={async (saleId: string, articles: any[], clientName?: string) => {
                    await journalData.updateSale(saleId, articles, clientName)
                  }}
                  onAddArticle={async (saleId: string, text: string) => {
                    await journalData.addArticleToSale(saleId, text, 'blue')
                  }}
                  onUpdateCategory={async (saleId: string, cat: string) => {
                    await journalData.updateCategory(saleId, cat)
                  }}
                />
              </div>
            )}
            {activeTab === 'dettes' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <DebtsBook shopId={shopManager.shopId} onRefreshTotals={journalData.reloadData} onError={setPostItMessage} />
              </div>
            )}
            {activeTab === 'stock' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <StockManager 
                  shopId={shopManager.shopId} 
                  isEmployee={isEmployeeRole(effectiveRole)} 
                />
              </div>
            )}
            {activeTab === 'analytics' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnalyticsDashboard 
                  sales={journalData.allSales} 
                  shopId={shopManager.shopId} 
                  userRole={effectiveRole}
                  currentShopActivity={shopManager.shopActivity}
                />
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <SettingsManager
                  shopId={shopManager.shopId}
                  shopName={shopManager.currentShop?.name || 'Ma Boutique'}
                  activity={shopManager.shopActivity}
                  userEmail={mappedUser?.email}
                  userShops={shopManager.userShops}
                  onResetData={() => {
                    journalData.reloadData()
                  }}
                  onUpdateShopActivity={(sId, act) => {
                    shopManager.setUserShops(shopManager.userShops.map(s => s.id === sId ? { ...s, activity: act } : s))
                  }}
                />
              </div>
            )}
            {activeTab === 'shopping' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ShoppingListManager shopId={shopManager.shopId} />
              </div>
            )}
            {activeTab === 'demandes' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <RequestedProductsManager shopId={shopManager.shopId} />
              </div>
            )}
            {activeTab === 'particulier' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ParticulierDashboard sales={journalData.sales} allSales={journalData.allSales} shopId={shopManager.shopId} />
              </div>
            )}
          </div>

          {/* Pied de page (FIXE) */}
          <footer className="flex-shrink-0 text-center text-[10px] text-amber-900/60 font-mono py-1 uppercase tracking-widest border-t border-dashed border-amber-300/40 select-none">
            CAHIER NO. 200 • WEST AFRICA MARKET RD.
          </footer>
        </div>
      </div>

      {/* ── Modales ── */}
      <NotebookModals
        showAssistantModal={showAssistantModal}
        onCloseAssistantModal={() => setShowAssistantModal(false)}
        showCashClosingModal={showCashClosing}
        onCloseCashClosingModal={() => setShowCashClosing(false)}
        showBarcodeScannerModal={showBarcodeScannerModal}
        onCloseBarcodeScannerModal={() => setShowBarcodeScannerModal(false)}
        onBarcodeDetected={handleBarcodeDetected}
        onAssociateBarcode={handleAssociateBarcode}
        showSyscohadaModal={showSyscohadaModal}
        onCloseSyscohadaModal={() => setShowSyscohadaModal(false)}
        showReceiptModal={showReceiptModal}
        onCloseReceiptModal={() => setShowReceiptModal(false)}
        sales={journalData.allSales}
        products={getOfflineProducts(shopManager.shopId)}
        currentShopName={shopManager.currentShop?.name || 'Cahier Numérique'}
        receiptSale={receiptSale}
      />

      <NewShopModal
        isOpen={shopManager.showNewShopModal}
        onClose={() => shopManager.setShowNewShopModal(false)}
        newShopName={shopManager.newShopName}
        onNameChange={shopManager.setNewShopName}
        newShopActivity={shopManager.newShopActivity}
        onActivityChange={shopManager.setNewShopActivity}
        onCreate={shopManager.handleCreateShop}
      />

      <CashAdjustmentModal
        isOpen={showCashAdjustment}
        onClose={() => setShowCashAdjustment(false)}
        currentCash={journalData.tiroirCaisse}
        onSaveAdjustment={journalData.reloadData}
      />

      {/* ── Pipeline Interception Modals ── */}

      <StockConfirmationModal
        isOpen={!!stockConfirmationData}
        product={stockConfirmationData?.product || { name: '', unit: 'pièce', unit_cost: 0, unit_price: 0 }}
        quantity={stockConfirmationData?.quantity || 1}
        packaging={stockConfirmationData?.packaging || 'unité'}
        multiplier={stockConfirmationData?.multiplier || 1}
        unit={stockConfirmationData?.unit || 'pièce'}
        onConfirm={async () => {
          if (!stockConfirmationData) return
          const { product, quantity, packaging, multiplier, unit } = stockConfirmationData
          const lotPrice = product.unit_cost * multiplier
          const salePrice = product.unit_price
          const isUnit = packaging === 'unité' || !packaging
          const text = isUnit
            ? `stock de ${quantity} ${product.name} à ${lotPrice} prix de vente à l'unité ${salePrice}`
            : `stock de ${quantity} ${packaging} de ${product.name} de ${multiplier} ${unit} à ${lotPrice} prix de vente à l'unité ${salePrice}`
          await saleCreation.submitText(text, 'green')
          setStockConfirmationData(null)
        }}
        onModify={() => {
          if (!stockConfirmationData) return
          setWizardPrefill({
            productName: stockConfirmationData.product.name,
            quantity: stockConfirmationData.quantity,
            packaging: stockConfirmationData.packaging,
            multiplier: String(stockConfirmationData.multiplier),
            unit: stockConfirmationData.unit,
          })
          setStockConfirmationData(null)
          setShowStockWizard(true)
        }}
        onCancel={() => setStockConfirmationData(null)}
      />

      <PriceChangeDialog
        isOpen={!!priceChangeData}
        productName={priceChangeData?.product?.name || ''}
        oldLotPrice={priceChangeData?.oldLotPrice || 0}
        newLotPrice={priceChangeData?.newLotPrice || 0}
        packaging={priceChangeData?.product?.packaging_name || 'unité'}
        onAcceptNewPrice={async () => {
          if (!priceChangeData) return
          // Enregistrer avec le nouveau prix
          await saleCreation.submitText(
            priceChangeData.rawText,
            priceChangeData.penColor
          )
          // Mettre à jour le catalogue offline avec le nouveau prix
          const product = priceChangeData.product
          const newUnitCost = Math.round(priceChangeData.newLotPrice / (product.multiplier || 1))
          saveOfflineProduct(shopManager.shopId, { ...product, unit_cost: newUnitCost })
          // Si en ligne : synchro API
          if (isOnline) {
            fetch('/api/stock', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-shop-id': shopManager.shopId },
              body: JSON.stringify({ id: product.id, unit_cost: newUnitCost }),
            }).catch(console.error)
          }
          setPriceChangeData(null)
        }}
        onKeepOldPrice={async () => {
          if (!priceChangeData) return
          // Enregistre avec le texte original mais remet l'ancien prix en catalogue
          const product = priceChangeData.product
          const isUnit = !product.packaging_name || product.packaging_name === 'unité'
          const safeText = isUnit
            ? `stock de 1 ${product.name} à ${priceChangeData.oldLotPrice}`
            : `stock de 1 ${product.packaging_name} de ${product.name} à ${priceChangeData.oldLotPrice}`
          await saleCreation.submitText(
            safeText,
            priceChangeData.penColor
          )
          setPriceChangeData(null)
        }}
        onCancel={() => setPriceChangeData(null)}
      />

      <StockWizardModal
        isOpen={showStockWizard}
        shopActivity={shopManager.shopActivity}
        prefillName={wizardPrefill?.productName || ''}
        onClose={() => { setShowStockWizard(false); setWizardPrefill(null) }}
        onComplete={async (product) => {
          const qty = wizardPrefill?.quantity || 1
          const isUnit = product.packaging === 'unité'
          const text = isUnit
            ? `stock de ${qty} ${product.name} à ${product.purchasePrice} prix de vente à l'unité ${product.salePrice}`
            : `stock de ${qty} ${product.packaging} de ${product.name} de ${product.multiplier} ${product.unit} à ${product.purchasePrice} prix de vente à l'unité ${product.salePrice}`
          await saleCreation.submitText(text, 'green')
          setShowStockWizard(false)
          setWizardPrefill(null)
        }}
      />
      <EditSaleModal
        isOpen={!!editingSale}
        sale={editingSale}
        onClose={() => setEditingSale(null)}
        onSave={async (saleId, articles, clientName) => {
          await journalData.updateSale(saleId, articles, clientName)
        }}
        onDelete={async (saleId) => {
          await journalData.crossOutSale(saleId)
        }}
      />
      <TactileMenuModal
        isOpen={showTactileMenuModal}
        onClose={() => setShowTactileMenuModal(false)}
        items={tactileMenu.menuItems}
        isLoading={tactileMenu.isLoadingMenu}
        shopActivity={shopManager.shopActivity}
        onTapItem={tactileMenu.handleTapItem}
        onDeleteItem={tactileMenu.handleDeleteItem}
        onAddItem={tactileMenu.handleAddItem}
      />
      <ReceiptShareModal
        isOpen={showShareReceiptModal}
        onClose={() => { setShowShareReceiptModal(false); setShareReceiptSale(null) }}
        sale={shareReceiptSale}
        shopName={shopManager.userShops?.find(s => s.id === shopManager.shopId)?.name || 'Ma Boutique'}
      />
    </div>
  )
}
