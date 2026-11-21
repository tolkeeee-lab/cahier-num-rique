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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-5xl max-h-[90vh] bg-[#f5efe0] border border-[#e2d6be] rounded-2xl p-6 shadow-xl flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-[#e2d6be] pb-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-emerald-700" strokeWidth={1.5} />
            <div>
              <h3 className="text-base font-semibold text-stone-900">Inspection : {shopName}</h3>
              <p className="text-xs text-stone-500 font-mono">ID : {shopId}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#faf5e8] p-1 rounded-xl border border-[#e2d6be]">
              <button
                onClick={() => onTabChange('journal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer active:scale-[0.97] ${
                  activeTab === 'journal' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Journal ventes
              </button>
              <button
                onClick={() => onTabChange('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer active:scale-[0.97] ${
                  activeTab === 'analytics' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Statistiques
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg transition-colors cursor-pointer active:scale-[0.97]"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto pr-1 space-y-4">
          {loading ? (
            <p className="text-xs text-stone-500 text-center py-12">Chargement du cahier de la boutique...</p>
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
