# Standards de Haute Qualité — Senior Architecte & Directeur Artistique (20+ Ans d'Expérience)

## 🏗️ 1. Architecture Modulaire Stricte (Anti-Monolithe)
- **Tolérance zéro pour les fichiers monolithiques** : Chaque fichier doit avoir une responsabilité unique et rester sous la barre des ~150-200 lignes.
- **Extraction systématique des Custom Hooks** : Dès qu'un composant dépasse 3 états `useState` ou contient de la logique métier/calculs, extrayez-la dans un hook dédié (`hooks/use[Fonctionnalite].ts`).
- **Décomposition Atomique** : Découpez les pages complexes en sous-composants réutilisables (`Header`, `Toolbar`, `Card`, `List`, `Modal`).
- **Typage Strict** : Typage TypeScript explicite sans aucun `any`.

## 🎨 2. Rigueur Visuelle & Design Figma Pro (Directeur Artistique)
- **Grille Spatiale 8-Point** : Tous les espacements (`p-`, `m-`, `gap-`) doivent suivre le rythme de 8px (4px, 8px, 12px, 16px, 24px, 32px, 48px).
- **Règle 60-30-10 des Couleurs** : 60% base neutre/fond élégant, 30% surfaces et cartes avec bordures subtiles (`border-slate-800/80`), 10% accent de marque à fort contraste.
- **Anti "AI Slop"** :
  - Interdiction des dégradés violet/cyan fluo génériques partout.
  - Interdiction du spam d'emojis devant chaque titre. Utilisez des icônes SVG fines et élégantes (Lucide, stroke 1.5px).
  - Éclairage réaliste à double ombre (occlusion ambiante + ombre portée directionnelle).
- **Micro-Interactions Tactiles** : Réaction physique au clic (`active:scale-[0.98] transition-transform duration-100`), survol doux et squelettes de chargement géométriques précis (pas de spinner géant).

## ✍️ 3. Copywriting Humain & Professionnel
- Pas de jargon robotique ni de superlatifs creux (*"Révolutionnez"*, *"Plongez dans le futur"*, *"Propulsé par des algorithmes révolutionnaires"*, *"Effet wow"*).
- Texte direct, limpide, précis et orienté valeur concrète pour l'utilisateur.
