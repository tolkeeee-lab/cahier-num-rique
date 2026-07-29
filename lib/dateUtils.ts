/**
 * dateUtils.ts — Gestion unifiée de la date locale (YYYY-MM-DD)
 * Garantit l'alignement sur le fuseau horaire local (Africa/Porto-Novo / GMT+1)
 * et évite le décalage UTC qui gardait l'ancien jour après minuit.
 */

export function getTodayDateString(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'Africa/Porto-Novo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d)
  } catch {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}
