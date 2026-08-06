'use client'

import React, { useState, useMemo } from 'react'
import { Layers, ShieldAlert, Landmark, ChevronDown, ChevronUp } from 'lucide-react'
import { calculateCategoryCashboxBreakdown, CategoryCashboxGroup } from '@/lib/boutiqueAnalyticsEngine'
import { generateOfflineId, saveOfflineSale } from '@/lib/offlineDb'

interface CategoryCashboxWidgetProps {
  sales: any[]
  products?: any[]
  activeCashboxFilter?: string
  onSelectCashboxFilter?: (filter: string) => void
  onRefreshData?: () => void
  shopId?: string
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount) + ' F'
}

export function CategoryCashboxWidget({
  sales,
  products = [],
  activeCashboxFilter = 'ALL',
  onSelectCashboxFilter,
  onRefreshData,
  shopId
}: CategoryCashboxWidgetProps) {
  // Mode Caisse : 'unified' (Caisse Unique Commune) vs 'separated' (Multi-Caisses par Rayon)
  const [cashboxMode, setCashboxMode] = useState<'unified' | 'separated'>('unified')
  const [showDetailInUnified, setShowDetailInUnified] = useState(false)

  // Modale d'Ajustement physique d'une Caisse
  const [adjustingGroup, setAdjustingGroup] = useState<CategoryCashboxGroup | null>(null)
  const [actualCashInput, setActualCashInput] = useState<string>('')
  const [adjustMode, setAdjustMode] = useState<'real' | 'add' | 'sub'>('real')
  const [adjustNote, setAdjustNote] = useState<string>('')
  const [savingAdjust, setSavingAdjust] = useState<boolean>(false)

  const openAdjustModal = (group: CategoryCashboxGroup) => {
    setAdjustingGroup(group)
    setActualCashInput(group.paidCash.toString())
    setAdjustMode('real')
    setAdjustNote('')
  }

  const handleSaveAdjustment = async () => {
    if (!adjustingGroup) return
    setSavingAdjust(true)

    const sId = shopId || 'default-shop'
    const currentCash = adjustingGroup.paidCash
    let delta = 0
    let noteText = ''

    if (adjustMode === 'real') {
      const target = parseInt(actualCashInput) || 0
      delta = target - currentCash
      if (delta === 0) {
        setAdjustingGroup(null)
        setSavingAdjust(false)
        return
      }
      const sign = delta > 0 ? '+' : '-'
      noteText = `Ajustement Caisse (${adjustingGroup.name}) : Écart ${sign}${Math.abs(delta)} F ${adjustNote ? `(${adjustNote})` : ''}`
    } else if (adjustMode === 'add') {
      const val = parseInt(actualCashInput) || 0
      if (val <= 0) return
      delta = val
      noteText = `Apport Fond de Caisse (${adjustingGroup.name}) : +${val} F ${adjustNote ? `(${adjustNote})` : ''}`
    } else if (adjustMode === 'sub') {
      const val = parseInt(actualCashInput) || 0
      if (val <= 0) return
      delta = -val
      noteText = `Retrait Caisse (${adjustingGroup.name}) : -${val} F ${adjustNote ? `(${adjustNote})` : ''}`
    }

    const absAmount = Math.abs(delta)
    const isPositive = delta > 0
    const dateStr = new Date().toISOString().split('T')[0]
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    const localSale = {
      id: generateOfflineId(),
      shop_id: sId,
      date: dateStr,
      time: timeStr,
      client: `Caisse ${adjustingGroup.name}`,
      total: absAmount,
      paid: absAmount,
      debt: 0,
      status: 'paid' as const,
      type: 'cash_adjustment',
      pen_color: isPositive ? 'purple' : 'red',
      notes: noteText,
      category: adjustingGroup.name,
      articles: [{ name: noteText, quantity: 1, unit_price: absAmount }],
      created_at: new Date().toISOString(),
      is_synced: false
    }
    saveOfflineSale(sId, localSale)

    try {
      await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': sId,
        },
        body: JSON.stringify({
          shop_id: sId,
          pen_color: isPositive ? 'purple' : 'red',
          raw_text: noteText,
          parsed: {
            articles: [{ nom: noteText, quantite: 1, prix_unitaire: absAmount }],
            total_facture: absAmount,
            montant_paye: absAmount,
            montant_dette: 0,
            nom_client: `Caisse ${adjustingGroup.name}`,
            type: 'cash_adjustment'
          }
        })
      })
    } catch (err) {
      console.warn('Sauvegarde réseau échouée, conservé en local:', err)
    } finally {
      setSavingAdjust(false)
      setAdjustingGroup(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cahier_sales_updated'))
      }
      if (onRefreshData) {
        onRefreshData()
      }
    }
  }

  const breakdown = useMemo(
    () => calculateCategoryCashboxBreakdown(sales, products),
    [sales, products]
  )

  const activeGroups = useMemo(() => {
    const list: CategoryCashboxGroup[] = [breakdown.boissons, breakdown.divers]
    if (breakdown.resto.revenue > 0 || breakdown.resto.itemCount > 0) {
      list.push(breakdown.resto)
    }
    if (breakdown.services.revenue > 0 || breakdown.services.itemCount > 0) {
      list.push(breakdown.services)
    }
    return list
  }, [breakdown])

  // Totaux Généraux Caisse Unique
  const unifiedTotals = useMemo(() => {
    let totalStockSale = 0
    let totalStockCost = 0
    let totalDebt = 0
    let totalExpenses = 0
    let totalItems = 0
    let totalOutOfStock = 0

    activeGroups.forEach(g => {
      totalStockSale += g.stockValueSale
      totalStockCost += g.stockValueCost
      totalDebt += g.debt
      totalExpenses += g.expenses
      totalItems += g.itemCount
      totalOutOfStock += g.outOfStockCount
    })

    return {
      revenue: breakdown.totalCa,
      paidCash: breakdown.totalCash,
      debt: totalDebt,
      expenses: totalExpenses,
      stockValueSale: totalStockSale,
      stockValueCost: totalStockCost,
      itemCount: totalItems,
      outOfStockCount: totalOutOfStock,
    }
  }, [breakdown, activeGroups])

  return (
    <div className="bg-[#fffdf9] border-2 border-amber-900/15 rounded-3xl p-5 shadow-sm space-y-4 font-sans">
      {/* En-tête avec Sélecteur de Mode (Caisse Unique vs Multi-Caisses) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center font-bold shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-handwritten text-lg font-bold text-amber-950">
              Gestion de Caisse & Trésorerie
            </h3>
            <p className="text-xs text-amber-800 font-medium">
              {cashboxMode === 'unified' 
                ? '🏛️ Mode Caisse Unique (Toutes les écritures regroupées)' 
                : '🥤📦 Mode Multi-Caisses (Fonds de roulement séparés par rayon)'}
            </p>
          </div>
        </div>

        {/* Boutons d'interrupteur Caisse Unique ↔ Multi-Caisses */}
        <div className="flex items-center gap-1 bg-amber-100/70 p-1 rounded-2xl border border-amber-300 self-start md:self-auto text-xs font-bold font-mono">
          <button
            onClick={() => setCashboxMode('unified')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              cashboxMode === 'unified'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-amber-950 hover:bg-amber-200/60'
            }`}
          >
            <span>🏛️</span> Caisse Unique (Commune)
          </button>
          <button
            onClick={() => setCashboxMode('separated')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              cashboxMode === 'separated'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-amber-950 hover:bg-amber-200/60'
            }`}
          >
            <span>🥤📦</span> Multi-Caisses (Par Rayon)
          </button>
        </div>
      </div>

      {/* MODE 1 : CAISSE UNIQUE (COMMUNE) */}
      {cashboxMode === 'unified' ? (
        <div className="space-y-3">
          <div className="bg-amber-900 text-amber-50 rounded-2xl p-4 space-y-3.5 shadow-sm border border-amber-950">
            <div className="flex items-center justify-between border-b border-amber-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-300" />
                <div>
                  <h4 className="font-bold text-base text-amber-100">Caisse Commune Centrale</h4>
                  <span className="text-[10px] text-amber-300 font-mono">
                    Ensemble des recettes, dépenses et stocks de la boutique ({unifiedTotals.itemCount} références)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAdjustModal({
                    name: 'Commune Centrale',
                    key: 'commune',
                    icon: '🏛️',
                    revenue: unifiedTotals.revenue,
                    paidCash: unifiedTotals.paidCash,
                    debt: unifiedTotals.debt,
                    expenses: unifiedTotals.expenses,
                    stockValueCost: unifiedTotals.stockValueCost,
                    stockValueSale: unifiedTotals.stockValueSale,
                    itemCount: unifiedTotals.itemCount,
                    outOfStockCount: unifiedTotals.outOfStockCount
                  })}
                  className="px-2.5 py-1 bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition-all shadow-xs flex items-center gap-1 font-mono uppercase border border-amber-500"
                >
                  <span>✏️ Ajuster</span>
                </button>

                {unifiedTotals.outOfStockCount > 0 && (
                  <span className="px-2.5 py-1 bg-red-900/80 text-red-100 border border-red-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    {unifiedTotals.outOfStockCount} en rupture
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
              <div className="p-3 bg-amber-950/70 border border-amber-800/70 rounded-xl space-y-1">
                <span className="text-[9.5px] uppercase font-bold text-amber-300 block">Chiffre d'Affaires</span>
                <span className="text-base font-bold text-amber-100 block">{formatPrice(unifiedTotals.revenue)}</span>
                <span className="text-[9px] text-emerald-400">Cash encaissé : {formatPrice(unifiedTotals.paidCash)}</span>
              </div>

              <div className="p-3 bg-amber-950/70 border border-amber-800/70 rounded-xl space-y-1">
                <span className="text-[9.5px] uppercase font-bold text-amber-300 block">Capital Stock Total</span>
                <span className="text-base font-bold text-amber-100 block">{formatPrice(unifiedTotals.stockValueSale)}</span>
                <span className="text-[9px] text-amber-300/80">Coût d'achat : {formatPrice(unifiedTotals.stockValueCost)}</span>
              </div>

              <div className="p-3 bg-amber-950/70 border border-amber-800/70 rounded-xl space-y-1">
                <span className="text-[9.5px] uppercase font-bold text-amber-300 block">Crédits Clients</span>
                <span className="text-base font-bold text-amber-200 block">{formatPrice(unifiedTotals.debt)}</span>
                <span className="text-[9px] text-amber-300/80">Reste à recouvrer</span>
              </div>

              <div className="p-3 bg-amber-950/70 border border-amber-800/70 rounded-xl space-y-1">
                <span className="text-[9.5px] uppercase font-bold text-amber-300 block">Dépenses Cash</span>
                <span className="text-base font-bold text-rose-300 block">-{formatPrice(unifiedTotals.expenses)}</span>
                <span className="text-[9px] text-rose-300/80">Sorties de caisse</span>
              </div>
            </div>

            {/* Accordéon de détail optionnel */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => setShowDetailInUnified(!showDetailInUnified)}
                className="text-xs font-bold text-amber-200 hover:text-white flex items-center gap-1 font-mono transition-all"
              >
                <span>{showDetailInUnified ? 'Masquer la répartition par rayon' : 'Afficher la répartition par rayon (Boissons / Divers)'}</span>
                {showDetailInUnified ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Ventilation optionnelle dans la Caisse Unique */}
          {showDetailInUnified && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {activeGroups.map(group => (
                <div key={group.key} className="bg-white border border-amber-200 rounded-xl p-3 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-950 border-b border-amber-100 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>{group.icon}</span> {group.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openAdjustModal(group)}
                        className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[9px] font-bold rounded-lg transition-all"
                      >
                        ✏️ Ajuster
                      </button>
                      <span>{formatPrice(group.revenue)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-600">
                    <span>Cash : +{formatPrice(group.paidCash)}</span>
                    <span>Stock : {formatPrice(group.stockValueSale)} ({group.itemCount} art.)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* MODE 2 : MULTI-CAISSES (PAR RAYON SEPARÉS) */
        <div className="space-y-4">
          {onSelectCashboxFilter && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs font-bold font-mono">
              <button
                onClick={() => onSelectCashboxFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeCashboxFilter === 'ALL'
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'bg-amber-100/60 text-amber-900 hover:bg-amber-200/50'
                }`}
              >
                Toutes les caisses
              </button>
              <button
                onClick={() => onSelectCashboxFilter('boissons')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                  activeCashboxFilter === 'boissons'
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'bg-amber-100/60 text-amber-900 hover:bg-amber-200/50'
                }`}
              >
                <span>🥤</span> Boissons
              </button>
              <button
                onClick={() => onSelectCashboxFilter('divers')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                  activeCashboxFilter === 'divers'
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'bg-amber-100/60 text-amber-900 hover:bg-amber-200/50'
                }`}
              >
                <span>📦</span> Divers
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGroups.map(group => {
              const isBoisson = group.key === 'boissons'
              const isDivers = group.key === 'divers'
              const isResto = group.key === 'resto'

              const themeClass = isBoisson
                ? 'bg-blue-50/50 border-blue-200 text-blue-950'
                : isDivers
                ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                : isResto
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                : 'bg-purple-50/50 border-purple-200 text-purple-950'

              return (
                <div key={group.key} className={`border rounded-2xl p-4 space-y-3.5 shadow-xs ${themeClass}`}>
                  {/* Entête Caisse avec bouton Ajuster */}
                  <div className="flex items-center justify-between border-b border-black/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{group.icon}</span>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{group.name}</h4>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {group.itemCount} référence(s) en stock
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openAdjustModal(group)}
                        className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white border border-amber-900 text-[10px] font-bold rounded-lg transition-all shadow-xs flex items-center gap-1 font-mono uppercase"
                        title={`Ajuster ce tiroir cash (${group.name})`}
                      >
                        <span>✏️ Ajuster</span>
                      </button>

                      {group.outOfStockCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          {group.outOfStockCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chiffres Clés de la Caisse */}
                  <div className="grid grid-cols-2 gap-2.5 font-mono">
                    <div className="p-3 bg-white border border-gray-200/80 rounded-xl space-y-1">
                      <span className="text-[9.5px] uppercase font-bold text-gray-500 block">
                        Ventes (Chiffre d'Affaires)
                      </span>
                      <span className="text-base font-bold text-gray-900 block">
                        {formatPrice(group.revenue)}
                      </span>
                      <span className="text-[9px] text-emerald-700 font-bold block">
                        Cash actuel : {formatPrice(group.paidCash)}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-gray-200/80 rounded-xl space-y-1">
                      <span className="text-[9.5px] uppercase font-bold text-gray-500 block">
                        Capital Stock (Immobilisé)
                      </span>
                      <span className="text-base font-bold text-gray-900 block">
                        {formatPrice(group.stockValueSale)}
                      </span>
                      <span className="text-[9px] text-gray-500">
                        Prix de revient : {formatPrice(group.stockValueCost)}
                      </span>
                    </div>
                  </div>

                  {/* Détails Crédits & Dépenses du rayon */}
                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    <div className="flex items-center gap-1.5 text-amber-900">
                      <span>🟡 Crédits en cours :</span>
                      <strong className="font-bold">{formatPrice(group.debt)}</strong>
                    </div>

                    {group.expenses > 0 && (
                      <div className="text-red-700">
                        🔴 Dépenses rayon : <strong>-{formatPrice(group.expenses)}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modal d'Ajustement Physique de Caisse ── */}
      {adjustingGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#fffdf8] border-2 border-amber-400 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 font-sans animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{adjustingGroup.icon}</span>
                <div>
                  <h4 className="font-bold text-base text-amber-950 font-handwritten text-lg">
                    Ajuster : {adjustingGroup.name}
                  </h4>
                  <span className="text-[10px] text-amber-800 font-mono">
                    Ajustement du tiroir cash et du fond de roulement
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAdjustingGroup(null)}
                className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs hover:bg-amber-200"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-100/60 border border-amber-300 rounded-2xl p-3 text-xs font-mono space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>Cash Théorique Calculé :</span>
                <strong className="text-amber-950 font-bold">{formatPrice(adjustingGroup.paidCash)}</strong>
              </div>
            </div>

            {/* Mode d'Ajustement */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider block font-mono">
                Type d'opération :
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustMode('real')
                    setActualCashInput(adjustingGroup.paidCash.toString())
                  }}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    adjustMode === 'real' ? 'bg-amber-900 text-white border-amber-950 shadow-xs' : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  🔢 Comptage Réel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustMode('add')
                    setActualCashInput('')
                  }}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    adjustMode === 'add' ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs' : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  📥 Apport (+)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustMode('sub')
                    setActualCashInput('')
                  }}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    adjustMode === 'sub' ? 'bg-rose-700 text-white border-rose-800 shadow-xs' : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  📤 Retrait (-)
                </button>
              </div>
            </div>

            {/* Saisie Montant */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider block font-mono">
                {adjustMode === 'real' ? 'Montant Physique en Caisse (FCFA) :' : adjustMode === 'add' ? 'Montant de l\'Apport (FCFA) :' : 'Montant du Retrait (FCFA) :'}
              </label>
              <input
                type="number"
                min="0"
                value={actualCashInput}
                onChange={e => setActualCashInput(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-base font-mono font-bold text-amber-950 outline-none focus:border-amber-600"
                autoFocus
              />
              {adjustMode === 'real' && (
                <div className="text-[10px] font-mono pt-1">
                  {(() => {
                    const target = parseInt(actualCashInput) || 0
                    const diff = target - adjustingGroup.paidCash
                    if (diff === 0) return <span className="text-emerald-700 font-bold">✅ Compte exact, aucun écart.</span>
                    if (diff > 0) return <span className="text-emerald-700 font-bold">📈 Excédent détecté : +{formatPrice(diff)}</span>
                    return <span className="text-rose-700 font-bold">⚠️ Manquant détecté : {formatPrice(diff)}</span>
                  })()}
                </div>
              )}
            </div>

            {/* Note / Motif */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-600 tracking-wider block font-mono">
                Motif / Remarque (Optionnel) :
              </label>
              <input
                type="text"
                value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)}
                placeholder="Ex: Fond de caisse matin, appoint monnaie..."
                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold outline-none focus:border-amber-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustingGroup(null)}
                className="flex-1 py-2 px-3 border border-gray-300 rounded-xl text-xs font-bold uppercase text-gray-700 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={savingAdjust || !actualCashInput}
                onClick={handleSaveAdjustment}
                className="flex-1 py-2 px-3 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold uppercase shadow-sm disabled:opacity-40"
              >
                {savingAdjust ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
