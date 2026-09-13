---
name: impeccable-ui-artisan
description: >-
  Guide de référence complet pour concevoir des interfaces utilisateur de calibre
  Senior Figma Designer (Linear, Stripe, Apple, Framer). Fournit les tokens de surface
  biseautés, la typographie de haute précision, les variantes d'états complètes,
  l'harmonie optique et la physique d'animations professionnelles.
---

# 💎 Senior Figma-Grade UI/UX Artisan & Design System

Ce guide définit les standards appliqués par les meilleurs designers Figma, directeurs artistiques et motion designers pour créer des interfaces épurées, tactiles, vivantes et sans défaut.

---

## 🎬 1. Le Moteur d'Animation Professionnel (Physics & Micro-Animations)

### 🏎️ Variables CSS de Courbes Easing (Springs & Deceleration)
```css
:root {
  /* 1. Entrée dynamique / Pop (Linear Modal / Sheet) */
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  /* 2. Pression & Clic tactile ultra-réactif */
  --ease-press: cubic-bezier(0.2, 0, 0, 1);
  /* 3. Glissement feutré (iOS Sheet / Drawer) */
  --ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);
  /* 4. Sortie rapide */
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
}
```

### 📦 Snippets d'Animation Prêts à l'Emploi

#### A. Entrée en Cascade (Staggered Fade-Up pour Listes & Grilles)
```css
@keyframes staggerFadeUp {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.stagger-item {
  animation: staggerFadeUp 220ms var(--ease-spring) both;
  animation-delay: calc(var(--index, 0) * 35ms);
}
```

#### B. Modale & Overlay de Haut Vol (React / Tailwind)
```tsx
{/* Backdrop avec flou progressif */}
<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-opacity duration-200 ease-out flex items-center justify-center p-4">
  {/* Fenêtre modale avec éjection douce */}
  <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_12px_40px_-8px_rgba(0,0,0,0.6)] animate-[staggerFadeUp_240ms_cubic-bezier(0.16,1,0.3,1)_both]">
    {/* Contenu */}
  </div>
</div>
```

#### C. Micro-Rebond Toast Notification
```tsx
<div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/95 border border-white/[0.1] shadow-2xl backdrop-blur-lg transform transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01]">
  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
  <span className="text-sm font-medium text-slate-100">Ticket #1043 imprimé</span>
</div>
```

---

## 🎨 2. Architecture des Couleurs & Traitement de Surface (Figma Layer Styles)

### A. Dark Mode "Obsidian Obsidian Pro" (Linear / Raycast Grade)
```css
:root {
  --canvas: #090a0f;
  --surface-base: #11131a;
  --surface-elevated: #181b24;
  --surface-overlay: #212532;
  
  --border-subtle: rgba(255, 255, 255, 0.07);
  --border-active: rgba(255, 255, 255, 0.16);
  --border-focus: rgba(99, 102, 241, 0.6);
  
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  
  --accent-brand: #6366f1;   /* Indigo royal */
  --accent-emerald: #10b981; /* Émeraude financier */
  --accent-amber: #f59e0b;   /* Ambre alerte stock */
  --accent-rose: #f43f5e;    /* Rose erreur */
}
```

### B. Traitement Biseauté des Cartes (Inset Light & Multi-Stop Shadows)
```css
.figma-card-dark {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0) 100%), #11131a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    inset 0 1px 0 0 rgba(255, 255, 255, 0.08),  /* Liseré supérieur réfléchissant */
    0 1px 3px 0 rgba(0, 0, 0, 0.3),             /* Occlusion ambiante */
    0 8px 24px -4px rgba(0, 0, 0, 0.5);          /* Ombre portée douce */
  border-radius: 16px;
}
```

---

## 📐 3. Échelle Typographique & Règle des Chiffres Tabulaires

### Hiérarchie Visuelle Strictement Calibrée
- **Grand Titre de Section (H1/Display)** : `text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-slate-50 leading-tight`.
- **Titre de Carte / Widget (H2)** : `text-base font-semibold tracking-[-0.02em] text-slate-100`.
- **Sur-titre / Badge de Catégorie (Overline)** : `text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400`.
- **Corps de Texte / Explications** : `text-sm text-slate-400 leading-relaxed`.

### Règle d'Or Métier : Chiffres Tabulaires
Tous les montants en caisse, quantités en stock, pourcentages et dates doivent obligatoirement utiliser :
```tsx
<span className="font-mono tabular-nums tracking-tight font-medium text-slate-100">
  {new Intl.NumberFormat('fr-FR').format(montant)} FCFA
</span>
```

---

## 🔘 4. Composants & Variantes Interactives (Figma Variants)

### Bouton Principal "Tactile Bevel" avec Press Feedback
```tsx
<button
  type="button"
  className="relative inline-flex items-center justify-center gap-2 px-4 py-2.5 
             text-sm font-medium text-white 
             bg-gradient-to-b from-indigo-500 to-indigo-600 
             hover:from-indigo-400 hover:to-indigo-500 
             active:scale-[0.97] active:from-indigo-600 active:to-indigo-700
             rounded-xl border border-indigo-400/30 
             shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.1),0_4px_14px_rgba(99,102,241,0.3)]
             transition-all duration-100 ease-[cubic-bezier(0.2,0,0,1)]
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
>
  <CheckCircleIcon className="w-4 h-4 stroke-[1.75]" />
  <span>Valider la transaction</span>
  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-indigo-700/60 rounded border border-indigo-400/30 text-indigo-100">
    ↵ Enter
  </kbd>
</button>
```

### Carte Statistique KPI Animée
```tsx
<div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent bg-slate-900/90 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_20px_-2px_rgba(0,0,0,0.4)] hover:border-white/[0.14] hover:-translate-y-0.5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
  <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2.5">
    <span className="uppercase tracking-wider text-[11px] font-semibold text-slate-400">Chiffre d'affaires journalier</span>
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
      <TrendingUpIcon className="w-3.5 h-3.5 stroke-[2]" /> +14.2%
    </span>
  </div>
  <div className="text-3xl font-bold font-mono tabular-nums tracking-tight text-slate-50">
    284 500 <span className="text-sm font-sans font-normal text-slate-400">FCFA</span>
  </div>
  <div className="mt-4 text-xs text-slate-400 flex items-center justify-between border-t border-white/[0.06] pt-3">
    <span>32 ventes finalisées</span>
    <span className="text-slate-300 font-medium">Panier moy : 8 890 F</span>
  </div>
</div>
```
