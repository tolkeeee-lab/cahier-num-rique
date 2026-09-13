---
trigger: always_on
description: Standard Senior Art Director & Figma-Grade UI/UX avec physique d'animation pro (Apple, Linear, Framer). Enforce 8pt spatial grid, optical balance, inset beveled lighting, fluid cubic-bezier springs, and ban generic AI aesthetics.
---

# 🎨 Standard Figma-Grade UI/UX & Senior Art Direction

Chaque écran, composant, style ou texte généré DOIT atteindre la qualité d'un fichier **Figma Senior Product Designer** (Stripe, Linear, Apple, Framer) et intégrer des **animations professionnelles physiques fluides**.

---

## 🚫 1. Les Interdictions Absolues ("AI Slop" & Erreurs Juniors)

1. **Pas de dégradé violet/cyan fluo systématique** : Banni sur les cartes, bordures et boutons.
2. **Pas de spam d'émojis** : Zéro emoji en guise d'icône ou de puce. Utiliser exclusivement des icônes SVG fines (`stroke-width: 1.5px` ou `1.75px`, Lucide / Heroicons).
3. **Pas de cartes plates et génériques ("Card Soup")** : Chaque conteneur doit avoir une intention, une hiérarchie et un traitement de surface précis.
4. **Pas de spinners géants bloquants** : Utiliser des **Skeletons calqués au pixel près** sur la forme finale attendue.
5. **Pas d'animations saccadées ou linéaires basiques** : BANNIR `transition: all 0.3s ease` générique. Utiliser des courbes physiques `cubic-bezier` rapides et précises.
6. **Pas de textes promotionnels creux** : Interdiction de slogans vagues (*"Révolutionnez votre gestion"*). Micro-copie sobre et directe.

---

## ✨ 2. Les Règles d'Or Figma-Grade (Craft & Finition Senior)

### 💎 A. Traitement des Surfaces & Profondeur (Beveled Inset Highlight)
- **Liseré supérieur biseauté (Inset Light)** :
  ```css
  /* Mode Sombre */
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 4px 16px -2px rgba(0, 0, 0, 0.4);
  /* Mode Clair */
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.9), 0 2px 8px -2px rgba(0, 0, 0, 0.06);
  ```
- **Micro-dégradé de surface sombre** :
  `background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%), #11131a;`

### 📐 B. Auto-Layout & Échelle Typographique Strictes
- **Grille 8pt stricte** : Tous les `gap`, `padding`, `margin` utilisent `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.
- **Titres (Display & H1/H2)** : `tracking-[-0.025em] font-semibold text-slate-100`.
- **Sur-titres & Badges (Overline/Labels)** : `text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400`.
- **Chiffres & Montants (POS / Finance / Stock)** : `font-mono tabular-nums tracking-tight` obligatoire.

---

## 🎬 3. Le Standard d'Animation Professionnelle (Apple / Linear Spring Physics)

### 🏎️ Les 3 Courbes de Bézier Officielles
```css
:root {
  /* 1. Entrée dynamique / Pop (Linear Sheet / Modal) */
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  /* 2. Pression & Clic tactile ultra-réactif */
  --ease-press: cubic-bezier(0.2, 0, 0, 1);
  /* 3. Glissement feutré (iOS Sheet / Drawer) */
  --ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);
}
```

### ⚡ Les Règles d'Animation à Appliquer :
1. **Entrées en cascade (Staggered Fade-Up)** :
   - Les listes, grilles de cartes et lignes de tableau ne surgissent jamais en bloc.
   - Décalage fluide : `animation-delay: calc(var(--index) * 35ms)` avec translation subtile `translate-y-2` ➔ `translate-y-0` et `opacity-0` ➔ `opacity-100` en `200ms var(--ease-spring)`.
2. **Modales & Tiroirs (Sheets) avec Flou Arrière-Plan** :
   - Fond : Transition douce `backdrop-blur-0` ➔ `backdrop-blur-md` avec `bg-black/60` en `180ms`.
   - Contenu : Éjection douce depuis le bas (`translate-y-4` ➔ `translate-y-0`) avec `var(--ease-spring)`.
3. **Indicateurs d'Onglets Glissants (Sliding Pill)** :
   - L'indicateur actif glisse sans à-coup entre les onglets (`transition: transform 200ms var(--ease-spring)` ou Framer Motion `layoutId`).
4. **Micro-Pression Tactile & Clic Instantané** :
   - `active:scale-[0.97] transition-transform duration-100 ease-out`.
5. **Toast Notifications Rebondissantes** :
   - Glissement depuis le bas/haut avec micro-dépassement feutré (`scale-[1.02]` ➔ `scale-100`) et disparition fluide.

---

## 📋 4. Checklist de Validation "Figma Senior & Motion"
- [ ] Zéro transition linéaire lente (`0.3s ease` banni).
- [ ] Les listes et cartes s'affichent avec une cascade feutrée (staggered).
- [ ] Le contraste texte/fond respecte les normes d'accessibilité WCAG AA.
- [ ] Les données chiffrées sont en `tabular-nums`.
- [ ] Les clics et boutons ont un retour de pression tactile immédiat (`scale-[0.97]`).
- [ ] Les bordures et ombres utilisent le système biseauté multi-couches.
- [ ] La micro-copie est concise, humaine et sans superlatifs artificiels.
