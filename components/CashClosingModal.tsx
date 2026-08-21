'use client'

import React, { useState } from 'react'
import { CheckCircle2, AlertTriangle, X, Share2, Calculator, Coins } from 'lucide-react'

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
}

interface CashClosingModalProps {
  isOpen: boolean
  onClose: () => void
  sales: SaleItem[]
  shopName?: string
}

export function CashClosingModal({
  isOpen,
  onClose,
  sales,
  shopName = 'Cahier Numérique',
}: CashClosingModalProps) {
  const [actualCashInput, setActualCashInput] = useState<string>('')
  const [showBilletage, setShowBilletage] = useState<boolean>(false)
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

  if (!isOpen) return null

  const todayStr = new Date().toLocaleDateString('fr-FR')
  const activeSales = sales.filter(s => s.status !== 'crossed_out')

  // Recettes Espèces (Ventes Cash + Encaisses Dettes)
  const cashReceipts = activeSales
    .filter(s => s.type === 'cash_in' || s.type === 'payment_client')
    .reduce((sum, s) => sum + (s.paid || 0), 0)

  // Ventes à Crédit accordées aux clients (Reste à payer)
  const creditSales = activeSales
    .filter(s => s.type === 'sale_credit' || (s.debt > 0 && s.type !== 'purchase_credit'))
    .reduce((sum, s) => sum + (s.debt || 0), 0)

  // Dépenses & Achats Cash
  const totalExpenses = activeSales
    .filter(s => s.type === 'cash_out' || s.type === 'purchase_cash' || s.type === 'payment_supplier')
    .reduce((sum, s) => sum + (s.paid || 0), 0)

  // Fond de caisse théorique net en tiroir
  const theoreticalCash = Math.max(0, cashReceipts - totalExpenses)

  // Parsing robuste des montants (suppression des espaces)
  const actualCash = actualCashInput !== ''
    ? (parseFloat(actualCashInput.replace(/\s/g, '')) || 0)
    : theoreticalCash

  const difference = actualCash - theoreticalCash

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' F'
  }

  // Calcul du billetage
  const totalBilletage = Object.entries(bills).reduce((sum, [denom, count]) => {
    return sum + Number(denom) * (count || 0)
  }, 0)

  const handleApplyBilletage = () => {
    setActualCashInput(String(totalBilletage))
    setShowBilletage(false)
  }

  const generateWhatsAppReportUrl = () => {
    let msg = `📊 *RAPPORT DE CLÔTURE DE CAISSE (Z)*\n`
    msg += `🏪 *Commerce* : ${shopName}\n`
    msg += `📅 *Date*     : ${todayStr}\n`
    msg += `═════════════════════════\n`
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
    
    msg += `═════════════════════════\n`
    msg += `✨ _Généré via Cahier Numérique PWA_`

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-[#fbf9f4] border border-amber-300 rounded-[28px] max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-200 bg-amber-100 flex items-center justify-between text-amber-950 flex-shrink-0">
          <div className="font-bold text-sm flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-700" />
            <span>Clôture de Caisse Journalière (Z)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-amber-200/60 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs font-mono overflow-y-auto">
          
          {/* Synthèse des flux du jour */}
          <div className="bg-white p-3.5 border border-amber-200 rounded-2xl space-y-2">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Flux financiers du {todayStr}</div>
            
            <div className="flex justify-between items-center py-1 border-b border-gray-100 text-emerald-800 font-bold">
              <span>💵 Recettes Espèces (Encaissements)</span>
              <span>+{formatPrice(cashReceipts)}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-gray-100 text-rose-700 font-bold">
              <span>💸 Dépenses & Achats Cash</span>
              <span>-{formatPrice(totalExpenses)}</span>
            </div>

            <div className="flex justify-between items-center py-1 text-amber-800">
              <span>📝 Ventes Crédit Client (Non encaissées)</span>
              <span>{formatPrice(creditSales)}</span>
            </div>
          </div>

          {/* Solde Théorique */}
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex justify-between items-center text-amber-950">
            <div>
              <div className="text-[10px] font-bold uppercase text-amber-800">Espèces Théoriques en Tiroir</div>
              <div className="text-lg font-black">{formatPrice(theoreticalCash)}</div>
            </div>
            <div className="text-right text-[10px] text-amber-700">
              Recettes - Dépenses
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
                className="text-[11px] font-bold text-amber-900 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5" />
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
                <div className="text-[10px] font-extrabold text-amber-950 uppercase">
                  💵 Assistant Comptage par Billet / Pièce :
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[10000, 5000, 2000, 1000, 500, 200, 100, 50].map((denom) => (
                    <div key={denom} className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-amber-200">
                      <span className="text-[11px] font-bold text-gray-700">{denom.toLocaleString('fr-FR')} F</span>
                      <input
                        type="number"
                        min="0"
                        value={bills[denom] || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10) || 0
                          setBills(prev => ({ ...prev, [denom]: val }))
                        }}
                        placeholder="0"
                        className="w-14 text-right px-1.5 py-0.5 bg-amber-50/50 border border-amber-300 rounded font-black text-xs"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
                  <span className="font-bold text-amber-950">Total compté : {formatPrice(totalBilletage)}</span>
                  <button
                    type="button"
                    onClick={handleApplyBilletage}
                    className="px-3 py-1 bg-amber-900 text-white rounded-lg font-bold text-[11px] hover:bg-amber-950 cursor-pointer"
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
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <div>
                <div className="text-[10px] uppercase">
                  {difference === 0 ? 'Caisse Parfaite' : difference > 0 ? 'Excédent de Caisse' : 'Manquant de Caisse'}
                </div>
                <div className="text-sm font-black">
                  {difference === 0 ? 'Écart : 0 F' : `${difference > 0 ? '+' : ''}${formatPrice(difference)}`}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-full font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Fermer
            </button>
            <a
              href={generateWhatsAppReportUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-center transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Envoyer WhatsApp</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}
