---
name: test-master-protocol
description: Catalogue complet et protocole d'exécution de tous les tests de Cahier Numérique (statiques, unitaires métier, sécurité API/RLS, PWA/hors-ligne, E2E Playwright et build). À utiliser pour vérifier l'application en profondeur sans jamais oublier un test entre sessions.
---

# Protocole Maître de Tests — Cahier Numérique

## 1. Commande unique de vérification rapide (`npm run test:all`)
Exécute en quelques secondes les 5 suites automatisées sans dépendance réseau :
1. `scripts/guard_anti_duplicate.ts` — composants orphelins, routes API mortes, doublon de manifeste PWA, cohérence Auth/RLS sur 100 % des routes métier, hygiène `sw.js`, intercepteur JWT client.
2. `scripts/test_critical_suite.ts` — normalisation produits, dettes FIFO clients/fournisseurs, calcul exact du tiroir-caisse, valorisation stock sans dérive d'arrondi, parseur de vente (aucune lettre avalée), validation Zod.
3. `scripts/test_infallible_valuation.ts` — paliers dégressifs FCFA (détail, lot, 1/8, 1/4, 1/2, carton) et anti-vente à perte.
4. `scripts/test_smart_product_parser.ts` — 11 scénarios NLP de saisie rapide de stock.
5. `scripts/test_error_diagnostics.ts` — 19 tests de télémétrie et traduction humaine des erreurs.

## 2. Tests d'intégration & Base de données (changements API / SQL)
- **Supabase Advisors** (`get_advisors` security + performance) : objectif `0 WARN`.
- **Matrice RBAC / RLS** : vérifier 4 profils (Anonyme = 401, Employé = accès restreint, Propriétaire = accès complet, Intrus autre boutique = 0 ligne).

## 3. Tests End-to-End Navigateur (`npm run test:e2e`)
Suites Playwright disponibles dans `e2e/` :
- `caisse_flow.spec.ts` — ventes, dépenses, ratures, solde
- `closing_flow.spec.ts` — clôture de caisse
- `dettes_stock.spec.ts` — dettes clients/fournisseurs & stock
- `employee_tabs_restriction.spec.ts` — onglets masqués pour l'employé
- `multidevice_sync.spec.ts` — synchronisation PC ↔ mobile

## 4. Porte finale avant déploiement
```powershell
npm.cmd run test:all; if ($LASTEXITCODE -eq 0) { npm.cmd run build }
```
- Tout nouveau bug corrigé doit être verrouillé par un test de non-régression dans `scripts/test_critical_suite.ts` ou `scripts/guard_anti_duplicate.ts`.
