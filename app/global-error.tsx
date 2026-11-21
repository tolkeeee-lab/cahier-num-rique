'use client'

import React, { useState, useMemo } from 'react'
import {
  RefreshCw,
  BookOpen,
  WifiOff,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from 'lucide-react'
import {
  captureAppError,
  copyErrorDiagnostics,
  generateWhatsAppErrorReportUrl,
  type AppErrorRecord,
} from '@/lib/errorDiagnostics'

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  const incidentRecord = useMemo<AppErrorRecord>(() => {
    return captureAppError(error, { source: 'app/global-error.tsx', digest: error?.digest })
  }, [error])

  const handleReload = () => {
    try {
      reset()
    } catch {}
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  const handleForceOfflineMode = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('cahier_force_offline', 'true')
      } catch {}
      window.location.href = '/journal?offline=true'
      window.location.reload()
    }
  }

  const handleCopyDiagnostics = async () => {
    const success = await copyErrorDiagnostics(incidentRecord)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const whatsAppUrl = useMemo(() => {
    return generateWhatsAppErrorReportUrl(incidentRecord)
  }, [incidentRecord])

  return (
    <html lang="fr">
      <body className="bg-[#f5efe0] min-h-screen flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-md bg-[#faf5e8] border border-[#e2d6be] rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-5">
          <div className="w-12 h-12 mx-auto rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-800">
            <BookOpen className="w-6 h-6" strokeWidth={1.5} />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-stone-900 tracking-tight">
              Cahier Numérique
            </h2>
            <p className="text-xs text-stone-600">
              Une interruption globale est survenue
            </p>
          </div>

          <div className="p-4 bg-white border border-stone-200 rounded-xl text-left space-y-1">
            <h3 className="text-xs font-semibold text-stone-900">
              {incidentRecord.title}
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {incidentRecord.advice}
            </p>
          </div>

          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed text-left flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" strokeWidth={1.75} />
            <span>
              Toutes vos ventes locales sont <span className="font-semibold">en sécurité sur cet appareil</span>.
            </span>
          </div>

          <div className="text-left border border-stone-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <span>Détails techniques</span>
              {showTechnicalDetails ? (
                <ChevronUp className="w-4 h-4 text-stone-500" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone-500" strokeWidth={1.5} />
              )}
            </button>

            {showTechnicalDetails && (
              <div className="p-3 border-t border-stone-200 bg-stone-900 space-y-1.5 overflow-x-auto text-left">
                <p className="text-[11px] text-rose-300 font-mono break-all select-text">
                  {incidentRecord.technicalMessage}
                </p>
                {incidentRecord.digest && (
                  <p className="text-[10px] text-stone-400 font-mono">
                    Réf : {incidentRecord.digest}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleReload}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-colors"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
              <span>Relancer l&apos;application</span>
            </button>

            <button
              type="button"
              onClick={handleForceOfflineMode}
              className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 text-stone-800 text-xs font-medium rounded-xl border border-stone-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-colors"
            >
              <WifiOff className="w-4 h-4 text-stone-600" strokeWidth={1.5} />
              <span>Ouvrir en mode hors-ligne</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyDiagnostics}
                className="py-2 px-3 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium rounded-xl border border-stone-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                    <span className="text-emerald-700">Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.5} />
                    <span>Copier diagnostic</span>
                  </>
                )}
              </button>

              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97] transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.5} />
                <span>Aide WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
