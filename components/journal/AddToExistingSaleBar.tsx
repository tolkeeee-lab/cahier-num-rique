'use client'

/**
 * AddToExistingSaleBar.tsx
 *
 * Barre de saisie qui remplace la barre WhatsApp quand l'utilisateur
 * veut ajouter un article à une vente déjà enregistrée.
 *
 * Affiche le mode "Ajout à vente" avec le nom du client cible.
 * Bouton Annuler pour revenir à la saisie normale.
 *
 * 100% UI — pas de logique métier.
 */

import React from 'react'
import { Plus, X, Loader } from 'lucide-react'

interface AddToExistingSaleBarProps {
  clientName: string
  value: string
  onChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isSubmitting: boolean
  placeholder?: string
}

export function AddToExistingSaleBar({
  clientName,
  value,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  placeholder = 'ex: 2 Sardines à 500',
}: AddToExistingSaleBarProps) {
  return (
    <div className="flex-shrink-0 border-t-2 border-dashed border-blue-300 bg-blue-50/60 rounded-xl px-3 py-2 space-y-2">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-blue-700">
          ➕ Ajouter à la vente de <span className="text-blue-900">{clientName}</span>
        </span>
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <X className="w-3 h-3" />
          Annuler
        </button>
      </div>

      {/* Champ de saisie */}
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-sm bg-white border border-blue-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 font-handwritten placeholder-gray-400"
          autoFocus
        />
        <button
          type="submit"
          disabled={!value.trim() || isSubmitting}
          className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all flex-shrink-0 shadow-md"
        >
          {isSubmitting ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  )
}
