'use client'

import React, { useState } from 'react'
import { X, Sliders, Check, RotateCcw } from 'lucide-react'
import { DASHBOARD_WIDGET_IDS, getDefaultDashboardWidgets } from '@/lib/roleUtils'

interface DashboardCustomizerModalProps {
  isOpen: boolean
  onClose: () => void
  shopId: string
  userRole?: string
  shopActivity?: string
  activeWidgets: string[]
  onSaveWidgets: (widgets: string[]) => void
}

const ALL_WIDGETS = [
  {
    id: DASHBOARD_WIDGET_IDS.REVENUE_SUMMARY,
    label: 'Synthèse des Chiffres d\'Affaires',
    description: 'Affiche le Total Ventes, Encaissé, Créances et Dépenses sur la période.',
    ownerOnly: false,
  },
  {
    id: DASHBOARD_WIDGET_IDS.NET_MARGINS,
    label: 'Marges & Bénéfices Nets',
    description: 'Calcul automatique des marges financières (Prix vente - Coût grossiste).',
    ownerOnly: true,
  },
  {
    id: DASHBOARD_WIDGET_IDS.TOP_PRODUCTS,
    label: 'Top Produits & Plats Vendus',
    description: 'Classement des articles les plus populaires et rentables.',
    ownerOnly: false,
  },
  {
    id: DASHBOARD_WIDGET_IDS.DEBT_SUMMARY,
    label: 'Suivi des Créances & Dettes',
    description: 'Abonnés, crédits clients en attente et dettes auprès des grossistes.',
    ownerOnly: true,
  },
  {
    id: DASHBOARD_WIDGET_IDS.SYSCOHADA_SUMMARY,
    label: 'Export & Bilan Comptable SYSCOHADA',
    description: 'Module de pré-comptabilité révisée aux normes ouest-africaines.',
    ownerOnly: true,
  },
  {
    id: DASHBOARD_WIDGET_IDS.ACTIVITY_WIDGET,
    label: 'Analyse Métier Spécifique',
    description: 'Widget adapté au secteur (Commerce, Resto/Maquis, Services, Budget).',
    ownerOnly: false,
  },
  {
    id: DASHBOARD_WIDGET_IDS.DAILY_CAISSE,
    label: 'État de la Caisse Journalière',
    description: 'Solde du tiroir-caisse, entrées/sorties en espèces du jour.',
    ownerOnly: false,
  },
]

export function DashboardCustomizerModal({
  isOpen,
  onClose,
  shopId: _shopId,
  userRole = 'owner',
  shopActivity = 'boutique',
  activeWidgets,
  onSaveWidgets,
}: DashboardCustomizerModalProps) {
  const [selected, setSelected] = useState<string[]>(activeWidgets)

  if (!isOpen) return null

  const isOwner = userRole !== 'employee'
  const visibleOptions = ALL_WIDGETS.filter(w => !w.ownerOnly || isOwner)

  const toggleWidget = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(wId => wId !== id) : [...prev, id]
    )
  }

  const handleResetDefault = () => {
    const defaults = getDefaultDashboardWidgets(userRole, shopActivity)
    setSelected(defaults)
  }

  const handleSave = () => {
    onSaveWidgets(selected)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-[#faf8f5] border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg leading-tight">Personnaliser le Tableau de Bord</h3>
              <p className="text-xs text-stone-500">Choisissez les indicateurs visibles sur votre écran</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 hover:bg-stone-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Indicateurs disponibles</span>
            <button
              onClick={handleResetDefault}
              className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          </div>

          {visibleOptions.map(widget => {
            const isChecked = selected.includes(widget.id)
            return (
              <div
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isChecked
                    ? 'border-amber-400 bg-amber-50/50 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg mt-0.5 flex items-center justify-center transition-colors ${
                  isChecked ? 'bg-amber-800 text-amber-50' : 'border border-stone-300 bg-white text-transparent'
                }`}>
                  <Check className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900 text-sm">{widget.label}</span>
                    {widget.ownerOnly && (
                      <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        Patron
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{widget.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-stone-600 font-semibold text-sm hover:bg-stone-200/60 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-amber-50 font-bold text-sm shadow-md transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
