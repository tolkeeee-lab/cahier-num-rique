import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /auth/callback
 *
 * Route de rappel (callback) Supabase Auth.
 * Appelée automatiquement quand un employé clique sur son lien d'invitation e-mail.
 *
 * Supabase ajoute en query string :
 *   - code         → code PKCE à échanger contre une session
 *   - error        → message d'erreur si le lien est invalide/expiré
 *
 * Après échange du code, on redirige vers /journal (l'app principale).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Lien invalide ou expiré
  if (error) {
    const msg = encodeURIComponent(errorDescription || error)
    return NextResponse.redirect(`${origin}/?auth_error=${msg}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?auth_error=Lien+d%27invitation+invalide`)
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // On utilise la clé anon ici (côté serveur pour l'échange de code)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError || !data.session) {
      console.error('[Auth Callback] Erreur échange code:', exchangeError)
      const msg = encodeURIComponent(exchangeError?.message || 'Session invalide')
      return NextResponse.redirect(`${origin}/?auth_error=${msg}`)
    }

    // Échange réussi — construire la réponse avec les cookies de session
    const response = NextResponse.redirect(`${origin}/journal`)

    // Stocker les tokens dans des cookies HttpOnly sécurisés
    // (Supabase SSR gère ça automatiquement via @supabase/ssr dans les apps Next.js)
    // Ici on force la redirection propre vers /journal où la session sera reprise côté client.
    response.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.session.expires_in || 3600,
      path: '/'
    })
    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: '/'
    })

    return response
  } catch (err: any) {
    console.error('[Auth Callback] Erreur inattendue:', err)
    const msg = encodeURIComponent(err?.message || 'Erreur de connexion')
    return NextResponse.redirect(`${origin}/?auth_error=${msg}`)
  }
}
