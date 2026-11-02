/**
 * lib/errorDiagnostics.ts
 *
 * Moteur Canonique de Télémétrie, d'Auto-Diagnostic et d'Assistance Commerçante
 * pour le projet Cahier Numérique.
 *
 * Rôles :
 * 1. Traduire instantanément toute anomalie technique en explications humaines compréhensibles.
 * 2. Journaliser les erreurs dans un tampon local circulaire résilient (max 50 entrées).
 * 3. Générer des rapports d'audit prêts pour le support (Copie Presse-Papier & WhatsApp 1-clic).
 * 4. Fournir un téléguidage clair sans jamais effrayer le boutiquier ni bloquer l'usage hors-ligne.
 *
 * Invariant : Ce module ne lève JAMAIS d'exception (Zéro Crash).
 */

export type ErrorCategory =
  | 'network'
  | 'supabase_sync'
  | 'storage'
  | 'pwa_cache'
  | 'auth'
  | 'runtime'

export interface AppErrorRecord {
  id: string
  timestamp: string
  formattedDate: string
  category: ErrorCategory
  title: string
  advice: string
  technicalMessage: string
  stack?: string
  digest?: string
  url: string
  isOnline: boolean
  userAgent: string
  shopId?: string
  context?: Record<string, unknown>
}

export interface TranslatedError {
  category: ErrorCategory
  title: string
  advice: string
  technicalMessage: string
  stack?: string
  digest?: string
}

const STORAGE_KEY = 'cahier_error_logs'
const MAX_LOGS = 50
const DEFAULT_SUPPORT_PHONE = '+22997000000'

// Mémoire de secours si localStorage est indisponible ou saturé
let inMemoryLogs: AppErrorRecord[] = []

/**
 * Traduit une erreur brute (Error, DOMException, objet Supabase, chaîne)
 * en un diagnostic commerçant clair avec conseils pratiques.
 */
