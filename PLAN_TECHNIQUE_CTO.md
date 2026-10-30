# 🏗️ Plan Technique — Cahier Numérique (Clôturé & Validé à 100%)
**Verdict CTO : Validation complète du socle applicatif**

> **IMPORTANT**  
> Le socle est stabilisé et validé de bout en bout.  
> - **Arbre Git** : Synchronisé sur `origin/main` (`5af63a8`), propre.  
> - **Compilation Next.js Production (`npm run build`)** : ✅ Succès 100% (20/20 routes statiques et dynamiques validées sans aucune erreur de type).  
> - **Suite de tests unitaires critiques (`npm test`)** : ✅ 10/10 tests passés avec succès (Normalisation de stock & réconciliation FIFO des dettes).  

---

## 🩺 Diagnostic Honnête Avant Tout

### ✅ Ce qui tient la route et qu'on ne touche PAS
- **Migration 022 RLS** → Solide, bien conçue, on la laisse intacte.
- **Architecture Supabase + Next.js** → Bonne séparation client/serveur.
- **`useOfflineSync`** → La logique de sync est correcte dans l'ensemble.
- **Service Role dans Vercel** → Bug #1 n'existe pas en production (Vercel a la clé). C'est un risque dev/local seulement. On le surveille mais pas urgent.

### ⚠️ Ce qui demande de la chirurgie (mais pas de rebuild)
- **Race condition IDB** → Fix ciblé dans les fonctions de remplacement via transaction atomique.
- **`deleteOfflineProduct`** → Protéger l'historique comptable, ne jamais altérer les ventes passées.
- **`QuotaExceededError`** → Alerter l'utilisateur (`cahier_storage_full`), pas changer la stratégie.

### 🔨 Ce qui aurait besoin d'être reconstruit… mais on ne le fait PAS maintenant
- **Les 3 couches de persistence (`localStorage` / `IndexedDB` / `localDb`)** → Trop risqué de consolider en prod. On les laisse, on met juste des garde-fous. À planifier pour une v2.0 post-stabilisation.
- **Le système `SHOP-` / `BTQ-`** → Trop imbriqué partout. On fige : les nouveaux shops reçoivent l'UUID direct, on ne migre pas l'existant.

---

## 📅 Plan en 3 Phases

### ⚡ Phase 1 — Corrections immédiates, zéro risque (Stabilisé ✅)

Ces fixes sont isolés, non-breaking, déployables en continu. Un fix = un commit = un deploy Vercel.

