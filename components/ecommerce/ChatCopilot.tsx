'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Copy, Check, Sparkles, RefreshCw, Share2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function ChatCopilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 **Bonjour et bienvenue sur CumuluShop AI !**\n\nJe suis votre **Copilote E-Commerce propulsé par NVIDIA Nemotron**.\n\nJe peux vous aider à :\n- 🎯 **Trouver et valider des produits gagnants** (Scoring, marges, viabilité).\n- 🎬 **Créer des scripts publicitaires percutants** pour TikTok, Reels et Facebook.\n- ✍️ **Rédiger des fiches produits et des messages de vente WhatsApp**.\n- 💰 **Calculer vos prix de vente et vos seuils de rentabilité**.\n\n*Sur quel produit ou quel projet travaillez-vous aujourd'hui ?*`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const starterPrompts = [
    { title: "🎯 Analyse Produit", text: "Analyse ce produit pour l'e-commerce : [Nom du produit]. Donne-moi une note sur 10, les marges potentielles et le public cible." },
    { title: "🎬 Script TikTok", text: "Rédige un script publicitaire TikTok de 30 secondes avec un hook choc pour vendre [Nom du produit]." },
    { title: "📲 Texte WhatsApp", text: "Rédige un message de vente WhatsApp irrésistible avec des émojis pour présenter [Nom du produit] à mes clients." },
    { title: "💰 Calculateur Prix", text: "Mon produit me coûte [Prix d'achat] FCFA chez le fournisseur. À quel prix dois-je le vendre pour faire 60% de marge nette ?" },
  ]

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || loading) return

    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: text })

      // Appel API avec system prompt e-commerce expert
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nvidia/llama-3.1-nemotron-70b-instruct',
          messages: [
            {
              role: 'system',
              content: `Tu es le Directeur E-Commerce et Marketing de CumuluShop, propulsé par NVIDIA Nemotron. 
Tu es un expert mondial en e-commerce, dropshipping, retail et vente en ligne (particulièrement adapté au marché francophone et ouest-africain : FCFA, WhatsApp, TikTok Ads, Facebook Ads).
Tes réponses sont toujours :
1. Structurées, claires et agréables à lire (avec des titres, puces et émojis).
2. Précises avec des calculs financiers et des pourcentages de marge réels.
3. Prêtes à l'emploi (scripts prêts à tourner, textes prêts à copier).`
            },
            ...history
          ],
          temperature: 0.6,
          max_tokens: 4096,
        }),
      })

      const data = await response.json()
      const botReply = data.choices?.[0]?.message?.content || data.response || "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer."

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: botReply,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Erreur de connexion à l'IA NVIDIA : ${err?.message || 'Erreur réseau'}. Vérifiez votre connexion.`,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] max-w-5xl mx-auto p-2 sm:p-4">
      
      {/* Zone des messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2 pb-4 scrollbar-thin">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 shadow-lg text-xs sm:text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-tr-xs'
                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
            }`}>
              {/* Contenu du message */}
              <div className="whitespace-pre-wrap font-sans space-y-2">
                {m.content}
              </div>

              {/* Barre d'outils du message */}
              <div className={`flex items-center justify-between mt-3 pt-2 border-t text-[10px] ${
                m.role === 'user' ? 'border-indigo-400/30 text-indigo-100' : 'border-slate-800 text-slate-500'
              }`}>
                <span>{m.timestamp}</span>

                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(m.content, idx)}
                      className="flex items-center gap-1 hover:text-sky-400 transition-colors cursor-pointer"
                      title="Copier le texte"
                    >
                      {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedIdx === idx ? 'Copié !' : 'Copier'}</span>
                    </button>

                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(m.content)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-emerald-400 transition-colors cursor-pointer"
                      title="Partager sur WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 shadow-md">
                <User className="w-4 h-4 text-sky-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start items-center text-sky-400 text-xs font-mono animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-indigo-900 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
            </div>
            <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>NVIDIA Nemotron 70B réfléchit et rédige votre stratégie...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions rapides Starter Prompts */}
      {messages.length <= 2 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {starterPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(p.text)
              }}
              className="p-2.5 bg-slate-900/90 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all cursor-pointer shadow-xs group"
            >
              <div className="font-bold text-xs text-sky-300 group-hover:text-sky-200">{p.title}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.text}</div>
            </button>
          ))}
        </div>
      )}

      {/* Barre de saisie */}
      <div className="relative flex items-center gap-2 bg-slate-900/95 border-2 border-indigo-950 rounded-2xl p-1.5 sm:p-2 shadow-2xl backdrop-blur-md">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Posez votre question e-commerce à NVIDIA Nemotron..."
          rows={1}
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none resize-none font-sans"
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <span>Envoyer</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  )
}
