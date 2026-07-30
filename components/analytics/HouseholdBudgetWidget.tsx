'use client'

import React, { useState, useMemo } from 'react'
import { Wallet, TrendingUp, TrendingDown, AlertCircle, Share2, Plus, Trash2, ShieldCheck, Target } from 'lucide-react'
import { generateWhatsAppPerformanceReport } from '@/lib/exportUtils'
import { getOfflineSales, saveOfflineSale, generateOfflineId, replaceOfflineSales } from '@/lib/offlineDb'
import { getTodayDateString } from '@/lib/dateUtils'

interface Sale {
  id: string
  date: string
  time: string
  client: string
  total: number
  paid: number
  debt: number
  status: string
  type: string
  pen_color: string
  notes: string
  category?: string
  articles?: Array<{ name: string; quantity: number; unit_price: number; category?: string }>
}

interface HouseholdBudgetWidgetProps {
  sales: Sale[]
  period: 'today' | '7days' | 'month' | 'all'
  onPeriodChange: (p: 'today' | '7days' | 'month' | 'all') => void
  shopName?: string
  shopId?: string
  onRefreshData?: () => void
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(price) + ' F'
}

export function HouseholdBudgetWidget({ 
  sales, 
  period, 
  onPeriodChange, 
  shopName = 'Budget Foyer',
  shopId = 'default-shop',
  onRefreshData
}: HouseholdBudgetWidgetProps) {
  // État de saisie rapide depuis le Dashboard
  const [inputText, setInputText] = useState('')
  const [selectedPen, setSelectedPen] = useState<'blue' | 'red' | 'green' | 'yellow' | 'purple'>('red')
  const [submitting, setSubmitting] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  // Plafond mensuel de budget (personnalisable)
  const [monthlyCap, setMonthlyCap] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`cahier_budget_cap_${shopId}`)
      return saved ? parseInt(saved, 10) : 250000
    }
    return 250000
  })
  const [showCapModal, setShowCapModal] = useState(false)
  const [newCapInput, setNewCapInput] = useState('')

  // Filtre d'affichage des opérations dans le dashboard
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense' | 'reserve' | 'loans'>('all')

  // Calculs financiers du foyer
  const budgetStats = useMemo(() => {
    let totalEntrees = 0
    let totalSorties = 0
    let totalReserve = 0
    let totalPretsAccordes = 0
    let totalArrieres = 0 // Dettes dues aux boutiquiers/factures

    const categoryMap: Record<string, number> = {
      'Alimentation & Marché': 0,
      'Loyer, Gaz & Maison': 0,
      'Scolarité & Enfants': 0,
      'Santé & Hygiène': 0,
      'Transport & Communication': 0,
      'Divers & Autres': 0
    }

    sales.forEach(s => {
      if (s.status === 'crossed_out') return

      const isIncome = s.pen_color === 'blue' || s.type === 'cash_in'
      const isReserve = s.pen_color === 'green'
      const isLoan = s.pen_color === 'yellow' || s.pen_color === 'purple'

      if (isIncome) {
        totalEntrees += (s.paid || s.total || 0)
      } else if (isReserve) {
        totalReserve += (s.paid || s.total || 0)
      } else if (isLoan) {
        totalPretsAccordes += (s.paid || s.total || 0)
      } else {
        const paidVal = s.paid ?? s.total ?? 0
        const debtVal = s.debt ?? 0
        totalSorties += paidVal
        totalArrieres += debtVal

        // Catégorisation des dépenses
        if (s.articles && s.articles.length > 0) {
          s.articles.forEach(art => {
            const nameLower = art.name.toLowerCase()
            const cost = art.unit_price * art.quantity

            if (nameLower.includes('riz') || nameLower.includes('huile') || nameLower.includes('pain') || nameLower.includes('viande') || nameLower.includes('poisson') || nameLower.includes('légume') || nameLower.includes('marché') || nameLower.includes('lait') || nameLower.includes('nourriture') || nameLower.includes('repas')) {
              categoryMap['Alimentation & Marché'] += cost
            } else if (nameLower.includes('loyer') || nameLower.includes('gaz') || nameLower.includes('courant') || nameLower.includes('eau') || nameLower.includes('cie') || nameLower.includes('sodeci') || nameLower.includes('recharge') || nameLower.includes('maison')) {
              categoryMap['Loyer, Gaz & Maison'] += cost
            } else if (nameLower.includes('école') || nameLower.includes('ecole') || nameLower.includes('scolarité') || nameLower.includes('scolarite') || nameLower.includes('cahier') || nameLower.includes('tenue') || nameLower.includes('livre')) {
              categoryMap['Scolarité & Enfants'] += cost
            } else if (nameLower.includes('pharmacie') || nameLower.includes('médicament') || nameLower.includes('medicament') || nameLower.includes('savon') || nameLower.includes('couche') || nameLower.includes('soin')) {
              categoryMap['Santé & Hygiène'] += cost
            } else if (nameLower.includes('essence') || nameLower.includes('carburant') || nameLower.includes('taxi') || nameLower.includes('transport') || nameLower.includes('deplacement') || nameLower.includes('pass')) {
              categoryMap['Transport & Communication'] += cost
            } else {
              categoryMap['Divers & Autres'] += cost
            }
          })
        } else {
          const notesLower = (s.notes || '').toLowerCase()
          const cost = paidVal || s.total || 0
          if (notesLower.includes('riz') || notesLower.includes('huile') || notesLower.includes('pain') || notesLower.includes('viande') || notesLower.includes('poisson') || notesLower.includes('marché') || notesLower.includes('lait') || notesLower.includes('nourriture') || notesLower.includes('repas')) {
            categoryMap['Alimentation & Marché'] += cost
          } else if (notesLower.includes('loyer') || notesLower.includes('gaz') || notesLower.includes('courant') || notesLower.includes('eau') || notesLower.includes('cie') || notesLower.includes('sodeci') || notesLower.includes('recharge') || notesLower.includes('maison')) {
            categoryMap['Loyer, Gaz & Maison'] += cost
          } else if (notesLower.includes('école') || notesLower.includes('ecole') || notesLower.includes('scolarité') || notesLower.includes('scolarite') || notesLower.includes('cahier') || notesLower.includes('tenue') || notesLower.includes('livre')) {
            categoryMap['Scolarité & Enfants'] += cost
          } else if (notesLower.includes('pharmacie') || notesLower.includes('médicament') || notesLower.includes('medicament') || notesLower.includes('savon') || notesLower.includes('couche') || notesLower.includes('soin')) {
            categoryMap['Santé & Hygiène'] += cost
          } else if (notesLower.includes('essence') || notesLower.includes('carburant') || notesLower.includes('taxi') || notesLower.includes('transport') || notesLower.includes('deplacement') || notesLower.includes('pass')) {
            categoryMap['Transport & Communication'] += cost
          } else {
            categoryMap['Divers & Autres'] += cost
          }
        }
      }
    })

    const resteAVivre = totalEntrees - totalSorties - totalReserve
    const budgetPct = monthlyCap > 0 ? Math.min(100, Math.round((totalSorties / monthlyCap) * 100)) : 0

    const sortedCategories = Object.entries(categoryMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalSorties > 0 ? Math.round((amount / totalSorties) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    return {
      totalEntrees,
      totalSorties,
      totalReserve,
      totalPretsAccordes,
      totalArrieres,
      resteAVivre,
      budgetPct,
      sortedCategories
    }
  }, [sales, monthlyCap])

  // Filtrer la liste des opérations
  const filteredTransactions = useMemo(() => {
    return sales.filter(s => {
      if (s.status === 'crossed_out') return false
      if (txFilter === 'income') return s.pen_color === 'blue' || s.type === 'cash_in'
      if (txFilter === 'expense') return s.pen_color === 'red' || s.type === 'cash_out'
      if (txFilter === 'reserve') return s.pen_color === 'green'
      if (txFilter === 'loans') return s.pen_color === 'yellow' || s.pen_color === 'purple'
      return true
    }).slice(0, 30) // 30 plus récentes
  }, [sales, txFilter])

  // Soumission directe d'une opération depuis le Dashboard
  const handleSubmitTransaction = async (e?: React.FormEvent, overrideText?: string, overridePen?: typeof selectedPen) => {
    if (e) e.preventDefault()
    const textToSubmit = overrideText || inputText
    const penToUse = overridePen || selectedPen

    if (!textToSubmit || !textToSubmit.trim()) return

    setSubmitting(true)
    setFeedbackMsg(null)

    try {
      const isOnline = typeof window !== 'undefined' ? window.navigator.onLine : false

      let txType = 'cash_in'
      if (penToUse === 'red') txType = 'cash_out'
      else if (penToUse === 'green') txType = 'stock_cash'
      else if (penToUse === 'yellow') txType = 'sale_credit'
      else if (penToUse === 'purple') txType = 'purchase_credit'

      if (isOnline) {
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': shopId,
            'x-shop-activity': 'particulier'
          },
          body: JSON.stringify({
            text: textToSubmit.trim(),
            pen_color: penToUse,
            type: txType
          })
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Erreur lors de l\'enregistrement')
        }
      } else {
        // Enregistrement offline
        const now = new Date()
        const newSale = {
          id: generateOfflineId(),
          shop_id: shopId,
          date: getTodayDateString(now),
          time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          client: 'Foyer',
          total: 0,
          paid: 0,
          debt: 0,
          status: 'paid' as const,
          type: txType,
          pen_color: penToUse,
          notes: textToSubmit.trim(),
          articles: [] as Array<{ name: string; quantity: number; unit_price: number }>,
          created_at: now.toISOString(),
          is_synced: false
        }
        saveOfflineSale(shopId, newSale)
      }

      setInputText('')
      setFeedbackMsg('✅ Opération ajoutée au budget du foyer !')
      setTimeout(() => setFeedbackMsg(null), 3000)

      if (onRefreshData) onRefreshData()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cahier_sales_updated'))
      }
    } catch (err: any) {
      setFeedbackMsg(`⚠️ ${err?.message || 'Erreur d\'enregistrement'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Suppression d'une opération directement depuis le Dashboard
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Voulez-vous biffer (supprimer) cette ligne du budget ?')) return

    try {
      const isOnline = typeof window !== 'undefined' ? window.navigator.onLine : false
      if (isOnline) {
        await fetch(`/api/sales?id=${id}`, {
          method: 'DELETE',
          headers: { 'x-shop-id': shopId }
        })
      } else {
        const offlineSales = getOfflineSales(shopId)
        const updated = offlineSales.map((s: any) => s.id === id ? { ...s, status: 'crossed_out' } : s)
        replaceOfflineSales(shopId, updated)
      }

      if (onRefreshData) onRefreshData()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cahier_sales_updated'))
      }
    } catch (err) {
      console.error('Erreur suppression:', err)
    }
  }

  // Sauvegarder le nouveau plafond de budget
  const handleSaveBudgetCap = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseInt(newCapInput, 10)
    if (!isNaN(val) && val > 0) {
      setMonthlyCap(val)
      localStorage.setItem(`cahier_budget_cap_${shopId}`, val.toString())
      setShowCapModal(false)
      setNewCapInput('')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 🏠 En-tête du Dashboard Tout-en-Un */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-amber-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-900 text-amber-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
            🏠
          </div>
          <div>
            <h2 className="font-handwritten text-2xl font-bold text-amber-950">
              Gestionnaire Intégral du Foyer & Budget
            </h2>
            <p className="text-xs font-mono text-amber-700">
              GÉREZ VOS REVENUS, DÉPENSES DU MÉNAGE, RÉSERVE ET COMPTES DU VOISINAGE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sélection Période */}
          <div className="flex gap-1 bg-amber-50 p-1 rounded-2xl border border-amber-200">
            {[
              { id: 'all', label: 'Tout' },
              { id: 'month', label: 'Ce Mois' },
              { id: '7days', label: '7 Jours' },
              { id: 'today', label: 'Aujourd\'hui' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => onPeriodChange(p.id as any)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                  period === p.id 
                    ? 'bg-amber-900 text-white shadow-sm' 
                    : 'text-amber-800 hover:bg-amber-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <a
            href={generateWhatsAppPerformanceReport(sales, period === 'all' ? 'Tout' : period === 'month' ? 'Ce Mois' : period === '7days' ? '7 Jours' : 'Aujourd\'hui', shopName)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold transition-all shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Rapport WhatsApp</span>
          </a>
        </div>
      </div>

      {/* ✍️ CENTRE DE SAISIE RAPIDE DIRECTEMENT DANS LE DASHBOARD */}
      <div className="bg-amber-50/90 border-2 border-amber-300 rounded-[32px] p-5 md:p-6 shadow-md space-y-4 relative">
        <div className="flex items-center justify-between">
          <h3 className="font-handwritten text-xl font-bold text-amber-950 flex items-center gap-2">
            <span>✍️ Saisir une Opération de la Maison</span>
          </h3>
          {feedbackMsg && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 animate-pulse">
              {feedbackMsg}
            </span>
          )}
        </div>

        {/* Sélecteur de Stylo / Nature d'écriture */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'blue', label: '🔵 REVENU / SALAIRE', bg: 'bg-blue-600', activeBg: 'bg-blue-700 text-white', ph: 'ex: Salaire mois 250000, Vente affaires 45000...' },
            { id: 'red', label: '🔴 DÉPENSE FOYER', bg: 'bg-rose-600', activeBg: 'bg-rose-700 text-white', ph: 'ex: Marché poisson 12000, Loyer 60000...' },
            { id: 'green', label: '🟢 RÉSERVE / ÉPARGNE', bg: 'bg-emerald-700', activeBg: 'bg-emerald-800 text-white', ph: 'ex: Mettre de côté pour urgence 25000...' },
            { id: 'yellow', label: '🟡 PRÊT À UN PROCHE', bg: 'bg-amber-600', activeBg: 'bg-amber-700 text-white', ph: 'ex: Prêt à Koffi 15000...' },
            { id: 'purple', label: '🟣 CARNET BOUTIQUIER', bg: 'bg-purple-700', activeBg: 'bg-purple-800 text-white', ph: 'ex: Dette boutique quartier riz et savon 8500...' },
          ].map(pen => (
            <button
              key={pen.id}
              type="button"
              onClick={() => setSelectedPen(pen.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedPen === pen.id 
                  ? `${pen.activeBg} border-black shadow-sm scale-105` 
                  : 'bg-white text-gray-700 border-gray-250 hover:bg-gray-100'
              }`}
            >
              {pen.label}
            </button>
          ))}
        </div>

        {/* Formulaire de saisie directe */}
        <form onSubmit={e => handleSubmitTransaction(e)} className="flex items-center gap-2 bg-white border-2 border-amber-300 rounded-2xl p-2 shadow-inner">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={
              selectedPen === 'blue' ? '🔵 Stylo Bleu : Revenu, Salaire, Tontine (ex: Salaire 250000)' :
              selectedPen === 'red' ? '🔴 Stylo Rouge : Dépense (ex: Marché poisson et légumes 12000)' :
              selectedPen === 'green' ? '🟢 Stylo Vert : Réserve Maison / Épargne (ex: Épargne 30000)' :
              selectedPen === 'yellow' ? '🟡 Stylo Jaune : Prêt donné à un proche (ex: Prêt à Koffi 15000)' :
              '🟣 Stylo Violet : Dette boutiquier quartier (ex: Grossiste boutique 8500)'
            }
            className="flex-grow bg-transparent text-sm md:text-base font-handwritten px-3 outline-none text-gray-900 font-bold"
          />
          <button
            type="submit"
            disabled={submitting || !inputText.trim()}
            className="px-5 py-2.5 bg-amber-900 hover:bg-amber-950 disabled:opacity-40 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all flex-shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? 'Enregistrement...' : 'Valider'}</span>
          </button>
        </form>

        {/* Raccourcis 1-Tap d'Opérations Courantes */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide text-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex-shrink-0">Raccourcis 1-Tap :</span>
          {[
            { label: '🌾 Marché (15 000 F)', text: 'Marché 15000', pen: 'red' },
            { label: '🏠 Loyer (75 000 F)', text: 'Loyer 75000', pen: 'red' },
            { label: '⚡ Courant/Eau (12 000 F)', text: 'Facture eau et courant 12000', pen: 'red' },
            { label: '📚 Scolarité (25 000 F)', text: 'Frais scolarité 25000', pen: 'red' },
            { label: '💵 Salaire (+250 000 F)', text: 'Salaire mois 250000', pen: 'blue' },
            { label: '🛡️ Réserve (+30 000 F)', text: 'Réserve épargne 30000', pen: 'green' },
          ].map((sc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setInputText(sc.text)
                setSelectedPen(sc.pen as any)
                handleSubmitTransaction(undefined, sc.text, sc.pen as any)
              }}
              className="px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-xl font-bold text-amber-900 whitespace-nowrap transition-all shadow-2xs hover:scale-105"
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* 💚 Radar de Santé Financière du Foyer (4 Cartes KPIs Clés) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entrées / Revenus */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-[28px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block font-mono">
              📥 Total Revenus Reçus
            </span>
            <span className="text-xl font-extrabold font-mono text-blue-950 mt-1 block">
              +{formatPrice(budgetStats.totalEntrees)}
            </span>
            <span className="text-[9px] text-blue-700 font-sans mt-0.5 block">
              Salaires, tontines et rentrées
            </span>
          </div>
          <div className="p-3 bg-blue-200/60 rounded-2xl text-blue-800">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Dépenses Totales */}
        <div className="bg-rose-50/80 border border-rose-200 rounded-[28px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block font-mono">
              📤 Dépenses Réelles Foyer
            </span>
            <span className="text-xl font-extrabold font-mono text-rose-950 mt-1 block">
              -{formatPrice(budgetStats.totalSorties)}
            </span>
            <span className="text-[9px] text-rose-700 font-sans mt-0.5 block">
              Marché, factures, loyer, école
            </span>
          </div>
          <div className="p-3 bg-rose-200/60 rounded-2xl text-rose-800">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Réserve / Épargne Foyer */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-[28px] p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block font-mono">
              🛡️ Réserve & Épargne
            </span>
            <span className="text-xl font-extrabold font-mono text-emerald-950 mt-1 block">
              {formatPrice(budgetStats.totalReserve)}
            </span>
            <span className="text-[9px] text-emerald-700 font-sans mt-0.5 block">
              Fonds de sécurité maison
            </span>
          </div>
          <div className="p-3 bg-emerald-200/60 rounded-2xl text-emerald-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Solde Net Disponible */}
        <div className={`border rounded-[28px] p-5 shadow-sm flex items-center justify-between ${
          budgetStats.resteAVivre >= 0 ? 'bg-sky-50/80 border-sky-200' : 'bg-amber-50/80 border-amber-300'
        }`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block font-mono text-sky-900">
              💚 Reste à Vivre Net
            </span>
            <span className={`text-xl font-extrabold font-mono mt-1 block ${
              budgetStats.resteAVivre >= 0 ? 'text-sky-950' : 'text-amber-900'
            }`}>
              {budgetStats.resteAVivre >= 0 ? '+' : ''}{formatPrice(budgetStats.resteAVivre)}
            </span>
            <span className="text-[9px] text-sky-800 font-sans mt-0.5 block">
              {budgetStats.resteAVivre >= 0 ? 'Budget équilibré !' : '⚠️ Attention au solde'}
            </span>
          </div>
          <div className="p-3 bg-sky-200/60 rounded-2xl text-sky-800">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 📈 JAUGE DE MAÎTRISE DU BUDGET MENSUEL */}
      <div className="bg-white border border-amber-200 rounded-[28px] p-5 md:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-700" />
            <h3 className="font-handwritten text-lg font-bold text-amber-950">
              Baromètre de Consommation du Budget Mensuel
            </h3>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-gray-500 font-bold">Plafond fixé : <strong className="text-amber-950 font-extrabold">{formatPrice(monthlyCap)}</strong></span>
            <button
              onClick={() => { setNewCapInput(monthlyCap.toString()); setShowCapModal(true) }}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold transition-all border border-amber-300"
            >
              ⚙️ Ajuster Plafond
            </button>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="space-y-1.5">
          <div className="h-4 w-full bg-amber-100 rounded-full overflow-hidden p-0.5 border border-amber-300">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                budgetStats.budgetPct > 90 ? 'bg-rose-600' : budgetStats.budgetPct > 70 ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
              style={{ width: `${budgetStats.budgetPct}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[11px] font-mono font-bold text-gray-600">
            <span>Dépensé : {formatPrice(budgetStats.totalSorties)} ({budgetStats.budgetPct}%)</span>
            <span className={monthlyCap - budgetStats.totalSorties >= 0 ? 'text-emerald-700' : 'text-rose-600 font-extrabold'}>
              Reste autorisée : {formatPrice(monthlyCap - budgetStats.totalSorties)}
            </span>
          </div>
        </div>
      </div>

      {/* Dépenses dues aux boutiquiers du quartier ou factures impayées */}
      {budgetStats.totalArrieres > 0 && (
        <div className="bg-amber-500/10 border border-amber-300/80 rounded-2xl p-4 flex items-center gap-3 text-amber-950 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0" />
          <div>
            <strong>Carnet Boutiquier & Dettes Quartier :</strong> Vous avez <strong>{formatPrice(budgetStats.totalArrieres)}</strong> de dépenses restant à régler auprès de vos commerçants ou voisins.
          </div>
        </div>
      )}

      {/* 📊 Répartition des Dépenses de la Maison par Catégorie */}
      <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-150 pb-3">
          <h3 className="font-handwritten text-xl font-bold text-gray-800 flex items-center gap-2">
            📊 Répartition des Postes de Dépense du Foyer
          </h3>
          <span className="text-[10px] font-mono text-gray-400">
            Ventilation automatique par catégories
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetStats.sortedCategories.map((cat, idx) => (
            <div key={idx} className="space-y-1.5 bg-[#fdfaf2] border border-amber-100 p-3.5 rounded-2xl">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>{cat.name.includes('Alimentation') ? '🌾' : cat.name.includes('Loyer') ? '🏠' : cat.name.includes('Scolarité') ? '📚' : cat.name.includes('Santé') ? '🧼' : cat.name.includes('Transport') ? '🚗' : '📦'}</span>
                  <span>{cat.name}</span>
                </span>
                <span className="font-mono font-bold text-amber-900">
                  {formatPrice(cat.amount)} ({cat.percentage}%)
                </span>
              </div>
              <div className="h-3 w-full bg-amber-100/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-600 rounded-full transition-all duration-500"
                  style={{ width: `${cat.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 📜 HISTORIQUE & JOURNAL DES OPÉRATIONS DU FOYER */}
      <div className="bg-white border border-gray-200 rounded-[28px] p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-150 pb-3">
          <h3 className="font-handwritten text-xl font-bold text-gray-800 flex items-center gap-2">
            📜 Journal des Écritures du Foyer
          </h3>

          {/* Filtres par Stylo / Catégorie */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs font-bold overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'income', label: '🔵 Revenus' },
              { id: 'expense', label: '🔴 Dépenses' },
              { id: 'reserve', label: '🟢 Réserve' },
              { id: 'loans', label: '🤝 Prêts/Carnet' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setTxFilter(f.id as any)}
                className={`px-3 py-1 rounded-xl transition-all whitespace-nowrap ${
                  txFilter === f.id ? 'bg-amber-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des opérations */}
        <div className="divide-y divide-gray-150 max-h-96 overflow-y-auto pr-1">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map(sale => {
              const isIncome = sale.pen_color === 'blue' || sale.type === 'cash_in'
              const isReserve = sale.pen_color === 'green'
              const isLoan = sale.pen_color === 'yellow' || sale.pen_color === 'purple'
              const amount = sale.total || sale.paid || 0

              return (
                <div key={sale.id} className="py-3 flex items-center justify-between gap-3 hover:bg-amber-50/50 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {isIncome ? '🔵' : isReserve ? '🟢' : isLoan ? '🤝' : '🔴'}
                    </span>
                    <div>
                      <span className="font-handwritten text-base font-bold text-gray-900 block leading-tight">
                        {sale.notes || 'Opération du foyer'}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mt-0.5">
                        <span>{sale.date} à {sale.time}</span>
                        {sale.client && sale.client !== 'Foyer' && (
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">{sale.client}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-extrabold text-sm md:text-base ${
                      isIncome ? 'text-blue-700' : isReserve ? 'text-emerald-700' : isLoan ? 'text-amber-700' : 'text-rose-600'
                    }`}>
                      {isIncome ? '+' : isReserve ? '🛡️ ' : isLoan ? '🤝 ' : '-'}{formatPrice(amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTransaction(sale.id)}
                      title="Biffer cette ligne"
                      className="p-1 text-gray-300 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-10 text-center text-gray-400 font-handwritten text-lg">
              Aucune opération enregistrée pour ce filtre.
            </div>
          )}
        </div>
      </div>

      {/* Modal Ajustement du Plafond Budget */}
      {showCapModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="font-handwritten text-xl font-bold text-amber-950 flex items-center gap-2">
              <span>⚙️ Définir le Plafond Mensuel du Foyer</span>
            </h4>
            <p className="text-xs text-gray-600 font-sans">
              Indiquez le montant maximum de dépenses que vous vous autorisez pour le mois. La jauge du dashboard calculera automatiquement votre niveau de consommation.
            </p>
            <form onSubmit={handleSaveBudgetCap} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-amber-900 tracking-wider font-sans block mb-1">
                  Plafond Mensuel (FCFA) :
                </label>
                <input
                  type="number"
                  required
                  value={newCapInput}
                  onChange={e => setNewCapInput(e.target.value)}
                  placeholder="ex: 250000"
                  className="w-full px-4 py-3 bg-amber-50 border-2 border-amber-300 rounded-2xl text-lg font-mono font-bold outline-none text-amber-950 focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCapModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold shadow-sm"
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
