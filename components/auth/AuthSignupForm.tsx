'use client'

import React, { useState } from 'react'
import { User, Mail, Lock, Store, Key, ArrowRight, ShieldCheck, Users } from 'lucide-react'

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
    <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Sélecteur de rôle : Propriétaire ou Employé */}
      <div>
        <label className="block text-gray-300 font-bold uppercase mb-1.5">
          Je crée un compte en tant que :
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole('owner')}
            className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
              role === 'owner'
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md ring-1 ring-amber-500/30'
                : 'bg-[#141210] border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Propriétaire</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('employee')}
            className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
              role === 'employee'
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md ring-1 ring-amber-500/30'
                : 'bg-[#141210] border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Employé / Vendeur</span>
          </button>
        </div>
      </div>

      {/* Nom complet */}
      <div>
        <label className="block text-gray-300 font-bold uppercase mb-1">
          Votre Nom Complet :
        </label>
        <div className="relative">
          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Koffi Kouassi"
            required
            className="w-full pl-9 pr-3 py-2.5 bg-[#141210] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Adresse e-mail */}
      <div>
        <label className="block text-gray-300 font-bold uppercase mb-1">
          Adresse e-mail :
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre.email@exemple.com"
            required
            className="w-full pl-9 pr-3 py-2.5 bg-[#141210] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Mot de passe */}
      <div>
        <label className="block text-gray-300 font-bold uppercase mb-1">
          Mot de passe :
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full pl-9 pr-3 py-2.5 bg-[#141210] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Si Propriétaire : Nom du commerce */}
      {role === 'owner' ? (
        <div>
          <label className="block text-gray-300 font-bold uppercase mb-1">
            Nom de votre commerce / boutique :
          </label>
          <div className="relative">
            <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="ex: Boutique Espoir"
              className="w-full pl-9 pr-3 py-2.5 bg-[#141210] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>
      ) : (
        /* Si Employé : Code Boutique du Propriétaire */
        <div>
          <label className="block text-[#f59e0b] font-bold uppercase mb-1">
            Code Boutique du Propriétaire :
          </label>
          <div className="relative">
            <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#f59e0b]" />
            <input
              type="text"
              value={shopCode}
              onChange={(e) => setShopCode(e.target.value.toUpperCase())}
              placeholder="ex: BTQ-58C54"
              required
              className="w-full pl-9 pr-3 py-2.5 bg-[#141210] border border-[#f59e0b]/50 rounded-xl text-[#f59e0b] font-bold placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Demandez ce code à votre patron/gérant (il le trouve dans ses Réglages).
          </p>
        </div>
      )}

      {/* Bouton de création */}
      <button
        type="submit"
        disabled={loading || !name.trim() || !email.trim() || (role === 'employee' && !shopCode.trim())}
        className="w-full py-3 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#141210] font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
      >
        <span>
          {loading
            ? 'Création...'
            : role === 'owner'
              ? 'Créer Mon Compte Propriétaire'
              : 'Rejoindre la Boutique'}
        </span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  )
}

