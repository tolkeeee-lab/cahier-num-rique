'use client'

import React, { useState } from 'react'
import { Flame, Sparkles, Calculator, CheckCircle, RefreshCw, Copy, Check } from 'lucide-react'

export function WinningProductScorer() {
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('Beauté & Bien-être')
  const [buyCost, setBuyCost] = useState('')
  const [shippingCost, setShippingCost] = useState('')
  const [targetSellPrice, setTargetSellPrice] = useState('')
  const [targetMarket, setTargetMarket] = useState("Afrique de l'Ouest (FCFA)")
  const [productDescription, setProductDescription] = useState('')

  const [loading, setLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Calculs financiers instantanés
  const buy = parseFloat(buyCost) || 0
  const ship = parseFloat(shippingCost) || 0
  const sell = parseFloat(targetSellPrice) || 0
  const totalCost = buy + ship
  const grossProfit = sell > 0 ? sell - totalCost : 0
  const grossMarginPercent = sell > 0 ? Math.round((grossProfit / sell) * 100) : 0
  const markupMultiplier = totalCost > 0 ? (sell / totalCost).toFixed(1) : '0'

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productName.trim() || loading) return

    setLoading(true)
    setAnalysisResult(null)

    const prompt = `Tu es un expert mondial en sourcing e-commerce, dropshipping et produits gagnants.
Analyse ce produit en profondeur :

- Nom du Produit : ${productName}
- Catégorie : ${category}
- Marché Cible : ${targetMarket}
- Coût d'achat fournisseur estimé : ${buy} FCFA
- Frais logistique / livraison : ${ship} FCFA
- Prix de vente envisagé : ${sell} FCFA
- Description / Spécificités : ${productDescription || 'Non spécifié'}

Fais une analyse complète structurée ainsi :
1. 🏆 **Verdict & Note Globale sur 50** (Note /10 pour : Effet WOW visuel, Douleur/Problème résolu, Facilité de transport, Marge brute, Potentiel de viralité TikTok/Facebook).
2. 💰 **Audit Financier & Rentabilité** (Recommandation du prix de vente idéal, budget pub Facebook/TikTok maximum toléré pour rester rentable, calcul du ROAS minimum).
3. 🎯 **Public Cible & Persona Acheteur** (Qui achète ce produit ? Pourquoi vont-ils l'acheter impulsivement ?).
4. ⚠️ **Pièges & Risques à Éviter** (Qualité, contrefaçons, taux de retour, fragilité).
5. 🚀 **Les 3 Meilleurs Angles Marketing** (Comment présenter le produit pour exploser les ventes).`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nvidia/llama-3.1-nemotron-70b-instruct',
          prompt,
          temperature: 0.5,
          max_tokens: 4096,
        }),
      })

      const data = await res.json()
      const botReply = data.choices?.[0]?.message?.content || data.response || "Analyse terminée."
      setAnalysisResult(botReply)
    } catch (err: any) {
      setAnalysisResult(`⚠️ Erreur : ${err?.message || 'Erreur réseau'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!analysisResult) return
    navigator.clipboard.writeText(analysisResult)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-6 animate-in fade-in duration-200">
      
      {/* En-tête du module */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-400 fill-amber-400/20" />
            <span>Dénicheur & Calculateur de Produits Gagnants</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Testez la rentabilité, l'effet WOW et le potentiel de vente de n'importe quel produit avant d'investir.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Colonne Gauche : Formulaire de Sourcing */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
          <form onSubmit={handleAnalyze} className="space-y-3.5 text-xs font-sans">
            
            {/* Nom du Produit */}
            <div>
              <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                Nom du Produit ou Idée : *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Mini Hachoir Électrique Sans Fil..."
                value={productName}
                onChange={e => setProductName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Catégorie & Marché */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Catégorie :
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="Beauté & Bien-être">Beauté & Soins</option>
                  <option value="Cuisine & Maison">Cuisine & Maison</option>
                  <option value="High-Tech & Gadgets">High-Tech & Gadgets</option>
                  <option value="Mode & Accessoires">Mode & Accessoires</option>
                  <option value="Santé & Fitness">Santé & Fitness</option>
                  <option value="Bébés & Enfants">Bébés & Enfants</option>
                  <option value="Auto & Bricolage">Auto & Bricolage</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                  Marché Cible :
                </label>
                <select
                  value={targetMarket}
                  onChange={e => setTargetMarket(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="Afrique de l'Ouest (FCFA)">Afrique de l'Ouest (FCFA)</option>
                  <option value="Afrique Centrale (FCFA)">Afrique Centrale (FCFA)</option>
                  <option value="France / Europe (EUR)">France / Europe (EUR)</option>
                  <option value="USA / International ($)">USA / International ($)</option>
                </select>
              </div>
            </div>

            {/* Données Financières */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                <Calculator className="w-3.5 h-3.5" />
                <span>Paramètres Financiers Estimés</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 text-[9px] uppercase font-bold">Prix Achat</label>
                  <input
                    type="number"
                    placeholder="Ex: 2500"
                    value={buyCost}
                    onChange={e => setBuyCost(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[9px] uppercase font-bold">Livraison/Fret</label>
                  <input
                    type="number"
                    placeholder="Ex: 1500"
                    value={shippingCost}
                    onChange={e => setShippingCost(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[9px] uppercase font-bold">Prix Vente</label>
                  <input
                    type="number"
                    placeholder="Ex: 9500"
                    value={targetSellPrice}
                    onChange={e => setTargetSellPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-amber-400/50 rounded-lg text-amber-300 font-mono text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* Indicateurs financiers calculés en direct */}
              {sell > 0 && (
                <div className="pt-2 border-t border-slate-800 grid grid-cols-3 text-center text-[10px]">
                  <div>
                    <span className="text-slate-400 block">Bénéfice Brut</span>
                    <strong className={grossProfit > 0 ? 'text-emerald-400 font-mono' : 'text-red-400 font-mono'}>
                      +{grossProfit.toLocaleString()} F
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Marge Brute</span>
                    <strong className="text-sky-300 font-mono">{grossMarginPercent}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Coefficient</span>
                    <strong className="text-amber-300 font-mono">x{markupMultiplier}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Description / Lien produit */}
            <div>
              <label className="block text-slate-300 font-bold uppercase text-[10px] mb-1">
                Détails / Problème résolu (Optionnel) :
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Évite de pleurer en coupant des oignons, fonctionne sur batterie rechargeable USB..."
                value={productDescription}
                onChange={e => setProductDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-amber-400 resize-none"
              />
            </div>

            {/* Bouton Lancer Analyse */}
            <button
              type="submit"
              disabled={!productName.trim() || loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-2xl text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Analyse NVIDIA Nemotron en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Calculer le Score de Produit Gagnant</span>
                </>
              )}
            </button>

          </form>
        </div>

        {/* Colonne Droite : Rapport & Résultats d'Analyse */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col min-h-[420px] shadow-xl">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-300">
              <CheckCircle className="w-4 h-4 text-sky-400" />
              <span>Rapport d'Audit Stratégique & Rentabilité</span>
            </div>

            {analysisResult && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-slate-400 hover:text-sky-300 text-xs font-bold cursor-pointer transition-colors"
                title="Copier le rapport"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié !' : 'Copier'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                <p className="font-bold text-xs text-amber-200">NVIDIA Nemotron 70B calcule vos marges et votre score...</p>
                <p className="text-[11px] text-slate-500 max-w-xs">Analyse du ratio d'effet WOW, concurrence, coût par acquisition et rentabilité.</p>
              </div>
            ) : analysisResult ? (
              <div className="whitespace-pre-wrap text-xs sm:text-sm text-slate-200 font-sans leading-relaxed space-y-3">
                {analysisResult}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
                <Sparkles className="w-10 h-10 opacity-30 text-amber-400" />
                <p className="font-bold text-xs text-slate-400">Prêt pour l'analyse</p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Remplissez le nom et les prix de votre produit à gauche pour générer instantanément l'audit complet de rentabilité.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
