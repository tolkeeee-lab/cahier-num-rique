'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Check, UserPlus, Trash2, Shield, Users } from 'lucide-react'

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
  onError?: (err: string) => void
}

export function SettingsManager({ shopId = 'default-shop', userEmail, userShops = [], onError }: SettingsManagerProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  // Formulaire d'ajout
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [assignedShopId, setAssignedShopId] = useState(shopId)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

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
    navigator.clipboard.writeText(shopId)
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
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shopId
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: 'employee'
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur lors de la création')

      setName('')
      setEmail('')
      setSuccessMsg('✓ Employé associé avec succès !')
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

        {/* Section 1 : Code Boutique */}
        <div className="bg-white border border-gray-250 rounded-[24px] p-5 shadow-sm">
          <h3 className="font-handwritten text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            🔑 Code de la Boutique
          </h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed font-sans">
            Partagez ce code de sécurité avec vos employés. Ils devront le saisir lors de la création de leur compte pour pouvoir accéder aux comptes et aux stocks de votre boutique.
          </p>

          <div className="flex items-center gap-2 bg-[#faf7f0] border border-gray-200 rounded-2xl p-3">
            <span className="font-mono text-sm font-bold text-gray-800 tracking-wider flex-grow break-all">
              {shopId}
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copier
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
                      {s.name} ({s.activity === 'resto' ? '🍲 Resto' : s.activity === 'prestations' ? '✂️ Service' : '🏬 Boutique'})
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
              {saving ? 'Association...' : 'Associer l\'employé'}
            </button>
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
      </div>
    </div>
  )
}
