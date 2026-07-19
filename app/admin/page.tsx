'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Store, 
  Users, 
  TrendingUp, 
  FileText, 
  Search, 
  Download, 
  ShieldAlert, 
  Eye, 
  X, 
  Lock,
  RefreshCw
} from 'lucide-react'
import { SalesHistory } from '@/components/SalesHistory'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'

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

interface AdminUser {
  id: string
  shop_id: string
  name: string
  email: string
  role: 'owner' | 'employee'
  created_at: string
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(price) + ' FCFA'
}

export default function SuperAdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'shops' | 'users' | 'analytics'>('shops')
  
  // Data States
  const [kpis, setKpis] = useState<AdminKPIs | null>(null)
  const [shops, setShops] = useState<AdminShop[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [allNetworkSales, setAllNetworkSales] = useState<any[]>([])
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedShopForJournal, setSelectedShopForJournal] = useState<string | null>(null)
  const [selectedShopName, setSelectedShopName] = useState('')
  const [journalSales, setJournalSales] = useState<any[]>([])
  const [shopModalTab, setShopModalTab] = useState<'journal' | 'analytics'>('journal')
  const [loadingJournal, setLoadingJournal] = useState(false)

  // Dev mode bypass checker
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
    // Vérifier si on est en dev local
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      setIsDev(isLocal)
    }
  }, [])

  const loadAdminData = useCallback(async (emailToUse?: string) => {
    setLoading(true)
    setError('')
    try {
      const email = emailToUse || adminEmail || localStorage.getItem('cahier_admin_email') || 'admin@cahier.com'
      const response = await fetch('/api/admin', {
        headers: {
          'x-admin-email': email
        }
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de récupérer les données d\'administration')
      }
      setKpis(data.kpis)
      setShops(data.shops)
      setUsers(data.users)
      setAllNetworkSales(data.allSales || [])
      setIsAdmin(true)
      if (emailToUse) {
        localStorage.setItem('cahier_admin_email', emailToUse)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [adminEmail])

  // Chargement automatique si déjà authentifié localement
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

  const handleBypass = () => {
    setAdminEmail('tolkeeee@gmail.com')
    loadAdminData('tolkeeee@gmail.com')
  }

  const handleLogout = () => {
    localStorage.removeItem('cahier_admin_email')
    setIsAdmin(false)
    setAdminPassword('')
    setKpis(null)
    setShops([])
    setUsers([])
  }

  // Charger le journal d'une boutique en lecture seule
  const viewShopJournal = async (shopId: string, shopName: string) => {
    setLoadingJournal(true)
    setSelectedShopForJournal(shopId)
    setSelectedShopName(shopName)
    setJournalSales([])
    try {
      const response = await fetch('/api/sales', {
        headers: {
          'x-shop-id': shopId
        }
      })
      const data = await response.json()
      if (response.ok) {
        setJournalSales(data.sales || [])
      } else {
        setError(data.error || 'Erreur lors du chargement des transactions')
      }
    } catch (err) {
      setError('Impossible de joindre le serveur')
    } finally {
      setLoadingJournal(false)
    }
  }

  // Export CSV
  const exportToCSV = (type: 'shops' | 'users' | 'analytics') => {
    let csvContent = "data:text/csv;charset=utf-8,"
    
    if (type === 'shops') {
      csvContent += "ID Boutique,Nom,Email Proprio,Transactions,Volume Ventes,Solde Caisse,Employes,Date Creation\n"
      shops.forEach(s => {
        csvContent += `"${s.shop_id}","${s.name}","${s.owner_email}",${s.transactions_count},${s.total_sales},${s.cash_balance},${s.employees_count},"${s.created_at.slice(0, 10)}"\n`
      })
    } else if (type === 'users') {
      csvContent += "ID Utilisateur,ID Boutique,Nom,Email,Role,Date Inscription\n"
      users.forEach(u => {
        csvContent += `"${u.id}","${u.shop_id}","${u.name}","${u.email}","${u.role}","${u.created_at.slice(0, 10)}"\n`
      })
    } else {
      csvContent += "ID Transaction,Date,Heure,Client,Total,Statut,Type,Notes,Categorie\n"
      allNetworkSales.forEach(s => {
        csvContent += `"${s.id}","${s.date}","${s.time}","${s.client}",${s.total},"${s.status}","${s.type}","${(s.notes || '').replace(/"/g, '""')}","${s.category}"\n`
      })
    }
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `export_admin_${type}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filtres de recherche
  const filteredShops = shops.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.shop_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.owner_email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.shop_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-radial-gradient flex items-center justify-center p-4 bg-[#141210]">
        <div className="w-full max-w-md bg-[#fdfaf2] border border-gray-300 shadow-2xl rounded-[32px] p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-600 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="font-handwritten text-3xl font-bold text-gray-800">
              Accès Super Admin
            </h1>
            <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">
              Cahier de Caisse Intelligent
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">
                E-mail Administrateur
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="ex: admin@cahier.com"
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider font-sans block mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              {loading ? 'Connexion...' : 'S\'authentifier'}
            </button>
          </form>

          {isDev && (
            <div className="pt-4 border-t border-gray-200 text-center">
              <button
                onClick={handleBypass}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
              >
                ⚡ Démo local : Contourner l'accès
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#141210] text-gray-800 p-4 md:p-8 flex flex-col font-sans">
      <div className="w-full max-w-6xl mx-auto bg-[#fdfaf2] border border-gray-300 shadow-2xl rounded-[40px] overflow-hidden flex flex-col min-h-[90vh]">
        
        {/* En-tête */}
        <div className="px-6 py-5 border-b border-gray-200 bg-[#f5f1e8] flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-handwritten text-2xl font-bold text-gray-900">
                Panneau Super Admin
              </h1>
              <p className="text-[9px] text-gray-400 font-mono uppercase tracking-widest">
                Surveillance Réseau & Métriques
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAdminData()}
              title="Rafraîchir les statistiques"
              className="p-2 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-600 hover:text-gray-900 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* KPIs Section */}
        {kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-b border-gray-200 bg-white">
            <div className="bg-[#fffdf9] border border-gray-150 p-4 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Boutiques</span>
                <span className="text-xl font-bold font-mono text-gray-800">{kpis.totalBoutiques}</span>
              </div>
            </div>

            <div className="bg-[#fffdf9] border border-gray-150 p-4 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Utilisateurs</span>
                <span className="text-xl font-bold font-mono text-gray-800">{kpis.totalUsers}</span>
              </div>
            </div>

            <div className="bg-[#fffdf9] border border-gray-150 p-4 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Transactions (NLP)</span>
                <span className="text-xl font-bold font-mono text-gray-800">{kpis.globalTransactions}</span>
              </div>
            </div>

            <div className="bg-[#fffdf9] border border-gray-150 p-4 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 font-sans block">Volume Affaires</span>
                <span className="text-xs font-bold font-mono text-emerald-800 block truncate">{formatPrice(kpis.globalVolumeSales)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab & Search Bar */}
        <div className="px-6 py-4 border-b border-gray-200 bg-[#f5f1e8] flex flex-col md:flex-row gap-4 items-center justify-between select-none">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setActiveTab('shops'); setSearchQuery('') }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'shops' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-250 text-gray-500 hover:text-gray-850'
              }`}
            >
              🏪 Boutiques ({shops.length})
            </button>
            <button
              onClick={() => { setActiveTab('users'); setSearchQuery('') }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'users' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-250 text-gray-500 hover:text-gray-850'
              }`}
            >
              👥 Utilisateurs ({users.length})
            </button>
            <button
              onClick={() => { setActiveTab('analytics'); setSearchQuery('') }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'analytics' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-250 text-gray-500 hover:text-gray-850'
              }`}
            >
              📊 Analyses Réseau
            </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'shops' ? "Rechercher boutique ou propriétaire..." : "Rechercher email ou nom..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-gray-400"
              />
            </div>
            <button
              onClick={() => exportToCSV(activeTab)}
              title="Exporter les lignes"
              className="p-2.5 bg-white border border-gray-250 hover:bg-gray-50 rounded-xl text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-x-auto p-6">
          {activeTab === 'shops' ? (
            <div className="min-w-full overflow-hidden border border-gray-200 rounded-2xl bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 font-sans text-xs">
                <thead className="bg-gray-50 uppercase text-[9px] font-bold text-gray-400 tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Code Boutique (Shop ID)</th>
                    <th className="px-5 py-3.5 text-left">Nom Boutique</th>
                    <th className="px-5 py-3.5 text-left">E-mail Propriétaire</th>
                    <th className="px-5 py-3.5 text-center">Transactions</th>
                    <th className="px-5 py-3.5 text-right">CA Total</th>
                    <th className="px-5 py-3.5 text-right">Solde Caisse</th>
                    <th className="px-5 py-3.5 text-center">Staff</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {filteredShops.map((shop, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 hover:bg-opacity-40 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-[10px] text-gray-400">{shop.shop_id}</td>
                      <td className="px-5 py-3 font-bold text-gray-800">{shop.name}</td>
                      <td className="px-5 py-3">{shop.owner_email}</td>
                      <td className="px-5 py-3 text-center font-mono font-bold">{shop.transactions_count}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-emerald-700">{formatPrice(shop.total_sales)}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-blue-700">{formatPrice(shop.cash_balance)}</td>
                      <td className="px-5 py-3 text-center font-mono font-bold">{shop.employees_count}</td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => viewShopJournal(shop.shop_id, shop.name)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 hover:border-gray-400 rounded-lg text-[9px] font-bold text-gray-700 flex items-center gap-1.5 mx-auto transition-all"
                        >
                          <Eye className="w-3 h-3" /> Journal
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredShops.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-gray-400 font-handwritten text-lg font-bold">
                        Aucune boutique trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'users' ? (
            <div className="min-w-full overflow-hidden border border-gray-200 rounded-2xl bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 font-sans text-xs">
                <thead className="bg-gray-50 uppercase text-[9px] font-bold text-gray-400 tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Nom Utilisateur</th>
                    <th className="px-5 py-3.5 text-left">Email</th>
                    <th className="px-5 py-3.5 text-left">Rôle</th>
                    <th className="px-5 py-3.5 text-left">Liaison Boutique (Shop ID)</th>
                    <th className="px-5 py-3.5 text-center">Date Inscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {filteredUsers.map((user, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 hover:bg-opacity-40 transition-colors">
                      <td className="px-5 py-3 font-bold text-gray-800">{user.name}</td>
                      <td className="px-5 py-3">{user.email}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          user.role === 'owner' ? 'bg-amber-100 text-amber-800 border border-amber-250' : 'bg-teal-150 text-teal-800 border border-teal-200'
                        }`}>
                          {user.role === 'owner' ? 'Propriétaire' : 'Employé'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-[10px] text-gray-400">{user.shop_id}</td>
                      <td className="px-5 py-3 text-center">{user.created_at.slice(0, 10)}</td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-gray-400 font-handwritten text-lg font-bold">
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="min-w-full">
              <AnalyticsDashboard sales={allNetworkSales} />
            </div>
          )}
        </div>
      </div>

      {/* ── Tiroir / Modal de Journal & Analyses de Boutique (Lecture Seule) ── */}
      {selectedShopForJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black bg-opacity-40 p-4 animate-fade-in">
          <div className="w-full max-w-2xl h-full bg-[#fdfaf2] border border-gray-300 shadow-2xl rounded-l-[32px] overflow-hidden flex flex-col transform transition-transform duration-350 translate-x-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-[#f5f1e8]">
              <div>
                <h3 className="font-handwritten text-xl font-bold text-gray-900">
                  🏪 {selectedShopName}
                </h3>
                <p className="text-[8px] text-gray-400 font-mono uppercase tracking-wider">
                  Code : {selectedShopForJournal}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex bg-white border border-gray-250 rounded-xl p-0.5">
                  <button
                    onClick={() => setShopModalTab('journal')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${
                      shopModalTab === 'journal' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    📖 Journal
                  </button>
                  <button
                    onClick={() => setShopModalTab('analytics')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${
                      shopModalTab === 'analytics' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    📊 Analyses
                  </button>
                </div>

                <button 
                  onClick={() => setSelectedShopForJournal(null)} 
                  className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-20">
              {loadingJournal ? (
                <div className="flex items-center justify-center p-24">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : shopModalTab === 'journal' ? (
                journalSales.length > 0 ? (
                  <SalesHistory 
                    sales={journalSales} 
                    shopId={selectedShopForJournal}
                    isEmployee={true} // Lecture seule en se faisant passer pour un employé
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-24 text-center">
                    <span className="text-3xl mb-2">📖</span>
                    <p className="font-handwritten text-lg text-gray-500 font-bold">Aucune transaction.</p>
                  </div>
                )
              ) : (
                <AnalyticsDashboard sales={journalSales} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
