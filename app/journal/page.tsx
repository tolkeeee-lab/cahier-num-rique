'use client'

import React, { useState } from 'react'
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

import { useShopManager } from '@/hooks/useShopManager'
import { useJournalData } from '@/hooks/useJournalData'
import { getPens } from '@/lib/penUtils'
import { getTodayDateString } from '@/lib/dateUtils'
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

  const mappedUser = React.useMemo(() => {
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
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [postItMessage, setPostItMessage] = useState<string | null>(null)

  // Modales d'action
  const [showCashAdjustment, setShowCashAdjustment] = useState(false)
  const [showCashClosing, setShowCashClosing] = useState(false)
  const [showAssistantModal, setShowAssistantModal] = useState(false)
  const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState(false)
  const [showSyscohadaModal, setShowSyscohadaModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [receiptSale, setReceiptSale] = useState<any>(null)

  const pens = getPens(shopManager.shopActivity)

  const filters = [
    { id: 'all', label: 'Tout', emoji: '🌟' },
    { id: 'fourniture', label: 'Fournitures', emoji: '📚' },
    { id: 'alimentaire', label: 'Alimentaire', emoji: '🌾' },
    { id: 'boisson', label: 'Boissons', emoji: '🥤' },
    { id: 'autre', label: 'Divers', emoji: '🏷️' }
  ]

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
        setInput('')
        journalData.reloadData()
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
          <div className="p-3 md:p-6 flex-grow">
            {/* Post-it d'alerte */}
            <JournalPostIt message={postItMessage} onDismiss={() => setPostItMessage(null)} />

            {activeTab === 'cahier' && (
              <div className="space-y-4">
                {/* Barre de stylos & filtres */}
                <NotebookToolbar
                  pens={pens}
                  selectedPen={selectedPen}
                  onSelectPen={setSelectedPen}
                  filters={filters}
                  activeFilter={activeFilter}
                  onSelectFilter={setActiveFilter}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />

                {/* Badges de raccourcis produits fréquents */}
                <QuickProductBadges
                  products={quickProducts}
                  onSelectProduct={handleSelectQuickProduct}
                />

                {/* Saisie manuscrite au stylo */}
                <form onSubmit={handleCreateSale} className="bg-amber-100/40 p-2.5 rounded-2xl border border-amber-300/60 shadow-sm space-y-2">
                  <div className="flex gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={pens.find(p => p.id === selectedPen)?.placeholder || 'Écrivez votre vente ou dépense...'}
                      rows={2}
                      className="w-full px-4 py-2.5 bg-[#fdfaf2] border border-amber-300 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none font-handwritten"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isSubmitting}
                      className="px-5 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#141210] font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 flex-shrink-0 shadow-md"
                    >
                      {isSubmitting ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span className="font-mono text-xs uppercase font-extrabold">Enregistrer</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Rendu de la Page Seyes */}
                <NotebookPage
                  sales={journalData.sales}
                  onCrossOutSale={journalData.crossOutSale}
                  onPrintReceipt={handlePrintReceipt}
                  searchQuery={searchQuery}
                  currentDateStr={getTodayDateString()}
                />
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

      {/* Modales */}
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
