'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Check, UserPlus, Trash2, Shield, Users, Database, AlertCircle, CheckCircle2, RefreshCw, Coins, Store, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react'
import { testSupabaseConnection } from '@/lib/supabaseClient'
import { SUPPORTED_CURRENCIES, getShopCurrency, setShopCurrency } from '@/lib/currencyUtils'
import { formatShortShopCode } from '@/lib/shopCodeUtils'
import { useFeatures, FeatureFlags } from '@/context/FeatureContext'

interface Employee {
  id: string
  shop_id: string
  name: string
  email: string
  role: 'owner' | 'employee'
  created_at: string
}

interface SettingsManagerProps {
  shopId?: string
  userEmail?: string
  userShops?: Array<{ id: string; name: string; activity: string }>
  onUpdateShopActivity?: (shopId: string, activity: 'boutique' | 'resto' | 'prestations' | 'particulier') => void
  onResetShopData?: () => void
  onError?: (err: string) => void
}

export function SettingsManager({ shopId = 'default-shop', userEmail, userShops = [], onUpdateShopActivity, onResetShopData, onError }: SettingsManagerProps) {
  const { features, toggleFeature, resetFeatures } = useFeatures()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => getShopCurrency(shopId))

  // Modification du secteur d'activité
  const currentShop = userShops.find(s => s.id === shopId)
  const [selectedActivity, setSelectedActivity] = useState<'boutique' | 'resto' | 'prestations' | 'particulier'>(
    (currentShop?.activity as any) || 'boutique'
  )
  const [activitySavedMsg, setActivitySavedMsg] = useState<string | null>(null)

  useEffect(() => {
    if (currentShop?.activity) {
      setSelectedActivity(currentShop.activity as any)
    }
  }, [currentShop?.activity])

  const handleActivityChange = (act: 'boutique' | 'resto' | 'prestations' | 'particulier') => {
    setSelectedActivity(act)
    onUpdateShopActivity?.(shopId, act)
    setActivitySavedMsg('✓ Secteur d\'activité rectifié avec succès !')
    setTimeout(() => setActivitySavedMsg(null), 3500)
  }

  // Zone de Danger - Réinitialisation
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmInput, setResetConfirmInput] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const executeShopReset = async () => {
    setIsResetting(true)
    try {
      localStorage.removeItem(`cahier_offline_sales_${shopId}`)
      localStorage.removeItem(`cahier_offline_products_${shopId}`)
      localStorage.removeItem(`cahier_offline_clients_${shopId}`)
      localStorage.removeItem(`cahier_offline_suppliers_${shopId}`)
      localStorage.removeItem(`cahier_offline_debts_${shopId}`)
      localStorage.removeItem(`cahier_offline_cash_closing_${shopId}`)
      localStorage.removeItem(`cahier_requested_products_${shopId}`)
      localStorage.removeItem(`cahier_offline_supplier_debts_${shopId}`)
      localStorage.removeItem(`cahier_offline_supplier_transactions_${shopId}`)
      localStorage.removeItem(`cahier_deleted_menu_items_${shopId}`)

      if (typeof window !== 'undefined' && window.navigator.onLine) {
        await fetch('/api/shop/reset', {
          method: 'POST',
          headers: { 'x-shop-id': shopId }
        })
      }

      setShowResetModal(false)
      if (onResetShopData) {
        onResetShopData()
      } else {
        window.location.reload()
      }
    } catch (err: any) {
      console.error('Erreur réinitialisation:', err)
      onError?.(err.message || 'Erreur lors de la réinitialisation des données')
    } finally {
      setIsResetting(false)
    }
  }

  // Diagnostic BDD
  const [dbStatus, setDbStatus] = useState<{ ok: boolean; message: string; code?: number } | null>(null)
  const [checkingDb, setCheckingDb] = useState(false)

  // Formulaire d'ajout
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [assignedShopId, setAssignedShopId] = useState(shopId)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const runDbCheck = async () => {
    setCheckingDb(true)
    const res = await testSupabaseConnection()
    setDbStatus(res)
    setCheckingDb(false)
  }

  useEffect(() => {
    runDbCheck()
  }, [])


  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsOffline(!window.navigator.onLine)
    const handleStatus = () => setIsOffline(!window.navigator.onLine)
    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)
    return () => {
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
    }
  }, [])

  const loadEmployees = async () => {
    setLoading(true)
    if (isOffline) {
      // En mode hors-ligne, on récupère les employés du cache mock local
      const stored = localStorage.getItem(`cahier_offline_employees_${shopId}`)
      if (stored) {
        setEmployees(JSON.parse(stored))
      } else {
        setEmployees([])
      }
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/employees', {
        headers: { 'x-shop-id': shopId }
      })
      if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`)
      const data = await response.json()
      setEmployees(data.employees || [])
      // Mettre en cache local
      localStorage.setItem(`cahier_offline_employees_${shopId}`, JSON.stringify(data.employees || []))
    } catch (err) {
      console.error('Erreur chargement employes:', err)
      onError?.(err instanceof Error ? err.message : 'Erreur de chargement des employés')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [shopId, isOffline])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(formatShortShopCode(shopId))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    setSaving(true)
    setFormError(null)
    setSuccessMsg(null)

    try {
      const shopName = currentShop?.name || shopId
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': assignedShopId || shopId,
          'x-shop-name': shopName
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: 'employee'
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur lors de la création')

      const savedEmail = email.trim().toLowerCase()
      setName('')
      setEmail('')

      if (data.inviteSent) {
        setSuccessMsg(`📧 Invitation envoyée à ${savedEmail} ! L'employé recevra un e-mail pour créer son mot de passe.`)
      } else if (data.inviteError) {
        // Associé en base mais pas d'invitation (clé manquante ou déjà inscrit)
        setSuccessMsg(`✓ Employé associé. Note : ${data.inviteError} L'employé devra s'inscrire manuellement avec le Code Boutique.`)
      } else {
        setSuccessMsg('✓ Employé associé avec succès !')
      }

      await loadEmployees()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEmployee = async (id: string, empName: string) => {
    if (!confirm(`Dissocier « ${empName} » de cette boutique ?`)) return

    try {
      const response = await fetch(`/api/employees?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-shop-id': shopId }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      setEmployees(prev => {
        const updated = prev.filter(e => e.id !== id && e.name !== empName)
        if (typeof window !== 'undefined') {
          localStorage.setItem(`cahier_offline_employees_${shopId}`, JSON.stringify(updated))
        }
        return updated
      })

      await loadEmployees()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fbf9f4]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-[#f5f1e8] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-700" />
          <h2 className="font-handwritten text-xl font-bold text-gray-800">Paramètres de la Boutique</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Rectification du Secteur d'Activité */}
        <div className="bg-white border border-amber-200 rounded-[24px] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-800" />
              <h3 className="font-bold text-sm text-gray-900">Secteur d'Activité de la Boutique</h3>
            </div>
            {activitySavedMsg && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full animate-bounce">
                {activitySavedMsg}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-sans leading-relaxed">
            Corrigez ou ajustez le secteur d'activité de votre point de vente pour adapter les termes et la gestion du stock (ex: masquer le stock physique pour les prestations).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleActivityChange('boutique')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                selectedActivity === 'boutique'
                  ? 'border-amber-500 bg-amber-50 shadow-sm font-bold text-amber-950 scale-102'
                  : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
              }`}
            >
              <span className="text-xl">🏬</span>
              <div>
                <div className="text-xs font-bold">Boutique</div>
                <div className="text-[10px] text-gray-500">Commerce & Vente</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleActivityChange('resto')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                selectedActivity === 'resto'
                  ? 'border-amber-500 bg-amber-50 shadow-sm font-bold text-amber-950 scale-102'
                  : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
              }`}
            >
              <span className="text-xl">🍲</span>
              <div>
                <div className="text-xs font-bold">Resto / Maquis</div>
                <div className="text-[10px] text-gray-500">Cuisine & Bar</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleActivityChange('prestations')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                selectedActivity === 'prestations'
                  ? 'border-amber-500 bg-amber-50 shadow-sm font-bold text-amber-950 scale-102'
                  : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
              }`}
            >
              <span className="text-xl">✂️</span>
              <div>
                <div className="text-xs font-bold">Prestations</div>
                <div className="text-[10px] text-gray-500">Services & Métiers</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleActivityChange('particulier')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                selectedActivity === 'particulier'
                  ? 'border-amber-500 bg-amber-50 shadow-sm font-bold text-amber-950 scale-102'
                  : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
              }`}
            >
              <span className="text-xl">🏠</span>
              <div>
                <div className="text-xs font-bold">Particulier</div>
                <div className="text-[10px] text-gray-500">Budget & Foyer</div>
              </div>
            </button>
          </div>
        </div>
        {/* Configuration de la Devise Régionale / Internationale */}
        <div className="bg-white border border-amber-200 rounded-[24px] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-700" />
            <h3 className="font-bold text-sm text-gray-900">Devise Principale du Point de Vente</h3>
          </div>
          <p className="text-xs text-gray-500 font-mono">
            Sélectionnez la monnaie d'affichage pour vos prix, ventes et reçus de caisse.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {Object.values(SUPPORTED_CURRENCIES).map(curr => {
              const isSelected = selectedCurrency === curr.code
              return (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => {
                    setSelectedCurrency(curr.code)
                    setShopCurrency(shopId, curr.code)
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all font-mono ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 shadow-sm scale-105'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-gray-900">{curr.symbol}</div>
                  <div className="text-[10px] text-gray-500 truncate">{curr.name}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Personnalisation des Fonctionnalités (Mode Simple vs Mode Avancé) */}
        <div className="bg-white border border-emerald-200 rounded-[24px] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-sm text-gray-900">Personnalisation du Cahier & Modules</h3>
            </div>
            <button
              type="button"
              onClick={resetFeatures}
              className="text-[11px] font-mono text-gray-500 hover:text-emerald-700 underline"
            >
              Reinitialiser par défaut
            </button>
          </div>
          <p className="text-xs text-gray-500 font-mono leading-relaxed">
            Activez ou désactivez les fonctionnalités avancées selon vos besoins pour garder une interface ultra-simple ou complète.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {[
              {
                key: 'enableStockManagement' as keyof FeatureFlags,
                title: 'Gestion de Stock Produits',
                desc: 'Suivi des quantités et réapprovisionnements',
              },
              {
                key: 'enableAnalytics' as keyof FeatureFlags,
                title: 'Statistiques & Rapports',
                desc: 'Graphiques de ventes et analyse d\'activité',
              },
              {
                key: 'enableSyscohada' as keyof FeatureFlags,
                title: 'Comptabilité SYSCOHADA',
                desc: 'Classification comptable selon les normes OHADA',
              },
              {
                key: 'enableBarcodeScanner' as keyof FeatureFlags,
                title: 'Scanner de Code-Barres',
                desc: 'Lecture rapide par caméra ou douchette',
              },
              {
                key: 'enableReceiptPrinter' as keyof FeatureFlags,
                title: 'Impression de Tickets',
                desc: 'Génération et impression de reçus de caisse',
              },
              {
                key: 'enableCashClosing' as keyof FeatureFlags,
                title: 'Clôture de Caisse',
                desc: 'Réconciliation journalière du tiroir-caisse',
              },
              {
                key: 'enableParticulierMode' as keyof FeatureFlags,
                title: 'Mode Budget Foyer / Particulier',
                desc: 'Gestion des dépenses personnelles et du ménage',
              },
            ].map(item => {
              const isEnabled = features[item.key]
              return (
                <div
                  key={item.key}
                  onClick={() => toggleFeature(item.key)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isEnabled
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                      : 'border-gray-200 bg-gray-50/50 opacity-75'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-gray-900">{item.title}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{item.desc}</div>
                  </div>
                  <div className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 mt-0.5 ${isEnabled ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${isEnabled ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Diagnostic Connexion Supabase */}
        <div className="bg-white border border-gray-200 rounded-[24px] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-sm text-gray-800">Diagnostic Base de Données Supabase</h3>
            </div>
            <button
              onClick={runDbCheck}
              disabled={checkingDb}
              className="p-1.5 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingDb ? 'animate-spin' : ''}`} />
              <span>Tester</span>
            </button>
          </div>

          {dbStatus && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              dbStatus.ok 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {dbStatus.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{dbStatus.message}</p>
                {dbStatus.code === 401 && (
                  <p className="text-[11px] text-amber-700 font-mono bg-amber-100/60 p-2 rounded-md">
                    💡 Pour résoudre cela :<br />
                    1. Exécutez la migration <strong>011_fix_rls_permissions.sql</strong> dans l'éditeur SQL Supabase.<br />
                    2. Vérifiez que <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> est configurée dans Vercel.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Accès Super Admin pour les comptes d'administration autorisés */}
        {(userEmail === 'tolkeeee@gmail.com' || userEmail === 'tolkeeeee@gmail.com' || userEmail === 'admin@cahier.com') && (
          <div className="bg-[#fffdf9] border border-rose-250 rounded-[28px] p-5 shadow-sm select-none">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex-grow space-y-1">
                <h4 className="font-handwritten text-lg font-bold text-gray-800">
                  Accès Privilégié Super Admin
                </h4>
                <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                  Votre compte <strong className="text-rose-700 font-mono">{userEmail}</strong> possède des droits d'administration de la plateforme globale.
                </p>
                <div className="pt-2">
                  <a
                    href="/admin"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97]"
                  >
                    Aller au Panneau Admin →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 0 : Statut Abonnement & Recharge Mobile Money */}
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-[28px] p-6 shadow-xl space-y-4 border border-emerald-700/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl">
                <Coins className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Statut de votre Abonnement</h3>
                <p className="text-xs text-emerald-200 font-sans">Compte Professionnel & Service Actif</p>
              </div>
            </div>

            <span className="px-3 py-1 bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Essai Gratuit Illimité
            </span>
          </div>

          {/* Grille Tarifs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-2xl p-4 space-y-1">
              <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Formule Mensuelle</div>
              <div className="text-2xl font-black text-amber-300 font-mono">1 500 <span className="text-sm font-bold">FCFA / mois</span></div>
              <p className="text-[10px] text-emerald-200 font-sans">Accès complet Caisse, Stock, Dettes & Rapport Z</p>
            </div>

            <div className="bg-emerald-950/60 border border-amber-500/40 rounded-2xl p-4 space-y-1 relative">
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-emerald-950 font-bold text-[8px] uppercase rounded-full tracking-wider">
                -17% Réduction
              </span>
              <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Formule Annuelle</div>
              <div className="text-2xl font-black text-amber-300 font-mono">15 000 <span className="text-sm font-bold">FCFA / an</span></div>
              <p className="text-[10px] text-emerald-200 font-sans">2 mois gratuits + Support prioritaire</p>
            </div>
          </div>

          {/* Zone d'Activation Mobile Money */}
          <div className="bg-emerald-950/80 border border-emerald-600/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📲</span>
              <h4 className="font-bold text-xs text-amber-200 uppercase tracking-wider">
                Recharge & Activation par Mobile Money (MTN / Moov / Wave)
              </h4>
            </div>

            <div className="bg-emerald-900/90 border border-amber-500/40 rounded-xl p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Numéro Officiel de Dépôt MoMo / Wave</div>
                  <div className="text-xl font-black text-white font-mono flex items-center gap-2">
                    +229 01 54 33 05 45
                  </div>
                  <div className="text-xs font-bold text-amber-200 font-sans mt-0.5 flex items-center gap-1">
                    <span>👤 Titulaire :</span>
                    <span className="underline decoration-amber-400">KOUISSOU Sèdjro Merveil Vianney</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('0154330545')
                    alert("Numéro MoMo 0154330545 copié dans le presse-papier !")
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copier Numéro
                </button>
              </div>

              <p className="text-[10px] text-emerald-200 font-sans border-t border-emerald-800/80 pt-2">
                💡 Indiquez le code de votre boutique <strong className="font-mono text-amber-300 bg-emerald-950 px-1.5 py-0.5 rounded">{formatShortShopCode(shopId)}</strong> dans le motif du transfert ou envoyez votre reçu sur WhatsApp.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <a
                href={`https://wa.me/2290154330545?text=${encodeURIComponent(`Bonjour, je souhaite recharger l'abonnement de ma boutique (Code: ${formatShortShopCode(shopId)}).`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span>💬</span>
                Envoyer le Reçu par WhatsApp (+229 01 54 33 05 45)
              </a>
            </div>
          </div>
        </div>

        {/* Section 1 : Code Boutique */}
        <div className="bg-white border border-amber-200 rounded-[24px] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <span>🔑 Code de la Boutique (Accès Employés)</span>
            </h3>
            <span className="bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Code Court Sécurisé
            </span>
          </div>
          <p className="text-xs text-gray-500 font-sans leading-relaxed">
            Partagez ce code court avec vos employés. Ils devront le saisir lors de la création de leur compte pour être rattachés automatiquement à cette boutique.
          </p>

          <div className="flex items-center gap-3 bg-[#fefcf6] border-2 border-amber-300 rounded-2xl p-3.5 shadow-inner">
            <div className="flex-grow flex flex-col">
              <span className="text-[9px] uppercase font-bold text-amber-800 tracking-wider">Code d'accès rapide</span>
              <span className="font-mono text-2xl font-black text-amber-950 tracking-widest">
                {formatShortShopCode(shopId)}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copier Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 2 : Ajouter un Employé */}
        <div className="bg-white border border-gray-250 rounded-[24px] p-5 shadow-sm">
          <h3 className="font-handwritten text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-gray-700" />
            Associer un Employé
          </h3>

          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Nom complet de l'employé
              </label>
              <input
                type="text"
                placeholder="Ex: Koffi Kouassi"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-250 rounded-xl text-xs font-mono outline-none focus:border-gray-400 bg-[#faf7f0] transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Adresse e-mail
              </label>
              <input
                type="email"
                placeholder="Ex: koffi@cahier.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-250 rounded-xl text-xs font-mono outline-none focus:border-gray-400 bg-[#faf7f0] transition-all"
              />
            </div>

            {userShops.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Boutique / Point de Vente Assigné
                </label>
                <select
                  value={assignedShopId}
                  onChange={e => setAssignedShopId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-250 rounded-xl text-xs font-semibold text-gray-800 outline-none bg-[#faf7f0]"
                >
                  {userShops.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.activity === 'resto' ? '🍲 Resto' : s.activity === 'prestations' ? '✂️ Service' : s.activity === 'particulier' ? '🏠 Particulier' : '🏬 Boutique'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formError && (
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">
                ⚠️ {formError}
              </p>
            )}

            {successMsg && (
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || isOffline}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-black text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? 'Envoi de l\'invitation...' : '📧 Associer & Inviter par e-mail'}
            </button>
            {isOffline && (
              <p className="text-[10px] text-amber-600 font-mono text-center">
                ⚠️ Hors-ligne — l\'invitation sera uniquement enregistrée en local, sans e-mail.
              </p>
            )}
          </form>
        </div>

        {/* Section 3 : Liste des Employés */}
        <div className="bg-white border border-gray-250 rounded-[24px] p-5 shadow-sm">
          <h3 className="font-handwritten text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-700" />
            Employés Associés
          </h3>

          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400 uppercase tracking-widest font-mono">
              Chargement...
            </div>
          ) : employees.length === 0 ? (
            <div className="py-8 text-center bg-[#faf7f0] border border-dashed border-gray-250 rounded-2xl flex flex-col items-center justify-center p-6">
              <Users className="w-6 h-6 text-gray-400 mb-2" />
              <p className="font-handwritten text-lg text-gray-500">Aucun employé pour l'instant</p>
              <p className="text-[10px] text-gray-400 font-mono mt-1">
                Associez vos gérants et employés pour leur donner accès à vos comptes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <div key={emp.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-800 truncate block">
                        {emp.name}
                      </span>
                      {emp.role === 'owner' && (
                        <span className="flex-shrink-0 px-2 py-0.5 bg-amber-100 border border-amber-200 text-[8px] font-bold text-amber-700 rounded-full uppercase tracking-wider">
                          Propriétaire
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono truncate block mt-0.5">
                      {emp.email}
                    </span>
                  </div>

                  {emp.role !== 'owner' && !isOffline && (
                    <button
                      onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                      title="Dissocier cet employé"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section Zone de Danger : Repartir de zéro */}
        <div className="bg-red-50/50 border border-red-200 rounded-[24px] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-sm text-red-950">Zone de Danger — Repartir de Zéro</h3>
          </div>
          <p className="text-xs text-red-800 font-sans leading-relaxed">
            Vous souhaitez réinitialiser cette boutique ? Cette action effacera toutes les ventes, les créances et les articles en stock pour vous permettre de démarrer sur un cahier vierge.
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setResetConfirmInput('')
                setShowResetModal(true)
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser la boutique & Repartir à zéro
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmation Réinitialisation Totale */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-red-500 rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Attention — Action Irréversible</h3>
                <p className="text-xs text-gray-500">Réinitialisation complète de la boutique</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              Toutes les transactions enregistrées, le stock actuel, le carnet de dettes et les statistiques de ce point de vente seront effacés définitivement.
            </p>

            <div className="bg-red-50 p-3 rounded-xl border border-red-200">
              <label className="block text-[10px] font-bold text-red-900 uppercase tracking-wider mb-1">
                Tapez <strong className="font-mono text-red-700">EFFACER</strong> pour confirmer :
              </label>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="EFFACER"
                className="w-full px-3 py-2 bg-white border border-red-300 rounded-xl text-xs font-mono font-bold text-gray-900 outline-none uppercase tracking-widest"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 text-xs font-bold uppercase rounded-xl hover:bg-gray-100 transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={resetConfirmInput.trim().toUpperCase() !== 'EFFACER' || isResetting}
                onClick={executeShopReset}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-red-600 shadow-md flex items-center justify-center gap-1.5"
              >
                {isResetting ? 'Effacement...' : 'Confirmer & Effacer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
