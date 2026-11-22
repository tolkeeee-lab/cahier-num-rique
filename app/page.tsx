'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock,
  Package,
  Play,
  ShieldCheck,
} from 'lucide-react'

const BIC_COLORS = [
  { label: 'Vente', dot: 'bg-[#1d4ed8]' },
  { label: 'Dépense', dot: 'bg-[#e11d48]' },
  { label: 'Stock cash', dot: 'bg-[#047857]' },
  { label: 'Crédit', dot: 'bg-[#b45309]' },
] as const

export default function LandingPage() {
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('auth_error')
    if (err) setAuthError(decodeURIComponent(err))
  }, [])

  return (
    <div className="min-h-screen bg-[#f5efe0] text-stone-900 font-sans antialiased overflow-x-hidden">
      {/* Bandeau d'erreur d'invitation — visible si ?auth_error= est présent dans l'URL */}
      {authError && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-semibold text-rose-900">
                Lien d&apos;invitation invalide ou expiré
              </p>
              <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
                {authError.includes('expired') || authError.includes('invalid')
                  ? "Ce lien d'invitation a expiré ou est invalide. Demandez à votre gérant de vous en renvoyer un nouveau depuis les réglages de la boutique."
                  : `Détail : ${authError}. Contactez votre gérant pour un nouveau lien.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <header className="border-b border-[#e2d6be] bg-[#faf5e8]/80 backdrop-blur-sm">
        <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#064e3b] text-[#faf5e8] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]">
              <BookOpen className="w-4 h-4" strokeWidth={1.75} />
            </span>
            <span className="font-semibold text-sm tracking-[-0.01em] text-stone-900">
              Cahier Numérique
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/presentation"
              className="text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
              <span>Démo</span>
            </Link>
            <Link
              href="/journal"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-[background-color,transform] duration-150 active:scale-[0.97] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]"
            >
              Ouvrir mon cahier
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-20 md:pt-20 md:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
        {/* Hero Left Text */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center gap-2.5 text-xs font-medium text-stone-600">
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              {BIC_COLORS.map((pen) => (
                <span key={pen.label} className={`w-2 h-2 rounded-full ${pen.dot}`} />
              ))}
            </span>
            <span>Cahier de caisse Seyes hors-ligne · Afrique de l&apos;Ouest</span>
          </div>

          <h1 className="text-4xl md:text-[44px] font-semibold tracking-[-0.025em] leading-[1.1] text-stone-900">
            Gérez votre caisse et vos dettes à la main, sans calculette
          </h1>

          <p className="text-stone-600 text-sm md:text-base leading-relaxed max-w-xl">
            Pensé pour les boutiquiers, commerçants de proximité et grossistes. Écrivez vos ventes comme sur un vrai cahier Seyes avec vos stylos de couleur ; le cahier calcule vos totaux et protège votre tiroir-caisse.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/journal"
              className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-[background-color,transform] duration-150 active:scale-[0.97] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_2px_8px_-2px_rgba(6,78,59,0.28)] flex items-center justify-center gap-2 group"
            >
              <span>Ouvrir mon cahier</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.75} />
            </Link>

            <Link
              href="/presentation"
              className="px-5 py-3.5 bg-[#faf5e8] hover:bg-[#efe6d1] border border-[#e2d6be] text-stone-800 text-sm font-medium rounded-xl transition-[background-color,transform] duration-150 active:scale-[0.97] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)] flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 text-emerald-700" strokeWidth={1.75} />
              <span>Voir la démo</span>
            </Link>
          </div>

          <div className="pt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-600 font-mono tabular-nums">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" strokeWidth={1.75} />
              <span>100 % FCFA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" strokeWidth={1.75} />
              <span>Fonctionne hors-ligne</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" strokeWidth={1.75} />
              <span>Synchronisé PC et mobile</span>
            </div>
          </div>
        </div>

        {/* Hero Right Visual — Le cahier ouvert Seyes */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-lg bg-[#faf5e8] rounded-2xl shadow-[0_18px_40px_-14px_rgba(28,25,23,0.18),0_2px_8px_-2px_rgba(28,25,23,0.08)] border border-[#d8cbb0] overflow-hidden flex relative aspect-[16/10]">
            {/* Reliure vert foncé */}
            <div className="w-8 bg-gradient-to-b from-[#064e3b] to-[#022c22] flex flex-col justify-around py-4 z-10 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-amber-400/70 mx-auto" />
              <div className="w-2 h-2 rounded-full bg-amber-400/70 mx-auto" />
              <div className="w-2 h-2 rounded-full bg-amber-400/70 mx-auto" />
            </div>

            {/* Spirales laiton */}
            <div className="absolute left-[26px] top-0 bottom-0 w-3 flex flex-col justify-around py-4 z-20 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-1.5 bg-gradient-to-r from-amber-800 to-amber-300 rounded-full shadow-sm"
                />
              ))}
            </div>

            {/* Feuille Seyes */}
            <div className="flex-grow p-4 pl-12 relative flex flex-col justify-between">
              {/* Marge rouge */}
              <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-rose-400/45" />

              {/* Lignes bleues Seyes */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_19px,rgba(14,165,233,0.14)_20px)] bg-[size:100%_20px] pointer-events-none" />

              {/* En-tête + écritures */}
              <div className="relative z-10 space-y-2.5 mt-1">
                <div className="flex items-center justify-between gap-2 pb-1">
                  <span className="text-[11px] text-stone-500 font-mono">
                    Jeudi 2 juillet 2026
                  </span>
                  <span className="text-[10px] font-mono tabular-nums font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                    Tiroir : 33 500 F
                  </span>
                </div>

                <div className="font-handwritten space-y-2.5">
                  <div>
                    <div className="text-[#1d4ed8] text-base leading-snug flex flex-wrap items-center gap-1.5">
                      <span>Vente 3 sacs de riz à 12 000 F</span>
                      <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-sans font-medium leading-none">
                        Vente
                      </span>
                    </div>
                    <div className="text-stone-500 text-[11px] mt-0.5 ml-3 flex items-center gap-1 font-sans tabular-nums">
                      <Package className="w-3 h-3 text-stone-400" strokeWidth={1.75} />
                      <span>3 × riz à 12 000 F · Total 36 000 F</span>
                    </div>
                  </div>

                  <div className="text-[#e11d48] text-base leading-snug flex flex-wrap items-center gap-1.5">
                    <span>Achat emballages boutique 2 500 F</span>
                    <span className="text-[10px] bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded font-sans font-medium leading-none">
                      Dépense
                    </span>
                  </div>

                  <div className="text-[#701a75] text-base leading-snug flex flex-wrap items-center gap-1.5">
                    <span>Grossiste Chantal carton lait crédit 35 000 F</span>
                    <span className="text-[10px] bg-stone-100 text-stone-700 border border-stone-300 px-1.5 py-0.5 rounded font-sans font-medium leading-none">
                      Stock crédit
                    </span>
                  </div>
                </div>
              </div>

              {/* Barre de saisie simulée */}
              <div className="relative z-10 border-t border-[#e2d6be] pt-2 flex items-center justify-between text-stone-500 font-mono text-[10px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="flex items-center gap-1 tabular-nums flex-shrink-0">
                    <Clock className="w-3 h-3 text-stone-400" strokeWidth={1.75} />
                    <span>22:51</span>
                  </span>
                  <span className="text-stone-300">|</span>
                  <span className="font-handwritten text-xs text-[#1d4ed8] truncate">
                    Ex : 3 litres d&apos;huile à 6 000...
                  </span>
                </div>
                <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Fonctionnalités */}
      <section id="features" className="bg-[#faf5e8] py-20 border-y border-[#e2d6be]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.025em] text-stone-900">
              Un vrai cahier d&apos;école, les calculs en moins
            </h2>
            <p className="text-stone-600 text-sm md:text-base leading-relaxed">
              Ne changez rien à vos habitudes au comptoir. Nous avons repris le geste d&apos;écrire sur votre carnet tout en gardant votre caisse juste à chaque ligne.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {/* Carte 1 */}
            <div className="bg-[#f5efe0] p-6 rounded-2xl border border-[#e2d6be] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.75)] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-700/10 border border-emerald-700/15 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-emerald-800" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold tracking-[-0.01em] text-stone-900">
                Le stylo Bic 4 couleurs
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                Encre bleue pour les ventes, rouge pour les dépenses, verte pour le stock payé cash, violette pour vos dettes grossistes et ambre pour les crédits clients.
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                {BIC_COLORS.map((pen) => (
                  <span
                    key={pen.label}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-700 bg-[#faf5e8] border border-[#e2d6be] px-2 py-0.5 rounded-md"
                  >
                    <span className={`w-2 h-2 rounded-full ${pen.dot}`} />
                    {pen.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Carte 2 */}
            <div className="bg-[#f5efe0] p-6 rounded-2xl border border-[#e2d6be] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.75)] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-700/10 border border-emerald-700/15 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-emerald-800" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold tracking-[-0.01em] text-stone-900">
                Zéro calculette au comptoir
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                Tapez <span className="font-mono text-xs text-stone-900 bg-[#faf5e8] border border-[#e2d6be] px-1.5 py-0.5 rounded">3 litres d&apos;huile à 6 000</span>. Le cahier vérifie s&apos;il s&apos;agit du prix unitaire ou total, calcule le montant et met à jour votre stock.
              </p>
            </div>

            {/* Carte 3 */}
            <div className="bg-[#f5efe0] p-6 rounded-2xl border border-[#e2d6be] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.75)] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-700/10 border border-emerald-700/15 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-800" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold tracking-[-0.01em] text-stone-900">
                Protection contre le solde négatif
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                Règle de caisse stricte : impossible de valider une sortie cash ou d&apos;effacer une vente si cela fait passer votre tiroir sous <span className="font-mono tabular-nums text-stone-900">0 FCFA</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section CTA finale */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.025em] text-stone-900">
          Prêt à remplacer vos fiches volantes ?
        </h2>
        <p className="text-stone-600 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          Ouvrez votre cahier sur téléphone ou ordinateur et suivez chaque franc, même sans connexion internet.
        </p>
        <div className="pt-2">
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-[background-color,transform] duration-150 active:scale-[0.97] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_2px_8px_-2px_rgba(6,78,59,0.28)]"
          >
            <span>Ouvrir mon cahier de caisse</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e2d6be] bg-[#faf5e8]/60 py-8 px-6 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} Cahier Numérique · Conçu pour les commerçants d&apos;Afrique de l&apos;Ouest
      </footer>
    </div>
  )
}
