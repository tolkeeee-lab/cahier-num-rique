'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader, AlertTriangle } from 'lucide-react'

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
  status: 'paid' | 'debt' | 'crossed_out'
  type: string
  pen_color: string
  notes: string
}

interface SalesInputProps {
  onSaleRecorded: (sale: Sale) => void
  onError: (error: string) => void
}

const PENS = [
  { 
    id: 'blue', 
    name: 'Bleu (Vente / Cash In)', 
    color: '#1d4ed8', 
    bg: 'bg-blue-700', 
    border: 'border-blue-700', 
    textClass: 'ink-blue', 
    placeholder: 'Stylo Bleu : Écrivez une vente cash... (ex: 10 mèches à 2000 pour Maman Tantie)' 
  },
  { 
    id: 'red', 
    name: 'Rouge (Dépense / Cash Out)', 
    color: '#e11d48', 
    bg: 'bg-rose-600', 
    border: 'border-rose-600', 
    textClass: 'ink-red', 
    placeholder: 'Stylo Rouge : Écrivez une dépense... (ex: Achat ampoules boutique 4500 ou Facture électricité 12000)' 
  },
  { 
    id: 'green', 
    name: 'Vert (Achat Stock Cash)', 
    color: '#047857', 
    bg: 'bg-emerald-700', 
    border: 'border-emerald-700', 
    textClass: 'ink-green', 
    placeholder: 'Stylo Vert : Écrivez un achat de stock payé cash... (ex: 5 cartons lait à 15000 pour boutique)' 
  },
  { 
    id: 'purple', 
    name: 'Violet (Crédit Grossiste)', 
    color: '#701a75', 
    bg: 'bg-fuchsia-800', 
    border: 'border-fuchsia-800', 
    textClass: 'ink-purple', 
    placeholder: 'Stylo Violet : Écrivez un achat à crédit chez un grossiste... (ex: Grossiste Chantal 3 cartons Peak crédit 35000)' 
  },
  { 
    id: 'yellow', 
    name: 'Jaune (Crédit Client)', 
    color: '#b45309', 
    bg: 'bg-amber-600', 
    border: 'border-amber-600', 
    textClass: 'ink-yellow', 
    placeholder: 'Stylo Jaune : Écrivez un crédit accordé à un client... (ex: Koffi prend 2 sacs de riz crédit 12000)' 
  },
]

export function SalesInput({ onSaleRecorded, onError }: SalesInputProps) {
  const [input, setInput] = useState('')
  const [selectedPen, setSelectedPen] = useState('blue')
  const [loading, setLoading] = useState(false)
  const [postItWarning, setPostItWarning] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  const currentPen = PENS.find(p => p.id === selectedPen) || PENS[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) {
      onError('Veuillez entrer une transaction')
      return
    }

    setLoading(true)
    setPostItWarning(null)

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: input.trim(),
          penColor: selectedPen 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.isSafeguardTriggered) {
          // Affichage du Post-It
          setPostItWarning(data.error)
        } else {
          throw new Error(data.error || 'Erreur lors de l\'enregistrement')
        }
        return
      }

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
    <div className="relative space-y-4">
      {/* Visual representation of Bic 4-couleurs pen */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
          🖊️ Choisir le stylo de caisse :
        </span>
        <div className="flex flex-wrap gap-2">
          {PENS.map((pen) => (
            <button
              key={pen.id}
              type="button"
              onClick={() => {
                setSelectedPen(pen.id)
                textareaRef.current?.focus()
              }}
              style={{ color: selectedPen === pen.id ? '#ffffff' : pen.color }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                selectedPen === pen.id 
                  ? `${pen.bg} ${pen.border} shadow-sm scale-105 text-white` 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${pen.bg}`}></span>
              {pen.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Text Area & Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white p-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentPen.placeholder}
            disabled={loading}
            className={`w-full px-4 py-4 min-h-24 bg-transparent text-lg placeholder-gray-400 border-0 focus:ring-0 leading-relaxed font-handwritten transition-colors ${currentPen.textClass}`}
          />

          <div className="flex items-center justify-end px-3 py-2 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Post-it warning card for Safeguards */}
      {postItWarning && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 w-80 bg-amber-200 border-2 border-amber-300 shadow-2xl p-6 rotate-2 transition-all flex flex-col items-center text-center">
          {/* Post-it pin/tape effect */}
          <div className="absolute -top-3 w-16 h-6 bg-gray-300 bg-opacity-70 -rotate-3"></div>
          
          <AlertTriangle className="w-8 h-8 text-amber-700 mb-2" />
          <h4 className="font-bold text-amber-900 text-lg uppercase tracking-wide handwritten mb-2">
            ⚠️ Opération Bloquée !
          </h4>
          <p className="text-amber-850 text-sm font-medium handwritten leading-relaxed">
            {postItWarning}
          </p>
          <button
            type="button"
            onClick={() => setPostItWarning(null)}
            className="mt-4 px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs rounded shadow handwritten"
          >
            Fermer l'alerte
          </button>
        </div>
      )}
    </div>
  )
}
