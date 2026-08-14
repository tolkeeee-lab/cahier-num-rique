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

import { JournalHeader } from '@/components/journal/JournalHeader'
import { JournalTabs, JournalTab } from '@/components/journal/JournalTabs'
import { NotebookToolbar } from '@/components/journal/NotebookToolbar'
import { NotebookPage } from '@/components/journal/NotebookPage'
import { NotebookModals } from '@/components/journal/NotebookModals'
import { NewShopModal } from '@/components/journal/NewShopModal'
import { CashAdjustmentModal } from '@/components/journal/CashAdjustmentModal'
import { JournalPostIt } from '@/components/journal/JournalPostIt'
import { StockSuggestionsBubble, StockSuggestionItem } from '@/components/journal/StockSuggestionsBubble'
import { AutoLearnModal } from '@/components/journal/AutoLearnModal'
import { TactileMenuGrid } from '@/components/journal/TactileMenuGrid'
import { ChangeCalculatorPostIt } from '@/components/journal/ChangeCalculatorPostIt'

// ── Hooks ─────────────────────────────────────────────────────────────────────
import { useShopManager } from '@/hooks/useShopManager'
import { useJournalData } from '@/hooks/useJournalData'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useSaleCreation } from '@/hooks/useSaleCreation'
import { useTactileMenu } from '@/hooks/useTactileMenu'
import { useChangeCalculator } from '@/hooks/useChangeCalculator'

