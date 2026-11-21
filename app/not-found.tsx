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
    <div className="min-h-screen bg-[#f5efe0] flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-[#faf5e8] border border-[#e2d6be] rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-5">
        <div className="w-12 h-12 mx-auto rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-800">
          <BookOpen className="w-6 h-6" strokeWidth={1.5} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-stone-900 tracking-tight">
            Page introuvable
          </h2>
          <p className="text-xs text-stone-600">
            Redirection automatique vers votre cahier en cours
          </p>
        </div>

        <div className="pt-1">
          <Link
            href="/journal"
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>Ouvrir mon cahier</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </div>
  )
}
