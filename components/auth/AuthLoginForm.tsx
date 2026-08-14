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
    <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Champ E-mail */}
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

      {/* Champ Mot de passe (si non Magic Link) */}
      {!useMagicLink && (
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
      )}

      {/* Option Magic Link */}
      {onMagicLink && (
        <div className="flex items-center justify-between text-[11px] pt-1">
          <button
            type="button"
            onClick={() => setUseMagicLink(!useMagicLink)}
            className="text-amber-400 hover:underline flex items-center gap-1"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{useMagicLink ? 'Utiliser mot de passe' : 'Connexion sans mot de passe (Magic Link)'}</span>
          </button>
        </div>
      )}

      {/* Bouton de validation */}
      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="w-full py-3 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#141210] font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
      >
        <span>{loading ? 'Connexion...' : useMagicLink ? 'Envoyer le lien de connexion' : 'Se Connecter'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  )
}
