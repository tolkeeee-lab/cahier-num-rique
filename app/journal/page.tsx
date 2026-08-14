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
    <div className="min-h-screen bg-[#141210] text-[#fefdfa] font-sans antialiased">
      {/* En-tête Navigation Principale */}
      <JournalHeader
        user={mappedUser}
        currentShopName={shopManager.currentShop?.name || 'Mon Point de Vente'}
        activity={shopManager.shopActivity}
        isOnline={isOnline}
        pendingSyncCount={pendingCount}
        isSyncing={syncStatus === 'syncing'}
        onSyncClick={() => setSyncStatus('syncing')}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenCashClosing={() => setShowCashClosing(true)}
        onOpenBarcodeScanner={() => setShowBarcodeScannerModal(true)}
        onOpenBoutiqueAssistant={() => setShowAssistantModal(true)}
        onOpenSyscohada={() => setShowSyscohadaModal(true)}
      />

      {/* Onglets de navigation */}
      <JournalTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activity={shopManager.shopActivity}
      />

      {/* Contenu Principal */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Post-it d'alerte */}
        <JournalPostIt message={postItMessage} onDismiss={() => setPostItMessage(null)} />

        {activeTab === 'cahier' && (
          <div className="space-y-6">
            {/* Zone de saisie rapide au stylo */}
            <form onSubmit={handleCreateSale} className="bg-[#1e1a18] p-4 rounded-2xl border border-gray-800 shadow-xl space-y-3">
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

              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={pens.find(p => p.id === selectedPen)?.placeholder || 'Écrivez votre vente ou dépense...'}
                  rows={2}
                  className="w-full px-4 py-3 bg-[#141210] border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none font-handwritten"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isSubmitting}
                  className="px-6 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#141210] font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0"
                >
                  {isSubmitting ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Enregistrer</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Rendu visuel de la Page Seyes du Cahier */}
            <NotebookPage
              sales={journalData.sales}
              onCrossOutSale={journalData.crossOutSale}
              onPrintReceipt={handlePrintReceipt}
              searchQuery={searchQuery}
              currentDateStr={getTodayDateString()}
            />
          </div>
        )}

        {/* Autres Onglets */}
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
      </main>

      {/* Ensemble des Modales */}
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
