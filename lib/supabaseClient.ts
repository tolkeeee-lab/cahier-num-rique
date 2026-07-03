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
  return (
    supabaseUrl && 
    !supabaseUrl.includes('placeholder') && 
    supabaseKey && 
    !supabaseKey.includes('placeholder')
  )
}
