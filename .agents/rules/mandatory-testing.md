# Protocole Permanent de Tests & Non-Régression

Cette règle est chargée automatiquement à chaque session afin qu'aucune vérification ne soit oubliée entre deux conversations.

## 1. Avant tout `git push` (Obligatoire)
Exécuter la suite unifiée complète et le build de production :
```powershell
npm.cmd run test:all; if ($LASTEXITCODE -eq 0) { npm.cmd run build }
```
Si un seul contrôle échoue, corriger la cause racine avant de pousser.

## 2. Matrice des tests selon le domaine modifié
- **Toute modification** : `npm.cmd run test:all` (gardien anti-doublons/RLS/PWA + suite critique caisse/dettes/stock/parseur + valorisation FCFA + NLP produit + diagnostics).
- **Routes API / Auth / Supabase** : vérifier `requireShopAccess`/`requireShopOwner` + client RLS authentifié (`auth.client || supabase`) + Supabase Advisors (0 WARN).
- **UI / Mobile / Navigation** : vérifier zéro débordement horizontal sur mobile (`375px`), zéro texte tronqué, et lancer Playwright (`npm.cmd run test:e2e`) lors de changements majeurs de flux.
- **PWA / Hors-ligne** : vérifier `public/sw.js` (pré-cache `/` et `/journal` en `no-store`, exclusion `/api/` et `?_rsc`), `next.config.js` (`NEXT_PUBLIC_BUILD_ID` + anti-cache `/sw.js`).

## 3. Règle anti-oubli
Tout bug corrigé (parseur qui mange une lettre, arrondi de stock, faille RLS, cache PWA) **doit** recevoir un test de non-régression dans `scripts/test_critical_suite.ts` ou `scripts/guard_anti_duplicate.ts` dans le même commit.
