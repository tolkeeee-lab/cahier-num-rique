'use client'

import React, { useEffect } from 'react'
import { RefreshCw, BookOpen, WifiOff } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erreur interceptée par l\'Error Boundary Global:', error)
  }, [error])

  const handleForceOfflineMode = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/journal'
    }
  }

  return (
    <div className="min-h-screen bg-[#141210] flex items-center justify-center p-4 select-none font-mono">
      <div className="w-full max-w-md bg-[#fdfaf2] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Icône & Titre */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-800 shadow-inner">
          <BookOpen className="w-8 h-8" strokeWidth={2} />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-black text-amber-950 font-handwritten tracking-wide">
            Cahier Numérique
          </h2>
          <p className="text-xs text-amber-900/80 font-bold">
            Une interruption temporaire est survenue lors de l'affichage.
          </p>
        </div>

        {/* Note rassurante sur les données */}
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-[11px] text-emerald-950 font-bold leading-relaxed text-left flex items-start gap-2">
          <div className="p-1 rounded-md bg-emerald-200 text-emerald-900 mt-0.5">
            ✓
          </div>
          <div>
            <span>Toutes vos ventes et vos données locales sont </span>
            <span className="text-emerald-800 font-extrabold underline">en sécurité sur cet appareil</span>.
          </div>
        </div>

        {/* Boutons d'Action */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => reset()}
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
        </div>
      </div>
    </div>
  )
}