'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { DebtsBook } from '@/components/DebtsBook'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'
import { ShoppingListManager } from '@/components/ShoppingListManager'
import { RequestedProductsManager } from '@/components/RequestedProductsManager'
import { isSupabaseClientConfigured } from '@/lib/supabaseClient'
import { AuthScreen } from '@/components/AuthScreen'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { StockManager } from '@/components/StockManager'
import { SettingsManager } from '@/components/SettingsManager'
import { ParticulierDashboard } from '@/components/ParticulierDashboard'

import { JournalHeader } from '@/components/journal/JournalHeader'
import { JournalTabs, JournalTab } from '@/components/journal/JournalTabs'
import { NotebookToolbar } from '@/components/journal/NotebookToolbar'
import { NotebookPage } from '@/components/journal/NotebookPage'
import { NotebookModals } from '@/components/journal/NotebookModals'
import { NewShopModal } from '@/components/journal/NewShopModal'
import { CashAdjustmentModal } from '@/components/journal/CashAdjustmentModal'
import { JournalPostIt } from '@/components/journal/JournalPostIt'
import { QuickProductBadges } from '@/components/sales/QuickProductBadges'
import { StockSuggestionsBubble, StockSuggestionItem } from '@/components/journal/StockSuggestionsBubble'
import { AutoLearnModal } from '@/components/journal/AutoLearnModal'

import { useShopManager } from '@/hooks/useShopManager'
import { useJournalData } from '@/hooks/useJournalData'
import { getPens } from '@/lib/penUtils'
import { getTodayDateString } from '@/lib/dateUtils'
import { getOfflineProducts, saveOfflineProduct, generateOfflineId } from '@/lib/offlineDb'
import { Send, Loader } from 'lucide-react'

