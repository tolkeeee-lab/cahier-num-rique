'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Sparkles, RefreshCw, X } from 'lucide-react'

/**
 * PwaUpdateBanner.tsx
 * 
 * Détecte activement les mises à jour PWA déployées et permet au boutiquier
 * d'actualiser son application instantanément sans perte de données locales.
 *
 * Conforme au standard Figma-Grade Senior (Apple / Linear Physics) :
 * - Inset light biseauté & flou d'arrière-plan
 * - Transition fluide cubic-bezier(0.16, 1, 0.3, 1)
 * - Micro-pression tactile active:scale-[0.97]
 * - Vérifications périodiques (visibilité, reconnexion, intervalle 20 min)
 */

export function PwaUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const waitingWorkerRef = useRef<ServiceWorker | null>(null)
  const refreshingRef = useRef(false)

  const applyUpdate = useCallback(() => {
    setIsUpdating(true)
    const worker = waitingWorkerRef.current

    if (worker) {
      worker.postMessage({ type: 'SKIP_WAITING' })
    } else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      }).catch(() => {})
    }

    // Sécurité : si l'événement controllerchange tarde, forcer le reload après 800ms
    setTimeout(() => {
      if (!refreshingRef.current) {
        refreshingRef.current = true
        window.location.reload()
      }
    }, 800)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // 1. Écouter le changement de contrôleur pour recharger la page proprement
    const handleControllerChange = () => {
      if (refreshingRef.current) return
      refreshingRef.current = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    let updateInterval: NodeJS.Timeout | null = null

    const checkServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!reg) return

        // Si un nouveau worker attend déjà en arrière-plan
        if (reg.waiting) {
          waitingWorkerRef.current = reg.waiting
          setUpdateAvailable(true)
          return
        }

        // Écouter l'arrivée d'une nouvelle version pendant l'utilisation
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = installingWorker
              setUpdateAvailable(true)
            }
          })
        })

        // Forcer une vérification réseau active
        reg.update().catch(() => {})
      } catch (err) {
        console.warn('[PWA Update] Erreur vérification SW:', err)
      }
    }

    checkServiceWorker()

    // 2. Vérification au retour au premier plan (déverrouillage ou retour sur l'app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then(reg => reg?.update().catch(() => {}))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 3. Vérification au retour de la connexion internet
    const handleOnline = () => {
      navigator.serviceWorker.getRegistration().then(reg => reg?.update().catch(() => {}))
    }
    window.addEventListener('online', handleOnline)

    // 4. Vérification périodique toutes les 20 minutes
    updateInterval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then(reg => reg?.update().catch(() => {}))
    }, 20 * 60 * 1000)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      if (updateInterval) clearInterval(updateInterval)
    }
  }, [])

  if (!updateAvailable || dismissed) {
    return null
  }

  return (
    <aside
      aria-label="Mise à jour de l'application disponible"
      role="status"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300"
      style={{
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#16171d]/95 backdrop-blur-md border border-emerald-500/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
            <Sparkles className="w-5 h-5 animate-pulse" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold text-white tracking-tight leading-tight">
              Nouvelle version disponible
            </h2>
            <p className="text-[11px] text-slate-400 leading-snug truncate">
              Mettez à jour pour profiter des améliorations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={applyUpdate}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-medium text-xs rounded-xl shadow-sm cursor-pointer transition-transform active:scale-[0.97]"
            style={{
              transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
            }}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
            />
            <span>{isUpdating ? 'Chargement...' : 'Actualiser'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Fermer la notification de mise à jour"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors active:scale-[0.95] cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  )
}

