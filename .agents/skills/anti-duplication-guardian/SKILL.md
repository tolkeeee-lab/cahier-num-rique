---
name: anti-duplication-guardian
description: >-
  Protocole et garde-fous d'ingénierie stricte pour empêcher la création de doublons
  de fonctions, composants, routes API, constantes, icônes et chemins dans le projet
  Cahier Numérique. Impose la réutilisation systématique des modules canoniques et
  l'exécution du gardien automatique.
---

# 🛡️ Anti-Duplication Guardian (Cahier Numérique)

Ce guide de compétence et ce protocole d'ingénierie empêchent formellement l'apparition de duplications techniques, de composants orphelins, de copier-coller de logique métier et d'incohérences de chemins dans l'ensemble du projet.

---

## 🚫 1. Les Interdictions Absolues ("Zero-Duplication")

1. **Interdiction de recréer une fonction déjà existante** :
   - Ne JAMAIS réécrire un formateur de prix (`Intl.NumberFormat` ou `formatPrice`) localement dans un composant.
   - Ne JAMAIS recalculer le tiroir-caisse (`getCurrentCash`) manuellement dans une route API ou un hook.
   - Ne JAMAIS réimplémenter la distance de Levenshtein ou la normalisation de noms de produits.
2. **Interdiction des vérifications d'environnement Supabase inline** :
   - Ne JAMAIS réécrire `!process.env.NEXT_PUBLIC_SUPABASE_URL || ...` dans une route API.
   - Utiliser exclusivement `isBackendSupabaseConfigured()` depuis `@/lib/supabase`.
3. **Interdiction des listes de constantes locales dispersées** :
   - Ne JAMAIS redéclarer localement les tableaux `CATEGORIES` ou `UNITS` de stock.
   - Utiliser les constantes officielles exportées par `@/components/stock/stockUtils`.
4. **Interdiction de créer des composants orphelins** :
   - Tout composant créé dans `components/` DOIT être monté et utilisé immédiatement dans une page ou un composant parent.
   - Si un composant est remplacé par une nouvelle version (ex: modal remplacé par un bandeau), l'ancien DOIT être supprimé immédiatement.
5. **Interdiction de dupliquer les chemins d'icônes ou de fichiers PWA** :
   - Les icônes canoniques vivent dans `/public/icons/`. Le Web Manifest et le layout HTML ne doivent pas déclarer la même ressource sous deux chemins concurrents.
6. **Interdiction de commiter des scripts de test scratch dans Git** :
   - Les scripts scratch temporaires restent réservés aux analyses éphémères et ne doivent jamais être trackés dans le dépôt Git (conformément au `.gitignore`).

---

## 🗺️ 2. Cartographie des Modules Canoniques ("Single Source of Truth")

Avant toute modification ou ajout de fonctionnalité, vous DEVEZ vérifier et réutiliser ces points d'entrée officiels :

| Domaine / Besoin | Module Canonique | Fonctions / Constantes à Réutiliser |
| :--- | :--- | :--- |
| **Formatage des Prix** | `@/lib/productUtils` | `formatPrice(price, suffix = 'F')` |
| **Normalisation Produits & NLP** | `@/lib/productUtils` | `normalizeProductName`, `levenshteinDistance` |
| **Solde Tiroir-Caisse & Cash** | `@/lib/sales/cashDrawerCalculator` | `getCurrentCash(shopId)`, `calculateCash(list)`, `getItemCashDelta(item)` |
| **Backend Supabase & Auth check** | `@/lib/supabase` | `isBackendSupabaseConfigured()`, `supabase`, `Database` |
| **Sécurité & Accès Boutique** | `@/lib/server/shopAccess` | `requireShopAccess`, `requireShopOwner`, `shopAuthorizationErrorResponse` |
| **Constantes Stock & Paliers** | `@/components/stock/stockUtils` | `CATEGORIES`, `UNITS`, `getItemPurchaseValue`, `getStockStatus` |
| **Journal d'Audit Anti-Fraude** | `@/lib/auditLogger` | `logAuditEvent({ shopId, action, targetId, details })` |
| **Codes Boutiques Multi-Tenants** | `@/lib/shopCodeUtils` | `getDualShopIds(shopId)`, `normalizeShopCode`, `formatShortShopCode` |
| **Synchronisation Temps Réel** | `@/lib/realtimeSync` | `broadcastInstantSync(shopId, entity)`, `setupRealtimeSync`, `getRealtimeChannelName` |
| **Persistance Hors-Ligne & Sync** | `@/lib/offlineDb` & `@/lib/indexedDb` | `saveOfflineSale`, `getPendingSync`, `idbAddSyncItem` |
| **Mises à Jour PWA & SW** | `@/components/pwa/PwaUpdateBanner` | `PwaUpdateBanner`, `SKIP_WAITING` |
| **Schéma SQL Maître Unique** | `supabase/migrations/000_MASTER_TOUT_EN_UN_DEFINITIF.sql` | 11 tables DDL + indexes + RLS unifiées |
| **Autorité Centrale SSOT** | `.agents/skills/central-ssot-authority` | Matrice des 10 domaines canoniques |

---

## 📋 3. Protocole Obligatoire avant d'Écrire du Code

Avant d'ajouter du code dans le projet, appliquez cette séquence stricte :

1. **Recherche préalable ("Search First")** :
   - Effectuer un `git grep "<terme_clef>"` pour vérifier si la fonction, le type, la constante ou le composant existe déjà.
2. **Importation canonique** :
   - Si la logique existe déjà dans un module de `lib/` ou `components/`, importez-la directement au lieu de la dupliquer.
3. **Purge immédiate des obsolescences** :
   - Si une fonctionnalité rend un composant ou un fichier superflu, supprimez l'ancien fichier sans le laisser à l'abandon.
4. **Validation automatisée anti-doublons** :
   - Exécutez le script gardien avant chaque commit :
     ```bash
     npm run check:duplicates
     ```

---

## ⚡ 4. Exécution du Gardien Automatique

Le script [`scripts/guard_anti_duplicate.ts`](file:///c:/Users/fenou/.antigravity-ide/cahier-num-rique/scripts/guard_anti_duplicate.ts) vérifie automatiquement :
- L'absence de composants orphelins (fichiers non importés dans l'arborescence).
- L'utilisation exclusive de `isBackendSupabaseConfigured` dans toutes les routes `app/api/`.
- L'absence de réimplémentation locale de `getCurrentCash`.
- L'absence d'icônes ou de chemins dupliqués dans le Web Manifest PWA.
- L'absence de fichiers scratch temporaires trackés dans Git.

Il est intégré directement à la commande `npm test`. Aucun code dupliqué ne peut être validé si ce test échoue.

