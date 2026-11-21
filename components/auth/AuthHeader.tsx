'use client'

import React from 'react'

export const AuthHeader: React.FC = () => {
  return (
    <div className="text-center space-y-2.5">
      <div className="inline-flex items-center justify-center p-2.5 rounded-xl bg-white border border-stone-200">
        <img src="/logo/logo-symbole.svg" alt="Cahier Numérique" className="w-9 h-10 object-contain" />
      </div>

      <h1 className="text-xl font-semibold text-stone-900 tracking-tight">
        Le Cahier Numérique
      </h1>
      <p className="text-xs text-stone-600">
        Gestion simple, rapide et hors-ligne pour boutiquiers et commerçants
      </p>
    </div>
  )
}
