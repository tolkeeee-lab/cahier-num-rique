'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Calculator, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#141210] text-[#fefdfa] font-sans antialiased overflow-x-hidden relative">
      
      {/* Decorative desktop lamp highlight blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-amber-500 opacity-[0.03] rounded-full blur-[160px] pointer-events-none z-0"></div>

      {/* Navigation */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-gray-800/40 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">📓</span>
          <span className="font-extrabold text-base tracking-widest text-[#f59e0b] uppercase">
            Cahier Numérique
          </span>
        </div>
        <Link 
          href="/journal"
          className="px-5 py-2.5 bg-gradient-to-r from-[#064e3b] to-[#043c2d] hover:from-[#085a44] hover:to-[#054937] text-[#f59e0b] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] border border-[#024c34]"
        >
          Ouvrir mon Cahier
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Hero Left Text */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#064e3b]/30 border border-[#047857]/40 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="text-[10px] font-bold text-[#f59e0b] tracking-wider uppercase">
              Le Cahier d'Écolier, version Augmentée
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] text-white">
            Gérez votre caisse et vos dettes <span className="text-[#f59e0b] font-serif italic">à la main</span>, sans calculette.
          </h2>

          <p className="text-gray-400 text-sm md:text-base leading-relaxed">
            Spécialement conçu pour les boutiquiers, commerçants de proximité et grossistes en Afrique de l'Ouest. Écrivez vos ventes comme sur un vrai cahier Seyes avec vos stylos Bic de couleur, l'application s'occupe de faire les calculs et de sécuriser votre tiroir-caisse.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <Link
              href="/journal"
              className="px-8 py-4 bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#fbbf24] hover:to-[#f59e0b] text-[#141210] text-sm font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              <span>Accéder à l'application</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            
            <a
              href="#features"
              className="px-6 py-4 bg-[#1e1a18] hover:bg-[#2a2421] border border-gray-800 text-gray-300 text-sm font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center"
            >
              Découvrir les fonctionnalités
            </a>
          </div>

          <div className="pt-6 flex items-center gap-6 text-xs text-gray-500 font-mono">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>100% FCFA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Aucune IA obligatoire</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Fonctionne hors-ligne</span>
            </div>
          </div>
        </div>

        {/* Hero Right Visual (Miniature Pure CSS open notebook) */}
        <div className="lg:col-span-6 relative flex justify-center">
          
          <div className="w-full max-w-lg bg-[#fdfaf2] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-gray-300 overflow-hidden flex relative transform lg:rotate-2 hover:rotate-0 transition-transform duration-500 aspect-[16/10]">
            
            {/* Left Cover Spine */}
            <div className="w-8 bg-gradient-to-b from-[#064e3b] to-[#012b1c] flex flex-col justify-around py-4 z-10 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-yellow-500/60 mx-auto"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500/60 mx-auto"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500/60 mx-auto"></div>
            </div>

            {/* Brass spiral loops binder */}
            <div className="absolute left-[26px] top-0 bottom-0 w-3 flex flex-col justify-around py-4 z-20 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="w-4 h-1.5 bg-gradient-to-r from-amber-800 to-yellow-400 rounded-full shadow-md"></div>
              ))}
            </div>

            {/* Page content */}
            <div className="flex-grow p-4 pl-12 relative flex flex-col justify-between">
              {/* Red Margin Line */}
              <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-red-400 opacity-40"></div>

              {/* Lined Paper Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_19px,rgba(14,165,233,0.15)_20px)] bg-[size:100%_20px] pointer-events-none"></div>

              {/* Mock Content */}
              <div className="relative z-10 space-y-3 font-handwritten mt-2">
                <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wide mb-1">
                  Jeudi 2 juillet 2026
                </div>
                <div className="text-[#1d4ed8] text-base leading-none">
                  Vente 3 sacs de riz à 12000 F <span className="text-[8px] bg-blue-100 text-blue-800 border px-1 rounded font-sans">VENTE</span>
                </div>
                <div className="text-gray-500 text-[10px] -mt-1 ml-4">
                  📦 3x riz à 12000 F (Total 36 000 F)
                </div>

                <div className="text-[#e11d48] text-base leading-none pt-2">
                  achat emballages boutique 2500 <span className="text-[8px] bg-rose-100 text-rose-800 border px-1 rounded font-sans">DÉPENSE</span>
                </div>

                <div className="text-[#701a75] text-base leading-none pt-2">
                  Grossiste Chantal carton peak credit 35000 <span className="text-[8px] bg-fuchsia-100 text-fuchsia-800 border px-1 rounded font-sans">STOCK CRÉDIT</span>
                </div>
              </div>

              {/* Bottom Sticky mock bar */}
              <div className="relative z-10 border-t border-gray-200/80 pt-2 flex items-center justify-between text-gray-400 font-mono text-[9px]">
                <div className="flex items-center gap-1">
                  <span>⏰ 22:51</span>
                  <span className="text-gray-300">|</span>
                  <span className="font-handwritten text-xs text-[#1d4ed8]">Ex: 3 litres d'huiles à 6000...</span>
                </div>
                <div className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center">
                  →
                </div>
              </div>

            </div>

          </div>

        </div>

      </section>

      {/* Feature Section */}
      <section id="features" className="bg-[#1b1816] py-20 border-t border-gray-800/40 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h3 className="text-3xl font-extrabold tracking-tight text-white">
              Une Métaphore Physique pour la Trésorerie
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Ne changez rien à vos habitudes. Nous avons numérisé le geste d'écrire sur votre carnet d'école tout en effectuant les calculs de caisse en temps réel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            
            {/* feature 1 */}
            <div className="bg-[#24201d] p-8 rounded-2xl border border-gray-800/60 space-y-4 transition-all hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-xl bg-[#064e3b]/30 flex items-center justify-center border border-[#047857]/20">
                <BookOpen className="w-6 h-6 text-[#f59e0b]" />
              </div>
              <h4 className="text-lg font-bold text-white">Le Stylo Bic 4-Couleurs</h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                Utilisez l'encre bleue pour les ventes, le rouge pour les charges, le vert pour les stocks payés cash, le violet pour vos dettes grossistes et le jaune pour vos crédits clients. Classez visuellement vos flux.
              </p>
            </div>

            {/* feature 2 */}
            <div className="bg-[#24201d] p-8 rounded-2xl border border-gray-800/60 space-y-4 transition-all hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-xl bg-[#064e3b]/30 flex items-center justify-center border border-[#047857]/20">
                <Calculator className="w-6 h-6 text-[#f59e0b]" />
              </div>
              <h4 className="text-lg font-bold text-white">Zéro Calculette (Aide au Calcul)</h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                Tapez <span className="italic text-[#f59e0b]">"3 litres d'huiles à 6000"</span>. Le cahier s'ouvre pour vous demander s'il s'agit du prix unitaire ou global, réalise la division/multiplication, et remplit la fiche à votre place.
              </p>
            </div>

            {/* feature 3 */}
            <div className="bg-[#24201d] p-8 rounded-2xl border border-gray-800/60 space-y-4 transition-all hover:scale-[1.02]">
              <div className="w-12 h-12 rounded-xl bg-[#064e3b]/30 flex items-center justify-center border border-[#047857]/20">
                <ShieldCheck className="w-6 h-6 text-[#f59e0b]" />
              </div>
              <h4 className="text-lg font-bold text-white">Protection contre le Solde Négatif</h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                Règle de caisse stricte : l'application bloque automatiquement l'achat de stock ou la rature d'une vente si cela fait passer votre caisse sous la barre des 0 FCFA. Votre argent est en sécurité.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center space-y-8 relative z-10">
        <h3 className="text-3xl md:text-4xl font-extrabold text-white">
          Prêt à abandonner vos fiches volantes ?
        </h3>
        <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          Rejoignez les commerçants de proximité qui font confiance au Cahier de Caisse Intelligent pour suivre chaque franc.
        </p>
        <div className="pt-2">
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#fbbf24] hover:to-[#f59e0b] text-[#141210] text-sm font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-xl hover:scale-[1.02]"
          >
            <span>Ouvrir mon Cahier de Caisse</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/30 py-8 text-center text-xs text-gray-500 font-mono relative z-10 select-none">
        © {new Date().getFullYear()} CAHIER NUMÉRIQUE INC. • TOUS DROITS RÉSERVÉS.
      </footer>

    </div>
  )
}
