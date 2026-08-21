'use client'

import React, { useState } from 'react'
import { Sparkles, TrendingUp, Loader2, Search, PlusCircle } from 'lucide-react'

interface WinningProduct {
  id: string
  name: string
  category: string
  supplierPrice: number
  targetPrice: number
  viralScore: number
  trend: '🔥 Explosion TikTok' | '📈 Croissance Forte' | '⭐ Niche Rentable'
  platform: string
  description: string
  suggestedMargin: number
  tags: string[]
}

const PRELOADED_WINNERS: WinningProduct[] = [
  {
    id: '1',
    name: 'Brosse Soufflante Ionique 5-en-1',
    category: 'Beauté & Soins',
    supplierPrice: 11.5,
    targetPrice: 44.99,
    viralScore: 94,
    trend: '🔥 Explosion TikTok',
    platform: 'AliExpress / CJ Dropshipping',
    description: 'Styling complet des cheveux en quelques minutes. Fort attrait visuel pour vidéos avant/après.',
    suggestedMargin: 33.49,
    tags: ['Effet Wow', 'Forte marge', 'UGC Facile'],
  },
  {
    id: '2',
    name: 'Mini Imprimante Thermique Portable Bluetooth',
    category: 'Gadgets Tech & Bureau',
    supplierPrice: 8.2,
    targetPrice: 29.99,
    viralScore: 89,
    trend: '📈 Croissance Forte',
    platform: 'AliExpress / 1688',
    description: 'Imprime étiquettes, listes et photos sans encre. Très populaire auprès des étudiants et pros.',
    suggestedMargin: 21.79,
    tags: ['Zéro consommable', 'Achat impulsif'],
  },
  {
    id: '3',
    name: 'Correcteur Posture Intelligent à Capteur Vibreur',
    category: 'Santé & Bien-être',
    supplierPrice: 6.8,
    targetPrice: 34.9,
    viralScore: 91,
    trend: '⭐ Niche Rentable',
    platform: 'CJ Dropshipping',
    description: 'Vibre dès que le dos se courbe à plus de 25°. Résout une douleur quotidienne chez les sédentaires.',
    suggestedMargin: 28.1,
    tags: ['Douleur -> Solution', 'Grand public'],
  },
  {
    id: '4',
    name: 'Mélangeur Électrique Magnétique Auto-Touillant',
    category: 'Maison & Cuisine',
    supplierPrice: 5.5,
    targetPrice: 24.99,
    viralScore: 86,
    trend: '🔥 Explosion TikTok',
    platform: 'AliExpress',
    description: 'Tasse isolante qui touille automatiquement le café et les shakers en 1 clic.',
    suggestedMargin: 19.49,
    tags: ['Cadeau idéal', 'Démonstration vidéo'],
  },
]

