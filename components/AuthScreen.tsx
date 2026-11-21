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
    <div className="min-h-screen bg-[#f5efe0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#faf5e8] border border-[#e2d6be] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <AuthHeader />

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-xs">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              mode === 'signup' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Créer un compte
          </button>
        </div>

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
