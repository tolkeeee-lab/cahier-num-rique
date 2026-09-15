'use client'

/**
 * /auth/callback — Page cliente de callback Supabase
 *
 * Supabase redirige ici après qu'un employé clique sur son lien d'invitation.
 * Le token peut arriver :
 *   - Dans le fragment de l'URL : #access_token=...&refresh_token=...&type=invite
 *   - Ou en query param : ?code=... (PKCE flow)
 *
 * Le client Supabase (avec detectSessionInUrl: true) gère les deux automatiquement.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabaseClient'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (!supabaseClient) {
          throw new Error('Supabase client non initialisé')
        }

        const hash = window.location.hash
        const search = window.location.search

        if (!hash && !search) {
          throw new Error('Aucun paramètre d\'authentification trouvé dans l\'URL.')
        }

        const { data, error } = await supabaseClient.auth.getSession()

        if (error) {
          console.error('[Auth Callback] Erreur getSession:', error)
          throw error
        }

        if (data.session) {
          setStatus('success')
          setTimeout(() => router.replace('/'), 1200)
          return
        }

        const { data: authListener } = supabaseClient.auth.onAuthStateChange(
          async (_event, session) => {
            if (session) {
              setStatus('success')
              authListener.subscription.unsubscribe()
              setTimeout(() => router.replace('/'), 1200)
            }
          }
        )

        setTimeout(() => {
          supabaseClient.auth.getSession().then(({ data: fallbackData }) => {
            if (fallbackData.session) {
              setStatus('success')
              router.replace('/')
            } else {
              setStatus('error')
              setMessage('Session non détectée après validation du lien. Veuillez vous reconnecter.')
            }
          })
        }, 3000)
      } catch (err: any) {
        console.error('[Auth Callback] Exception:', err)
        setStatus('error')
        setMessage(err?.message || 'Erreur inattendue')
        setTimeout(() => router.replace(`/?auth_error=${encodeURIComponent(err?.message || 'Erreur')}`), 2000)
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-[#141210] flex items-center justify-center px-4">
      <div className="bg-[#1c1a17] border border-gray-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-amber-400 font-bold text-sm uppercase tracking-widest">Connexion en cours...</p>
            <p className="text-gray-500 text-xs mt-2 font-mono">Vérification de votre invitation</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-emerald-400 font-bold text-sm uppercase tracking-widest">Connexion réussie !</p>
            <p className="text-gray-400 text-xs mt-2">Redirection vers votre cahier...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-rose-400 font-bold text-sm uppercase tracking-widest">Lien invalide ou expiré</p>
            <p className="text-gray-400 text-xs mt-2">{message}</p>
            <p className="text-gray-500 text-[10px] mt-3 font-mono">Demandez à votre gérant de vous renvoyer une invitation.</p>
          </>
        )}
      </div>
    </div>
  )
}
