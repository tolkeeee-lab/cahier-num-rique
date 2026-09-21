'use client'

import { useState, useEffect } from 'react'
import { answerBoutiqueQuestion, AnalyticsAnswer } from '@/lib/boutiqueAnalyticsEngine'
import {
  Sparkles, Mic, MicOff, Send, X,
  TrendingUp, Calendar, Wheat, CreditCard, AlertTriangle,
  Lightbulb, MessageSquare, Bot
} from 'lucide-react'

interface BoutiqueAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  sales: any[]
  products: any[]
  shopName?: string
}

export default function BoutiqueAssistantModal({
  isOpen,
  onClose,
  sales,
  products,
  shopName = 'Ma Boutique'
}: BoutiqueAssistantModalProps) {
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState<AnalyticsAnswer | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleAsk = async (textToAsk?: string) => {
    const q = (textToAsk || query).trim()
    if (!q) return

    // 1. Calcul local instantané (0 latence)
    const localResult = answerBoutiqueQuestion(q, sales, products)
    setCurrentAnswer(localResult)

    // 2. Si l'intention locale est générique ou non reconnue précisément, interroger l'IA en renfort
    if (localResult.type === 'general' && typeof window !== 'undefined' && navigator.onLine) {
      setIsAiLoading(true)

      try {
        // Préparer un résumé compact des métriques clés de la boutique
        const todayIso = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
        const activeSales = sales.filter(s => s.status !== 'crossed_out')
        const todaySales = activeSales.filter(s => s.date === todayIso)
        const todayRevenue = todaySales
          .filter(s => ['cash_in', 'sale', 'sale_cash', 'payment_client'].includes(s.type) || s.pen_color === 'blue' || s.pen === 'blue')
          .reduce((sum, s) => sum + (s.paid || s.total || 0), 0)
        
        const totalDebtsOut = activeSales
          .filter(s => (s.debt || 0) > 0 && s.type !== 'purchase_credit')
          .reduce((sum, s) => sum + (s.debt || 0), 0)

        const lowStockCount = products.filter(p => (p.current_stock ?? p.initial_stock ?? 0) <= (p.alert_threshold ?? 5)).length

        const contextSummary = `Boutique: ${shopName}. Recettes espèces aujourd'hui: ${todayRevenue.toLocaleString('fr-FR')} FCFA (${todaySales.length} opérations). Total dettes clients à recouvrer: ${totalDebtsOut.toLocaleString('fr-FR')} FCFA. Catalogue: ${products.length} produits, dont ${lowStockCount} en stock critique.`

        const messages = [
          {
            role: 'system',
            content: `Tu es le conseiller commercial et expert de gestion pour le commerçant gérant "${shopName}". Réponds à sa question en français simple, précis et encourageant. Utilise au maximum 3 phrases. Mets les chiffres et noms clés en gras avec **...**. Pas d'émojis superflus. Données actuelles de la boutique: ${contextSummary}`
          },
          {
            role: 'user',
            content: q
          }
        ]

        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, temperature: 0.4 })
        })

        if (res.ok) {
          const data = await res.json()
          const aiText = data?.choices?.[0]?.message?.content || data?.content
          if (aiText && typeof aiText === 'string') {
            setCurrentAnswer({
              question: q,
              answer: aiText.trim(),
              type: 'general',
              details: [
                `Analyse intelligente générée à partir des données réelles de votre boutique.`
              ]
            })
          }
        }
      } catch (err) {
        console.warn('[BoutiqueAssistant] Fallback IA non disponible, conservation de la réponse locale:', err)
      } finally {
        setIsAiLoading(false)
      }
    }
  }

  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée sur ce navigateur.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setQuery(transcript)
      setIsListening(false)
      handleAsk(transcript)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const quickQuestions = [
    { label: "Combien j'ai gagné aujourd'hui ?", q: "Combien j'ai gagné aujourd'hui ?", icon: TrendingUp },
    { label: "Ventes du mois passé", q: "Combien j'ai vendu le mois passé ?", icon: Calendar },
    { label: "Quantité de riz vendue", q: "Quelle est la quantité de riz vendue ?", icon: Wheat },
    { label: "Dettes des clients", q: "Combien les clients me doivent ?", icon: CreditCard },
    { label: "Produits en rupture", q: "Quels sont les produits en rupture ?", icon: AlertTriangle }
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-amber-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-100" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Assistant Bilan & Intelligence Boutique</h3>
              <p className="text-[10px] text-amber-100 font-mono">Posez vos questions en vocal ou écrit • Analyse instantanée</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center active:scale-[0.97] transition-transform duration-100 ease-out cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
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
            className="flex items-center gap-2 bg-amber-50/70 border border-amber-300 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-amber-500"
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
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-[0.97] transition-transform duration-100 ease-out cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-200 text-amber-900 hover:bg-amber-300'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" strokeWidth={1.75} />
                  <span className="text-[10px]">Écoute...</span>
                </>
              ) : (
                <Mic className="w-4 h-4" strokeWidth={1.75} />
              )}
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 active:scale-[0.97] transition-transform duration-100 ease-out cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Poser</span>
            </button>
          </form>

          {/* Quick Suggestions Chips */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">
              Exemples de questions fréquentes :
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((item, idx) => {
                const IconComponent = item.icon
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(item.q)
                      handleAsk(item.q)
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100/70 hover:bg-amber-200 border border-amber-300 rounded-full text-[11px] text-amber-950 font-bold font-mono active:scale-[0.97] transition-transform duration-100 ease-out cursor-pointer"
                  >
                    <IconComponent className="w-3 h-3 text-amber-800 flex-shrink-0" strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Display Answer Card */}
          {currentAnswer ? (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 space-y-2 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-amber-900 font-bold text-xs">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-700" strokeWidth={1.75} />
                  <span>Réponse :</span>
                </div>
                {isAiLoading && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-700 animate-pulse font-mono font-medium">
                    <Bot className="w-3 h-3 text-amber-600" />
                    <span>Analyse IA en cours...</span>
                  </span>
                )}
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
            <div className="text-center py-6 text-gray-400 font-mono text-xs border border-dashed border-amber-200 rounded-2xl bg-amber-50/50 flex flex-col items-center justify-center gap-1.5">
              <MessageSquare className="w-7 h-7 text-amber-400/80 mb-1" />
              <p>Cliquez sur un exemple ci-dessus ou posez une question par texte ou à la voix !</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
