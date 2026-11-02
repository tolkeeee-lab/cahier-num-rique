'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  captureAppError,
  copyErrorDiagnostics,
  generateWhatsAppErrorReportUrl,
  type AppErrorRecord,
} from '@/lib/errorDiagnostics'
import { AlertTriangle, Copy, Check, ExternalLink, X } from 'lucide-react'

/**
 * ErrorDiagnosticsProvider.tsx
 *
 * Fournisseur racine d'interception d'incidents et de téléguidage commerçant.
 * Intercepte les rejets de promesses non gérés et les erreurs globales.
 * Affiche une notification discrète et non bloquante avec copie 1-clic du diagnostic.
 */
export function ErrorDiagnosticsProvider({ children }: { children: React.ReactNode }) {
  const [activeIncident, setActiveIncident] = useState<AppErrorRecord | null>(null)
  const [copied, setCopied] = useState(false)
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleDismiss = useCallback(() => {
    setActiveIncident(null)
    setCopied(false)
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current)
      autoDismissTimerRef.current = null
    }
  }, [])

  const handleCopy = useCallback(async () => {
    if (!activeIncident) return
    const success = await copyErrorDiagnostics(activeIncident)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [activeIncident])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Interception des erreurs runtime non gérées
    const handleGlobalError = (event: ErrorEvent) => {
      // Ignorer les erreurs d'annulation normales
      if (event.error?.name === 'AbortError' || event.message?.includes('ResizeObserver')) {
        return
      }
      const record = captureAppError(event.error || event.message, {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })

      // Afficher une alerte discrète uniquement pour les erreurs réseau ou de synchronisation
      if (record.category === 'network' || record.category === 'supabase_sync') {
        setActiveIncident(record)
        if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
        autoDismissTimerRef.current = setTimeout(handleDismiss, 10000)
      }
    }

    // 2. Interception des rejets de promesses non gérées
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      if (reason?.name === 'AbortError' || String(reason).includes('AbortError')) {
        return
      }

      const record = captureAppError(reason, {
        source: 'window.onunhandledrejection',
      })

      // Ne pas spammer l'UI si l'utilisateur est délibérément hors-ligne
      if (record.category === 'network' && !navigator.onLine) {
        return
      }

      if (record.category === 'network' || record.category === 'supabase_sync') {
        setActiveIncident(record)
        if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
        autoDismissTimerRef.current = setTimeout(handleDismiss, 10000)
      }
    }

    // 3. Écoute de l'événement personnalisé dispatched par captureAppError
    const handleCustomCapture = (event: Event) => {
      const customEvt = event as CustomEvent<AppErrorRecord>
      if (customEvt.detail && (customEvt.detail.category === 'supabase_sync')) {
        setActiveIncident(customEvt.detail)
        if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
        autoDismissTimerRef.current = setTimeout(handleDismiss, 10000)
      }
    }

    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('cahier_error_captured', handleCustomCapture)

    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('cahier_error_captured', handleCustomCapture)
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
    }
  }, [handleDismiss])

  return (
    <>
      {children}

      {/* Toast non-bloquant pour incidents en arrière-plan */}
      {activeIncident && (
        <aside
          role="alert"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-300"
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="flex flex-col gap-2 p-3.5 sm:p-4 rounded-2xl bg-[#14151b]/95 backdrop-blur-md border border-amber-500/40 text-white shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <AlertTriangle className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-amber-200 tracking-tight leading-tight">
                    {activeIncident.title}
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-2">
                    {activeIncident.advice}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Fermer l'alerte"
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors active:scale-[0.95] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Actions rapides */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
              <span className="text-[10px] text-emerald-400 font-medium">
                ✓ Données locales intactes
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/15 text-slate-200 rounded-lg cursor-pointer transition-transform active:scale-[0.97]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300 font-semibold">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copier le diagnostic</span>
                    </>
                  )}
                </button>

                <a
                  href={generateWhatsAppErrorReportUrl(activeIncident)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700/80 hover:bg-emerald-600 text-white font-medium rounded-lg cursor-pointer transition-transform active:scale-[0.97]"
                >
                  <span>Support</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
