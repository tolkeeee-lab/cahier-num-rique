'use client'

import React, { useState, useMemo } from 'react'
import {
  X, Printer, Landmark, FileSpreadsheet,
  BookOpen, Layers, ShieldCheck, Search
} from 'lucide-react'
import {
  generateSyscohadaJournal, calculateSyscohadaSMT
} from '@/lib/syscohadaEngine'
import { exportSyscohadaJournalCSV } from '@/lib/exportUtils'

interface SyscohadaModalProps {
  isOpen: boolean
  onClose: () => void
  sales: any[]
  periodLabel?: string
  shopName?: string
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(price) + ' F'
}

export function SyscohadaModal({
  isOpen,
  onClose,
  sales,
  periodLabel = 'Cette_periode',
  shopName = 'Cahier Numérique'
}: SyscohadaModalProps) {
  const [activeTab, setActiveTab] = useState<'smt' | 'journal' | 'balance'>('smt')
  const [searchQuery, setSearchQuery] = useState('')

  const smtSummary = useMemo(() => calculateSyscohadaSMT(sales), [sales])
  const journalRows = useMemo(() => generateSyscohadaJournal(sales), [sales])

  const filteredJournal = useMemo(() => {
    if (!searchQuery.trim()) return journalRows
    const q = searchQuery.toLowerCase().trim()
    return journalRows.filter(j =>
      j.pieceRef.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      j.debitAccountCode.includes(q) ||
      j.debitAccountLabel.toLowerCase().includes(q) ||
      j.creditAccountCode.includes(q) ||
      j.creditAccountLabel.toLowerCase().includes(q)
    )
  }, [journalRows, searchQuery])

  if (!isOpen) return null

  const handlePrintPDF = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-[#fffdf9] border-2 border-amber-900/20 rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#f4ebd9] border-b border-amber-250 flex items-center justify-between flex-shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center font-bold shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-handwritten text-xl font-bold text-amber-950">
                  États Comptables SYSCOHADA (OHADA SMT)
                </h3>
                <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 text-[10px] font-mono font-bold rounded-full border border-amber-300">
                  Système Minimal de Trésorerie
                </span>
              </div>
              <p className="text-xs text-amber-800 font-medium">
                Nomenclature officielle des 17 pays membres • {shopName} ({periodLabel.replace(/_/g, ' ')})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportSyscohadaJournalCSV(sales, periodLabel, shopName)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              title="Télécharger le Journal en format CSV Excel pour votre comptable"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV SYSCOHADA</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="p-2 text-amber-900 hover:bg-amber-200/60 rounded-xl transition-colors"
              title="Imprimer ou enregistrer en PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre d'Onglets */}
        <div className="flex items-center gap-2 px-6 py-2 bg-[#eae1cd]/60 border-b border-amber-200 flex-shrink-0 text-xs font-bold select-none overflow-x-auto">
          <button
            onClick={() => setActiveTab('smt')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'smt'
                ? 'bg-amber-900 text-white shadow-sm'
                : 'text-amber-900 hover:bg-amber-200/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Compte de Résultat & Trésorerie (SMT)</span>
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'journal'
                ? 'bg-amber-900 text-white shadow-sm'
                : 'text-amber-900 hover:bg-amber-200/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Grand Livre Partie Double ({journalRows.length} écritures)</span>
          </button>

          <button
            onClick={() => setActiveTab('balance')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'balance'
                ? 'bg-amber-900 text-white shadow-sm'
                : 'text-amber-900 hover:bg-amber-200/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>3. Balance des Tiers (411 Clients / 401 Fournisseurs)</span>
          </button>
        </div>

        {/* Corps du Document */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── TAB 1 : COMPTE DE RÉSULTAT ET TABLEAU DE TRÉSORERIE (SMT) ── */}
          {activeTab === 'smt' && (
            <div className="space-y-6 animate-fade-in">
              {/* Cartes Clés SMT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-bold font-mono text-emerald-800 uppercase block">
                    Classe 7 — Ventes Nettes (Compte 7011)
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-950 mt-1">
                    {formatPrice(smtSummary.totalProduits)}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">Recettes d'exploitation</span>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <span className="text-[10px] font-bold font-mono text-amber-800 uppercase block">
                    Compte 6011 — Achats Stock
                  </span>
                  <div className="text-xl font-bold font-mono text-amber-950 mt-1">
                    {formatPrice(smtSummary.achatsMarchandises601)}
                  </div>
                  <span className="text-[10px] text-amber-700 font-medium">Réapprovisionnement</span>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <span className="text-[10px] font-bold font-mono text-blue-800 uppercase block">
                    Marge Brute sur Marchandises
                  </span>
                  <div className={`text-xl font-bold font-mono mt-1 ${smtSummary.margeBrute >= 0 ? 'text-blue-950' : 'text-red-700'}`}>
                    {formatPrice(smtSummary.margeBrute)}
                  </div>
                  <span className="text-[10px] text-blue-700 font-medium">Produits - Achats Stock</span>
                </div>

                <div className={`p-4 border rounded-2xl ${smtSummary.resultatNetSMT >= 0 ? 'bg-emerald-100/70 border-emerald-300' : 'bg-red-50 border-red-200'}`}>
                  <span className="text-[10px] font-bold font-mono uppercase block text-gray-700">
                    Résultat Net SMT (Bénéfice/Perte)
                  </span>
                  <div className={`text-xl font-bold font-mono mt-1 ${smtSummary.resultatNetSMT >= 0 ? 'text-emerald-900' : 'text-red-800'}`}>
                    {smtSummary.resultatNetSMT >= 0 ? '+' : ''}{formatPrice(smtSummary.resultatNetSMT)}
                  </div>
                  <span className="text-[10px] text-gray-600 font-medium">Produits (7) - Charges (6)</span>
                </div>
              </div>

              {/* Tableau Synthétique Compte de Résultat OHADA SMT */}
              <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-[#f6f1e7] border-b border-amber-200 font-bold text-xs text-amber-950 flex items-center justify-between">
                  <span>📊 COMPTE DE RÉSULTAT SIMPLIFIÉ (SYSCOHADA SMT)</span>
                  <span className="font-mono text-[10px] text-amber-800">Montants en FCFA</span>
                </div>

                <div className="divide-y divide-gray-100 text-xs font-sans">
                  <div className="flex items-center justify-between p-3 bg-emerald-50/40">
                    <div>
                      <span className="font-bold text-gray-900 block">7011 — Ventes de marchandises</span>
                      <span className="text-[10px] text-gray-500">Total encaissements et ventes à crédit enregistrées</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-900">+{formatPrice(smtSummary.chiffreAffaires701)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-amber-50/40">
                    <div>
                      <span className="font-bold text-gray-900 block">6011 — Achats de marchandises</span>
                      <span className="text-[10px] text-gray-500">Achats stock payés cash et à crédit chez les grossistes</span>
                    </div>
                    <span className="font-mono font-bold text-amber-900">-{formatPrice(smtSummary.achatsMarchandises601)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 font-bold">
                    <span className="text-gray-800 uppercase text-[11px]">MARGE BRUTE D'EXPLOITATION</span>
                    <span className="font-mono text-gray-900">{formatPrice(smtSummary.margeBrute)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 pl-6">
                    <div>
                      <span className="font-semibold text-gray-800">6221 — Loyer commercial</span>
                    </div>
                    <span className="font-mono text-red-700">-{formatPrice(smtSummary.chargesLoyer622)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 pl-6">
                    <div>
                      <span className="font-semibold text-gray-800">6051 — Électricité, Eau & Télécoms</span>
                    </div>
                    <span className="font-mono text-red-700">-{formatPrice(smtSummary.chargesEnergie605)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 pl-6">
                    <div>
                      <span className="font-semibold text-gray-800">6111 — Transport & Livraisons</span>
                    </div>
                    <span className="font-mono text-red-700">-{formatPrice(smtSummary.chargesTransport611)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 pl-6">
                    <div>
                      <span className="font-semibold text-gray-800">6611 — Salaires & Gratifications personnel</span>
                    </div>
                    <span className="font-mono text-red-700">-{formatPrice(smtSummary.chargesSalaires661)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 pl-6">
                    <div>
                      <span className="font-semibold text-gray-800">6581 — Autres charges diverses de gestion</span>
                    </div>
                    <span className="font-mono text-red-700">-{formatPrice(smtSummary.autresCharges658)}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-amber-100/70 border-t-2 border-amber-300 font-bold text-sm">
                    <span className="text-amber-950 uppercase tracking-wide">RÉSULTAT COMPTABLE NET (SMT)</span>
                    <span className={`font-mono ${smtSummary.resultatNetSMT >= 0 ? 'text-emerald-900' : 'text-red-800'}`}>
                      {smtSummary.resultatNetSMT >= 0 ? '+' : ''}{formatPrice(smtSummary.resultatNetSMT)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Solde de Trésorerie & Bilan Synthétique */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3.5 bg-white border border-gray-200 rounded-2xl space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">5711 — Solde Caisse Espèces</span>
                  <span className="font-bold text-gray-900 text-sm block">{formatPrice(smtSummary.soldeCaisse571)}</span>
                  <span className="text-[9px] text-gray-400">Trésorerie liquide disponible</span>
                </div>

                <div className="p-3.5 bg-white border border-amber-200 rounded-2xl space-y-1">
                  <span className="text-[10px] text-amber-800 uppercase font-bold block">4111 — Créances Clients à Recouvrer</span>
                  <span className="font-bold text-amber-900 text-sm block">{formatPrice(smtSummary.creancesClients411)}</span>
                  <span className="text-[9px] text-amber-700">Crédits clients en cours</span>
                </div>

                <div className="p-3.5 bg-white border border-purple-200 rounded-2xl space-y-1">
                  <span className="text-[10px] text-purple-800 uppercase font-bold block">4011 — Dettes Grossistes à Payer</span>
                  <span className="font-bold text-purple-900 text-sm block">{formatPrice(smtSummary.dettesFournisseurs401)}</span>
                  <span className="text-[9px] text-purple-700">Achats fournisseurs à régler</span>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2 : GRAND LIVRE & JOURNAL PARTIE DOUBLE ── */}
          {activeTab === 'journal' && (
            <div className="space-y-4 animate-fade-in">
              {/* Barre de Recherche */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filtrer par n° de compte (ex: 5711, 7011, 6011), libellé ou réf pièce..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-amber-250 rounded-xl text-xs outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <span className="text-xs font-mono font-bold text-gray-500 whitespace-nowrap">
                  {filteredJournal.length} / {journalRows.length} lignes
                </span>
              </div>

              {/* Table Journal Partie Double */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f5f1e8] text-amber-950 font-bold border-b border-amber-200 font-mono text-[10.5px]">
                        <th className="py-2.5 px-3">Pièce</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Libellé de l'Écriture</th>
                        <th className="py-2.5 px-3">Débit (Compte)</th>
                        <th className="py-2.5 px-3">Crédit (Compte)</th>
                        <th className="py-2.5 px-3 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-sans">
                      {filteredJournal.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-400 text-xs italic">
                            Aucune écriture comptable trouvée pour cette recherche.
                          </td>
                        </tr>
                      ) : (
                        filteredJournal.map((row) => (
                          <tr key={row.id} className="hover:bg-amber-50/50 transition-colors">
                            <td className="py-2 px-3 font-mono font-bold text-gray-600 text-[10px] whitespace-nowrap">
                              {row.pieceRef}
                            </td>
                            <td className="py-2 px-3 font-mono text-gray-500 text-[10px] whitespace-nowrap">
                              {row.date} {row.time}
                            </td>
                            <td className="py-2 px-3 font-semibold text-gray-800">
                              {row.description}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-950 font-mono font-bold text-[10px] rounded border border-emerald-300 mr-1.5">
                                {row.debitAccountCode}
                              </span>
                              <span className="text-[10.5px] text-gray-700">{row.debitAccountLabel}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-950 font-mono font-bold text-[10px] rounded border border-blue-300 mr-1.5">
                                {row.creditAccountCode}
                              </span>
                              <span className="text-[10.5px] text-gray-700">{row.creditAccountLabel}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                              {formatPrice(row.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3 : BALANCE DES TIERS (411 vs 401) ── */}
          {activeTab === 'balance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 4111 — Compte Clients */}
                <div className="bg-white border border-amber-250 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <div>
                      <span className="font-bold font-mono text-amber-900 text-sm block">Compte 4111 — Clients (Crédits Accordés)</span>
                      <span className="text-[10px] text-gray-500">Créances à recouvrer auprès des clients</span>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-950 font-mono font-bold text-xs rounded-xl border border-amber-300">
                      {formatPrice(smtSummary.creancesClients411)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Toutes les ventes réalisées avec le **Stylo Jaune** sont imputées au débit du compte `4111 Clients` et au crédit du compte `7011 Ventes`. Le règlement ultérieur crédite le compte `4111` par le débit du compte `5711 Caisse`.
                  </p>
                </div>

                {/* 4011 — Compte Fournisseurs */}
                <div className="bg-white border border-purple-250 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                    <div>
                      <span className="font-bold font-mono text-purple-900 text-sm block">Compte 4011 — Fournisseurs (Dettes Grossistes)</span>
                      <span className="text-[10px] text-gray-500">Dettes sur réapprovisionnement à crédit</span>
                    </div>
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-950 font-mono font-bold text-xs rounded-xl border border-purple-300">
                      {formatPrice(smtSummary.dettesFournisseurs401)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Les achats de stock effectués avec le **Stylo Violet** sont imputés au débit du compte `6011 Achats` et au crédit du compte `4011 Fournisseurs`. Le paiement ultérieur au fournisseur débite le compte `4011` par le crédit du compte `5711 Caisse`.
                  </p>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#f4ebd9] border-t border-amber-250 flex items-center justify-between text-xs text-amber-900 flex-shrink-0 select-none">
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Conforme aux normes du Conseil Comptable OHADA (SYSCOHADA révisé 2017)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  )
}
