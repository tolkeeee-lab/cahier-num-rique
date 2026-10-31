/**
 * @deprecated Ce module est obsolète. Les routes API utilisent désormais exclusivement Supabase,
 * et le mode hors-ligne est assuré de bout en bout par IndexedDB côté client.
 */

let inMemoryDb: any[] = []

export function getLocalDb(): any[] {
  return inMemoryDb
}

export function saveLocalDb(data: any[]) {
  inMemoryDb = Array.isArray(data) ? [...data] : []
}
