/**
 * localDb.ts — Fallback en mémoire côté SERVEUR (Dev / Tests uniquement)
 *
 * Ce module fournit un stockage de secours temporaire en mémoire utilisé par
 * les API Routes quand Supabase n'est pas configuré en environnement local.
 *
 * ⚠️ En production (Vercel), Supabase est obligatoire et les écritures disques sont proscrites.
 * ⚠️ NE PAS importer ce fichier côté client. Utiliser lib/offlineDb.ts.
 */

let inMemoryDb: any[] = []

export function getLocalDb(): any[] {
  return inMemoryDb
}

export function saveLocalDb(data: any[]) {
  inMemoryDb = Array.isArray(data) ? [...data] : []
}
