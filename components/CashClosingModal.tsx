'use client'

import React, { useState, useEffect } from 'react'
import { 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Share2, 
  Calculator, 
  Coins, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText, 
  Wallet,
  History,
  Save,
  Check,
  Calendar,
  Clock
} from 'lucide-react'
import { calculateCash } from '@/lib/sales/cashDrawerCalculator'
import { 
  getOfflineCashClosings, 
  saveOfflineCashClosing, 
  OfflineCashClosing 
} from '@/lib/offlineDb'
import { logAuditEvent } from '@/lib/auditLogger'

interface SaleItem {
  id: string
  date: string
  time?: string
  total: number
  paid: number
  debt: number
  status: string
  type: string
  notes?: string
  pen_color?: string
  pen?: string
}

interface CashClosingModalProps {
  isOpen: boolean
  onClose: () => void
  sales: SaleItem[]
  shopName?: string
  shopId?: string
}

export function CashClosingModal({
  isOpen,
  onClose,
  sales,
  shopName = 'Cahier Numérique',
  shopId = 'default-shop',
}: CashClosingModalProps) {
  const [activeTab, setActiveTab] = useState<'closing' | 'history'>('closing')
  const [openingCashInput, setOpeningCashInput] = useState<string>('')
  const [actualCashInput, setActualCashInput] = useState<string>('')
  const [notesInput, setNotesInput] = useState<string>('')
  const [showBilletage, setShowBilletage] = useState<boolean>(false)
  const [isSaved, setIsSaved] = useState<boolean>(false)
  const [historyClosings, setHistoryClosings] = useState<OfflineCashClosing[]>([])
  
  const [bills, setBills] = useState<Record<number, number>>({
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
  })

  // Chargement de l'historique et des données existantes
  useEffect(() => {
    if (!isOpen) return
    const closings = getOfflineCashClosings(shopId)
    setHistoryClosings(closings)

    // Synchronisation en tâche de fond avec le serveur
    if (typeof window !== 'undefined' && navigator.onLine) {
      fetch(`/api/cash-closings?shop_id=${encodeURIComponent(shopId)}`, {
        headers: { 'x-shop-id': shopId }
      })
        .then(res => res.json())
        .then(data => {
          if (data?.closings && Array.isArray(data.closings) && data.closings.length > 0) {
            setHistoryClosings(data.closings)
          }
        })
        .catch(() => {})
    }

    const todayIso = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const existingToday = closings.find(c => c.date === todayIso)
    if (existingToday) {
      if (existingToday.opening_cash > 0) setOpeningCashInput(String(existingToday.opening_cash))
      if (existingToday.actual_cash > 0) setActualCashInput(String(existingToday.actual_cash))
      if (existingToday.notes) setNotesInput(existingToday.notes)
    }
  }, [isOpen, shopId])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const todayIso = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const todayStr = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Porto-Novo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
  const currentTimeStr = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Porto-Novo', hour: '2-digit', minute: '2-digit' }).format(new Date())
  
  const activeSales = sales.filter(s => s.status !== 'crossed_out')
  const todaySales = activeSales.filter(s => s.date === todayIso)

  // Recettes Espèces du Jour (Ventes Cash + Encaisses Dettes + Acomptes)
  const cashReceipts = todaySales
    .filter(s => ['cash_in', 'sale', 'sale_cash', 'payment_client'].includes(s.type) || (s.type === 'sale_credit' && (s.paid || 0) > 0) || s.pen_color === 'blue' || s.pen === 'blue')
    .reduce((sum, s) => sum + (s.paid || (s.type === 'sale_credit' ? 0 : s.total) || 0), 0)

  // Ventes à Crédit accordées aux clients aujourd'hui
  const creditSales = todaySales
    .filter(s => s.type === 'sale_credit' || (s.debt > 0 && s.type !== 'purchase_credit') || s.pen_color === 'yellow' || s.pen === 'yellow')
    .reduce((sum, s) => sum + (s.debt || 0), 0)

  // Dépenses & Achats Cash du Jour (Montant décaissé du tiroir)
  const totalExpenses = todaySales
    .filter(s => ['cash_out', 'purchase_cash', 'payment_supplier'].includes(s.type) || (s.type === 'purchase_credit' && (s.paid || 0) > 0) || s.pen_color === 'red' || s.pen_color === 'green' || s.pen === 'red' || s.pen === 'green')
    .reduce((sum, s) => {
      if (s.type === 'purchase_credit') return sum + (s.paid || 0)
      return sum + (s.total || s.paid || 0)
    }, 0)

  // Fond de caisse d'ouverture
  const rawOpening = parseFloat(openingCashInput.replace(/\s/g, '').replace(/,/g, '.'))
  const openingCash = Number.isFinite(rawOpening) ? Math.max(0, rawOpening) : 0

  // Solde théorique total = ouverture + recettes jour - dépenses jour
  // Si openingCash est renseigné, on l'ajoute au flux net de la journée
  const netDayCash = cashReceipts - totalExpenses
  const cumulatedSalesCash = calculateCash(activeSales)
  const theoreticalCash = openingCash > 0 ? (openingCash + netDayCash) : cumulatedSalesCash

  // Parsing espèces réelles comptées
  const rawActual = parseFloat(actualCashInput.replace(/\s/g, '').replace(/,/g, '.'))
  const actualCash = actualCashInput !== ''
    ? (Number.isFinite(rawActual) ? rawActual : 0)
    : theoreticalCash

  const difference = Math.round((actualCash - theoreticalCash) * 100) / 100

  const formatPrice = (price: number) => {
    const safe = Number.isFinite(price) ? price : 0
    return new Intl.NumberFormat('fr-FR').format(safe) + ' F'
  }

  // Calcul du billetage
  const totalBilletage = Object.entries(bills).reduce((sum, [denom, count]) => {
    const d = Number(denom)
    const c = Number(count || 0)
    return sum + (Number.isFinite(d) && Number.isFinite(c) ? d * c : 0)
  }, 0)

  const handleApplyBilletage = () => {
    setActualCashInput(String(totalBilletage))
    setShowBilletage(false)
  }

  const handleSaveClosing = async () => {
    const closingRecord: OfflineCashClosing = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `close_${Date.now()}`,
      shop_id: shopId,
      date: todayIso,
      closing_time: currentTimeStr,
      opening_cash: openingCash,
      theoretical_cash: theoreticalCash,
      actual_cash: actualCash,
      difference: difference,
      cash_receipts: cashReceipts,
      expenses: totalExpenses,
      credit_sales: creditSales,
      notes: notesInput.trim(),
      created_at: new Date().toISOString(),
      is_synced: false
    }

    // 1. Sauvegarde locale instantanée (Offline-First)
    saveOfflineCashClosing(shopId, closingRecord)
    setHistoryClosings(prev => {
      const filtered = prev.filter(c => c.date !== todayIso)
      return [closingRecord, ...filtered]
    })
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)

    logAuditEvent({
      shopId,
      action: 'cash_closing',
      targetId: closingRecord.id,
      details: {
        date: closingRecord.date,
        theoretical_cash: closingRecord.theoretical_cash,
        actual_cash: closingRecord.actual_cash,
        difference: closingRecord.difference,
      },
    })

    // 2. Synchronisation serveur en tâche de fond si connecté
    if (typeof window !== 'undefined' && navigator.onLine) {
      try {
        const res = await fetch('/api/cash-closings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': shopId
          },
          body: JSON.stringify(closingRecord)
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.closing) {
            saveOfflineCashClosing(shopId, { ...closingRecord, is_synced: true })
          }
        }
      } catch (e) {
        console.warn('[CashClosing] Sauvegarde réseau en attente de reconnexion')
      }
    }
  }

  const generateWhatsAppReportUrl = () => {
    let msg = `📊 *RAPPORT DE CLÔTURE DE CAISSE (Z)*\n`
    msg += `🏪 *Commerce* : ${shopName}\n`
    msg += `📅 *Date*     : ${todayStr} à ${currentTimeStr}\n`
    msg += `═════════════════════════\n`
    if (openingCash > 0) {
      msg += `🪙 *Fond d'Ouverture* : ${formatPrice(openingCash)}\n`
    }
    msg += `💵 *Recettes Espèces* : ${formatPrice(cashReceipts)}\n`
    msg += `💸 *Dépenses & Achats* : ${formatPrice(totalExpenses)}\n`
    msg += `📝 *Ventes Crédit*    : ${formatPrice(creditSales)}\n`
    msg += `═════════════════════════\n`
    msg += `💰 *SOLDE THÉORIQUE*  : ${formatPrice(theoreticalCash)}\n`
    msg += `📥 *ESPÈCES COMPTÉES*  : ${formatPrice(actualCash)}\n`
    
    if (difference === 0) {
      msg += `✅ *ÉCART CAISSE*       : PARFAIT (0 F)\n`
    } else if (difference > 0) {
      msg += `📈 *EXCÉDENT CAISSE*    : +${formatPrice(difference)}\n`
    } else {
      msg += `⚠️ *MANQUANT CAISSE*   : ${formatPrice(difference)}\n`
    }

    if (notesInput.trim()) {
      msg += `📝 *Observations*    : ${notesInput.trim()}\n`
    }
    
    msg += `═════════════════════════\n`
    msg += `✨ _Généré via Cahier Numérique PWA_`

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-[#fbf9f4] border border-amber-300 rounded-[28px] max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-amber-200/80 bg-gradient-to-r from-amber-100 to-amber-50 flex items-center justify-between text-amber-950 flex-shrink-0">
          <div className="font-bold text-sm flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
            <span className="font-mono tracking-tight font-extrabold">Clôture de Caisse (Z)</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-amber-200/60 cursor-pointer text-amber-800 active:scale-[0.97] transition-all"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Onglets Clôture vs Historique */}
        <div className="flex border-b border-amber-200 bg-amber-50/50 p-1 gap-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('closing')}
            className={`flex-1 py-1.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.97] ${
              activeTab === 'closing'
                ? 'bg-white text-amber-950 shadow-xs border border-amber-300/60'
                : 'text-amber-800/70 hover:text-amber-900 hover:bg-amber-100/50'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Clôture du Jour</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.97] ${
              activeTab === 'history'
                ? 'bg-white text-amber-950 shadow-xs border border-amber-300/60'
                : 'text-amber-800/70 hover:text-amber-900 hover:bg-amber-100/50'
            }`}
          >
            <History className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Historique ({historyClosings.length})</span>
          </button>
        </div>

        {activeTab === 'closing' ? (
          <div className="p-5 space-y-4 text-xs font-mono overflow-y-auto">
            
            {/* Saisie Fond d'Ouverture */}
            <div className="bg-white p-3 border border-amber-200/80 rounded-2xl space-y-1.5 shadow-2xs">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                  Fond de caisse d&apos;ouverture (Matin)
                </label>
                <span className="text-[10px] text-amber-800 font-semibold">Monnaie initiale</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 20 000 F (ou 0 si déjà cumulé)"
                value={openingCashInput}
                onChange={e => setOpeningCashInput(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50/30 border border-amber-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Synthèse des flux du jour */}
            <div className="bg-white p-3.5 border border-amber-200/80 rounded-2xl space-y-2.5 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Flux financiers du {todayStr}</div>
              
              <div className="flex justify-between items-center py-1 border-b border-stone-100 text-emerald-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                  <span>Recettes Espèces (Encaissements)</span>
                </span>
                <span className="tabular-nums font-black">+{formatPrice(cashReceipts)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-stone-100 text-rose-700 font-bold">
                <span className="flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" strokeWidth={1.75} />
                  <span>Dépenses & Achats Cash</span>
                </span>
                <span className="tabular-nums font-black">-{formatPrice(totalExpenses)}</span>
              </div>

              <div className="flex justify-between items-center py-1 text-amber-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.75} />
                  <span>Ventes Crédit Client (Non encaissées)</span>
                </span>
                <span className="tabular-nums font-black">{formatPrice(creditSales)}</span>
              </div>
            </div>

            {/* Solde Théorique */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-300/80 rounded-2xl flex justify-between items-center text-amber-950 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-200/80 flex items-center justify-center text-amber-800 flex-shrink-0">
                  <Wallet className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-amber-800">Espèces Théoriques Attendues</div>
                  <div className="text-lg font-black tabular-nums tracking-tight">{formatPrice(theoreticalCash)}</div>
                </div>
              </div>
              <div className="text-right text-[10px] text-amber-700 font-semibold">
                {openingCash > 0 ? 'Ouverture + Flux Net' : 'Cumul actif'}
              </div>
            </div>

            {/* Saisie Espèces Réelles dans le Tiroir */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-gray-600 uppercase">
                  Espèces Réelles Comptées (FCFA)
                </label>
                <button
                  type="button"
                  onClick={() => setShowBilletage(prev => !prev)}
                  className="text-[11px] font-bold text-amber-900 flex items-center gap-1 hover:underline cursor-pointer active:scale-[0.97] transition-transform"
                >
                  <Coins className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>{showBilletage ? 'Masquer billetage' : 'Compter mes billets'}</span>
                </button>
              </div>

              <input
                type="text"
                inputMode="numeric"
                placeholder={`Par défaut : ${theoreticalCash.toLocaleString('fr-FR')} F`}
                value={actualCashInput}
                onChange={e => setActualCashInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-base font-black text-gray-900 outline-none focus:border-amber-500 font-mono shadow-inner"
              />

              {/* Assistant Billetage en 1 clic */}
              {showBilletage && (
                <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-2 animate-in fade-in duration-150">
                  <div className="text-[10px] font-extrabold text-amber-950 uppercase flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-800" strokeWidth={1.75} />
                    <span>Assistant Billetage :</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[10000, 5000, 2000, 1000, 500, 200, 100, 50].map((denom) => (
                      <div key={denom} className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-amber-200">
                        <span className="text-[11px] font-bold text-gray-700 tabular-nums">{denom.toLocaleString('fr-FR')} F</span>
                        <input
                          type="number"
                          min="0"
                          value={bills[denom] || ''}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 0
                            setBills(prev => ({ ...prev, [denom]: val }))
                          }}
                          placeholder="0"
                          className="w-14 text-right px-1.5 py-0.5 bg-amber-50/50 border border-amber-300 rounded font-black text-xs tabular-nums"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
                    <span className="font-bold text-amber-950 tabular-nums">Total : {formatPrice(totalBilletage)}</span>
                    <button
                      type="button"
                      onClick={handleApplyBilletage}
                      className="px-3 py-1 bg-amber-900 text-white rounded-lg font-bold text-[11px] hover:bg-amber-950 cursor-pointer active:scale-[0.97] transition-transform"
                    >
                      Valider le total
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Analyse de l'Écart */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between font-bold ${
              difference === 0 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : difference > 0 
                ? 'bg-blue-50 border-blue-200 text-blue-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {difference === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" strokeWidth={1.75} />
                ) : (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
                )}
                <div>
                  <div className="text-[10px] uppercase">
                    {difference === 0 ? 'Caisse Parfaite' : difference > 0 ? 'Excédent de Caisse' : 'Manquant de Caisse'}
                  </div>
                  <div className="text-sm font-black tabular-nums tracking-tight">
                    {difference === 0 ? 'Écart : 0 F' : `${difference > 0 ? '+' : ''}${formatPrice(difference)}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Note / Justification */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                Observations / Justification d&apos;écart (facultatif)
              </label>
              <input
                type="text"
                placeholder="Ex: Monnaie gardée pour demain, pourboire..."
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Bouton de Persistance Clôture Z */}
            <button
              type="button"
              onClick={handleSaveClosing}
              className={`w-full py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-white shadow-sm cursor-pointer active:scale-[0.97] transition-all ${
                isSaved 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-amber-800 hover:bg-amber-900'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" strokeWidth={2} />
                  <span>Clôture Z enregistrée avec succès !</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" strokeWidth={1.75} />
                  <span>Valider & Enregistrer la Clôture Z</span>
                </>
              )}
            </button>

            {/* Footer Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-amber-200/90 bg-white/80 rounded-full font-bold text-amber-950 hover:bg-amber-50 active:scale-[0.97] transition-all cursor-pointer shadow-2xs"
              >
                Fermer
              </button>
              <a
                href={generateWhatsAppReportUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-center active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Partager WhatsApp</span>
              </a>
            </div>

          </div>
        ) : (
          /* Onglet Historique des Clôtures */
          <div className="p-5 space-y-3 text-xs font-mono overflow-y-auto max-h-[70vh]">
            <div className="flex items-center justify-between text-stone-500 font-bold uppercase text-[10px] pb-1 border-b border-amber-200">
              <span>Date & Heure</span>
              <span>Solde Réel / Écart</span>
            </div>

            {historyClosings.length === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-2">
                <History className="w-8 h-8 mx-auto text-amber-300" strokeWidth={1.5} />
                <p>Aucune clôture enregistrée pour l&apos;instant.</p>
                <p className="text-[10px]">Validez votre première clôture Z pour constituer l&apos;historique.</p>
              </div>
            ) : (
              historyClosings.map((closing) => {
                const diff = closing.difference || 0
                return (
                  <div 
                    key={closing.id || closing.date}
                    className="p-3 bg-white border border-amber-200/80 rounded-2xl space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-stone-900">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" strokeWidth={1.75} />
                        <span>{closing.date}</span>
                        {closing.closing_time && (
                          <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {closing.closing_time}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        diff === 0 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : diff > 0 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {diff === 0 ? 'Écart 0 F' : `${diff > 0 ? '+' : ''}${formatPrice(diff)}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] border-t border-stone-100">
                      <div>
                        <span className="text-stone-400">Recettes : </span>
                        <span className="font-bold text-emerald-700 tabular-nums">+{formatPrice(closing.cash_receipts)}</span>
                      </div>
                      <div>
                        <span className="text-stone-400">Dépenses : </span>
                        <span className="font-bold text-rose-700 tabular-nums">-{formatPrice(closing.expenses)}</span>
                      </div>
                      <div>
                        <span className="text-stone-400">Théorique : </span>
                        <span className="font-bold text-stone-700 tabular-nums">{formatPrice(closing.theoretical_cash)}</span>
                      </div>
                      <div>
                        <span className="text-stone-400">Compté : </span>
                        <span className="font-black text-amber-950 tabular-nums">{formatPrice(closing.actual_cash)}</span>
                      </div>
                    </div>

                    {closing.notes && (
                      <p className="text-[10px] text-stone-500 italic pt-1 border-t border-dashed border-stone-100">
                        &quot;{closing.notes}&quot;
                      </p>
                    )}
                  </div>
                )
              })
            )}

            <button
              type="button"
              onClick={() => setActiveTab('closing')}
              className="w-full mt-2 py-2 border border-amber-300 bg-amber-50 rounded-xl font-bold text-amber-950 hover:bg-amber-100 active:scale-[0.97] transition-all cursor-pointer"
            >
              Retour à la clôture du jour
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
