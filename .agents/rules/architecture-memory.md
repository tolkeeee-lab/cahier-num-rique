# 🏛️ Mémoire Architecturale & Invariants Techniques — Cahier Numérique

Ce document consigne les acquis immuables, les règles d'architecture et les arbitrages techniques validés pour le projet. Tout agent ou développeur intervenant sur ce dépôt DOIT respecter ces invariants.

---

## 1. 🔄 Architecture de Synchronisation Offline-First (Flux Unidirectionnel)
- **Principe d'écriture instantanée (0 ms)** : L'UI écrit **exclusivement** dans le stockage local (IndexedDB via `lib/offlineDb.ts`) et émet l'événement `cahier_local_sale_created`. L'UI ne doit JAMAIS attendre la réponse du réseau pour valider une vente.
- **Passerelle Réseau Unique** : Le hook `hooks/useOfflineSync.ts` est l'**unique orchestrateur** chargé de dépiler les ventes locales et de les envoyer vers Supabase. Ne jamais réintroduire de fonction réseau parallèle (ex: `syncWithApi`).
- **Sanctuarisation des données non synchronisées** : Lors d'un fetch Supabase dans `hooks/useJournalData.ts`, les ventes locales ayant `is_synced === false` ou absentes de Supabase sont **strictement préservées** lors de la fusion. Elles ne doivent JAMAIS être écrasées ou filtrées.
- **Temps Réel & Réveil Mobile** : La synchronisation inter-appareils repose sur :
  1. Le canal Supabase Realtime (`postgres_changes` sur `sales`).
  2. L'événement `visibilitychange` (déclenché quand l'utilisateur rouvre l'application sur smartphone).
  3. Un polling de secours toutes les 15 secondes.

---

## 2. 💾 Gestion du Stockage & Intégrité Comptable
- **IndexedDB = Source de Vérité Historique** : Rétention illimitée de 100% de l'historique dans IndexedDB (`idbGetAllSales`).
- **LocalStorage = Cache Rapide Plafonné** : Le `localStorage` est limité aux **250 ventes les plus récentes** + **100% des ventes non synchronisées**. Cela prévient l'erreur `QuotaExceededError` sur mobile tout en garantissant zéro perte de données.
- **Intégrité Historique des Ventes** : La suppression d'un produit en rayon (`deleteOfflineProduct`) ne doit JAMAIS supprimer rétroactivement les articles vendus dans les ventes passées.
- **Journal d'Audit Hors-Ligne** : Les logs de sécurité/fraude (`lib/auditLogger.ts`) sont stockés dans la file IndexedDB `sync_queue` s'il n'y a pas de réseau et vidés automatiquement dès reconnexion.

---

## 3. 🛡️ Base de Données & Multi-Tenant
- **Génération d'Identifiants Boutiques** : Toute nouvelle boutique reçoit un identifiant UUID v4 standard (`crypto.randomUUID()`). Le code court (`shop_code`) est conservé pour l'affichage et l'invitation d'employés.
- **Typage Supabase** : Les clients `supabase` et `supabaseClient` sont instanciés de manière stable. `Database` dans `lib/types/database.types.ts` sert de référence de schéma sans bloquer les tables et vues dynamiques.
- **Isolation RLS** : Toutes les requêtes Supabase doivent respecter l'isolation multi-tenant via `shop_id` et les politiques RLS définies dans `supabase/migrations/`.

---

## 4. 🧪 Discipline de Validation & Déploiement
- Avant toute mise en production ou push git :
  1. `npm test` : Vérifie la non-régression (normalisation de stock et FIFO des dettes).
  2. `npm run build` : Vérifie la compilation Next.js et la stricte validité des types TypeScript.
- Règle d'or : **Ne jamais empiler de nouvelles fonctionnalités sur une dette non résolue.** Toujours maintenir le socle vert.