// ── Utils ─────────────────────────────────────────────────────────────────────
import { isSupabaseClientConfigured } from '@/lib/supabaseClient'
import { getPens } from '@/lib/penUtils'
import { getTodayDateString } from '@/lib/dateUtils'
import { getOfflineProducts } from '@/lib/offlineDb'
import { Send, Loader } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const isConfigured = isSupabaseClientConfigured()

  // ── Utilisateur connecté ───────────────────────────────────────────────────
  const [user, setUser] = useState<any>(() => {
    if (typeof window === 'undefined') return null
    const loggedOut = localStorage.getItem('cahier_logged_out_flag') === 'true'
    if (!loggedOut) {
      const cached = localStorage.getItem('cahier_last_active_user') || localStorage.getItem('cahier_mock_session')
      if (cached) { try { return JSON.parse(cached) } catch { return null } }
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
      shop_id: meta.shop_id || user.shop_id || user.id || 'default-shop',
    }
  }, [user])

  // ── Onglets & UI locale ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<JournalTab>('cahier')
  const [selectedPen, setSelectedPen] = useState('blue')
  const [searchQuery, setSearchQuery] = useState('')
  const [postItMessage, setPostItMessage] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [receiptSale, setReceiptSale] = useState<any>(null)

  // Modales secondaires
  const [showCashAdjustment, setShowCashAdjustment] = useState(false)
  const [showCashClosing, setShowCashClosing] = useState(false)
  const [showAssistantModal, setShowAssistantModal] = useState(false)
  const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState(false)
  const [showSyscohadaModal, setShowSyscohadaModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  // ── Hooks métier ───────────────────────────────────────────────────────────
  const shopManager = useShopManager(mappedUser)
  const { isOnline, pendingCount, syncStatus, setSyncStatus } = useNetworkStatus(shopManager.shopId)
  const journalData = useJournalData(shopManager.shopId, isOnline)
  const changeCalc = useChangeCalculator()

  const saleCreation = useSaleCreation({
    shopId: shopManager.shopId,
    selectedPen,
    onSaleCreated: journalData.reloadData,
    onAfterSale: (total) => {
      if (selectedPen === 'blue') changeCalc.triggerAfterSale(total)
    },
  })

  const tactileMenu = useTactileMenu({
    shopId: shopManager.shopId,
    shopActivity: shopManager.shopActivity,
    input: saleCreation.input,
    setInput: saleCreation.setInput,
  })

  // ── Suggestions prédictives (dernier fragment tapé) ────────────────────────
  const stockSuggestions = useMemo(() => {
    const text = saleCreation.input
    if (!text.trim()) return []

    const parts = text.split(/(?:,|\+|\bet\b)/i)
    const lastPart = parts[parts.length - 1] || ''
    const cleanTerm = lastPart.replace(/^\s*\d+\s*/, '').trim().toLowerCase()
    if (cleanTerm.length < 1) return []

    return (getOfflineProducts(shopManager.shopId) || [])
      .filter(p => p.name.toLowerCase().includes(cleanTerm))
      .slice(0, 5)
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

  // ── Garde d'authentification ───────────────────────────────────────────────
  if (!user && isConfigured) {
    return (
      <AuthScreen
        onBypass={(role) => setUser({ id: 'demo', email: 'demo@cahier.app', role })}
        onLoginSuccess={(usr) => setUser(usr)}
      />
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen max-h-screen max-w-screen bg-[#141210] text-[#1e1a18] font-sans p-2 md:p-4 antialiased flex flex-col justify-between overflow-hidden select-none">

      {/* ── Chassis Principal du Cahier Ouvert ── */}
      <div className="flex-1 min-h-0 bg-[#fdfaf2] md:rounded-3xl border-0 md:border border-amber-950/20 shadow-2xl flex relative z-0 overflow-hidden w-full max-w-6xl mx-auto flex-row">

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
          <div className="flex-shrink-0 z-10">
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
          </div>

          {/* Onglets (FIXES) */}
          <div className="flex-shrink-0 z-10">
            <JournalTabs activeTab={activeTab} onTabChange={setActiveTab} activity={shopManager.shopActivity} />
          </div>

          {/* Corps principal */}
          <div className="p-2 md:p-4 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            <JournalPostIt message={postItMessage} onDismiss={() => setPostItMessage(null)} />

            {activeTab === 'cahier' && (
              <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">

                {/* Stylos Bic + Recherche (FIXE) */}
                <div className="flex-shrink-0 z-10">
                  <NotebookToolbar
                    pens={pens}
                    selectedPen={selectedPen}
                    onSelectPen={setSelectedPen}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                  />
                </div>

                {/* Page Seyes — SEUL ÉLÉMENT QUI DÉFILE */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <NotebookPage
                    sales={journalData.sales}
                    onCrossOutSale={journalData.crossOutSale}
                    onPrintReceipt={(sale) => { setReceiptSale(sale); setShowReceiptModal(true) }}
                    searchQuery={searchQuery}
                    currentDateStr={getTodayDateString()}
                  />
                </div>

                {/* Calculateur de monnaie (FIXE, visible après vente) */}
                <ChangeCalculatorPostIt
                  show={changeCalc.show}
                  changeTotal={changeCalc.changeTotal}
                  setChangeTotal={changeCalc.setChangeTotal}
                  changeReceived={changeCalc.changeReceived}
                  setChangeReceived={changeCalc.setChangeReceived}
                  monnaie={changeCalc.monnaie}
                  onDismiss={changeCalc.dismiss}
                />

                {/* Menu Tactile 1-tap (FIXE) */}
                <div className="flex-shrink-0 z-10">
                  <TactileMenuGrid
                    items={tactileMenu.menuItems}
                    isLoading={tactileMenu.isLoadingMenu}
                    shopActivity={shopManager.shopActivity}
                    onTapItem={tactileMenu.handleTapItem}
                    onDeleteItem={tactileMenu.handleDeleteItem}
                    onAddItem={tactileMenu.handleAddItem}
                  />
                </div>

                {/* Barre de saisie WhatsApp (FIXE EN BAS) */}
                <div className="flex-shrink-0 pt-1 border-t border-dashed border-amber-300/60 relative z-20">
                  <form onSubmit={saleCreation.handleCreateSale} className="relative flex items-center gap-2">
                    <StockSuggestionsBubble
                      suggestions={stockSuggestions}
                      activeQty={activeQty}
                      onSelectSuggestion={handleAppendStockSuggestion}
                    />

                    <div className="font-mono text-xs font-bold text-gray-500 flex-shrink-0 min-w-[45px] text-center">
                      ⏰ {currentTime || '--:--'}
                    </div>

                    <div className="relative flex-grow">
                      <input
                        type="text"
                        value={saleCreation.input}
                        onChange={(e) => saleCreation.setInput(e.target.value)}
                        placeholder={pens.find(p => p.id === selectedPen)?.placeholder || 'Écrivez une vente...'}
                        className="w-full pl-4 pr-4 py-2.5 bg-[#fdfaf2] border border-amber-300 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-500 font-handwritten"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!saleCreation.input.trim() || saleCreation.isSubmitting}
                      className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-[#141210] flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0 shadow-lg"
                    >
                      {saleCreation.isSubmitting
                        ? <Loader className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4 -mr-0.5" />
                      }
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Autres onglets */}
            {activeTab === 'dettes' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <DebtsBook shopId={shopManager.shopId} onRefreshTotals={journalData.reloadData} onError={setPostItMessage} />
              </div>
            )}
            {activeTab === 'stock' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <StockManager shopId={shopManager.shopId} />
              </div>
            )}
            {activeTab === 'analytics' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnalyticsDashboard sales={journalData.allSales} shopId={shopManager.shopId} />
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <SettingsManager
                  shopId={shopManager.shopId}
                  userEmail={mappedUser?.email}
                  userShops={shopManager.userShops}
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
        showSyscohadaModal={showSyscohadaModal}
        onCloseSyscohadaModal={() => setShowSyscohadaModal(false)}
        showReceiptModal={showReceiptModal}
        onCloseReceiptModal={() => setShowReceiptModal(false)}
        sales={journalData.allSales}
        currentShopName={shopManager.currentShop?.name || 'Cahier Numérique'}
        receiptSale={receiptSale}
      />

      <AutoLearnModal
        isOpen={saleCreation.showAutoLearnModal}
        autoLearnData={saleCreation.autoLearnData}
        onClose={saleCreation.handleDismissAutoLearn}
        onConfirmSave={saleCreation.handleConfirmAutoLearn}
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
    </div>
  )
}
