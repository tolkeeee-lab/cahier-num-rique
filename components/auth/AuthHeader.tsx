'use client'

import React from 'react'

export const AuthHeader: React.FC = () => {
  return (
    <div className="text-center space-y-3 mb-6">
      <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#1e1a18] border border-amber-900/30 shadow-xl">
        <img src="/logo/logo-symbole.svg" alt="Cahier Numérique" className="w-10 h-12 object-contain" />
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
