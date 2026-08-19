'use client'

import React, { useState } from 'react'
import { VoiceInputButton } from '@/components/sales/VoiceInputButton'
import { QuickProductBadges } from '@/components/sales/QuickProductBadges'
import { ChangeCalculatorModal } from '@/components/sales/ChangeCalculatorModal'
import { getPens } from '@/lib/penUtils'
import { Send, Calculator } from 'lucide-react'

export type PenColorKey = 'blue' | 'red' | 'green' | 'purple' | 'yellow'

interface SalesInputProps {
  onAddTransaction: (text: string, penColor: PenColorKey) => Promise<void>
  isSubmitting?: boolean
  shopActivity?: string
}

export function SalesInput({
  onAddTransaction,
  isSubmitting = false,
  shopActivity = 'boutique',
}: SalesInputProps) {
  const [text, setText] = useState('')
  const [activePenColor, setActivePenColor] = useState<PenColorKey>('blue')
  const [showCalculator, setShowCalculator] = useState(false)

  const pens = getPens(shopActivity)
  const currentPen = pens.find(p => p.id === activePenColor) || pens[0]

  const quickProducts: Array<{ name: string; price: number }> = []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isSubmitting) return

    await onAddTransaction(text.trim(), activePenColor)
    setText('')
  }

  const handleSelectQuickProduct = (prod: { name: string; price: number }) => {
    const entry = `${prod.name} ${prod.price}`
    setText((prev) => (prev ? `${prev}, ${entry}` : entry))
  }

  return (
    <div className="bg-[#1e1a18] p-4 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
      {/* Sélecteur de couleur de stylo */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-gray-400 uppercase">Stylo :</span>
          <div className="flex items-center gap-1.5">
            {pens.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePenColor(p.id as PenColorKey)}
                className={`w-6 h-6 rounded-full transition-all border-2 ${
                  activePenColor === p.id ? 'scale-110 border-white shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: p.color }}
                title={p.name}
              />
            ))}
          </div>
        </div>

        {/* Bouton Calculateur de monnaie */}
        <button
          type="button"
          onClick={() => setShowCalculator(true)}
          className="p-2 rounded-xl bg-[#2a2421] text-amber-400 border border-gray-800 hover:bg-[#342d29] transition-colors"
          title="Calculateur de monnaie"
        >
          <Calculator className="w-4 h-4" />
        </button>
      </div>

      {/* Raccourcis produits rapides */}
      <QuickProductBadges products={quickProducts} onSelectProduct={handleSelectQuickProduct} />

      {/* Formulaire de saisie */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={currentPen.placeholder}
          className="flex-grow px-4 py-3 bg-[#141210] border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 font-mono"
        />

        {/* Bouton reconnaissance vocale */}
        <VoiceInputButton
          onTranscript={(transcript) => setText((prev) => (prev ? `${prev} ${transcript}` : transcript))}
        />

        {/* Bouton de validation */}
        <button
          type="submit"
          disabled={!text.trim() || isSubmitting}
          className="p-3 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#141210] rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Modale Calculateur de monnaie */}
      <ChangeCalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        totalAmount={0}
      />
    </div>
  )
}
