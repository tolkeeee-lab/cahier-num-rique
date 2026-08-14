'use client'

import React, { useState } from 'react'
import { AlertTriangle, Trash2, X, ShieldAlert, CheckSquare, Square } from 'lucide-react'
import { purgeShopData, PurgeOptions } from '@/lib/dataPurgeUtils'

interface SelectiveDataPurgeModalProps {
  isOpen: boolean
  onClose: () => void
  shopId: string
  onPurgeComplete?: () => void
}

export function SelectiveDataPurgeModal({
  isOpen,
  onClose,
  shopId,
  onPurgeComplete,
}: SelectiveDataPurgeModalProps) {
  const [options, setOptions] = useState<PurgeOptions>({
    deleteSales: true,
    deleteDebts: true,
    deleteProducts: false, // Par défaut on propose de garder le catalogue
    deleteShopping: true,
    deleteRequests: true,
    deleteTactileMenu: false,
  })

  const [confirmStep, setConfirmStep] = useState(false)
  const [confirmWord, setConfirmWord] = useState('')
  const [isPurging, setIsPurging] = useState(false)
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const toggleOption = (key: keyof PurgeOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const selectAll = (val: boolean) => {
    setOptions({
      deleteSales: val,
      deleteDebts: val,
      deleteProducts: val,
      deleteShopping: val,
      deleteRequests: val,
      deleteTactileMenu: val,
    })
  }

  const handleApplyPurge = async () => {
    setIsPurging(true)
    const result = await purgeShopData(shopId, options)
    setIsPurging(false)

    if (result.success) {
      setPurgeMessage('✓ Données supprimées avec succès !')
      setTimeout(() => {
        if (onPurgeComplete) onPurgeComplete()
        window.location.reload()
      }, 1000)
    } else {
      setPurgeMessage(result.message)
    }
  }

  const selectedCount = Object.values(options).filter(Boolean).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#fffdf5] border-2 border-rose-400 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto font-sans">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-rose-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center shadow-2xs flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 font-handwritten tracking-wide">
                Suppression Sélective des Données
              </h3>
              <p className="text-xs text-gray-500 font-mono">
                Choisissez ce que vous souhaitez effacer ou conserver.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Étape 1 : Sélection des modules à effacer */}
        {!confirmStep && (
          <div className="space-y-4 font-mono text-xs">
            {/* Raccourcis de sélection */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80">
              <span className="font-bold text-amber-950">Options rapides :</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectAll(true)}
                  className="text-rose-700 hover:underline font-extrabold cursor-pointer"
                >
                  Tout cocher
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setOptions({
                      deleteSales: true,
                      deleteDebts: false,
                      deleteProducts: false,
                      deleteShopping: true,
                      deleteRequests: true,
                      deleteTactileMenu: false,
                    })
                  }}
                  className="text-amber-800 hover:underline font-extrabold cursor-pointer"
                >
                  Garder Stock & Dettes
                </button>
              </div>
            </div>

            {/* Liste des cases à cocher */}
            <div className="space-y-2">
              {/* Ventes */}
              <label
                onClick={() => toggleOption('deleteSales')}
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                  options.deleteSales
                    ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs'
                    : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="pt-0.5">
                  {options.deleteSales ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-xs">📖 Ventes & Écritures du Journal</p>
                  <p className="text-[10px] text-gray-500">Toutes les opérations d'entrées, sorties et dépenses saisies au cahier.</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${options.deleteSales ? 'bg-rose-200 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {options.deleteSales ? 'SUPPRIMER' : 'GARDER'}
                </span>
              </label>

              {/* Dettes */}
              <label
                onClick={() => toggleOption('deleteDebts')}
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                  options.deleteDebts
                    ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs'
                    : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="pt-0.5">
                  {options.deleteDebts ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-xs">👥 Dettes & Crédits (Clients & Grossistes)</p>
                  <p className="text-[10px] text-gray-500">Le carnet des crédits accordés et des dettes fournisseurs.</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${options.deleteDebts ? 'bg-rose-200 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {options.deleteDebts ? 'SUPPRIMER' : 'GARDER'}
                </span>
              </label>

              {/* Produits / Stock */}
              <label
                onClick={() => toggleOption('deleteProducts')}
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                  options.deleteProducts
                    ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs'
                    : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="pt-0.5">
                  {options.deleteProducts ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-xs">📦 Catalogue de Stock & Produits</p>
                  <p className="text-[10px] text-gray-500">Liste des articles enregistrés, prix unitaires et seuils d'alerte.</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${options.deleteProducts ? 'bg-rose-200 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {options.deleteProducts ? 'SUPPRIMER' : 'GARDER'}
                </span>
              </label>

              {/* Courses */}
              <label
                onClick={() => toggleOption('deleteShopping')}
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                  options.deleteShopping
                    ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs'
                    : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="pt-0.5">
                  {options.deleteShopping ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-xs">🛒 Liste de Courses & Ravitaillement</p>
                  <p className="text-[10px] text-gray-500">Articles à acheter et paniers d'approvisionnement.</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${options.deleteShopping ? 'bg-rose-200 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {options.deleteShopping ? 'SUPPRIMER' : 'GARDER'}
                </span>
              </label>

              {/* Demandes clients */}
              <label
                onClick={() => toggleOption('deleteRequests')}
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                  options.deleteRequests
                    ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs'
                    : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="pt-0.5">
                  {options.deleteRequests ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-xs">📝 Demandes Clients Réclamées</p>
                  <p className="text-[10px] text-gray-500">Historique des articles demandés par les clients.</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${options.deleteRequests ? 'bg-rose-200 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {options.deleteRequests ? 'SUPPRIMER' : 'GARDER'}
                </span>
              </label>

              {/* Raccourcis Tactiles */}
              <label
                onClick={() => toggleOption('deleteTactileMenu')}
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                  options.deleteTactileMenu
                    ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs'
                    : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="pt-0.5">
                  {options.deleteTactileMenu ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-xs">⚡ Raccourcis Tactiles 1-Tap</p>
                  <p className="text-[10px] text-gray-500">Boutons de vente rapide configurés sur le tiroir.</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${options.deleteTactileMenu ? 'bg-rose-200 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {options.deleteTactileMenu ? 'SUPPRIMER' : 'GARDER'}
                </span>
              </label>
            </div>

            {/* Bouton vers confirmation */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => setConfirmStep(true)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition-all shadow-md disabled:opacity-40 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Continuer ({selectedCount} sélectionné{selectedCount > 1 ? 's' : ''})</span>
              </button>
            </div>
          </div>
        )}

        {/* Étape 2 : Confirmation stricte avant action irréversible */}
        {confirmStep && (
          <div className="space-y-4 font-mono text-xs animate-in fade-in duration-200">
            <div className="p-4 bg-rose-100/90 border border-rose-300 rounded-2xl space-y-2 text-rose-950">
              <div className="flex items-center gap-2 font-black text-sm text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0" />
                <span>Attention : Action Irréversible !</span>
              </div>
              <p className="text-xs">
                Vous êtes sur le point de supprimer définitivement :
              </p>
              <ul className="list-disc pl-5 space-y-1 font-bold">
                {options.deleteSales && <li>Ventes et écritures du journal</li>}
                {options.deleteDebts && <li>Dettes et crédits</li>}
                {options.deleteProducts && <li>Catalogue de produits et stock</li>}
                {options.deleteShopping && <li>Liste de courses</li>}
                {options.deleteRequests && <li>Demandes clients</li>}
                {options.deleteTactileMenu && <li>Raccourcis 1-tap</li>}
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-gray-800 font-bold">
                Pour confirmer, tapez le mot <strong className="text-rose-700">EFFACER</strong> ci-dessous :
              </label>
              <input
                type="text"
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value.toUpperCase())}
                placeholder="EFFACER"
                className="w-full px-3 py-2 bg-white border-2 border-rose-300 rounded-xl text-center font-black text-rose-900 text-sm tracking-widest focus:outline-none focus:border-rose-500 shadow-inner"
              />
            </div>

            {purgeMessage && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-center font-bold">
                {purgeMessage}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setConfirmStep(false)}
                className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Retour
              </button>

              <button
                type="button"
                disabled={confirmWord !== 'EFFACER' || isPurging}
                onClick={handleApplyPurge}
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-xl transition-all shadow-md disabled:opacity-30 flex items-center gap-2 cursor-pointer"
              >
                {isPurging ? (
                  <span>Suppression en cours...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmer la Suppression</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
