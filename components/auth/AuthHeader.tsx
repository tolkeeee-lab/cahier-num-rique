'use client'

import React from 'react'
import { BookOpen } from 'lucide-react'

export const AuthHeader: React.FC = () => {
  return (
    <div className="text-center space-y-2 mb-6">
      <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#2a2421] border border-gray-800 shadow-xl">
        <BookOpen className="w-8 h-8 text-amber-400" />
      </div>

      <h1 className="text-xl font-extrabold text-white tracking-wide">
        Le Cahier Numérique
      </h1>
      <p className="text-xs text-gray-400 font-mono">
        Gestion simple, rapide et sécurisée pour boutiquiers & commerçants
      </p>
    </div>
  )
}
