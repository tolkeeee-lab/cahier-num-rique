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
  Sparkles,
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

  // Capture et analyse automatique de l'incident
  const incidentRecord = useMemo<AppErrorRecord>(() => {
    return captureAppError(error, { source: 'app/error.tsx', digest: error?.digest })
  }, [error])

  // Détection d'un Service Worker en attente
  useEffect(() => {
    console.error('Erreur interceptée par l\'Error Boundary:', error)

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

  // Libellé de catégorie lisible
  const categoryBadge = useMemo(() => {
    switch (incidentRecord.category) {
      case 'network':
        return { label: 'Réseau / Connexion', bg: 'bg-blue-100 text-blue-900 border-blue-300' }
      case 'supabase_sync':
        return { label: 'Synchronisation Serveur', bg: 'bg-amber-100 text-amber-900 border-amber-300' }
      case 'storage':
        return { label: 'Mémoire / Stockage', bg: 'bg-purple-100 text-purple-900 border-purple-300' }
      case 'pwa_cache':
        return { label: 'Mise à jour Logiciel', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
      case 'auth':
        return { label: 'Sécurité / Session', bg: 'bg-rose-100 text-rose-900 border-rose-300' }
      default:
        return { label: 'Affichage & Interface', bg: 'bg-amber-100 text-amber-900 border-amber-300' }
    }
  }, [incidentRecord.category])

  return (
    <div className="min-h-screen bg-[#141210] flex items-center justify-center p-4 select-none font-mono">
      <div className="w-full max-w-md bg-[#fdfaf2] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* En-tête */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-800 shadow-inner">
          <BookOpen className="w-8 h-8" strokeWidth={2} />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-black text-amber-950 font-handwritten tracking-wide">
            Cahier Numérique
          </h2>
          <div className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border mb-1">
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${categoryBadge.bg}`}>
              {categoryBadge.label}
            </span>
          </div>
        </div>

        {/* Diagnostic en Français Simple pour le Commerçant */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-300/80 rounded-2xl text-left space-y-1.5">
          <h3 className="text-xs font-black text-amber-950">
            {incidentRecord.title}
          </h3>
          <p className="text-[11px] text-amber-900/90 leading-relaxed font-sans">
            {incidentRecord.advice}
          </p>
        </div>

        {/* Note rassurante sur les données locales */}
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-[11px] text-emerald-950 font-bold leading-relaxed text-left flex items-start gap-2">
          <div className="p-1 rounded-md bg-emerald-200 text-emerald-900 mt-0.5 shrink-0 text-xs font-black">
            ✓
          </div>
          <div>
            <span>Toutes vos ventes et vos données locales sont </span>
            <span className="text-emerald-800 font-extrabold underline">en sécurité sur cet appareil</span>.
          </div>
        </div>

        {/* Alerte si mise à jour en attente */}
        {hasWaitingWorker && (
          <div className="p-3 bg-emerald-900/10 border-2 border-emerald-500 rounded-2xl text-left flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-900">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold">Nouvelle version prête à être activée</span>
            </div>
            <button
              type="button"
              onClick={handleApplyUpdateAndReload}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all active:scale-[0.97]"
            >
              Mettre à jour
            </button>
          </div>
        )}

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
              <p className="text-[9px] text-gray-400 font-mono">
                Statut: {incidentRecord.isOnline ? 'En ligne' : 'Hors-ligne'} • URL: {incidentRecord.url}
              </p>
            </div>
          )}
        </div>

        {/* Boutons d'Action */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleReload}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#fbbf24] hover:to-[#f59e0b] text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
            <span>Relancer l'affichage</span>
          </button>

          <button
            type="button"
            onClick={handleForceOfflineMode}
            className="w-full py-2.5 px-4 bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-black rounded-xl border border-amber-300 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
          >
            <WifiOff className="w-4 h-4 text-amber-800" strokeWidth={2} />
            <span>Ouvrir en Mode Hors-Ligne</span>
          </button>

          {/* Boutons d'Assistance 1-Clic */}
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
    </div>
  )
}
