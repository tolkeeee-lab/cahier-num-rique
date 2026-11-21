'use client'

import React, { useState } from 'react'
import { User, Mail, Lock, Store, Key, ArrowRight, ShieldCheck, Users, Info } from 'lucide-react'

interface AuthSignupFormProps {
  onSignup: (name: string, email: string, password?: string, shopName?: string, role?: 'owner' | 'employee', shopCode?: string) => Promise<void>
  loading?: boolean
  error?: string | null
}

export const AuthSignupForm: React.FC<AuthSignupFormProps> = ({
  onSignup,
  loading = false,
  error,
}) => {
  const [role, setRole] = useState<'owner' | 'employee'>('owner')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shopName, setShopName] = useState('')
  const [shopCode, setShopCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    if (role === 'employee' && !shopCode.trim()) {
      return
    }

    await onSignup(name.trim(), email.trim(), password, shopName.trim(), role, shopCode.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-stone-700 font-medium">
          Je crée un compte en tant que
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole('owner')}
            className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-medium transition-colors cursor-pointer ${
              role === 'owner'
                ? 'bg-emerald-50 border-emerald-700 text-emerald-900'
                : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" strokeWidth={1.5} />
            <span>Propriétaire</span>
            <span className="text-[11px] font-normal text-stone-500">Créer mon commerce</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('employee')}
            className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-medium transition-colors cursor-pointer ${
              role === 'employee'
                ? 'bg-emerald-50 border-emerald-700 text-emerald-900'
                : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-700" strokeWidth={1.5} />
            <span>Employé / Vendeur</span>
            <span className="text-[11px] font-normal text-stone-500">J&apos;ai un code boutique</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-stone-700 font-medium mb-1.5">
          Nom complet
        </label>
        <div className="relative">
          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex : Koffi Kouassi"
            required
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
          />
        </div>
      </div>

      <div>
        <label className="block text-stone-700 font-medium mb-1.5">
          Adresse e-mail
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre.email@exemple.com"
            required
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
          />
        </div>
      </div>

      <div>
        <label className="block text-stone-700 font-medium mb-1.5">
          Mot de passe
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
          />
        </div>
      </div>

      {role === 'owner' ? (
        <div>
          <label className="block text-stone-700 font-medium mb-1.5">
            Nom de votre commerce
          </label>
          <div className="relative">
            <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="ex : Boutique Espoir"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
          <label className="text-amber-900 font-medium text-xs flex items-center gap-1.5">
            <Key className="w-4 h-4 text-amber-700" strokeWidth={1.5} />
            <span>Code boutique du propriétaire</span>
          </label>
          <input
            type="text"
            value={shopCode}
            onChange={(e) => setShopCode(e.target.value.toUpperCase())}
            placeholder="ex : BTQ-58C54"
            required
            className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-xl text-stone-900 font-mono font-semibold text-sm placeholder-stone-400 focus:outline-none focus:border-emerald-700"
          />
          <p className="text-[11px] text-amber-800 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 text-amber-700 shrink-0" strokeWidth={1.5} />
            <span>Demandez ce code à votre gérant (visible dans ses Réglages).</span>
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim() || !email.trim() || (role === 'employee' && !shopCode.trim())}
        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl active:scale-[0.98] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>
          {loading
            ? 'Création...'
            : role === 'owner'
              ? 'Créer mon compte propriétaire'
              : 'Rejoindre la boutique'}
        </span>
        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </form>
  )
}