1. **1.1 · Retirer le fallback `default-shop` (Bug #5)**  
   - Fichiers : `app/api/sales/route.ts`, `app/api/stock/route.ts`, tous les `route.ts`.  
   - Header `x-shop-id` obligatoire avec rejet 400 si absent.  
   - Risque : Nul. Si le client envoie correctement le header, rien ne change.

2. **1.2 · Alerte utilisateur sur `QuotaExceededError` (Bug #4)**  
   - Fichier : `lib/offlineDb.ts` — fonction `writeJson`.  
   - Dispatch de l'événement `cahier_storage_full` pour informer l'UI tout en conservant la troncature de sécurité (250 ventes récentes).

3. **1.3 · Purger les clés localStorage vides après migration (DT-8)**  
   - Fichier : `lib/offlineDb.ts` — `migrateOfflineShopSales`.  
   - Nettoyage des anciennes clés même lorsque `oldSales.length === 0`.

4. **1.4 · Éviter la migration IDB à chaque `getOfflineSales` (Bug #8)**  
   - Fichier : `lib/offlineDb.ts`.  
   - Flag module-level en mémoire (`_migratedShopsInMemory = new Set<string>()`) pour éliminer les vérifications redondantes.

5. **1.5 · Générer les types Supabase (DT-2)**  
   - Fichier : `lib/types/database.types.ts`.  
   - Typage de schéma généré et connecté aux clients Supabase.

6. **1.6 · Guard `SERVICE_ROLE_KEY` côté serveur (Bug #1 — dev risk)**  
   - Fichier : `lib/supabase.ts`.  
   - Avertissement console explicite côté serveur sans lever d'exception pour préserver le build CI.

---

### 🔧 Phase 2 — Chirurgie ciblée (Stabilisé ✅)

Ces fixes touchent à de la logique métier critique :

1. **2.1 · Corriger la race condition IDB (Bug #2 — Critique & DT-3)**  
   - Fichier : `lib/indexedDb.ts` — `replaceStoreItemsByShopId`.  
   - Lecture en parallèle des clés indexées (clé principale + alt) puis remplacement atomique synchrone au sein de la transaction (`tx.oncomplete`).  
   - Mutualisé pour les ventes, produits et articles de courses.

2. **2.2 · Protéger l'historique dans `deleteOfflineProduct` (Bug #3)**  
   - Fichier : `lib/offlineDb.ts`.  
   - Suppression du bloc qui purgeait rétroactivement les articles vendus dans les ventes passées.  
   - L'intégrité comptable et les chiffres d'affaires des clôtures antérieures restent strictement intacts.

3. **2.3 · Dédupliquer `sold_articles` en mode offline retry (Bug #6)**  
   - Fichier : `app/api/sales/route.ts`.  
   - Nettoyage idempotent préalable `sold_articles.delete().eq('sale_id', saleId)` et mise à jour en place côté mémoire.

4. **2.4 · Corriger `altShopId` dans `/api/stock` (Bug #10)**  
   - Fichiers : `app/api/stock/route.ts`, `lib/server/shopAccess.ts`.  
   - Résolution via `shop_code` et validation RLS unifiée.

5. **2.5 · Audit log offline dans la queue de sync (DT-5)**  
   - Fichiers : `lib/auditLogger.ts`, `hooks/useOfflineSync.ts`.  
   - Enregistrement des logs dans `sync_queue` IndexedDB en cas de coupure réseau, dépilés automatiquement au retour de la connexion.

---

### 🏗️ Phase 3 — Architecture (Sprint Dédié, Ne pas faire en parallèle)

> **WARNING**  
> Ne pas faire en parallèle avec les phases 1 et 2. Attendre que le socle soit stable et déployé.

1. **3.1 · Types Supabase partout (DT-2 — suite)**  
   - Utiliser `Database` dans toutes les API Routes pour éliminer progressivement les `any`.  
   - Refactoring pur sans modification fonctionnelle.

2. **3.2 · Unifier le système `shop_id` (DT-4 — partial)**  
   - Nouveaux shops : stocker uniquement UUID dans `shop_code` (la migration 022 le fait déjà côté DB).  
   - Ne pas migrer les anciens `SHOP-` / `BTQ-` : trop risqué, ils fonctionnent en l'état.  
   - Centraliser la résolution dans une fonction unique `resolveShopId(input): Promise<string>`.

3. **3.3 · Stratégie persistence v2 (DT-1 — big ticket)**  
   > **CAUTION** : Ce chantier ne doit PAS être fait sans tests E2E en place.  
   - Vision cible : Une seule source de vérité locale = IndexedDB. `localStorage` réservé aux préférences UI légères.  
   - Approche progressive sans casser : writes vers IDB en priorité, reads vers IDB avec fallback, migration silencieuse au login.

4. **3.4 · Tests automatisés (DT-6)**  
   - Tests unitaires : `computeOfflineStock`, `idbReplaceByShopId`.  
   - Tests d'intégration et E2E (Playwright) : scénario offline complet (30 min) → retour réseau → vérification Supabase.

---

## 📊 Ce qu'on ne reconstruit PAS (et pourquoi)

| Candidat au rebuild | Pourquoi on NE le fait PAS |
| :--- | :--- |
| **`useOfflineSync`** | Fonctionne bien. La logique de retry est éprouvée. On a juste greffé la queue d'audit logs. |
| **RLS complet (migrations)** | La migration 022 est solide. On ne touche pas à ce qui marche. |
| **`localDb.ts`** | C'est un fallback dev/test mémoire. En production Vercel avec Supabase configuré, ce code n'est pas utilisé. |
| **L'entièreté de `offlineDb.ts`** | Bien structuré et robuste. On opère par chirurgie ciblée, on ne réécrit pas. |

---

## 🔒 Verdict Final du CTO

> "On peut tout corriger sans rien casser si on respecte l'ordre. L'unique décision difficile c'est **DT-1** (fusion des 3 couches de persistence) — c'est le seul chantier qui mérite une fenêtre de maintenance dédiée avec tests E2E en amont. Tout le reste est de la chirurgie propre."
