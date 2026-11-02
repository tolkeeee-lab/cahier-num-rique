# 🛡️ Règle Anti-Doublons & Zéro Fichier Orphelin (Cahier Numérique)

Cette règle est d'application obligatoire et permanente sur l'ensemble du projet.

---

## 🚫 1. Interdictions Strictes

1. **Pas de réimplémentation locale de logique existante** :
   - Formateurs de prix (`formatPrice`) : importer depuis `@/lib/productUtils`.
   - Calcul du tiroir-caisse (`getCurrentCash`, `calculateCash`) : importer depuis `@/lib/sales/cashDrawerCalculator`.
   - Vérification Supabase backend : importer `isBackendSupabaseConfigured` depuis `@/lib/supabase`.
   - Constantes de stock (`CATEGORIES`, `UNITS`) : importer depuis `@/components/stock/stockUtils`.
   - Normalisation et Levenshtein : importer depuis `@/lib/productUtils`.
   - Journal d'audit : importer `logAuditEvent` depuis `@/lib/auditLogger`.
   - Synchronisation temps réel : importer `broadcastInstantSync`, `setupRealtimeSync` depuis `@/lib/realtimeSync`.
   - Autorité centrale : se conformer à `.agents/skills/central-ssot-authority`.

2. **Pas de composants orphelins résiduels** :
   - Tout composant créé dans `components/` doit être activement utilisé.
   - Tout composant remplacé par une nouvelle version doit être immédiatement supprimé du dépôt.

3. **Pas de chemins ou fichiers PWA dupliqués** :
   - Les icônes canoniques vivent dans `/public/icons/`.
   - Les manifestes (`public/manifest.json` et `app/manifest.ts`) doivent être identiques et ne jamais déclarer la même image sous plusieurs URLs.

4. **Pas de scripts scratch temporaires dans Git** :
   - Les scripts scratch sont réservés aux analyses éphémères et doivent rester ignorés par `.gitignore`.

---

## 🔍 2. Protocole Avant Création de Nouveau Code
Avant de créer une fonction, un type, une constante ou un composant :
1. Lancer `git grep` pour vérifier l'existence préalable.
2. Si le module existe, importer et réutiliser la source unique de vérité.
3. Exécuter `npm run check:duplicates` pour valider l'intégrité structurelle.

