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
    <html lang="fr" className="dark">
      <body className="bg-[#141210] min-h-screen flex items-center justify-center p-4 font-mono select-none">
        <div className="w-full max-w-md bg-[#fdfaf2] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
          
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-800 shadow-inner">
            <BookOpen className="w-8 h-8" strokeWidth={2} />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-amber-950 font-handwritten tracking-wide">
              Cahier Numérique
            </h2>
            <p className="text-xs text-amber-900/80 font-bold">
              Une interruption globale est survenue.
            </p>
          </div>

          {/* Diagnostic en Français Simple */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-300/80 rounded-2xl text-left space-y-1.5">
            <h3 className="text-xs font-black text-amber-950">
              {incidentRecord.title}
            </h3>
            <p className="text-[11px] text-amber-900/90 leading-relaxed font-sans">
              {incidentRecord.advice}
            </p>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-[11px] text-emerald-950 font-bold leading-relaxed text-left flex items-start gap-2">
            <div className="p-1 rounded-md bg-emerald-200 text-emerald-900 mt-0.5 shrink-0 text-xs font-black">
              ✓
            </div>
            <div>
              <span>Toutes vos ventes locales sont </span>
              <span className="text-emerald-800 font-extrabold underline">en sécurité sur cet appareil</span>.
            </div>
          </div>

          {/* Accordéon Détails Techniques */}
          <div className="text-left border border-amber-900/20 rounded-xl overflow-hidden bg-white/50">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="w-full p-2.5 flex items-center justify-between text-[11px] font-bold text-amber-900 hover:bg-amber-100/50 transition-colors cursor-pointer"
            >
              <span>Détails techniques du diagnostic</span>
              {showTechnicalDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-amber-700" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
              )}
            </button>

            {showTechnicalDetails && (
              <div className="p-2.5 border-t border-amber-900/10 bg-black/80 space-y-1.5 overflow-x-auto text-left">
                <p className="text-[10px] text-red-400 font-mono break-all select-text">
                  {incidentRecord.technicalMessage}
                </p>
                {incidentRecord.digest && (
                  <p className="text-[9px] text-gray-400 font-mono">
                    Réf: {incidentRecord.digest}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleReload}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#fbbf24] hover:to-[#f59e0b] text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={2} />
              <span>Relancer l'application</span>
            </button>

            <button
              type="button"
              onClick={handleForceOfflineMode}
              className="w-full py-2.5 px-4 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-black rounded-xl border border-amber-300 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
            >
              <WifiOff className="w-4 h-4 text-amber-800" strokeWidth={2} />
              <span>Ouvrir en Mode Hors-Ligne</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyDiagnostics}
                className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-xl border border-stone-300 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97] transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-600" />
                    <span>Copier diagnostic</span>
                  </>
                )}
              </button>

              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-[11px] font-bold rounded-xl border border-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.97] transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                <span>Aide WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
