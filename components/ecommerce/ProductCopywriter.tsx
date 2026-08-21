'use client'

import React, { useState } from 'react'
import { FileText, Sparkles, Copy, Check, Share2, RefreshCw, MessageSquare } from 'lucide-react'

export function ProductCopywriter() {
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [formatType, setFormatType] = useState('Message Statut / Vente WhatsApp')
  const [keyFeatures, setKeyFeatures] = useState('')
  const [targetAudience, setTargetAudience] = useState('Grand Public / Réseaux')

  const [loading, setLoading] = useState(false)
  const [copyResult, setCopyResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productName.trim() || loading) return

    setLoading(true)
    setCopyResult(null)

    const prompt = `Tu es le meilleur copywriter e-commerce au monde.
Rédige un texte de vente ultra-persuasif pour ce produit :

- Nom du Produit : ${productName}
- Prix de Vente : ${productPrice || 'Non spécifié'} FCFA
- Format souhaité : ${formatType}
- Caractéristiques / Bénéfices : ${keyFeatures || 'Non spécifié'}
- Cible : ${targetAudience}

Structure ta rédaction ainsi :
1. 🌟 **Titre Accrocheur (Hook)** : Titre percutant avec émojis qui attire immédiatement l'œil.
2. 💔 **La Frustration / Le Problème** : Fais ressentir le problème que le client vit sans ce produit.
3. 🎁 **La Solution & Les 3 à 5 Avantages Irrésistibles** : Liste à puces des bénéfices concrets (pas juste les caractéristiques).
4. 🛡️ **Garanties & Réassurance** : Paiement à la livraison, essai satisfait ou remboursé, livraison rapide.
5. 🚀 **Appel à l'Action Clair (Call To Action WhatsApp)** : Phrase exacte pour inciter le client à envoyer un message tout de suite.`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nvidia/llama-3.1-nemotron-70b-instruct',
          prompt,
          temperature: 0.6,
          max_tokens: 4096,
        }),
      })

      const data = await res.json()
      const botReply = data.choices?.[0]?.message?.content || data.response || "Texte rédigé."
      setCopyResult(botReply)
    } catch (err: any) {
      setCopyResult(`⚠️ Erreur : ${err?.message || 'Erreur réseau'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!copyResult) return
    navigator.clipboard.writeText(copyResult)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-6 animate-in fade-in duration-200">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
            <span>Rédacteur de Fiches Produits & Textes WhatsApp</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Générez des messages de vente captivants avec émojis prêts à poster sur vos statuts, groupes et site web.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Formulaire de configuration */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
          <form onSubmit={handleGenerate} className="space-y-3.5 text-xs font-sans">
            
            <div>
              <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                Nom du Produit : *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Montre Connectée Étanche Ultra..."
                value={productName}
                onChange={e => setProductName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold outline-none focus:border-emerald-400 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Format de Rédaction :
                </label>
                <select
                  value={formatType}
                  onChange={e => setFormatType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="Message Statut / Vente WhatsApp">Message WhatsApp / Statut</option>
                  <option value="Fiche Produit Site E-Commerce">Fiche Produit Complète</option>
                  <option value="Texte Publicitaire Facebook Ads">Texte Facebook / Instagram Ads</option>
                  <option value="Message de Relance Panier Abandonné">Message de Relance Client</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Prix de Vente (FCFA) :
                </label>
                <input
                  type="number"
                  placeholder="Ex: 15000"
                  value={productPrice}
                  onChange={e => setProductPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-emerald-300 font-mono font-bold outline-none"
                />
              </div>
            </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Public Cible :
                </label>
                <input
                  type="text"
                  placeholder="Ex: Femmes actives, sportifs, étudiants..."
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Avantages & Caractéristiques :
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Écran AMOLED, batterie 7 jours, mesure la tension, résiste sous l'eau..."
                  value={keyFeatures}
                  onChange={e => setKeyFeatures(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-emerald-400 resize-none"
                />
              </div>

            <button
              type="submit"
              disabled={!productName.trim() || loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Rédaction persuasive en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Rédiger le Texte de Vente</span>
                </>
              )}
            </button>

          </form>
        </div>

        {/* Texte Rédigé */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col min-h-[420px] shadow-xl">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-300">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Texte de Vente Prêt à Publier</span>
            </div>

            {copyResult && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-slate-400 hover:text-emerald-300 text-xs font-bold cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(copyResult)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-bold"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                <p className="font-bold text-xs text-emerald-200">NVIDIA Nemotron rédige votre message de vente...</p>
                <p className="text-[11px] text-slate-500 max-w-xs">Intégration d'émojis, bénéfices émotionnels et structure de persuasion.</p>
              </div>
            ) : copyResult ? (
              <div className="whitespace-pre-wrap text-xs sm:text-sm text-slate-200 font-sans leading-relaxed space-y-3">
                {copyResult}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
                <FileText className="w-10 h-10 opacity-30 text-emerald-400" />
                <p className="font-bold text-xs text-slate-400">Aucun texte rédigé</p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Indiquez le nom et les atouts de votre article à gauche pour générer votre texte de vente WhatsApp ou site web.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