export default function JournalPage() {
  const isConfigured = isSupabaseClientConfigured()
  
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const loggedOut = localStorage.getItem('cahier_logged_out_flag') === 'true'
      if (!loggedOut) {
        const cached = localStorage.getItem('cahier_last_active_user') || localStorage.getItem('cahier_mock_session')
        if (cached) {
          try { return JSON.parse(cached) } catch { return null }
        }
      }
    }
    return null
  })

  const mappedUser = useMemo(() => {
    if (!user) return null
    const meta = user.user_metadata || {}
    return {
      id: user.id,
      email: user.email,
      name: meta.full_name || user.full_name || 'Utilisateur',
      role: meta.role || user.role || 'owner',
      shop_id: meta.shop_id || user.shop_id || user.id || 'default-shop'
    }
  }, [user])

  const shopManager = useShopManager(mappedUser)
  const { isOnline, pendingCount, syncStatus, setSyncStatus } = useNetworkStatus(shopManager.shopId)
  const journalData = useJournalData(shopManager.shopId, isOnline)

  const [activeTab, setActiveTab] = useState<JournalTab>('cahier')
  const [selectedPen, setSelectedPen] = useState('blue')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [postItMessage, setPostItMessage] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')

  // Modale d'Auto-apprentissage
  const [showAutoLearnModal, setShowAutoLearnModal] = useState(false)
  const [autoLearnData, setAutoLearnData] = useState<{ name: string; price: number } | null>(null)

  // Modales d'action
  const [showCashAdjustment, setShowCashAdjustment] = useState(false)
  const [showCashClosing, setShowCashClosing] = useState(false)
  const [showAssistantModal, setShowAssistantModal] = useState(false)
  const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState(false)
  const [showSyscohadaModal, setShowSyscohadaModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [receiptSale, setReceiptSale] = useState<any>(null)

  const pens = getPens(shopManager.shopActivity)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    updateTime()
    const interval = setInterval(updateTime, 30000)
    return () => clearInterval(interval)
  }, [])

  // Suggestions prédictives du stock en temps réel
  const stockSuggestions = useMemo(() => {
    if (!input || !input.trim()) return []

    const parts = input.split(/(?:,|\+|\bet\b)/i)
    const lastPart = parts[parts.length - 1] || ''
    const cleanTerm = lastPart.replace(/^\s*\d+\s*/, '').trim().toLowerCase()
    if (cleanTerm.length < 1) return []

    const localProds = getOfflineProducts(shopManager.shopId) || []
    return localProds
      .filter((p) => p.name.toLowerCase().includes(cleanTerm))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.unit_price || 0,
        category: p.category,
        stock: (p as any).current_stock ?? p.initial_stock,
        emoji: '📦',
      }))
  }, [input, shopManager.shopId])

  const activeQty = useMemo(() => {
    if (!input) return 1
    const parts = input.split(/(?:,|\+|\bet\b)/i)
    const lastPart = parts[parts.length - 1] || ''
    const qtyMatch = lastPart.match(/^\s*(\d+)\s*/)
    return qtyMatch ? parseInt(qtyMatch[1], 10) : 1
  }, [input])

  const handleAppendStockSuggestion = (item: StockSuggestionItem) => {
    const parts = input.split(/(?:,|\+|\bet\b)/i)
    parts.pop() // Retirer la dernière frappe incomplète
    const prefix = parts.join(', ').trim()
    const newEntry = `${activeQty} ${item.name} à ${item.price}`
    setInput(prefix ? `${prefix}, ${newEntry}` : newEntry)
  }

  const quickProducts = [
    { name: 'Beaufort Canette 33cl', price: 600 },
    { name: 'Boîte de Sardines', price: 500 },
    { name: 'Boîte de Tomate', price: 200 },
    { name: 'Dentifrice Colgate', price: 350 },
    { name: 'Sac de Riz 50kg', price: 22000 },
    { name: 'Huile Dinor 1L', price: 1200 },
  ]

  const handleSelectQuickProduct = (prod: { name: string; price: number }) => {
    if (!input.trim()) {
      setInput(`1 ${prod.name} à ${prod.price}`)
    } else {
      setInput(`${input.trim()}, 1 ${prod.name} à ${prod.price}`)
    }
  }

  const handlePrintReceipt = (sale: any) => {
    setReceiptSale(sale)
    setShowReceiptModal(true)
  }

  const handleConfirmAutoLearn = async (name: string, price: number) => {
    const sid = shopManager.shopId
    saveOfflineProduct(sid, {
      id: generateOfflineId(),
      shop_id: sid,
      name,
      category: 'Général',
      unit: 'pièce',
      alert_threshold: 5,
      initial_stock: 0,
      unit_cost: 0,
      unit_price: price,
      created_at: new Date().toISOString(),
    })
    setShowAutoLearnModal(false)
    setAutoLearnData(null)
  }

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shopManager.shopId,
        },
        body: JSON.stringify({
          raw_text: input.trim(),
          pen_color: selectedPen,
          shop_id: shopManager.shopId,
        }),
      })

      if (response.ok) {
        const textCreated = input.trim()
        setInput('')
        journalData.reloadData()

        // Déclencher la modale d'auto-apprentissage si nouveau produit détecté
        const matchSingle = textCreated.match(/^(\d+)?\s*([A-Za-zÀ-ÿ0-9\s'-]+?)\s*(?:à|a|@)\s*(\d+)/i)
        if (matchSingle) {
          const prodName = matchSingle[2].trim()
          const prodPrice = parseInt(matchSingle[3], 10)
          const existing = getOfflineProducts(shopManager.shopId)?.find(
            (p) => p.name.toLowerCase().trim() === prodName.toLowerCase()
          )
          if (!existing && prodName.length >= 3) {
            setAutoLearnData({ name: prodName, price: prodPrice })
            setShowAutoLearnModal(true)
          }
        }
      } else {
        setPostItMessage('Erreur lors de l\'enregistrement. Vérifiez votre connexion.')
      }
    } catch (err) {
      setPostItMessage('Mode hors-ligne : la vente sera synchronisée ultérieurement.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user && isConfigured) {
    return (
      <AuthScreen
        onBypass={(role) => setUser({ id: 'demo', email: 'demo@cahier.app', role })}
        onLoginSuccess={(usr) => setUser(usr)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#141210] text-[#1e1a18] font-sans p-2 md:p-6 antialiased flex flex-col justify-between">
      
      {/* Chassis Principal du Cahier Ouvert */}
      <div className="bg-[#fdfaf2] md:rounded-3xl border-0 md:border border-amber-950/20 shadow-2xl flex relative z-0 min-h-[750px] overflow-hidden w-full max-w-6xl mx-auto">
        
        {/* Reliure Cuir Vert Émeraude à Gauche */}
        <div className="hidden sm:flex w-10 md:w-16 notebook-cover-left flex-col items-center justify-between py-6 md:py-10 z-10 flex-shrink-0 select-none">
          {/* Vis en laiton supérieure */}
          <div className="brass-screw" />

          {/* Titre doré vertical sur le dos du cahier */}
          <div className="font-extrabold text-[8px] md:text-[10px] text-[#f59e0b] font-sans tracking-[0.3em] uppercase select-none my-auto whitespace-nowrap [writing-mode:vertical-lr] rotate-180 text-center opacity-90">
            CAHIER DE CAISSE INTELLIGENT
          </div>

          {/* Médaillon central en laiton */}
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full brass-medallion flex flex-col items-center justify-center text-[8px] md:text-[9px] font-bold font-mono my-2 shadow-md">
            <span className="scale-[0.8] md:scale-100">200</span>
            <span className="text-[5px] uppercase tracking-tighter -mt-0.5">PAGES</span>
          </div>

          {/* Vis en laiton inférieure */}
          <div className="brass-screw" />
        </div>

        {/* Anneaux Spirales Métalliques en Laiton */}
        <div className="hidden sm:flex absolute left-[28px] md:left-[48px] top-0 bottom-0 w-4 md:w-5 flex-col items-center justify-around py-4 z-20 pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-5 md:w-7 h-2.5 spiral-ring shadow-md rounded-sm" />
          ))}
        </div>

        {/* Page de Papier Seyes Ivoire à Droite */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-[#fdfaf2] relative">
          
          {/* Entête du Cahier + KPIs Financiers */}
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
            onLogout={() => {
              localStorage.removeItem('cahier_mock_session')
              localStorage.removeItem('cahier_last_active_user')
              localStorage.setItem('cahier_logged_out_flag', 'true')
              setUser(null)
            }}
          />

          {/* Onglets Intercalaires du Cahier */}
          <JournalTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activity={shopManager.shopActivity}
          />

          {/* Corps du Cahier Seyes & Autres Onglets */}
          <div className="p-3 md:p-6 flex-grow flex flex-col justify-between space-y-4">
            {/* Post-it d'alerte */}
            <JournalPostIt message={postItMessage} onDismiss={() => setPostItMessage(null)} />

            {activeTab === 'cahier' && (
              <div className="flex-grow flex flex-col justify-between space-y-4">
                {/* Barre de stylos Bic & Recherche */}
                <NotebookToolbar
                  pens={pens}
                  selectedPen={selectedPen}
                  onSelectPen={setSelectedPen}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />

                {/* Rendu de la Page Seyes du Cahier */}
                <NotebookPage
                  sales={journalData.sales}
                  onCrossOutSale={journalData.crossOutSale}
                  onPrintReceipt={handlePrintReceipt}
                  searchQuery={searchQuery}
                  currentDateStr={getTodayDateString()}
                />

                {/* Badges de raccourcis produits fréquents */}
                <QuickProductBadges
                  products={quickProducts}
                  onSelectProduct={handleSelectQuickProduct}
                />

                {/* Barre de Saisie WhatsApp flottante tout en bas */}
                <form onSubmit={handleCreateSale} className="relative flex items-center gap-2 pt-2 border-t border-dashed border-amber-300/60 mt-auto">
                  
                  {/* Bulle de Suggestions Prédictives du Stock */}
                  <StockSuggestionsBubble
                    suggestions={stockSuggestions}
                    activeQty={activeQty}
                    onSelectSuggestion={handleAppendStockSuggestion}
                  />

                  {/* Horloge à gauche */}
                  <div className="font-mono text-xs font-bold text-gray-500 flex-shrink-0 min-w-[45px] text-center">
                    ⏰ {currentTime || '14:42'}
                  </div>

                  {/* Champ de texte WhatsApp */}
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={pens.find(p => p.id === selectedPen)?.placeholder || `Stylo ${selectedPen} : Écrivez une vente cash... (ex: 2 sacs de riz à 22000)`}
                      className="w-full pl-4 pr-4 py-3 bg-white border-2 border-amber-300 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 shadow-inner font-handwritten"
                    />
                  </div>

                  {/* Bouton d'envoi circulaire style WhatsApp */}
                  <button
                    type="submit"
                    disabled={!input.trim() || isSubmitting}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-[#141210] flex items-center justify-center font-extrabold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0 shadow-lg"
                    title="Enregistrer l'écriture"
                  >
                    {isSubmitting ? (
                      <Loader className="w-5 h-5 animate-spin text-[#141210]" />
                    ) : (
                      <Send className="w-5 h-5 text-[#141210] -mr-0.5" />
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Autres onglets */}
            {activeTab === 'dettes' && (
              <DebtsBook
                shopId={shopManager.shopId}
                onRefreshTotals={() => journalData.reloadData()}
                onError={(msg) => setPostItMessage(msg)}
              />
            )}
            {activeTab === 'stock' && <StockManager shopId={shopManager.shopId} />}
            {activeTab === 'analytics' && <AnalyticsDashboard sales={journalData.allSales} shopId={shopManager.shopId} />}
            {activeTab === 'settings' && (
              <SettingsManager
                shopId={shopManager.shopId}
                userEmail={mappedUser?.email}
                userShops={shopManager.userShops}
                onUpdateShopActivity={(sId, act) => {
                  const updated = shopManager.userShops.map(s => s.id === sId ? { ...s, activity: act } : s)
                  shopManager.setUserShops(updated)
                }}
              />
            )}
            {activeTab === 'shopping' && <ShoppingListManager shopId={shopManager.shopId} />}
            {activeTab === 'demandes' && <RequestedProductsManager shopId={shopManager.shopId} />}
            {activeTab === 'particulier' && (
              <ParticulierDashboard
                sales={journalData.sales}
                allSales={journalData.allSales}
                shopId={shopManager.shopId}
              />
            )}
          </div>

          {/* Pied de page du Cahier */}
          <footer className="text-center text-[10px] text-amber-900/60 font-mono py-2 uppercase tracking-widest border-t border-dashed border-amber-300/40 select-none">
            CAHIER NO. 200 • WEST AFRICA MARKET RD.
          </footer>
        </div>
      </div>

      {/* Modales Principales */}
      <NotebookModals
        showAssistantModal={showAssistantModal}
        onCloseAssistantModal={() => setShowAssistantModal(false)}
        showCashClosingModal={showCashClosing}
        onCloseCashClosingModal={() => setShowCashClosing(false)}
        showBarcodeScannerModal={showBarcodeScannerModal}
        onCloseBarcodeScannerModal={() => setShowBarcodeScannerModal(false)}
        showSyscohadaModal={showSyscohadaModal}
        onCloseSyscohadaModal={() => setShowSyscohadaModal(false)}
        showReceiptModal={showReceiptModal}
        onCloseReceiptModal={() => setShowReceiptModal(false)}
        sales={journalData.allSales}
        currentShopName={shopManager.currentShop?.name || 'Cahier Numérique'}
        receiptSale={receiptSale}
      />

      {/* Modale d'Auto-apprentissage du Stock */}
      <AutoLearnModal
        isOpen={showAutoLearnModal}
        autoLearnData={autoLearnData}
        onClose={() => setShowAutoLearnModal(false)}
        onConfirmSave={handleConfirmAutoLearn}
      />

      {/* Modale de création d'une nouvelle boutique */}
      <NewShopModal
        isOpen={shopManager.showNewShopModal}
        onClose={() => shopManager.setShowNewShopModal(false)}
        newShopName={shopManager.newShopName}
        onNameChange={shopManager.setNewShopName}
        newShopActivity={shopManager.newShopActivity}
        onActivityChange={shopManager.setNewShopActivity}
        onCreate={shopManager.handleCreateShop}
      />

      {/* Modale d'ajustement de caisse */}
      <CashAdjustmentModal
        isOpen={showCashAdjustment}
        onClose={() => setShowCashAdjustment(false)}
        currentCash={journalData.tiroirCaisse}
        onSaveAdjustment={() => journalData.reloadData()}
      />
    </div>
  )
}
