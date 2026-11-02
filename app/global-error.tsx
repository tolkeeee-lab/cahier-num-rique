'use client'

import React from 'react'
import { RefreshCw, BookOpen } from 'lucide-react'

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const handleReload = () => {
    try {
      reset()
    } catch {}
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <html lang="fr" className="dark">
      <body className="bg-[#141210] min-h-screen flex items-center justify-center p-4 font-mono select-none">
        <div className="w-full max-w-md bg-[#fdfaf2] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
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

          {error?.message && (
            <div className="p-2.5 bg-black/60 border border-amber-900/40 rounded-xl text-left overflow-x-auto">
              <p className="text-[10px] text-red-400 font-mono break-all select-text">
                {error.message}
              </p>
            </div>
          )}

          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-[11px] text-emerald-950 font-bold leading-relaxed text-left flex items-start gap-2">
            <div className="p-1 rounded-md bg-emerald-200 text-emerald-900 mt-0.5">✓</div>
            <div>
              <span>Toutes vos ventes locales sont </span>
              <span className="text-emerald-800 font-extrabold underline">en sécurité sur cet appareil</span>.
            </div>
          </div>

          <button
            type="button"
            onClick={handleReload}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#fbbf24] hover:to-[#f59e0b] text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
            <span>Relancer l'application</span>
          </button>
        </div>
      </body>
    </html>
  )
}

