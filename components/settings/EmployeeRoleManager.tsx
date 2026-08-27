'use client'

import React, { useState } from 'react'
import { Users, UserPlus, Shield, Trash2 } from 'lucide-react'

interface Employee {
  id: string
  name: string
  role: 'admin' | 'employee'
  email?: string
}

interface EmployeeRoleManagerProps {
  employees: Employee[]
  shopId?: string
  shopName?: string
  onInviteEmployee?: (name: string, email: string, role: string) => Promise<void>
  onRemoveEmployee?: (id: string) => Promise<void>
}

export const EmployeeRoleManager: React.FC<EmployeeRoleManagerProps> = ({
  employees,
  onInviteEmployee,
  onRemoveEmployee,
}) => {
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [roleInput, setRoleInput] = useState<'admin' | 'employee'>('employee')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = emailInput.trim()
    if (!email) return

    const name = nameInput.trim() || email.split('@')[0]

    setIsSubmitting(true)
    setFeedback(null)
    try {
      if (onInviteEmployee) {
        await onInviteEmployee(name, email, roleInput)
      } else {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': shopId || 'default-shop',
            'x-shop-name': shopName || 'Ma Boutique'
          },
          body: JSON.stringify({ name, email, role: roleInput })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'invitation')
      }
      setFeedback({ type: 'success', msg: `Invitation enregistrée pour ${email} ✅` })
      setNameInput('')
      setEmailInput('')
    } catch (err: any) {
      console.error('Erreur invitation:', err)
      setFeedback({ type: 'error', msg: err?.message || 'Erreur lors de l\'invitation' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white/90 p-5 rounded-2xl border border-amber-300/80 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
        <Users className="w-5 h-5 text-amber-700" />
        <h4 className="text-sm font-extrabold text-gray-900">Gestion des Employés & Droits</h4>
      </div>

      {/* Formulaire d'invitation */}
      <form onSubmit={handleInvite} className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Prénom et nom de l'employé (optionnel)..."
            className="flex-grow px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Adresse e-mail de l'employé (obligatoire)..."
            required
            className="flex-grow px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:border-amber-500 shadow-inner"
          />
          <select
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value as 'admin' | 'employee')}
            className="px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-xs text-gray-900 font-mono font-bold focus:outline-none cursor-pointer"
          >
            <option value="employee">Vendeur / Employé</option>
            <option value="admin">Gérant / Admin</option>
          </select>
          <button
            type="submit"
            disabled={!emailInput.trim() || isSubmitting}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 text-xs font-extrabold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Envoi...' : 'Inviter'}</span>
          </button>
        </div>
        {feedback && (
          <p className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
            feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {feedback.msg}
          </p>
        )}
      </form>

      {/* Liste de l'équipe */}
      <div className="space-y-2 pt-2">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="flex items-center justify-between p-3 bg-amber-50/70 rounded-xl border border-amber-200 font-mono text-xs"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-700" />
              <div>
                <p className="font-extrabold text-gray-900">{emp.name}</p>
                <p className="text-[11px] text-gray-600 font-sans">{emp.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                {emp.role}
              </span>
              {onRemoveEmployee && (
                <button
                  type="button"
                  onClick={() => onRemoveEmployee(emp.id)}
                  className="p-1 text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                  title="Retirer l'employé"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
