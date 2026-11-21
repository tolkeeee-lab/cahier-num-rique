'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Store, Lock, LogOut, RefreshCw } from 'lucide-react'
import { AdminStatsCards } from '@/components/admin/AdminStatsCards'
import { AdminShopsTable } from '@/components/admin/AdminShopsTable'
import { AdminSubscriptionModal } from '@/components/admin/AdminSubscriptionModal'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'

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

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)
  const [selectedShopName, setSelectedShopName] = useState('')
  const [journalSales, setJournalSales] = useState<any[]>([])
  const [shopModalTab, setShopModalTab] = useState<'journal' | 'analytics'>('journal')
  const [loadingJournal, setLoadingJournal] = useState(false)

  const loadAdminData = useCallback(async (tokenToUse?: string) => {
    setLoading(true)
    setError('')
    try {
      let token = tokenToUse
      if (!token && isSupabaseClientConfigured()) {
        const { data: { session } } = await supabaseClient.auth.getSession()
        token = session?.access_token
      }

      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      if (adminEmail) {
        headers['x-admin-email'] = adminEmail
      }

      const response = await fetch('/api/admin', { headers })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Impossible de récupérer les données d'administration")
      }
      setKpis(data.kpis)
      setShops(data.shops || [])
      setIsAdmin(true)
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [adminEmail])

  useEffect(() => {
    if (isSupabaseClientConfigured()) {
      supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setAdminEmail(session.user.email || '')
          loadAdminData(session.access_token)
        }
      }).catch(() => {})
    }
  }, [loadAdminData])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = adminEmail.trim().toLowerCase()
    setLoading(true)
    setError('')

    try {
      if (isSupabaseClientConfigured()) {
        const { data, error: signErr } = await supabaseClient.auth.signInWithPassword({
          email,
          password: adminPassword,
        })
        if (signErr) throw signErr
        if (data.session?.access_token) {
          await loadAdminData(data.session.access_token)
          return
        }
      } else {
        const allowedAdmins = ['admin@cahier.com', 'tolkeeee@gmail.com', 'tolkeeeee@gmail.com']
        if (allowedAdmins.includes(email)) {
          await loadAdminData()
          return
        }
      }
      setError('Identifiants administrateur incorrects.')
    } catch (err: any) {
      setError(err?.message || "Erreur d'authentification administrateur.")
    } finally {
      setLoading(false)
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
      <div className="min-h-screen bg-[#f5efe0] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#faf5e8] p-6 rounded-2xl border border-[#e2d6be] space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-stone-200 pb-3">
            <Lock className="w-4 h-4 text-stone-700" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-stone-900">Administration plateforme</h2>
          </div>

          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="E-mail administrateur"
            className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
          />
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5efe0] text-stone-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-[#e2d6be] pb-4">
          <div className="flex items-center gap-2.5">
            <Store className="w-5 h-5 text-emerald-700" strokeWidth={1.5} />
            <h1 className="text-lg font-semibold text-stone-900">Administration réseau</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAdminData()}
              className="p-2 rounded-xl bg-[#faf5e8] border border-[#e2d6be] text-stone-600 hover:text-stone-900 transition-colors cursor-pointer active:scale-[0.97]"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <button
              onClick={async () => {
                try {
                  await supabaseClient.auth.signOut()
                } catch {}
                localStorage.removeItem('cahier_admin_email')
                setIsAdmin(false)
              }}
              className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer active:scale-[0.97]"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <AdminStatsCards kpis={kpis} />

        <AdminShopsTable
          shops={shops}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onInspectShop={handleInspectShop}
        />

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
    </div>
  )
}
