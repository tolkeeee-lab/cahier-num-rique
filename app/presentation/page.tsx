'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  Sparkles, 
  Share2, 
  ExternalLink
} from 'lucide-react'

// Synthétiseur d'effets sonores haptiques doux via Web Audio API (sans fichier externe)
class SoundFX {
  private ctx: AudioContext | null = null

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) this.ctx = new AudioCtx()
    }
  }

  // Clic mécanique stylo Bic
  penClick() {
    try {
      this.init()
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(800, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04)
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.04)
    } catch {}
  }

  // Tintement de tiroir-caisse (chime doux)
  cashChime() {
    try {
      this.init()
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1046.5, this.ctx.currentTime) // C6
      osc.frequency.setValueAtTime(1318.5, this.ctx.currentTime + 0.06) // E6
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.35)
    } catch {}
  }
}

const sfx = new SoundFX()

interface Scene {
  id: number
  title: string
  subtitle: string
  pen: 'blue' | 'red' | 'yellow'
  duration: number
}

const SCENES: Scene[] = [
  {
    id: 0,
    title: "1. La Métaphore Physique",
    subtitle: "Le cahier d'écolier Seyes en cuir émeraude s'ouvre. Zéro formulaire compliqué, juste votre carnet.",
    pen: 'blue',
    duration: 4500
  },
  {
    id: 1,
    title: "2. La Saisie Manuelle Vivante",
    subtitle: "Écrivez naturellement comme sur du papier. L'encre bleue Bic se pose sur les lignes Seyes.",
    pen: 'blue',
    duration: 5500
  },
  {
    id: 2,
    title: "3. Calcul Instantané & Tiroir-Caisse",
    subtitle: "3 cartons à 10 000 F = 30 000 F. Les calculs se font tout seuls, la caisse s'incrémente.",
    pen: 'blue',
    duration: 5000
  },
  {
    id: 3,
    title: "4. Dépenses & Encre Rouge",
    subtitle: "Un achat imprévu ? Changez de stylo. Le solde du tiroir-caisse se réajuste immédiatement.",
    pen: 'red',
    duration: 5000
  },
  {
    id: 4,
    title: "5. Crédits Clients & Ardoise",
    subtitle: "Vente à crédit notée en jaune. L'argent dehors est mémorisé sans calculette.",
    pen: 'yellow',
    duration: 5000
  },
  {
    id: 5,
    title: "6. Reçu Thermique & Partage WhatsApp",
    subtitle: "Ticket de caisse instantané, 100% hors-ligne. Partagez le bilan du jour au patron en 1 clic.",
    pen: 'blue',
    duration: 6000
  }
]

