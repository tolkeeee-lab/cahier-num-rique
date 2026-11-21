'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  RefreshCw,
  BookOpen,
  WifiOff,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Download,
} from 'lucide-react'
import {
  captureAppError,
  copyErrorDiagnostics,
  generateWhatsAppErrorReportUrl,
  getLatestErrorRecord,
  type AppErrorRecord,
} from '@/lib/errorDiagnostics'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const [hasWaitingWorker, setHasWaitingWorker] = useState(false)

  const incidentRecord = useMemo<AppErrorRecord>(() => {
    return captureAppError(error, { source: 'app/error.tsx', digest: error?.digest })
  }, [error])

  useEffect(() => {
    console.error("Erreur interceptée par l'Error Boundary:", error)

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          setHasWaitingWorker(true)
        }
      }).catch(() => {})
    }
  }, [error])

  const handleApplyUpdateAndReload = () => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      }).catch(() => {})
    }
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }, 400)
  }

  const handleReload = () => {
    try {
      reset()
    } catch {}
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      }).catch(() => {})
    }
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
    const record = incidentRecord || getLatestErrorRecord()
    if (!record) return
    const success = await copyErrorDiagnostics(record)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const whatsAppUrl = useMemo(() => {
    const record = incidentRecord || getLatestErrorRecord()
    return record ? generateWhatsAppErrorReportUrl(record) : '#'
  }, [incidentRecord])

  const categoryBadge = useMemo(() => {
    switch (incidentRecord.category) {
      case 'network':
        return { label: 'Réseau / Connexion', bg: 'bg-stone-100 text-stone-700 border-stone-200' }
      case 'supabase_sync':
        return { label: 'Synchronisation serveur', bg: 'bg-amber-50 text-amber-800 border-amber-200' }
      case 'storage':
        return { label: 'Mémoire / Stockage', bg: 'bg-stone-100 text-stone-700 border-stone-200' }
      case 'pwa_cache':
        return { label: 'Mise à jour logiciel', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
      case 'auth':
        return { label: 'Sécurité / Session', bg: 'bg-rose-50 text-rose-700 border-rose-200' }
      default:
        return { label: 'Affichage & Interface', bg: 'bg-amber-50 text-amber-800 border-amber-200' }
    }
  }, [incidentRecord.category])

  return (
    <div className="min-h-screen bg-[#f5efe0] flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-[#faf5e8] border border-[#e2d6be] rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-5">
        <div className="w-12 h-12 mx-auto rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-800">
          <BookOpen className="w-6 h-6" strokeWidth={1.5} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-stone-900 tracking-tight">
            Cahier Numérique
          </h2>
          <div className="flex justify-center">
            <span className={`px-2.5 py-0.5 rounded-md border text-[11px] font-medium ${categoryBadge.bg}`}>
              {categoryBadge.label}
            </span>
          </div>
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
            Toutes vos ventes et données locales sont <span className="font-semibold">en sécurité sur cet appareil</span>.
          </span>
        </div>

        {hasWaitingWorker && (
          <div className="p-3 bg-white border border-emerald-200 rounded-xl text-left flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-900">
              <Download className="w-4 h-4 text-emerald-700 shrink-0" strokeWidth={1.5} />
              <span className="text-xs font-medium">Nouvelle version prête</span>
            </div>
            <button
              type="button"
              onClick={handleApplyUpdateAndReload}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors active:scale-[0.97]"
            >
              Mettre à jour
            </button>
          </div>
        )}

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
              <p className="text-[10px] text-stone-400 font-mono">
                Statut : {incidentRecord.isOnline ? 'En ligne' : 'Hors-ligne'} · URL : {incidentRecord.url}
              </p>
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
            <span>Relancer l&apos;affichage</span>
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
    </div>
  )
}
