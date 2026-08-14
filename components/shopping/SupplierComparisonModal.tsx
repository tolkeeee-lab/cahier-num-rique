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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1e1a18] border border-[#2a2421] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">Comparatif Grossistes</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-400 font-mono">
          Tarifs recensés pour <span className="text-white font-bold">{productName}</span> :
        </p>

        {/* Liste des tarifs fournisseurs */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {suppliers.length > 0 ? (
            suppliers.map((sup, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-[#141210] rounded-xl border border-gray-800/60 hover:border-amber-500/40 transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-white">{sup.supplierName}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{sup.unit}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-extrabold text-amber-400">
                    {formatPrice(sup.price)}
                  </span>
                  {onSelectSupplier && (
                    <button
                      onClick={() => {
                        onSelectSupplier(sup.supplierName, sup.price)
                        onClose()
                      }}
                      className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                      title="Choisir ce fournisseur"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic text-center py-4">
              Aucun fournisseur répertorié pour ce produit.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
