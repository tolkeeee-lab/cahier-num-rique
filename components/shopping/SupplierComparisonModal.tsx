'use client'

import React from 'react'
import { X, Store, CheckCircle } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface SupplierOption {
  supplierName: string
  price: number
  unit: string
  lastUpdated?: string
}

interface SupplierComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  productName: string
  suppliers: SupplierOption[]
  onSelectSupplier?: (supplierName: string, price: number) => void
}

export const SupplierComparisonModal: React.FC<SupplierComparisonModalProps> = ({
  isOpen,
  onClose,
  productName,
  suppliers,
  onSelectSupplier,
}) => {
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md bg-[#faf5e8] border border-[#e2d6be] rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-700" strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-stone-900">Comparatif grossistes</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer active:scale-[0.97]"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <p className="text-xs text-stone-600">
          Tarifs recensés pour <span className="text-stone-900 font-semibold">{productName}</span> :
        </p>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {suppliers.length > 0 ? (
            suppliers.map((sup, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 hover:border-emerald-700/40 transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-stone-900">{sup.supplierName}</p>
                  <p className="text-[11px] text-stone-500 font-mono">{sup.unit}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold text-emerald-800 tabular-nums">
                    {formatPrice(sup.price)}
                  </span>
                  {onSelectSupplier && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSupplier(sup.supplierName, sup.price)
                        onClose()
                      }}
                      className="p-1 text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer active:scale-[0.97]"
                      title="Choisir ce fournisseur"
                    >
                      <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-stone-500 text-center py-4">
              Aucun fournisseur répertorié pour ce produit.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-stone-200 text-stone-700 text-xs font-medium rounded-xl hover:bg-stone-50 active:scale-[0.97] transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
