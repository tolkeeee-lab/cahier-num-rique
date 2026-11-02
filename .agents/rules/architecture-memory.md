# 🏛️ Mémoire Architecturale & Invariants Techniques — Cahier Numérique
**Plan Technique & Verdict CTO validé à 100% (Référence : `PLAN_TECHNIQUE_CTO.md`)**

Ce document consigne les acquis immuables, les règles d'architecture et les arbitrages techniques validés pour le projet. Tout agent ou développeur intervenant sur ce dépôt DOIT respecter ces invariants.

---

## 1. 🔄 Architecture de Synchronisation Offline-First (Flux Unidirectionnel)
- **Principe d'écriture instantanée (0 ms)** : L'UI écrit **exclusivement** dans le stockage local (IndexedDB via `lib/offlineDb.ts`) et émet l'événement `cahier_local_sale_created`. L'UI ne doit JAMAIS attendre la réponse du réseau pour valider une vente.
- **Passerelle Réseau Unique** : Le hook `hooks/useOfflineSync.ts` est l'**unique orchestrateur** chargé de dépiler les ventes locales et de les envoyer vers Supabase. Ne jamais réintroduire de fonction réseau parallèle (ex: `syncWithApi`).
- **Sanctuarisation des données non synchronisées** : Lors d'un fetch Supabase dans `hooks/useJournalData.ts`, les ventes locales ayant `is_synced === false` ou absentes de Supabase sont **strictement préservées** lors de la fusion. Elles ne doivent JAMAIS être écrasées ou filtrées.
- **Temps Réel & Réveil Mobile (< 50ms)** : La synchronisation inter-appareils repose sur l'architecture double couche de `@/lib/realtimeSync` :
  1. Le WebSocket Broadcast instantané (`broadcastInstantSync` < 50ms) sur le topic déterministe `realtime_shop_{code}`.
  2. Le canal Supabase Realtime (`postgres_changes` multi-alias sur `sales`, `products`, `shopping_list`).
  3. L'événement `visibilitychange` (déclenché quand l'utilisateur rouvre l'application sur smartphone).
  4. Un polling de secours toutes les 15 secondes.
  5. Référence centrale : `.agents/skills/central-ssot-authority/SKILL.md`.

---

## 2. 💾 Gestion du Stockage & Intégrité Comptable
- **IndexedDB = Source de Vérité Historique** : Rétention illimitée de 100% de l'historique dans IndexedDB (`idbGetAllSales`, `replaceStoreItemsByShopId`).
- **LocalStorage = Cache Rapide Plafonné** : Le `localStorage` est limité aux **250 ventes les plus récentes** + **100% des ventes non synchronisées**. Cela prévient l'erreur `QuotaExceededError` sur mobile tout en garantissant zéro perte de données.
- **Alerte Quota Stockage** : En cas de `QuotaExceededError`, un CustomEvent `cahier_storage_full` est émis pour prévenir l'utilisateur et inviter à la synchronisation.
- **Intégrité Historique des Ventes** : La suppression d'un produit en rayon (`deleteOfflineProduct`) ne doit JAMAIS supprimer rétroactivement les articles vendus dans les ventes passées.
- **Journal d'Audit Hors-Ligne** : Les logs de sécurité/fraude (`lib/auditLogger.ts`) sont stockés dans la file IndexedDB `sync_queue` s'il n'y a pas de réseau et vidés automatiquement dès reconnexion.

---

## 3. 🛡️ Base de Données, Multi-Tenant & RLS
- **Génération d'Identifiants Boutiques** : Toute nouvelle boutique reçoit un identifiant UUID v4 standard (`crypto.randomUUID()`). Le code court (`shop_code`) est conservé pour l'affichage et l'invitation d'employés.
- **Ne pas migrer les anciens codes `SHOP-` / `BTQ-`** : Trop risqué et inutile ; ils fonctionnent en l'état avec la résolution duale.
- **Isolation RLS (Migration 022)** : RLS solide et sanctuarisée. Toutes les requêtes Supabase doivent respecter l'isolation multi-tenant via `shop_id` et les politiques RLS définies dans `supabase/migrations/`.
- **Typage Supabase** : Les clients `supabase` et `supabaseClient` sont typés avec `Database` (`lib/types/database.types.ts`).

---

## 4. 🚫 Ce qu'on ne reconstruit PAS (Sanctuarisé)
- **`useOfflineSync`** : Ne pas réécrire, la logique de retry est solide.
- **Migrations RLS** : Ne pas altérer la migration 022.
- **`localDb.ts`** : Fallback mémoire transitoire uniquement, ne pas reconstruire.
- **`offlineDb.ts`** : Pratiquer uniquement des interventions chirurgicales ciblées, aucun rebuild global.
- **Persistence v2 (DT-1)** : Ne jamais entamer la fusion des 3 couches de stockage sans tests E2E préalables.

---

## 5. 🧪 Discipline de Validation & Déploiement
- Avant tout commit ou push :
  1. `npm test` : Validation de la suite critique (normalisation de stock et FIFO des dettes, 10/10 requis).
  2. `npm run build` : Compilation Next.js 100% au vert (20/20 routes, 0 erreur TypeScript).
- Règle d'or : **Ne jamais empiler de nouvelles fonctionnalités sur une dette non résolue.** Toujours maintenir le socle vert.