export default function MotionPresentationPage() {
  const [currentScene, setCurrentScene] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1)
  const [typedText, setTypedText] = useState('')
  const [cashTotal, setCashTotal] = useState(15000)
  const [argentDehors, setArgentDehors] = useState(3500)
  const [showReceipt, setShowReceipt] = useState(false)
  const [activePen, setActivePen] = useState<'blue' | 'red' | 'green' | 'purple' | 'yellow'>('blue')

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Gestion de la timeline automatique
  const nextScene = useCallback(() => {
    setCurrentScene(prev => (prev + 1) % SCENES.length)
  }, [])

  const prevScene = useCallback(() => {
    setCurrentScene(prev => (prev - 1 + SCENES.length) % SCENES.length)
  }, [])

  useEffect(() => {
    if (!isPlaying) return
    const currentDuration = SCENES[currentScene].duration / speed

    timerRef.current = setTimeout(() => {
      nextScene()
    }, currentDuration)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentScene, isPlaying, speed, nextScene])

  // Animation scénarisée par scène
  useEffect(() => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current)

    if (currentScene === 0) {
      // Scène 0: Carnet fermé -> ouverture
      setTypedText('')
      setCashTotal(15000)
      setArgentDehors(3500)
      setShowReceipt(false)
      setActivePen('blue')
    } else if (currentScene === 1) {
      // Scène 1: Saisie animée lettre par lettre
      setActivePen('blue')
      if (soundEnabled) sfx.penClick()
      const target = "3 cartons de Beaufort à 10000 F"
      setTypedText('')
      let i = 0
      typingTimerRef.current = setInterval(() => {
        if (i < target.length) {
          setTypedText(target.slice(0, i + 1))
          i++
        } else {
          if (typingTimerRef.current) clearInterval(typingTimerRef.current)
        }
      }, 70 / speed)
    } else if (currentScene === 2) {
      // Scène 2: Calcul 3x10000 = 30000, cash: 15000 -> 45000
      setTypedText("3 cartons de Beaufort à 10000 F")
      setActivePen('blue')
      setTimeout(() => {
        if (soundEnabled) sfx.cashChime()
        setCashTotal(45000)
      }, 800 / speed)
    } else if (currentScene === 3) {
      // Scène 3: Dépense rouge
      setActivePen('red')
      if (soundEnabled) sfx.penClick()
      setTypedText("Achat glace pour boutique 2500")
      setTimeout(() => {
        setCashTotal(42500)
      }, 1200 / speed)
    } else if (currentScene === 4) {
      // Scène 4: Crédit client jaune
      setActivePen('yellow')
      if (soundEnabled) sfx.penClick()
      setTypedText("Paul 1 casier Castel 7000 crédit")
      setTimeout(() => {
        setArgentDehors(10500)
      }, 1000 / speed)
    } else if (currentScene === 5) {
      // Scène 5: Reçu thermique + bouton WhatsApp
      setActivePen('blue')
      setTypedText("Clôture et génération du ticket...")
      setTimeout(() => {
        setShowReceipt(true)
        if (soundEnabled) sfx.cashChime()
      }, 600 / speed)
    }

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    }
  }, [currentScene, speed, soundEnabled])

  return (
    <div className="min-h-screen bg-[#0d0c0a] text-slate-100 flex flex-col justify-between selection:bg-amber-500/20">
      
      {/* ── Top Bar / Header de la Démo ── */}
      <header className="px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="flex items-center gap-2 group text-amber-500 hover:text-amber-400 transition-colors"
          >
            <BookOpen className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
            <span className="font-extrabold tracking-wider uppercase text-xs sm:text-sm font-mono">
              Cahier Numérique
            </span>
          </Link>
          <span className="text-white/30 text-xs hidden sm:inline">|</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Motion Showcase
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Son On/Off */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled)
              if (!soundEnabled) sfx.penClick()
            }}
            className={`p-2 rounded-xl border text-xs transition-all active:scale-[0.97] cursor-pointer flex items-center gap-1.5 ${
              soundEnabled 
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title={soundEnabled ? "Couper les effets sonores" : "Activer les sons haptiques"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="text-[10px] font-mono hidden md:inline">{soundEnabled ? "Audio Activé" : "Muet"}</span>
          </button>

          {/* Bouton vers l'application réelle */}
          <Link
            href="/journal"
            className="px-4 py-2 bg-gradient-to-r from-emerald-700 to-emerald-900 hover:from-emerald-600 hover:to-emerald-800 text-amber-300 border border-emerald-500/40 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all active:scale-[0.97] flex items-center gap-1.5"
          >
            <span>Ouvrir mon Cahier</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Scène Principale (Théâtre Motion Design) ── */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8 max-w-5xl mx-auto w-full relative">
        
        {/* Glow de fond cinématographique */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none"></div>

        {/* En-tête de la Scène Active */}
        <div className="text-center space-y-2 mb-6 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[11px] font-mono text-amber-400 uppercase tracking-widest font-bold">
            <span>Scène {currentScene + 1} sur {SCENES.length}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white transition-all duration-300">
            {SCENES[currentScene].title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 transition-all duration-300 min-h-[40px] leading-relaxed">
            {SCENES[currentScene].subtitle}
          </p>
        </div>

        {/* ── Mockup Cahier Physique avec Animations Fluides ── */}
        <div className="w-full max-w-3xl aspect-[16/10] bg-[#fdfaf2] rounded-3xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] border border-amber-900/40 overflow-hidden flex relative z-10 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] select-none">
          
          {/* Reliure cuir émeraude gauche */}
          <div className="w-10 sm:w-14 bg-gradient-to-b from-[#064e3b] via-[#022c1b] to-[#011d12] flex flex-col justify-between py-6 z-20 flex-shrink-0 shadow-[inset_-8px_0_15px_rgba(0,0,0,0.6)]">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80 mx-auto shadow-sm"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80 mx-auto shadow-sm"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80 mx-auto shadow-sm"></div>
          </div>

          {/* Anneaux de reliure spirale dorée en relief */}
          <div className="absolute left-[34px] sm:left-[48px] top-0 bottom-0 w-4 flex flex-col justify-around py-3 z-30 pointer-events-none">
            {Array.from({ length: 14 }).map((_, i) => (
              <div 
                key={i} 
                className="w-5 sm:w-6 h-1.5 bg-gradient-to-r from-amber-950 via-amber-400 to-yellow-200 rounded-full shadow-md"
              ></div>
            ))}
          </div>

          {/* Page intérieure Seyes avec marge rouge */}
          <div className="flex-grow p-4 sm:p-6 pl-14 sm:pl-20 relative flex flex-col justify-between overflow-hidden">
            
            {/* Ligne de marge rouge écolier */}
            <div className="absolute left-12 sm:left-16 top-0 bottom-0 w-[1.5px] bg-red-400/50 pointer-events-none z-10"></div>

            {/* Lignage Seyes bleu ciel */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_23px,rgba(14,165,233,0.18)_24px)] bg-[size:100%_24px] pointer-events-none z-0"></div>

            {/* En-tête de la page du jour */}
            <div className="relative z-10 flex items-center justify-between pb-2 border-b border-amber-900/10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-mono font-black text-amber-950/70 tracking-wider uppercase">
                  Jeudi 17 Septembre 2026
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  En ligne (Synchronisé)
                </span>
              </div>

              {/* Tiroir-caisse temps réel */}
              <div className="flex items-center gap-2 font-mono">
                <div className="text-right">
                  <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-amber-900/60 font-bold">
                    Tiroir-Caisse
                  </div>
                  <div className={`text-sm sm:text-lg font-black tabular-nums transition-all duration-300 ${
                    cashTotal > 15000 ? 'text-emerald-700 scale-105' : 'text-amber-950'
                  }`}>
                    {new Intl.NumberFormat('fr-FR').format(cashTotal)} FCFA
                  </div>
                </div>
              </div>
            </div>

            {/* Lignes d'écritures manuscrites dynamiques */}
            <div className="relative z-10 flex-grow py-3 space-y-3 font-handwritten text-base sm:text-lg leading-relaxed">
              
              {/* Ligne 1 permanente */}
              <div className="flex items-center justify-between group">
                <div className="text-[#1d4ed8] flex items-center gap-2">
                  <span>10:15</span>
                  <span>Ouverture caisse matinée</span>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
                  +15 000 F
                </span>
              </div>

              {/* Ligne 2 : Vente animée */}
              {currentScene >= 1 && (
                <div className="transition-all duration-300 animate-in fade-in slide-in-from-left-2 flex items-center justify-between">
                  <div className="text-[#1d4ed8] flex items-center gap-2">
                    <span className="text-xs text-blue-900/60 font-mono">11:30</span>
                    <span className="font-black underline decoration-blue-300 underline-offset-4">
                      {currentScene === 1 ? typedText : "3 cartons de Beaufort à 10000 F"}
                    </span>
                    {currentScene === 1 && (
                      <span className="inline-block w-1.5 h-4 bg-blue-600 animate-pulse ml-0.5"></span>
                    )}
                  </div>
                  {currentScene >= 2 && (
                    <span className="font-mono text-xs sm:text-sm font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md tabular-nums animate-in zoom-in-95">
                      +30 000 F
                    </span>
                  )}
                </div>
              )}

              {/* Ligne 3 : Dépense encre rouge */}
              {currentScene >= 3 && (
                <div className="transition-all duration-300 animate-in fade-in slide-in-from-left-2 flex items-center justify-between">
                  <div className="text-[#e11d48] flex items-center gap-2">
                    <span className="text-xs text-rose-900/60 font-mono">12:05</span>
                    <span>Achat glace pour boutique 2500 F</span>
                  </div>
                  <span className="font-mono text-xs sm:text-sm font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md tabular-nums">
                    -2 500 F
                  </span>
                </div>
              )}

              {/* Ligne 4 : Crédit client encre jaune */}
              {currentScene >= 4 && (
                <div className="transition-all duration-300 animate-in fade-in slide-in-from-left-2 flex items-center justify-between">
                  <div className="text-[#b45309] flex items-center gap-2">
                    <span className="text-xs text-amber-900/60 font-mono">14:20</span>
                    <span>Paul 1 casier Castel 7000 F (crédit)</span>
                  </div>
                  <span className="font-mono text-xs sm:text-sm font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md tabular-nums">
                    Dette +7 000 F
                  </span>
                </div>
              )}

            </div>

            {/* Pied du cahier : Barre de saisie style WhatsApp & Choix du Stylo Bic */}
            <div className="relative z-10 border-t border-amber-900/20 pt-2 flex items-center justify-between gap-2">
              
              {/* Sélecteur de stylos Bic 4 couleurs */}
              <div className="flex items-center gap-1.5 bg-amber-950/5 p-1 rounded-full border border-amber-900/20">
                <div 
                  className={`w-4 h-4 rounded-full transition-transform ${
                    activePen === 'blue' ? 'ring-2 ring-blue-500 scale-125 bg-blue-600' : 'bg-blue-600/40'
                  }`}
                  title="Stylo Bleu : Vente"
                ></div>
                <div 
                  className={`w-4 h-4 rounded-full transition-transform ${
                    activePen === 'red' ? 'ring-2 ring-rose-500 scale-125 bg-rose-600' : 'bg-rose-600/40'
                  }`}
                  title="Stylo Rouge : Dépense"
                ></div>
                <div 
                  className={`w-4 h-4 rounded-full transition-transform ${
                    activePen === 'green' ? 'ring-2 ring-emerald-500 scale-125 bg-emerald-600' : 'bg-emerald-600/40'
                  }`}
                  title="Stylo Vert : Achat Stock"
                ></div>
                <div 
                  className={`w-4 h-4 rounded-full transition-transform ${
                    activePen === 'yellow' ? 'ring-2 ring-amber-500 scale-125 bg-amber-500' : 'bg-amber-500/40'
                  }`}
                  title="Stylo Jaune : Crédit Client"
                ></div>
              </div>

              {/* Champ d'écriture factice */}
              <div className="flex-grow bg-white/80 border border-amber-900/30 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-mono shadow-inner">
                <span className="text-gray-500 truncate">
                  {typedText || "Écrivez ici (ex: 2 laits 1000)..."}
                </span>
                <span className="text-[10px] text-amber-800/60 font-bold">Bic {activePen}</span>
              </div>

              {/* Indicateur Dette Dehors */}
              <div className="hidden sm:flex flex-col items-end text-[9px] font-mono font-bold text-amber-950">
                <span className="text-gray-400">ARGENT DEHORS</span>
                <span className="text-amber-800 tabular-nums">
                  {new Intl.NumberFormat('fr-FR').format(argentDehors)} F
                </span>
              </div>

            </div>

          </div>

          {/* ── Ticket Thermique qui sort physiquement (Scène 5) ── */}
          {showReceipt && (
            <div className="absolute right-6 top-0 w-48 sm:w-56 bg-white text-gray-900 p-4 rounded-b-xl shadow-2xl border border-gray-300 font-mono text-[10px] z-40 animate-in slide-in-from-top-full duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
              <div className="text-center pb-2 border-b border-dashed border-gray-300">
                <div className="font-extrabold text-xs uppercase">Boutique du Progrès</div>
                <div className="text-[9px] text-gray-500">Cotonou, Bénin</div>
                <div className="text-[8px] text-gray-400 mt-0.5">Ticket #0048 • 17/09/2026</div>
              </div>
              <div className="py-2 space-y-1">
                <div className="flex justify-between">
                  <span>3x Beaufort</span>
                  <span className="font-bold">30 000 F</span>
                </div>
              </div>
              <div className="pt-2 border-t border-dashed border-gray-300 space-y-1">
                <div className="flex justify-between font-extrabold text-xs">
                  <span>TOTAL :</span>
                  <span>30 000 F</span>
                </div>
                <div className="text-center text-[8px] text-gray-400 pt-1">
                  Merci de votre visite !
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-emerald-700 font-bold text-[9px] bg-emerald-50 py-1 rounded">
                <Share2 className="w-3 h-3" />
                <span>Prêt pour WhatsApp</span>
              </div>
            </div>
          )}

        </div>

        {/* ── Barre de Contrôle Vidéo / Timeline (Linear Style) ── */}
        <div className="w-full max-w-3xl mt-8 bg-black/60 border border-white/10 p-3 rounded-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 z-20">
          
          {/* Boutons de Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevScene}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all active:scale-[0.97] cursor-pointer"
              title="Scène précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-2 transition-all active:scale-[0.97] cursor-pointer shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? "Pause" : "Lecture"}</span>
            </button>

            <button
              onClick={nextScene}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all active:scale-[0.97] cursor-pointer"
              title="Scène suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentScene(0)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-[0.97] cursor-pointer"
              title="Recommencer depuis le début"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Indicateur d'onglets de scènes (Sliding Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
            {SCENES.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentScene(idx)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  currentScene === idx 
                    ? 'bg-white text-black font-black shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Vitesse de lecture */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            {([1, 1.5, 2] as const).map(sp => (
              <button
                key={sp}
                onClick={() => setSpeed(sp)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                  speed === sp ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>

        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="px-6 py-4 border-t border-white/10 bg-black/40 text-center text-xs text-slate-500 font-mono">
        Cahier Numérique • Conçu spécialement pour les commerçants d'Afrique de l'Ouest
      </footer>

    </div>
  )
}
