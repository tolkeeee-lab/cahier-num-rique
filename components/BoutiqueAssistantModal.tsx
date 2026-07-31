'use client'

import { useState } from 'react'
import { answerBoutiqueQuestion, AnalyticsAnswer } from '@/lib/boutiqueAnalyticsEngine'

interface BoutiqueAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  sales: any[]
  products: any[]
}

export default function BoutiqueAssistantModal({
  isOpen,
  onClose,
  sales,
  products
}: BoutiqueAssistantModalProps) {
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState<AnalyticsAnswer | null>(null)

  if (!isOpen) return null

  const handleAsk = (textToAsk?: string) => {
    const q = textToAsk || query
    if (!q.trim()) return
    const result = answerBoutiqueQuestion(q, sales, products)
    setCurrentAnswer(result)
  }

  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setQuery(transcript)
      handleAsk(transcript)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const quickQuestions = [
    { label: "📈 Combien j'ai gagné aujourd'hui ?", q: "Combien j'ai gagné aujourd'hui ?" },
    { label: "📅 Ventes du mois passé", q: "Combien j'ai vendu le mois passé ?" },
    { label: "🌾 Quantité de riz vendue", q: "Quelle est la quantité de riz vendue ?" },
    { label: "💳 Dettes des clients", q: "Combien les clients me doivent ?" },
    { label: "⚠️ Produits en rupture", q: "Quels sont les produits en rupture ?" }
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-amber-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 bg-white/20 rounded-2xl">🤖</span>
            <div>
              <h3 className="font-bold text-sm leading-tight">Mon Assistant Bilan & Stock</h3>
              <p className="text-[10px] text-amber-100 font-mono">Posez toutes vos questions en vocal ou texte (0 FCFA)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          
          {/* Input & Voice */}
          <form
            onSubmit={e => {
              e.preventDefault()
              handleAsk()
            }}
            className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-amber-500"
          >
            <input
              type="text"
              placeholder="Ex: Combien j'ai gagné aujourd'hui ?"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono text-gray-800 bg-transparent outline-none"
            />

            {/* Vocal Button */}
            <button
              type="button"
              onClick={handleVoiceInput}
              title="Parler à l'assistant"
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-200 text-amber-900 hover:bg-amber-300'
              }`}
            >
              {isListening ? '🎙️ Écoute...' : '🎤'}
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              Poser
            </button>
          </form>

          {/* Quick Suggestions Chips */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
              Exemples de questions rapides :
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(item.q)
                    handleAsk(item.q)
                  }}
                  className="px-2.5 py-1 bg-amber-100/70 hover:bg-amber-200 border border-amber-300 rounded-full text-[11px] text-amber-950 font-bold font-mono transition-transform hover:scale-105"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Display Answer Card */}
          {currentAnswer ? (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 space-y-2 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <span>💡 Réponse de l'assistant :</span>
              </div>

              <div
                className="text-xs text-gray-800 font-mono leading-relaxed bg-white p-3 rounded-xl border border-amber-200"
                dangerouslySetInnerHTML={{
                  __html: currentAnswer.answer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                }}
              />

              {currentAnswer.details && currentAnswer.details.length > 0 && (
                <div className="bg-amber-100/80 p-3 rounded-xl border border-amber-200 text-[11px] font-mono text-amber-950 space-y-1">
                  {currentAnswer.details.map((d, i) => (
                    <div
                      key={i}
                      dangerouslySetInnerHTML={{
                        __html: d.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 font-mono text-xs border border-dashed border-amber-200 rounded-2xl bg-amber-50/50">
              <span className="text-2xl block mb-1">🗣️</span>
              Cliquez sur un exemple ci-dessus ou posez une question par texte ou à la voix !
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
