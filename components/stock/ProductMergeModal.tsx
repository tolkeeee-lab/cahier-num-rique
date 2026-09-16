'use client'

import React, { useEffect } from 'react'
import { GitMerge, X, Info } from 'lucide-react'
import { DuplicatePair } from '@/lib/productUtils'

interface ProductMergeModalProps {
  isOpen: boolean
  onClose: () => void
  duplicatePairs: DuplicatePair[]
  activePairIndex: number
  merging: boolean
  onMergeProducts: (sourceId: string, targetId: string) => Promise<void>
}

export function ProductMergeModal({
  isOpen,
  onClose,
  duplicatePairs,
  activePairIndex,
  merging,
  onMergeProducts,
}: ProductMergeModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || duplicatePairs.length === 0 || activePairIndex >= duplicatePairs.length) return null

  const currentPair = duplicatePairs[activePairIndex]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[#fbf9f4] border-2 border-amber-300 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-amber-200 bg-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <GitMerge className="w-5 h-5 text-amber-700" strokeWidth={1.75} />
            <span>Fusionner les doublons ({activePairIndex + 1}/{duplicatePairs.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-amber-800 hover:text-amber-950 rounded-full hover:bg-amber-200/60 transition-colors cursor-pointer active:scale-[0.97]"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-gray-700">
          <p className="text-gray-600">
            Ces deux articles semblent identiques. Choisissez le nom canonique à conserver :
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Choix 1 */}
            <button
              onClick={() => onMergeProducts(
                currentPair.item2.id,
                currentPair.item1.id
              )}
              disabled={merging}
              className="p-3.5 bg-white border border-amber-200 hover:border-amber-500 hover:bg-amber-50/50 rounded-2xl text-left transition-all group flex flex-col justify-between cursor-pointer active:scale-[0.97]"
            >
              <div>
                <div className="font-bold text-sm text-gray-900 group-hover:text-amber-900">
                  « {currentPair.item1.name} »
                </div>
                <span className="text-[10px] text-gray-400 block mt-1">Conserver ce nom</span>
              </div>
              <div className="mt-3 px-2 py-1 bg-amber-600 text-white text-[9px] font-bold uppercase rounded-lg text-center shadow-xs">
                Garder celui-ci
              </div>
            </button>

            {/* Choix 2 */}
            <button
              onClick={() => onMergeProducts(
                currentPair.item1.id,
                currentPair.item2.id
              )}
              disabled={merging}
              className="p-3.5 bg-white border border-amber-200 hover:border-amber-500 hover:bg-amber-50/50 rounded-2xl text-left transition-all group flex flex-col justify-between cursor-pointer active:scale-[0.97]"
            >
              <div>
                <div className="font-bold text-sm text-gray-900 group-hover:text-amber-900">
                  « {currentPair.item2.name} »
                </div>
                <span className="text-[10px] text-gray-400 block mt-1">Conserver ce nom</span>
              </div>
              <div className="mt-3 px-2 py-1 bg-amber-600 text-white text-[9px] font-bold uppercase rounded-lg text-center shadow-xs">
                Garder celui-ci
              </div>
            </button>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-[10px] text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
            <span><strong>Remarque :</strong> La fusion transférera automatiquement l'historique complet des ventes et mouvements sous le nom sélectionné et supprimera l'autre version.</span>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-amber-200 bg-amber-100/50 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-amber-900 hover:text-black font-semibold rounded-lg hover:bg-amber-200/40 cursor-pointer active:scale-[0.97] transition-all"
          >
            Passer
          </button>
          {merging && <span className="text-xs font-mono text-amber-700 animate-pulse">Fusion en cours...</span>}
        </div>
      </div>
    </div>
  )
}