export function translateErrorToPlainLanguage(
  error: unknown,
  fallbackDigest?: string
): TranslatedError {
  try {
    let rawMessage = ''
    let stack: string | undefined = undefined
    let digest: string | undefined = fallbackDigest

    if (error instanceof Error) {
      rawMessage = error.message || error.name || 'Erreur non spécifiée'
      stack = error.stack
      if ((error as { digest?: string }).digest) {
        digest = (error as { digest?: string }).digest
      }
    } else if (typeof error === 'string') {
      rawMessage = error
    } else if (error && typeof error === 'object') {
      const obj = error as Record<string, unknown>
      rawMessage = String(obj.message || obj.error_description || obj.error || JSON.stringify(obj))
      if (typeof obj.digest === 'string') digest = obj.digest
    } else {
      rawMessage = 'Une interruption inattendue est survenue'
    }

    const lower = rawMessage.toLowerCase()

    // 1. Détection Réseau / Connexion
    if (
      lower.includes('fetch') ||
      lower.includes('networkerror') ||
      lower.includes('load failed') ||
      lower.includes('failed to fetch') ||
      lower.includes('econnrefused') ||
      lower.includes('net::err_') ||
      lower.includes('internet_disconnected') ||
      lower.includes('offline')
    ) {
      return {
        category: 'network',
        title: 'Connexion internet momentanément coupée',
        advice:
          'Votre appareil a perdu le contact avec internet. Pas d’inquiétude : toutes vos ventes sont enregistrées sur cet appareil. Cliquez sur "Ouvrir en Mode Hors-Ligne" pour continuer à encaisser vos clients.',
        technicalMessage: rawMessage,
        stack,
        digest,
      }
    }

    // 1.5. Détection coupure de veille mobile (WebKit / Safari transport failure)
    if (lower.includes('transport failure')) {
      return {
        category: 'supabase_sync',
        title: 'Reprise après mise en veille mobile',
        advice:
          'Votre téléphone est sorti de veille ou a changé de connexion (Wi-Fi/4G). La liaison se rétablit automatiquement. Toutes vos ventes locales restent 100% protégées.',
        technicalMessage: rawMessage,
        stack,
        digest,
      }
    }

    // 2. Détection Supabase & Synchronisation Temps Réel
    if (
      lower.includes('postgres_changes') ||
      lower.includes('realtime') ||
      lower.includes('channel') ||
      lower.includes('subscribe') ||
      lower.includes('supabase') ||
      lower.includes('pgrst') ||
      lower.includes('websocket') ||
      lower.includes('jwt expired')
    ) {
      return {
        category: 'supabase_sync',
        title: 'Liaison de synchronisation perturbée',
        advice:
          'La liaison automatique entre votre appareil et le serveur distant a été coupée. Vos données locales sont en totale sécurité. Cliquez sur "Relancer l\'affichage" pour rétablir la liaison.',
        technicalMessage: rawMessage,
        stack,
        digest,
      }
    }

    // 3. Détection Saturation Mémoire / Stockage
    if (
      lower.includes('quota') ||
      lower.includes('quotaexceedederror') ||
      lower.includes('ns_error_dom_quota_reached') ||
      lower.includes('indexeddb') ||
      lower.includes('idb') ||
      lower.includes('database full')
    ) {
      return {
        category: 'storage',
        title: 'Espace de stockage local saturé',
        advice:
          'La mémoire allouée à votre navigateur pour l\'application est presque pleine ou restreinte par un mode privé. Vérifiez l’espace disponible sur votre téléphone ou fermez les onglets privés.',
        technicalMessage: rawMessage,
        stack,
        digest,
      }
    }

    // 4. Détection Cache PWA & Morceaux de Script Obsolètes
    if (
      lower.includes('chunk') ||
      lower.includes('loading chunk') ||
      lower.includes('serviceworker') ||
      lower.includes('sw.js') ||
      lower.includes('css chunk')
    ) {
      return {
        category: 'pwa_cache',
        title: 'Mise à jour du logiciel disponible',
        advice:
          'Une nouvelle version améliorée du Cahier Numérique a été publiée. Cliquez sur "Relancer l\'affichage" ou "Actualiser" pour charger la toute dernière version sans perte de données.',
        technicalMessage: rawMessage,
        stack,
        digest,
      }
    }

    // 5. Détection Authentification & Session
    if (
      lower.includes('authsessionmissing') ||
      lower.includes('invalid refresh token') ||
      lower.includes('non authentifié') ||
      lower.includes('401') ||
      lower.includes('unauthorized')
    ) {
      return {
        category: 'auth',
        title: 'Session de connexion expirée',
        advice:
          'Votre session sécurisée a expiré. Veuillez vous reconnecter avec votre code de boutique ou votre mot de passe pour reprendre le travail.',
        technicalMessage: rawMessage,
        stack,
        digest,
      }
    }

    // 6. Rendu React / Erreur d'Exécution Générique
    return {
      category: 'runtime',
      title: 'Interruption temporaire de l\'affichage',
      advice:
        'Une composante visuelle n\'a pas pu s\'afficher correctement. Vos ventes restent intactes sur cet appareil. Cliquez sur "Relancer l\'affichage" ou basculez en "Mode Hors-Ligne".',
      technicalMessage: rawMessage,
      stack,
      digest,
    }
  } catch (diagError) {
    return {
      category: 'runtime',
      title: 'Interruption imprévue',
      advice:
        'Une anomalie est survenue. Vos données locales restent en sécurité. Cliquez sur "Relancer l\'affichage".',
      technicalMessage: String(diagError),
    }
  }
}

/**
 * Capture et enregistre un incident dans le tampon circulaire local.
 * Dispatch l'événement 'cahier_error_captured' pour mise à jour UI réactive.
 */
export function captureAppError(
  error: unknown,
  context?: Record<string, unknown>
): AppErrorRecord {
  try {
    const translated = translateErrorToPlainLanguage(
      error,
      typeof context?.digest === 'string' ? context.digest : undefined
    )

    const now = new Date()
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Server/Node'
    const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

    let shopId: string | undefined = undefined
    if (typeof window !== 'undefined') {
      try {
        shopId =
          localStorage.getItem('cahier_current_shop_id') ||
          localStorage.getItem('current_shop_code') ||
          sessionStorage.getItem('cahier_current_shop_id') ||
          undefined
      } catch {}
    }

    const record: AppErrorRecord = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now.toISOString(),
      formattedDate: now.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      category: translated.category,
      title: translated.title,
      advice: translated.advice,
      technicalMessage: translated.technicalMessage,
      stack: translated.stack,
      digest: translated.digest,
      url: currentUrl,
      isOnline,
      userAgent,
      shopId: shopId || (typeof context?.shopId === 'string' ? context.shopId : undefined),
      context,
    }

    saveRecordLocally(record)

    if (typeof window !== 'undefined') {
      try {
        const evt = new CustomEvent('cahier_error_captured', { detail: record })
        window.dispatchEvent(evt)
      } catch {}
    }

    return record
  } catch (err) {
    // Filet de sécurité ultime : retourne un enregistrement minimal sans jamais planter
    return {
      id: `err_fallback_${Date.now()}`,
      timestamp: new Date().toISOString(),
      formattedDate: new Date().toLocaleTimeString('fr-FR'),
      category: 'runtime',
      title: 'Incident capturé en mode sécurité',
      advice: 'Cliquez sur Relancer pour réactualiser votre affichage.',
      technicalMessage: String(err),
      url: '',
      isOnline: true,
      userAgent: '',
    }
  }
}

