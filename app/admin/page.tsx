'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Store, Lock, LogOut, RefreshCw } from 'lucide-react'
import { AdminStatsCards } from '@/components/admin/AdminStatsCards'
import { AdminShopsTable } from '@/components/admin/AdminShopsTable'
import { AdminSubscriptionModal } from '@/components/admin/AdminSubscriptionModal'

interface AdminKPIs {
  totalBoutiques: number
  totalUsers: number
  globalTransactions: number
  globalVolumeSales: number
}

interface AdminShop {
  shop_id: string
  name: string
  owner_email: string
  transactions_count: number
  total_sales: number
  cash_balance: number
  employees_count: number
  created_at: string
}

export default function SuperAdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [kpis, setKpis] = useState<AdminKPIs | null>(null)
  const [shops, setShops] = useState<AdminShop[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Modale d'inspection
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)
  const [selectedShopName, setSelectedShopName] = useState('')
  const [journalSales, setJournalSales] = useState<any[]>([])
  const [shopModalTab, setShopModalTab] = useState<'journal' | 'analytics'>('journal')
  const [loadingJournal, setLoadingJournal] = useState(false)

  const loadAdminData = useCallback(async (emailToUse?: string) => {
    setLoading(true)
    setError('')
    try {
      const email = emailToUse || adminEmail || localStorage.getItem('cahier_admin_email') || 'admin@cahier.com'
      const response = await fetch('/api/admin', {
        headers: { 'x-admin-email': email },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de récupérer les données d\'administration')
      }
      setKpis(data.kpis)
      setShops(data.shops || [])
      setIsAdmin(true)
      if (emailToUse) {
        localStorage.setItem('cahier_admin_email', emailToUse)
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [adminEmail])

  useEffect(() => {
    const saved = localStorage.getItem('cahier_admin_email')
    if (saved) {
      setAdminEmail(saved)
      loadAdminData(saved)
    }
  }, [loadAdminData])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const email = adminEmail.trim().toLowerCase()
    if ((email === 'admin@cahier.com' || email === 'tolkeeee@gmail.com' || email === 'tolkeeeee@gmail.com') && adminPassword === 'admin2026') {
      loadAdminData(email)
    } else {
      setError('Identifiants administrateur incorrects.')
    }
  }

  const handleInspectShop = async (shopId: string, shopName: string) => {
    setSelectedShopId(shopId)
    setSelectedShopName(shopName)
    setLoadingJournal(true)
    try {
      const res = await fetch(`/api/sales?date=all`, {
        headers: { 'x-shop-id': shopId },
      })
      if (res.ok) {
        const data = await res.json()
        setJournalSales(data.sales || [])
      }
    } catch (e) {
      console.error('Erreur chargement journal boutique:', e)
    } finally {
      setLoadingJournal(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#141210] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#1e1a18] p-6 rounded-2xl border border-gray-800 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-extrabold text-white">Administration Plateforme</h2>
          </div>

          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="E-mail Admin..."
            className="w-full px-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-xs text-white focus:outline-none font-mono"
          />
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Mot de passe..."
            className="w-full px-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-xs text-white focus:outline-none font-mono"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#141210] text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all"
          >
            {loading ? 'Connexion...' : 'Se Connecter'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#141210] text-white p-6 space-y-6">
      {/* En-tête Admin */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-amber-400" />
          <h1 className="text-lg font-extrabold text-white">Tableau de Super-Administration</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAdminData()}
            className="p-2 rounded-xl bg-[#1e1a18] border border-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('cahier_admin_email')
              setIsAdmin(false)
            }}
            className="p-2 rounded-xl bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/60 transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cartes KPI */}
      <AdminStatsCards kpis={kpis} />

      {/* Tableau des Boutiques */}
      <AdminShopsTable
        shops={shops}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onInspectShop={handleInspectShop}
      />

      {/* Modale d'inspection */}
      <AdminSubscriptionModal
        isOpen={!!selectedShopId}
        onClose={() => setSelectedShopId(null)}
        shopId={selectedShopId || ''}
        shopName={selectedShopName}
        sales={journalSales}
        activeTab={shopModalTab}
        onTabChange={setShopModalTab}
        loading={loadingJournal}
      />
    </div>
  )
}