export const SourcingHunter: React.FC = () => {
  const [products] = useState<WinningProduct[]>(PRELOADED_WINNERS)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Formulaire d'analyse personnalisée
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState('Tech & Gadgets')
  const [customSupplierPrice, setCustomSupplierPrice] = useState<number>(10)
  const [customTargetPrice, setCustomTargetPrice] = useState<number>(39.99)
  const [customSource, setCustomSource] = useState('AliExpress')
  const [customNotes, setCustomNotes] = useState('')

  // État de chargement et résultat IA
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [analyzedProductName, setAnalyzedProductName] = useState<string>('')

  const categories = ['all', 'Beauté & Soins', 'Gadgets Tech & Bureau', 'Santé & Bien-être', 'Maison & Cuisine']

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory
    return matchSearch && matchCat
  })

  const runAnalysis = async (productData?: Partial<WinningProduct>) => {
    setLoadingAnalysis(true)
    setAnalysisResult(null)

    const name = productData?.name || customName
    const cat = productData?.category || customCategory
    const supPrice = productData?.supplierPrice !== undefined ? productData.supplierPrice : customSupplierPrice
    const tgtPrice = productData?.targetPrice !== undefined ? productData.targetPrice : customTargetPrice
    const source = productData?.platform || customSource
    const notes = productData?.description || customNotes

    setAnalyzedProductName(name)

    try {
      const res = await fetch('/api/ai/sourcing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: name,
          category: cat,
          supplierPrice: supPrice,
          targetSalePrice: tgtPrice,
          sourcePlatform: source,
          notes,
        }),
      })

      const data = await res.json()
      if (data.analysis) {
        setAnalysisResult(data.analysis)
      } else {
        setAnalysisResult('❌ Impossible de récupérer l’analyse NVIDIA pour le moment.')
      }
    } catch (err: any) {
      setAnalysisResult(`❌ Erreur: ${err.message}`)
    } finally {
      setLoadingAnalysis(false)
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Moteur de Sourcing IA NVIDIA Nemotron 30B
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dénicheur de Produits Gagnants & Calculateur de Rentabilité
          </h1>
          <p className="text-sm text-gray-300">
            Identifiez instantanément les produits à fort potentiel viral, calculez vos marges nettes réelles et obtenez un rapport stratégique d'acquisition client généré par l'IA.
          </p>
        </div>
      </div>

      {/* Grid: Analyseur sur-mesure & Produits tendances */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Formulaire Sourcing IA Rapide */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-white text-base">Tester un Nouveau Produit</h2>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-gray-400 font-medium mb-1">Nom du Produit</label>
                <input
                  type="text"
                  placeholder="ex: Lampe Lévitation Magnétique"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Catégorie</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="Tech & Gadgets">Tech & Gadgets</option>
                    <option value="Beauté & Soins">Beauté & Soins</option>
                    <option value="Maison & Déco">Maison & Déco</option>
                    <option value="Fitness & Bien-être">Fitness & Bien-être</option>
                    <option value="Animaux">Animaux</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Fournisseur</label>
                  <input
                    type="text"
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Prix d'Achat (€)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customSupplierPrice}
                    onChange={(e) => setCustomSupplierPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Prix Vente Cible (€)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={customTargetPrice}
                    onChange={(e) => setCustomTargetPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Marge calculée en direct */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-gray-400">Marge Brute Estimée :</span>
                  <p className="font-extrabold text-sm text-cyan-400">
                    {(customTargetPrice - customSupplierPrice).toFixed(2)} €
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-gray-400">Coefficient :</span>
                  <p className="font-extrabold text-sm text-emerald-400">
                    x{customSupplierPrice > 0 ? (customTargetPrice / customSupplierPrice).toFixed(1) : '0'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Détails ou angle marketing</label>
                <textarea
                  rows={2}
                  placeholder="Points forts, arguments, lien vidéo..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => runAnalysis()}
            disabled={loadingAnalysis || !customName.trim()}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingAnalysis ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyse NVIDIA en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Lancer l'Audit IA Complet</span>
              </>
            )}
          </button>
        </div>

        {/* Liste des Gagnants Détectés */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-white text-base">Top Produits Détectés</h2>
            </div>

            {/* Filter Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrer produits..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-900 text-gray-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat === 'all' ? 'Toutes les niches' : cat}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="group relative bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-300 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                      {p.category}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      Score {p.viralScore}/100
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm mt-2 line-clamp-1 group-hover:text-cyan-300 transition">
                    {p.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-gray-400">Achat :</span>{' '}
                      <span className="font-bold text-white">{p.supplierPrice} €</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Vente :</span>{' '}
                      <span className="font-bold text-cyan-300">{p.targetPrice} €</span>
                    </div>
                    <div className="col-span-2 text-emerald-400 font-extrabold flex items-center justify-between">
                      <span>Marge Nette Estimée :</span>
                      <span>+{p.suggestedMargin.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => runAnalysis(p)}
                  disabled={loadingAnalysis}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-indigo-600 text-gray-200 hover:text-white text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Auditer avec NVIDIA</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rapport d'Audit IA */}
      {(loadingAnalysis || analysisResult) && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-indigo-500/40 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500 flex items-center justify-center text-cyan-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Rapport Stratégique IA : {analyzedProductName}</h3>
                <span className="text-xs text-gray-400">Analysé par NVIDIA Nemotron 30B Reasoning</span>
              </div>
            </div>
            {analysisResult && (
              <button
                onClick={() => setAnalysisResult(null)}
                className="text-xs text-gray-400 hover:text-white px-3 py-1 rounded-lg bg-slate-800 transition"
              >
                Fermer
              </button>
            )}
          </div>

          {loadingAnalysis ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-sm font-medium">Calcul des marges, analyse de la concurrence et modélisation du ROI...</p>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {analysisResult}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