/**
 * Sauvegarde sécurisée dans localStorage avec rotation circulaire (max 50)
 */
function saveRecordLocally(record: AppErrorRecord): void {
  try {
    inMemoryLogs.unshift(record)
    if (inMemoryLogs.length > MAX_LOGS) {
      inMemoryLogs = inMemoryLogs.slice(0, MAX_LOGS)
    }

    if (typeof window === 'undefined') return

    const raw = localStorage.getItem(STORAGE_KEY)
    let logs: AppErrorRecord[] = []
    if (raw) {
      try {
        logs = JSON.parse(raw)
      } catch {
        logs = []
      }
    }

    logs.unshift(record)
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(0, MAX_LOGS)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch {
    // Si localStorage est plein ou inaccessible, inMemoryLogs conserve les traces
  }
}

/**
 * Récupère l'historique récent des incidents
 */
export function getRecentErrorLogs(): AppErrorRecord[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    }
  } catch {}
  return [...inMemoryLogs]
}

/**
 * Récupère la dernière erreur enregistrée (utile dans les Error Boundaries si error.message est masqué)
 */
export function getLatestErrorRecord(): AppErrorRecord | null {
  const logs = getRecentErrorLogs()
  return logs.length > 0 ? logs[0] : null
}

/**
 * Vide le journal d'erreurs local
 */
export function clearErrorLogs(): void {
  inMemoryLogs = []
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {}
}

/**
 * Formate un rapport textuel propre et lisible pour l'équipe technique
 */
export function formatDiagnosticReport(record: AppErrorRecord): string {
  const lines = [
    '🩺 *DIAGNOSTIC TECHNIQUE - CAHIER NUMÉRIQUE*',
    `📅 Date : ${record.formattedDate}`,
    `🏪 Boutique : ${record.shopId || 'Non spécifiée'}`,
    `🏷️ Catégorie : ${record.category}`,
    `💡 Titre : ${record.title}`,
    `🌐 Statut Réseau : ${record.isOnline ? 'En ligne (Wi-Fi/4G)' : 'Hors-ligne'}`,
    `🔗 Page : ${record.url || 'Non renseignée'}`,
    `🔍 Cause technique : ${record.technicalMessage}`,
  ]

  if (record.digest) {
    lines.push(`🔑 Réf React (Digest) : ${record.digest}`)
  }

  if (record.stack) {
    const compactStack = record.stack
      .split('\n')
      .slice(0, 5)
      .map(s => s.trim())
      .join('\n  ')
    lines.push(`📜 Pile d'exécution :\n  ${compactStack}`)
  }

  lines.push(`📱 Navigateur : ${record.userAgent.slice(0, 120)}...`)
  lines.push('----------------------------------------')
  lines.push('✅ Vos données locales restent protégées.')

  return lines.join('\n')
}

/**
 * Copie le rapport de diagnostic dans le presse-papier avec repli universel
 */
export async function copyErrorDiagnostics(record: AppErrorRecord): Promise<boolean> {
  const report = formatDiagnosticReport(record)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(report)
      return true
    }
  } catch {}

  // Repli via textarea virtuel si l'API Clipboard est bloquée
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea')
      textarea.value = report
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    }
  } catch {}

  return false
}

/**
 * Génère un lien direct WhatsApp pré-rempli pour envoyer le rapport au support
 */
export function generateWhatsAppErrorReportUrl(
  record: AppErrorRecord,
  phoneNumber: string = DEFAULT_SUPPORT_PHONE
): string {
  const report = formatDiagnosticReport(record)
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(report)}`
}

