'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'

export default function NotFound() {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = '/journal'
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#141210] flex items-center justify-center p-4 font-mono select-none">
      <div className="w-full max-w-md bg-[#fdfaf2] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-800 shadow-inner">
          <BookOpen className="w-8 h-8" strokeWidth={2} />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-black text-amber-950 font-handwritten tracking-wide">
            Cahier Numérique
          </h2>
          <p className="text-xs text-amber-900/80 font-bold">
            Page introuvable. Redirection automatique vers votre cahier en cours...
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/journal"
            className="w-full py-3 px-4 bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#fbbf24] hover:to-[#f59e0b] text-[#141210] text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>Ouvrir mon Cahier</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  )
}
