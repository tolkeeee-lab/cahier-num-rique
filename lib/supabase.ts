import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && typeof window === 'undefined') {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY absente côté serveur. Les requêtes API backend utiliseront NEXT_PUBLIC_SUPABASE_ANON_KEY.')
}

// Client Supabase sécurisé pour le backend (API Routes)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export const isBackendSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl && 
    !supabaseUrl.includes('placeholder') && 
    supabaseKey && 
    !supabaseKey.includes('placeholder')
  )
}

