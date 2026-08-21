'use client'

import React, { useState } from 'react'
import { Video, FileText, Sparkles, Copy, Check, Loader2, Flame } from 'lucide-react'

export const CreativeStudio: React.FC = () => {
  const [activeType, setActiveType] = useState<'video_script' | 'ad_copy' | 'product_page'>('video_script')
  const [productName, setProductName] = useState('Brosse Soufflante Ionique 5-en-1')
  const [productDescription, setProductDescription] = useState(
    'Sèche, lisse, boucle et donne du volume instantanément sans abîmer les cheveux. Câble rotatif 360° et embouts interchangeables.'
  )
  const [platform] = useState('TikTok / Reels')
  const [angle, setAngle] = useState('Problème -> Solution & Effet Wow')
  const [targetAudience, setTargetAudience] = useState('Femmes 18-35 ans, actives, amatrices de beauté')

  const [loading, setLoading] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!productName.trim()) return

    setLoading(true)
    setGeneratedContent(null)

    try {
      const res = await fetch('/api/ai/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productDescription,
          type: activeType,
          platform,
          angle,
          targetAudience,
        }),
      })

      const data = await res.json()
      if (data.content) {
        setGeneratedContent(data.content)
      } else {
        setGeneratedContent('❌ Erreur lors de la génération.')
      }
    } catch (err: any) {
      setGeneratedContent(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!generatedContent) return
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 border border-violet-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/30 text-xs font-bold">
            <Video className="w-3.5 h-3.5" />
            Studio Créatif Publicitaire & Copywriting IA
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Générateur de Scripts UGC & Publicités Haute Conversion
          </h1>
          <p className="text-sm text-gray-300">
            Créez en quelques secondes des scripts vidéos TikTok captivants, des textes publicitaires Meta Ads et des descriptions de fiches produits optimisées pour maximiser votre taux de vente.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          {/* Studio Type Selector */}
          <div>
            <label className="block text-gray-400 font-medium text-xs mb-2">Format de Création</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveType('video_script')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition ${
                  activeType === 'video_script'
                    ? 'bg-violet-600/20 border-violet-500 text-violet-300 shadow-md shadow-violet-600/20'
                    : 'bg-slate-950/60 border-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Script Vidéo UGC</span>
              </button>

              <button
                onClick={() => setActiveType('ad_copy')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition ${
                  activeType === 'ad_copy'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950/60 border-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>Textes Ads (Meta)</span>
              </button>

              <button
                onClick={() => setActiveType('product_page')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition ${
                  activeType === 'product_page'
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-600/20'
                    : 'bg-slate-950/60 border-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Fiche Produit CRO</span>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-gray-400 font-medium mb-1">Nom du Produit</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-medium mb-1">Bénéfices clés / Description</label>
              <textarea
                rows={3}
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 font-medium mb-1">Angle Marketing</label>
                <select
                  value={angle}
                  onChange={(e) => setAngle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 transition"
                >
                  <option value="Problème -> Solution & Effet Wow">Problème -&gt; Solution</option>
                  <option value="Unboxing & Expérience Client">Unboxing UGC</option>
                  <option value="Curiosité & Tendance Virale">Tendance Virale</option>
                  <option value="Urgence & Offre Limitée">Urgence & Promo</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Audience Cible</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500 transition"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !productName.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-violet-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Génération du Studio en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Générer les Créatifs avec l'IA</span>
              </>
            )}
          </button>
        </div>

        {/* Output Column */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <h2 className="font-bold text-white text-sm">Contenu Généré par NVIDIA Studio</h2>
              </div>
              {generatedContent && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white text-xs font-semibold transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier tout</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                <p className="text-sm">Rédaction des hooks, découpage des scènes et optimisation CRO...</p>
              </div>
            ) : generatedContent ? (
              <div className="mt-4 prose prose-invert max-w-none text-xs text-gray-200 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-2">
                {generatedContent}
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-500 text-center">
                <Video className="w-10 h-10 stroke-[1.5] text-gray-600" />
                <p className="text-sm font-medium">Choisissez vos paramètres et cliquez sur "Générer les Créatifs"</p>
                <p className="text-xs text-gray-600">
                  L'IA produira des variations de scripts vidéo prêtes pour le tournage et des textes ads percutants.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
