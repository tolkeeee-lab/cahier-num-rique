'use client'

import React, { useState } from 'react'
import { Video, Copy, Check, Share2, RefreshCw, Play, Film } from 'lucide-react'

export function VideoScriptStudio() {
  const [productName, setProductName] = useState('')
  const [targetAudience, setTargetAudience] = useState('Femmes 20-45 ans')
  const [videoTone, setVideoTone] = useState('Choc & Humoristique')
  const [keyBenefit, setKeyBenefit] = useState('')
  const [promoOffer, setPromoOffer] = useState('Livraison Gratuite + Paiement à la livraison')
  const [videoDuration, setVideoDuration] = useState('30 secondes')

  const [loading, setLoading] = useState(false)
  const [scriptResult, setScriptResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productName.trim() || loading) return

    setLoading(true)
    setScriptResult(null)

    const prompt = `Tu es le meilleur réalisateur et copywriter de publicités vidéos virales pour TikTok, Instagram Reels et Facebook Ads.
Rédige un script publicitaire ultra-captivant et prêt à tourner pour ce produit :

- Nom du Produit : ${productName}
- Public Cible : ${targetAudience}
- Ton de la vidéo : ${videoTone}
- Bénéfice Magique / Problème résolu : ${keyBenefit || 'Non spécifié'}
- Offre Commerciale / Appel à l'action : ${promoOffer}
- Durée souhaitée : ${videoDuration}

Structure le script ainsi :
1. 🎯 **Les 3 Hooks d'Accroche (0 à 3 secondes)** : 3 phrases chocs alternatives qui arrêtent net le défilement.
2. 🎬 **Le Scénario Tableau Découpage Visuel (Secondes par secondes)** :
   - [0-3s] : Ce qu'on voit à l'écran (Visuel) | Ce que dit la voix off (Audio) | Texte écrit à l'écran
   - [4-15s] : Le Problème & La frustration quotidienne
   - [16-25s] : La Démonstration magique du produit en action (Effet Wow)
   - [26-30s] : L'Offre irrésistible & Appel à commander sur WhatsApp / Site
3. 💡 **Conseils de Tournage avec un Smartphone** : Éclairage, sons tendance suggérés, angle de caméra pour paraître 100% authentique.`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nvidia/llama-3.1-nemotron-70b-instruct',
          prompt,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      })

      const data = await res.json()
      const botReply = data.choices?.[0]?.message?.content || data.response || "Script généré."
      setScriptResult(botReply)
    } catch (err: any) {
      setScriptResult(`⚠️ Erreur : ${err?.message || 'Erreur réseau'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!scriptResult) return
    navigator.clipboard.writeText(scriptResult)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-6 animate-in fade-in duration-200">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Video className="w-6 h-6 text-sky-400 fill-sky-400/20" />
            <span>Studio de Scripts Publicitaires TikTok & Reels</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Générez des scénarios publicitaires à fort taux de conversion prêts à filmer avec votre téléphone.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Formulaire de configuration du script */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
          <form onSubmit={handleGenerate} className="space-y-3.5 text-xs font-sans">
            
            <div>
              <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                Produit à promouvoir : *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Brosse Lissante Chauffante Sans Fil..."
                value={productName}
                onChange={e => setProductName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold outline-none focus:border-sky-400 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Public Cible :
                </label>
                <select
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="Femmes 18-35 ans">Femmes 18-35 ans</option>
                  <option value="Femmes & Mères de famille">Mères de famille</option>
                  <option value="Hommes 20-45 ans">Hommes 20-45 ans</option>
                  <option value="Jeunes / Étudiants">Jeunes & Étudiants</option>
                  <option value="Professionnels / Cadres">Professionnels</option>
                  <option value="Grand Public">Grand Public</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Ton de la Publicité :
                </label>
                <select
                  value={videoTone}
                  onChange={e => setVideoTone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="Choc & Storytelling">Choc & Histoire vécue</option>
                  <option value="Humoristique & Décalé">Humoristique & Décalé</option>
                  <option value="Démonstration Avant / Après">Démonstration Avant/Après</option>
                  <option value="Témoignage Client Réel (UGC)">Témoignage Client (UGC)</option>
                  <option value="Luxe & Élégance">Luxe & Élégance</option>
                  <option value="Urgence & Promo Flash">Urgence & Promo Flash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                Bénéfice Clé / Effet Magique :
              </label>
              <input
                type="text"
                placeholder="Ex: Lisse les cheveux en 3 minutes sans brûler..."
                value={keyBenefit}
                onChange={e => setKeyBenefit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-sky-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Offre / Appel à l'action :
                </label>
                <input
                  type="text"
                  placeholder="Ex: -40% aujourd'hui..."
                  value={promoOffer}
                  onChange={e => setPromoOffer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Format / Durée :
                </label>
                <select
                  value={videoDuration}
                  onChange={e => setVideoDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="15 secondes (Flash Hook)">15 sec (Hook Flash)</option>
                  <option value="30 secondes (Idéal TikTok)">30 sec (Idéal TikTok)</option>
                  <option value="60 secondes (Démonstration)">60 sec (Démonstration)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!productName.trim() || loading}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black rounded-2xl text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Rédaction du scénario vidéo...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>Générer le Script Vidéo Viral</span>
                </>
              )}
            </button>

          </form>
        </div>

        {/* Script & Découpage Visuel */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col min-h-[420px] shadow-xl">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-300">
              <Play className="w-4 h-4 text-sky-400" />
              <span>Scénario Publicitaire Découpé</span>
            </div>

            {scriptResult && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-slate-400 hover:text-sky-300 text-xs font-bold cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(scriptResult)}`}
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
                <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
                <p className="font-bold text-xs text-sky-200">NVIDIA Nemotron écrit votre script vidéo...</p>
                <p className="text-[11px] text-slate-500 max-w-xs">Découpage des scènes, hooks viraux et textes voix-off.</p>
              </div>
            ) : scriptResult ? (
              <div className="whitespace-pre-wrap text-xs sm:text-sm text-slate-200 font-sans leading-relaxed space-y-3">
                {scriptResult}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
                <Video className="w-10 h-10 opacity-30 text-sky-400" />
                <p className="font-bold text-xs text-slate-400">Aucun script généré</p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Complétez les informations de votre produit à gauche pour obtenir un script publicitaire complet.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
