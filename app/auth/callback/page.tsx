'use client'

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
          throw new Error("Aucun paramètre d'authentification trouvé dans l'URL.")
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
    <div className="min-h-screen bg-[#f5efe0] flex items-center justify-center px-4">
      <div className="bg-[#faf5e8] border border-[#e2d6be] rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
        {status === 'loading' && (
          <>
            <Loader2 className="w-8 h-8 text-emerald-700 animate-spin mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-stone-900 font-semibold text-sm">Connexion en cours</p>
            <p className="text-stone-500 text-xs mt-1.5">Vérification de votre invitation</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-11 h-11 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center mx-auto mb-4 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <p className="text-stone-900 font-semibold text-sm">Connexion réussie</p>
            <p className="text-stone-500 text-xs mt-1.5">Redirection vers votre cahier</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-11 h-11 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center mx-auto mb-4 text-rose-700">
              <AlertTriangle className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <p className="text-stone-900 font-semibold text-sm">Lien invalide ou expiré</p>
            <p className="text-stone-600 text-xs mt-1.5">{message}</p>
            <p className="text-stone-500 text-[11px] mt-3">Demandez à votre gérant de vous renvoyer une invitation.</p>
          </>
        )}
      </div>
    </div>
  )
}
