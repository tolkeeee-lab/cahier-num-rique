'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader } from 'lucide-react'

interface Sale {
  id: string
  date: string
  time: string
  client: string
  articles: Array<{
    name: string
    quantity: number
    unit_price: number
  }>
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt'
}

interface SalesInputProps {
  onSaleRecorded: (sale: Sale) => void
  onError: (error: string) => void
}

export function SalesInput({ onSaleRecorded, onError }: SalesInputProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) {
      onError('Veuillez entrer une vente')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'enregistrement')
      }

      const data = await response.json()
      onSaleRecorded(data.sale)
      setInput('')
      textareaRef.current?.focus()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      onError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: 10 mèches xpression à 2000 et 5 darling à 1500 pour Maman Tantie, elle a payé 25000 reste 10000"
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 placeholder-gray-400 min-h-24 transition-colors disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !input.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 active:scale-95"
      >
        {loading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Traitement...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Enregistrer
          </>
        )}
      </button>
    </form>
  )
}
