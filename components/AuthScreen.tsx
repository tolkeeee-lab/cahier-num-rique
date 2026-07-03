'use client'

import React, { useState } from 'react'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'
import { Loader, AlertTriangle, Eye, EyeOff, Lock, ArrowRight, UserPlus, LogIn } from 'lucide-react'

interface AuthScreenProps {
  onBypass: () => void
  onLoginSuccess?: (user: any) => void
}

export function AuthScreen({ onBypass, onLoginSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isConfigured = isSupabaseClientConfigured()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (isConfigured) {
        // --- AUTH SUPABASE ---
        if (isSignUp) {
          const { error: signUpError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name || 'Propriétaire',
              },
            },
          })
          if (signUpError) throw signUpError
          setSuccess('✓ Compte créé avec succès ! Connectez-vous maintenant.')
          setIsSignUp(false)
        } else {
          const { data, error: loginError } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
          })
          if (loginError) throw loginError
          if (onLoginSuccess && data.user) {
            onLoginSuccess(data.user)
          }
          setSuccess('✓ Connexion réussie !')
        }
      } else {
        // --- AUTH LOCAL STORAGE FALLBACK ---
        const storedUsers = JSON.parse(localStorage.getItem('cahier_mock_users') || '[]')
        
        if (isSignUp) {
          // Inscription locale
          const userExists = storedUsers.some((u: any) => u.email === email)
          if (userExists) {
            throw new Error('Cet e-mail est déjà utilisé localement.')
          }
          
          const newUser = {
            id: Math.random().toString(36).substring(2, 9),
            email,
            password,
            full_name: name || 'Propriétaire'
          }
          
          storedUsers.push(newUser)
          localStorage.setItem('cahier_mock_users', JSON.stringify(storedUsers))
          setSuccess('✓ Compte local créé ! Connectez-vous maintenant.')
          setIsSignUp(false)
        } else {
          // Connexion locale
          const matchedUser = storedUsers.find((u: any) => u.email === email && u.password === password)
          if (!matchedUser) {
            throw new Error('Identifiants locaux incorrects. Veuillez créer un compte.')
          }
          
          // Sauvegarder la session mock
          localStorage.setItem('cahier_mock_session', JSON.stringify(matchedUser))
          if (onLoginSuccess) {
            onLoginSuccess(matchedUser)
          }
          setSuccess('✓ Connexion locale réussie !')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#141210] flex items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Lamp bureau radial light highlight overlay */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-amber-500 opacity-[0.04] rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Closed Notebook Book Cover Chassis */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#064e3b] to-[#012b1c] rounded-[36px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),_inset_0_2px_4px_rgba(255,255,255,0.15),_inset_-10px_0_20px_rgba(0,0,0,0.8)] border border-[#02311f] p-8 z-10 flex flex-col items-center">
        
        {/* Book cover vertical spine binding stitches on the left */}
        <div className="absolute left-6 top-6 bottom-6 w-1 border-r-2 border-dashed border-[#f59e0b] opacity-25"></div>
        <div className="absolute left-7 top-0 bottom-0 w-2 bg-[#012015] shadow-inner opacity-40"></div>

        {/* Elegant brass screw locks on the left spine edge */}
        <div className="absolute left-3.5 top-12 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#fffbeb] via-[#f59e0b] to-[#78350f] shadow-md border border-[#b45309]"></div>
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#fffbeb] via-[#f59e0b] to-[#78350f] shadow-md border border-[#b45309]"></div>
        <div className="absolute left-3.5 bottom-12 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#fffbeb] via-[#f59e0b] to-[#78350f] shadow-md border border-[#b45309]"></div>

        {/* Book Cover Inscription Title (Gold foil typography) */}
        <div className="flex flex-col items-center mt-4 mb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#fffbeb] via-[#f59e0b] to-[#d97706] shadow-xl flex items-center justify-center border-2 border-[#b45309] mb-4 select-none transform hover:rotate-6 transition-transform">
            <Lock className="w-7 h-7 text-[#78350f]" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#f59e0b] tracking-wider uppercase font-sans">
            Cahier de Caisse
          </h2>
          <span className="text-[10px] text-[#f59e0b] opacity-60 tracking-[0.3em] font-mono uppercase mt-1">
            {isConfigured ? "Système Connecté" : "Système Local Autonome"}
          </span>
        </div>

        {/* School Owner Paper Label Sticker (Contient le formulaire) */}
        <div className="w-full bg-[#fefdfa] border-[3px] border-[#e2dcd0] rounded-2xl p-6 shadow-2xl relative z-20 flex flex-col">
          
          {/* Label visual guidelines */}
          <div className="text-center pb-4 mb-4 border-b border-[#e2dcd0] border-dashed">
            <h3 className="font-handwritten text-2xl text-gray-800 font-bold">
              {isSignUp ? "Création du Propriétaire" : "Registre de Caisse"}
            </h3>
            <p className="text-[10px] text-gray-400 font-mono mt-1 uppercase tracking-wider">
              Cahier No. 200 • Afrique de l'Ouest
            </p>
          </div>

          {!isConfigured && (
            <div className="mb-4 p-2.5 bg-sky-50 border border-sky-200 text-sky-850 rounded-xl text-[10px] leading-normal font-sans font-medium flex items-start gap-1.5">
              <span className="text-xs">💡</span>
              <span>Mode local actif : vous pouvez vous inscrire et vous connecter sans base de données externe. Vos données restent dans ce navigateur.</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 mb-4 font-sans font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 mb-4 font-sans font-medium">
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4 font-sans">
            {isSignUp && (
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                  Nom Complet / Boutique
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    required
                    placeholder="Boutique Chantal et Fils"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-3 pr-4 py-2.5 text-sm bg-[#fdfbf7] border border-[#dcd6c9] rounded-xl focus:border-gray-600 text-gray-800 transition-all font-medium placeholder-gray-300"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                Adresse E-mail
              </label>
              <div className="relative mt-1">
                <input
                  type="email"
                  required
                  placeholder="boutique@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-3 pr-4 py-2.5 text-sm bg-[#fdfbf7] border border-[#dcd6c9] rounded-xl focus:border-gray-600 text-gray-800 transition-all font-medium placeholder-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                Mot de passe
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 text-sm bg-[#fdfbf7] border border-[#dcd6c9] rounded-xl focus:border-gray-600 text-gray-800 transition-all font-medium placeholder-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-[#064e3b] hover:bg-[#043c2d] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? "Créer mon Compte" : "Ouvrir mon Cahier"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/SignUp - Toujours visible pour permettre l'inscription ! */}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
              setSuccess(null)
            }}
            className="mt-4 text-center text-xs text-[#064e3b] font-bold hover:underline flex items-center justify-center gap-1"
          >
            {isSignUp ? (
              <>
                <LogIn className="w-3 h-3" />
                <span>Déjà un compte ? Se connecter</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3 h-3" />
                <span>Créer un nouveau cahier de caisse</span>
              </>
            )}
          </button>

        </div>

        {/* Local Demo Bypass Button */}
        <button
          onClick={onBypass}
          className="mt-6 text-[10px] font-bold uppercase tracking-widest text-[#f59e0b] opacity-75 hover:opacity-100 transition-opacity flex items-center gap-1"
        >
          <span>Accéder directement sans compte (Mode Invité)</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        {/* Closed cover visual spine stitches footer */}
        <div className="text-[9px] text-[#f59e0b] opacity-40 font-mono tracking-widest mt-8 uppercase select-none">
          Propriété Privée • Interdit de Lire
        </div>

      </div>

    </div>
  )
}
