'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { RefreshCw, X } from 'lucide-react'

const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'

/**
 * PwaUpdateBanner.tsx
 *
 * Pipeline unifié de mise à jour PWA (iOS, Android, PC) :
 * - Détecte les nouvelles versions à la fois via le Service Worker ET via /api/version (buildId).
 * - Purge uniquement CacheStorage (HTML/JS obsolètes) sans jamais toucher IndexedDB ni localStorage.
 * - Élimine le besoin de désinstaller/réinstaller la PWA après chaque déploiement.
 */
export function PwaUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const waitingWorkerRef = useRef<ServiceWorker | null>(null)
  const refreshingRef = useRef(false)

  const checkServerVersion = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return
    if (!CLIENT_BUILD_ID || CLIENT_BUILD_ID === 'dev') return
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data?.buildId && data.buildId !== 'dev' && data.buildId !== CLIENT_BUILD_ID) {
        setUpdateAvailable(true)
        setDismissed(false)
        // Demander au navigateur de vérifier /sw.js en parallèle
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then((reg) => reg?.update().catch(() => {}))
        }
      }
    } catch {
      // Silencieux en mode hors-ligne
    }
  }, [])

  const applyUpdate = useCallback(async () => {
    if (refreshingRef.current) return
    setIsUpdating(true)

    try {
      // 1. Purger tous les caches HTTP/SW (les ventes/stock dans IndexedDB restent 100 % intacts)
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }

      // 2. Activer le nouveau Service Worker s'il est en attente
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const worker = waitingWorkerRef.current
        if (worker) {
          worker.postMessage({ type: 'SKIP_WAITING' })
        } else {
          const reg = await navigator.serviceWorker.getRegistration()
          if (reg?.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          } else if (reg) {
            await reg.update().catch(() => {})
          }
        }
      }
    } catch {
      // Continuer vers le rechargement propre
    }

    setTimeout(() => {
      if (!refreshingRef.current) {
        refreshingRef.current = true
        window.location.reload()
      }
    }, 350)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasSW = 'serviceWorker' in navigator

    const handleControllerChange = () => {
      if (refreshingRef.current) return
      refreshingRef.current = true
      window.location.reload()
    }

    if (hasSW) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    }

    const checkServiceWorker = async () => {
      if (!hasSW) return
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (!reg) return

        if (reg.waiting) {
          waitingWorkerRef.current = reg.waiting
          setUpdateAvailable(true)
          return
        }

        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = installingWorker
              setUpdateAvailable(true)
              setDismissed(false)
            }
          })
        })

        reg.update().catch(() => {})
      } catch {
        // Silencieux
      }
    }

    const runAllChecks = () => {
      checkServiceWorker()
      checkServerVersion()
    }

    runAllChecks()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runAllChecks()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const handleOnline = () => {
      runAllChecks()
    }
    window.addEventListener('online', handleOnline)

    const updateInterval = setInterval(runAllChecks, 5 * 60 * 1000)

    return () => {
      if (hasSW) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      clearInterval(updateInterval)
    }
  }, [checkServerVersion])

  if (!updateAvailable || dismissed) {
    return null
  }

  return (
    <aside
      aria-label="Mise à jour de l'application disponible"
      role="status"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-200"
      style={{
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#faf5e8] border border-[#d8cbb0] text-stone-900 shadow-[0_12px_32px_-8px_rgba(28,25,23,0.22),inset_0_1px_0_rgba(255,255,255,0.85)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-700/10 border border-emerald-700/20 flex items-center justify-center shrink-0 text-emerald-800">
            <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold text-stone-900 tracking-tight leading-tight">
              Nouvelle version disponible
            </h2>
            <p className="text-[11px] text-stone-600 leading-snug truncate">
              Actualisez en un clic, vos données restent intactes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={applyUpdate}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-900 text-white font-medium text-xs rounded-xl shadow-sm cursor-pointer transition-[background-color,transform] duration-150 active:scale-[0.97]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
            />
            <span>{isUpdating ? 'Mise à jour...' : 'Actualiser'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Fermer la notification de mise à jour"
            className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors active:scale-[0.95] cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  )
}
