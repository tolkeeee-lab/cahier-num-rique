'use client'

import React, { useState } from 'react'
import { AuthHeader } from './auth/AuthHeader'
import { AuthLoginForm } from './auth/AuthLoginForm'
import { AuthSignupForm } from './auth/AuthSignupForm'

export interface AuthScreenProps {
  onLogin?: (email: string, password?: string) => Promise<void>
  onSignup?: (name: string, email: string, password?: string, shopName?: string, role?: 'owner' | 'employee', shopCode?: string) => Promise<void>
  onMagicLink?: (email: string) => Promise<void>
  onBypass?: (role?: any) => void
  onLoginSuccess?: (usr?: any) => void
  loading?: boolean
  error?: string | null
}

export function AuthScreen({
  onLogin = async () => {},
  onSignup = async () => {},
  onMagicLink,
  loading = false,
  error = null,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <div className="min-h-screen bg-[#141210] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1e1a18] border border-[#2a2421] rounded-3xl p-6 shadow-2xl space-y-6">
        
        {/* En-tête de marque */}
        <AuthHeader />

        {/* Sélecteur Mode Connexion / Inscription */}
        <div className="flex items-center gap-1 bg-[#141210] p-1 rounded-2xl border border-gray-800 font-mono text-xs">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all ${
              mode === 'login' ? 'bg-[#2a2421] text-amber-400 shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Se Connecter
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-xl font-bold transition-all ${
              mode === 'signup' ? 'bg-[#2a2421] text-amber-400 shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Créer un Compte
          </button>
        </div>

        {/* Formulaire sélectionné */}
        {mode === 'login' ? (
          <AuthLoginForm
            onLogin={onLogin}
            onMagicLink={onMagicLink}
            loading={loading}
            error={error}
          />
        ) : (
          <AuthSignupForm
            onSignup={onSignup}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </div>
  )
}
