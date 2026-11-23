---
name: quality-maintainability-gate
description: Protocole obligatoire de qualité logicielle, maintenabilité long terme et non-régression pour Cahier Numérique. À activer avant tout commit, ajout de route API, modification PWA/sync ou calcul financier afin de garantir zéro doublon, zéro régression métier et un logiciel simple à maintenir.
---

# Garde-Fou Qualité & Maintenabilité — Cahier Numérique

## Objectif
Empêcher la dérive du code (doublons de routes/API, bugs de cache PWA, régressions de caisse ou de stock, failles RLS silencieuses) grâce à une **porte de validation automatisée** exécutée avant chaque déploiement.

---

## 1. Les 5 Invariants de Maintenabilité (Vérifiés Automatiquement)

1. **Zéro doublon de routes, d'API ou de manifeste**
   - Une seule source de vérité pour le manifeste PWA : `public/manifest.json` (interdiction de recréer `app/manifest.ts`).
   - Chaque route sous `app/api/**/route.ts` doit être appelée activement par le client ; les opérations CRUD d'une même ressource partagent la même route (`GET/POST/PATCH/DELETE`).
   - Zéro composant orphelin dans `components/` et zéro réimplémentation des fonctions canoniques (`getCurrentCash`, `broadcastInstantSync`, `captureAppError`, `isBackendSupabaseConfigured`).

2. **Sécurité & Cohérence RLS sur 100 % des routes API métier**
   - Toute route métier (`sales`, `stock`, `stock/adjust`, `stock/merge`, `debts`, `cash-closings`, `employees`, `audit-logs`) doit passer par `requireShopAccess` ou `requireShopOwner` (`lib/server/shopAccess.ts`).
   - Les requêtes Supabase serveur doivent toujours utiliser le client authentifié renvoyé (`auth.client || supabase`) afin de ne jamais casser en environnement sans `SUPABASE_SERVICE_ROLE_KEY`.
   - Côté client, `installAuthenticatedApiFetch()` (`lib/clientAuthFetch.ts`) reste branché dans `ErrorDiagnosticsProvider.tsx` pour joindre le JWT Supabase à tous les appels `/api/*` (garantie de synchronisation PC ↔ mobile).

3. **Cycle de vie PWA sans désinstallation & Hors-Ligne intact**
   - `next.config.js` expose `NEXT_PUBLIC_BUILD_ID` et impose `Cache-Control: no-cache, no-store, must-revalidate` sur `/sw.js`.
   - `public/sw.js` ne met **jamais** en cache `/api/*`, les requêtes authentifiées ni les payloads Next.js RSC (`?_rsc`, header `rsc`), mais pré-cache `/` et `/journal` avec `cache: 'no-store'` dès l'installation pour garantir le mode hors-ligne.
   - `PwaUpdateBanner.tsx` vérifie `/api/version` et purge uniquement `CacheStorage` + désenregistre les anciens SW sans jamais toucher à IndexedDB ni `localStorage`.

4. **Exactitude Comptable & Stock (Non-Régression)**
   - Toute évolution sur la caisse (`lib/sales/cashDrawerCalculator.ts`), les dettes FIFO (`reconcileDebts`) ou la valorisation stock (`lib/stock/infallibleValuation.ts`) doit passer les tests unitaires automatiques sans dérive d'arrondi ni solde incohérent.

5. **Simplicité avant tout**
   - Avant d'ajouter un fichier, une route ou une abstraction, vérifier si un module existant couvre déjà le besoin.
   - Ne jamais laisser de route morte, de script temporaire suivi par Git ou de configuration en double.

---

## 2. Porte de Validation Obligatoire (Avant chaque `git push`)

Exécuter en une seule commande et vérifier `0 échec` :

```powershell
npm.cmd test; if ($LASTEXITCODE -eq 0) { npm.cmd run build }
```

Cette commande exécute dans l'ordre :
1. `scripts/guard_anti_duplicate.ts` — audit statique complet (composants orphelins, routes API mortes, doublons manifeste, cohérence RLS, hygiène PWA, synchronisation).
2. `scripts/test_critical_suite.ts` — tests unitaires critiques (normalisation produits, dettes FIFO clients/fournisseurs, calcul tiroir-caisse, valorisation stock sans dérive d'arrondi).
3. `next build` — vérification TypeScript stricte, lint et génération de toutes les routes de production.

Si un seul contrôle échoue, **corriger la cause racine avant de pousser**.
