# 🏛️ Invariants Architecturaux Absolus du Projet Cahier Numérique

> **STATUT : INTRACTABLE ET PERMANENT**  
> Ce document consigne les fondations techniques non négociables de l'application Cahier Numérique.  
> **RÈGLE FORMELLE POUR TOUT AGENT IA OU DÉVELOPPEUR :**  
> Avant de toucher à toute logique de synchronisation, de persistance, de calcul ou d'accès boutique, ce document DOIT être lu et respecté. **Il est formellement interdit de supprimer ou de régresser l'un de ces invariants.**

---

## ⚡ 1. Synchronisation Temps Réel Hybride (PC <-> Téléphone PWA < 50ms)
- **Le canal distant Supabase Realtime WebSocket est OBLIGATOIRE** dans `lib/realtimeSync.ts`.
- **Interdiction Formelle :** Ne jamais supprimer `supabaseClient.channel` ni remplacer le WebSocket par une solution purement locale comme `BroadcastChannel`. `BroadcastChannel` ne traverse PAS Internet et rend les appareils distants aveugles.
- **Rôle du BroadcastChannel W3C :** Il fonctionne **en parallèle** du WebSocket Supabase pour synchroniser à 0ms les onglets multiples d'un même navigateur, mais NE REMPLACE PAS le WebSocket.
- **Gestion de la veille smartphone (iOS Safari / Android) :**
  - La déconnexion en veille est un comportement standard de l'OS.
  - La solution autorisée est **l'auto-rétablissement au réveil** via `visibilitychange` (`document.visibilityState === 'visible'`) et `window.addEventListener('online')`.
  - Ne jamais détruire le socket lors des cycles de rafraîchissement périodiques.
- **Stabilité de `useJournalData.ts` :**
  - La souscription WebSocket et le polling résilient ont leur propre cycle de vie stable (`[shopId, isOnline]`).
  - **Interdiction Formelle :** Ne jamais placer un compteur ou un déclencheur comme `refreshTrigger` dans les dépendances du `useEffect` qui gère le WebSocket, sous peine de détruire et recréer la connexion en boucle toutes les 4 secondes.

---

## 💾 2. Persistance Double Rempart & Zéro Perte Hors-Ligne (Offline-First)
- **Affichage instantané 0 ms :** Toute saisie au stylo est immédiatement enregistrée dans le stockage local persistant (`localStorage` via `offlineDb.ts`) avant tout appel réseau.
- **Persistance Cloud Directe :** Si le client est en ligne et connecté, une tentative d'upsert direct Supabase est déclenchée immédiatement en arrière-plan sans bloquer l'interface.
- **File de secours résiliente :** `useOfflineSync.ts` prend le relais en tâche de fond pour envoyer les ventes non synchronisées via l'API `/api/sales` ou en secours direct sur Supabase.
- **Idempotence stricte :** Toutes les écritures de ventes utilisent `upsert([saleRecord], { onConflict: 'id' })` avec l'UUID généré localement pour éliminer tout risque de doublon lors des réessais concurrents.

---

## 🔐 3. Multi-Tenant & Résolution des Identifiants Boutiques
- **Unification Déterministe :** Un commerçant peut être identifié par son UUID natif ou son code court chic (ex: `BTQ-58C54` / `SHOP-58C54` / `58C54`).
- **Topic Realtime Unique :** `getRealtimeChannelName(shopId)` unifie systématiquement l'UUID et les codes courts sur le même topic canonique `realtime_shop_<5CHARS>` (ex: `realtime_shop_58C54`), garantissant que PC et smartphone se rejoignent sur le même canal.
- **Requêtes Multi-Alias :** Les requêtes SQL dans Supabase utilisent `getDualShopIds(shopId)` pour interroger simultanément l'UUID et les codes courts.
- **Sécurité RLS Supabase & Fallback Serveur :**
  - Dans `lib/server/shopAccess.ts`, si la variable `SUPABASE_SERVICE_ROLE_KEY` est absente sur le serveur (Vercel), l'application bascule proprement sur `getAuthorizedServerClient(accessToken)` en injectant le Bearer token du commerçant pour respecter les politiques RLS `authenticated`.
  - Interdiction de faire échouer les routes en HTTP 500 par simple absence de `SUPABASE_SERVICE_ROLE_KEY`.

---

## 💰 4. Rigueur Financière, Tiroir-Caisse & Dettes
- **Zéro Flottant IEEE-754 :** Tous les montants financiers sont arrondis au centime près via `Math.round(val * 100) / 100`. Les centimes fantômes (ex: `12.0000000004`) sont strictement bannis.
- **Autorité Unique du Tiroir-Caisse :** Le calcul du solde en caisse est centralisé exclusivement dans `lib/sales/cashDrawerCalculator.ts` (`getCurrentCash` et `getItemCashDelta`). Aucune réimplémentation dispersée n'est tolérée.
- **Réconciliation FIFO des Dettes :** Les remboursements clients et fournisseurs sont apurés par ordre chronologique strict (du plus ancien au plus récent). Une dette ne peut jamais devenir négative (`Math.max(0, dette)`).

---

## 🛡️ 5. Intégrité du Code & Zéro Fichiers Fantômes
- **Gardien Automatique :** Tout commit DOIT passer avec succès `npm test` (`scripts/guard_anti_duplicate.ts` et `scripts/test_critical_suite.ts`).
- **Composants Orphelins :** Zéro composant React non importé dans le projet.
- **Scripts Scratch :** Aucun fichier temporaire ou de test à la volée ne doit être commité dans la branche principale `main`.

