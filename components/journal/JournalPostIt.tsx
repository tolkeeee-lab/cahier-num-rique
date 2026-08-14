'use client'

import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface JournalPostItProps {
  message: string | null
  onDismiss: () => void
}

export const JournalPostIt: React.FC<JournalPostItProps> = ({ message, onDismiss }) => {
  if (!message) return null

  return (
    <div className="mb-4 bg-amber-500/10 border-l-4 border-amber-500 text-amber-200 p-4 rounded-r-xl relative shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-grow text-xs font-mono leading-relaxed">
          {message}
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-amber-400 hover:text-amber-200 transition-colors rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
