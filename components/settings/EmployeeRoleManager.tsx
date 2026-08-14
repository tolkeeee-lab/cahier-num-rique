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
  onInviteEmployee?: (email: string, role: string) => Promise<void>
  onRemoveEmployee?: (id: string) => Promise<void>
}

export const EmployeeRoleManager: React.FC<EmployeeRoleManagerProps> = ({
  employees,
  onInviteEmployee,
  onRemoveEmployee,
}) => {
  const [emailInput, setEmailInput] = useState('')
  const [roleInput, setRoleInput] = useState<'admin' | 'employee'>('employee')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim() || !onInviteEmployee) return

    setIsSubmitting(true)
    try {
      await onInviteEmployee(emailInput.trim(), roleInput)
      setEmailInput('')
    } catch (err) {
      console.error('Erreur invitation:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-[#1e1a18] p-5 rounded-2xl border border-gray-800 space-y-4 shadow-md">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        <Users className="w-5 h-5 text-amber-400" />
        <h4 className="text-sm font-extrabold text-white">Gestion des Employés & Droits</h4>
      </div>

      {/* Formulaire d'invitation */}
      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="Adresse e-mail de l'employé..."
          className="flex-grow px-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
        />
        <select
          value={roleInput}
          onChange={(e) => setRoleInput(e.target.value as 'admin' | 'employee')}
          className="px-3 py-2 bg-[#141210] border border-gray-800 rounded-xl text-xs text-gray-300 font-mono focus:outline-none"
        >
          <option value="employee">Vendeur / Employé</option>
          <option value="admin">Gérant / Admin</option>
        </select>
        <button
          type="submit"
          disabled={!emailInput.trim() || isSubmitting}
          className="px-4 py-2 bg-amber-500 text-[#141210] text-xs font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Inviter</span>
        </button>
      </form>

      {/* Liste de l'équipe */}
      <div className="space-y-2 pt-2">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="flex items-center justify-between p-3 bg-[#141210] rounded-xl border border-gray-800/60 font-mono text-xs"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <div>
                <p className="font-bold text-white">{emp.name}</p>
                <p className="text-[11px] text-gray-400">{emp.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {emp.role}
              </span>
              {onRemoveEmployee && (
                <button
                  onClick={() => onRemoveEmployee(emp.id)}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
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
