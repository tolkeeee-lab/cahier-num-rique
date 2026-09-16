'use client'

import React, { useEffect } from 'react'
import { X, BookOpen } from 'lucide-react'
import { SalesHistory } from '@/components/SalesHistory'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'

interface AdminSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  shopId: string
  shopName: string
  sales: any[]
  activeTab: 'journal' | 'analytics'
  onTabChange: (tab: 'journal' | 'analytics') => void
  loading?: boolean
}

export const AdminSubscriptionModal: React.FC<AdminSubscriptionModalProps> = ({
  isOpen,
  onClose,
  shopId,
  shopName,
  sales,
  activeTab,
  onTabChange,
  loading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-5xl max-h-[90vh] bg-[#1e1a18] border border-[#2a2421] rounded-2xl p-6 shadow-2xl flex flex-col space-y-4">
        
        {/* Entête */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-amber-400" strokeWidth={1.75} />
            <div>
              <h3 className="text-base font-extrabold text-white">Inspection Admin : {shopName}</h3>
              <p className="text-xs text-gray-400 font-mono">Shop ID : {shopId}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Onglets de la modale */}
            <div className="flex items-center gap-1 bg-[#141210] p-1 rounded-xl border border-gray-800">
              <button
                onClick={() => onTabChange('journal')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer active:scale-[0.97] ${
                  activeTab === 'journal' ? 'bg-[#2a2421] text-amber-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Journal Ventes
              </button>
              <button
                onClick={() => onTabChange('analytics')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer active:scale-[0.97] ${
                  activeTab === 'analytics' ? 'bg-[#2a2421] text-amber-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Statistiques
              </button>
            </div>

            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer active:scale-[0.97]">
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-grow overflow-y-auto pr-1 space-y-4">
          {loading ? (
            <p className="text-xs text-gray-400 italic text-center py-12">Chargement du cahier de la boutique...</p>
          ) : activeTab === 'journal' ? (
            <SalesHistory sales={sales} shopId={shopId} isEmployee={true} />
          ) : (
            <AnalyticsDashboard sales={sales} shopId={shopId} />
          )}
        </div>
      </div>
    </div>
  )
}
