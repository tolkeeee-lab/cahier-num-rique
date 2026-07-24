import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Client-side singleton Supabase client
export const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Détecte si les variables Supabase client sont valides
export const isSupabaseClientConfigured = () => {
  return Boolean(
    supabaseUrl && 
    !supabaseUrl.includes('placeholder') && 
    supabaseKey && 
    !supabaseKey.includes('placeholder')
  )
}

// Vérifie l'état de la connexion et retourne un diagnostic précis
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; code?: number }> {
  if (!isSupabaseClientConfigured()) {
    return { 
      ok: false, 
      message: 'Les variables d\'environnement Supabase (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY) ne sont pas configurées.',
      code: 400
    }
  }

  try {
    const { error } = await supabaseClient.from('sales').select('id', { count: 'exact', head: true })
    if (error) {
      if (error.code === 'PGRST301' || error.message?.includes('401') || error.message?.includes('JWT')) {
        return {
          ok: false,
          message: 'Erreur 401 Unauthorized : Clé API Supabase invalide/expirée ou politiques RLS non appliquées.',
          code: 401
        }
      }
      return { ok: false, message: `Erreur Supabase (${error.code || 'inconnue'}) : ${error.message}`, code: 500 }
    }
    return { ok: true, message: 'Connexion à la base de données Supabase active.' }
  } catch (err: any) {
    return { ok: false, message: `Impossible de contacter Supabase : ${err?.message || err}`, code: 500 }
  }
}

