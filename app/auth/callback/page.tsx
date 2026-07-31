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

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. Lire les paramètres de l'URL (query string)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const errorParam = params.get('error')
        const errorDescription = params.get('error_description')

        // Erreur explicite dans l'URL
        if (errorParam) {
          setStatus('error')
          setMessage(errorDescription || errorParam)
          setTimeout(() => router.replace(`/?auth_error=${encodeURIComponent(errorDescription || errorParam)}`), 2000)
          return
        }

        // 2. Si un code PKCE est présent, l'échanger
        if (code) {
          const { error } = await supabaseClient.auth.exchangeCodeForSession(code)
          if (error) {
            setStatus('error')
            setMessage(error.message)
            setTimeout(() => router.replace(`/?auth_error=${encodeURIComponent(error.message)}`), 2000)
            return
          }
          setStatus('success')
          setTimeout(() => router.replace('/journal'), 1000)
          return
        }

        // 3. Sinon : vérifier si une session existe déjà via le fragment #access_token=...
        // Le client Supabase avec detectSessionInUrl:true lit automatiquement le hash
        const { data: { session } } = await supabaseClient.auth.getSession()

        if (session) {
          setStatus('success')
          setTimeout(() => router.replace('/journal'), 1000)
          return
        }

        // 4. Attendre un peu que Supabase traite le hash (peut prendre quelques ms)
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data: { session: session2 } } = await supabaseClient.auth.getSession()

        if (session2) {
          setStatus('success')
          setTimeout(() => router.replace('/journal'), 1000)
          return
        }

        // 5. Rien trouvé — lien invalide ou expiré
        setStatus('error')
        setMessage('Lien d\'invitation invalide ou expiré.')
        setTimeout(() => router.replace(`/?auth_error=${encodeURIComponent('Lien d\'invitation invalide ou expiré.')}`), 2000)
      } catch (err: any) {
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
            <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-amber-400 font-bold text-sm uppercase tracking-widest">Connexion en cours...</p>
            <p className="text-gray-500 text-xs mt-2 font-mono">Vérification de votre invitation</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <p className="text-emerald-400 font-bold text-sm uppercase tracking-widest">Connexion réussie !</p>
            <p className="text-gray-400 text-xs mt-2">Redirection vers votre cahier...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-400 font-bold text-sm uppercase tracking-widest">Lien invalide ou expiré</p>
            <p className="text-gray-400 text-xs mt-2">{message}</p>
            <p className="text-gray-500 text-[10px] mt-3 font-mono">Demandez à votre gérant de vous renvoyer une invitation.</p>
          </>
        )}
      </div>
    </div>
  )
}
