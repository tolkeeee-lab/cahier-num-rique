'use client'

import React, { useState } from 'react'
import { Lock, Mail, ArrowRight, Wand2 } from 'lucide-react'

interface AuthLoginFormProps {
  onLogin: (email: string, password?: string) => Promise<void>
  onMagicLink?: (email: string) => Promise<void>
  loading?: boolean
  error?: string | null
}

export const AuthLoginForm: React.FC<AuthLoginFormProps> = ({
  onLogin,
  onMagicLink,
  loading = false,
  error,
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [useMagicLink, setUseMagicLink] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    if (useMagicLink && onMagicLink) {
      await onMagicLink(email.trim())
    } else {
      await onLogin(email.trim(), password)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

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

      {!useMagicLink && (
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
      )}

      {onMagicLink && (
        <div className="flex items-center justify-between text-xs pt-0.5">
          <button
            type="button"
            onClick={() => setUseMagicLink(!useMagicLink)}
            className="text-emerald-700 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{useMagicLink ? 'Utiliser un mot de passe' : 'Connexion sans mot de passe'}</span>
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl active:scale-[0.98] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>{loading ? 'Connexion...' : useMagicLink ? 'Envoyer le lien de connexion' : 'Se connecter'}</span>
        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </form>
  )
}
