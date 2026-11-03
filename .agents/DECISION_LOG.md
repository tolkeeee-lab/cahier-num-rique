# 📜 Journal des Décisions d'Architecture (Architecture Decision Log)

> **RÈGLE FONDAMENTALE DE CONTINUITÉ & ANTI-AMNÉSIE**  
> Ce registre consigne toutes les décisions techniques structurantes du projet **Cahier Numérique**.  
> **Pour tout agent IA ou développeur :**  
> 1. Ne jamais défaire une décision actée sans avoir lu son contexte, ses motifs et ses alternatives rejetées.  
> 2. Si une nouvelle demande entre en tension avec une décision passée, NE PAS détruire aveuglément le code existant : informer l'utilisateur, expliquer la tension, et ajouter un nouvel ADR formel avant d'opérer.

---

## 📋 Modèle de Décision (ADR - Architectural Decision Record)

Chaque décision suit ce format strict :
- **Identifiant :** ADR-XXX
- **Date :** AAAA-MM-JJ
- **Statut :** [Accepté | Remplacé par ADR-YYY | Déprécié]
- **Contexte & Problématique :** Quel problème concret a motivé cette décision ?
- **Décision Adoptée :** Quelle solution technique a été retenue et pourquoi ?
- **Alternatives Rejetées :** Pourquoi les autres pistes n'étaient pas viables ?
- **Conséquences & Invariants induits :** Quels fichiers/règles sont verrouillés par cette décision ?

---

## 📌 Registre des Décisions Actées

### ADR-001 : Architecture Offline-First à Double Rempart (localStorage + Supabase direct)
- **Date :** 2026-10-25
- **Statut :** Accepté (Actif)
- **Contexte :** En Afrique de l'Ouest (Bénin, Togo, Côte d'Ivoire), les coupures réseau 3G/4G et pannes d'électricité sont fréquentes. Une caisse enregistreuse ne peut pas bloquer l'encaissement d'un client au comptoir à cause d'un réseau instable.
- **Décision :**
  1. Écriture synchrone immédiate (0 ms) dans le stockage local persistant (`localStorage` via `offlineDb.ts`) avec génération locale de l'UUID de la vente.
  2. Tentative d'upsert direct en arrière-plan sans attente bloquante si le réseau est présent.
  3. En cas d'échec ou hors-ligne, insertion dans la file d'attente locale `useOfflineSync.ts` pour rejeu automatique avec backoff exponentiel.
  4. Toutes les écritures utilisent `upsert([record], { onConflict: 'id' })` garantissant une idempotence mathématique parfaite sans doublon.
- **Alternatives Rejetées :**
  - *Cloud-Only (requête bloquante avant validation de la vente)* : Inacceptable pour le commerçant en zone à réseau intermittent.
- **Invariants Induits :** Voir Invariant 2 dans `.agents/ARCHITECTURAL_INVARIANTS.md`.

---

### ADR-002 : Résolution Multi-Tenant Déterministe et Fallback RLS sans SERVICE_ROLE_KEY
- **Date :** 2026-10-28
- **Statut :** Accepté (Actif)
- **Contexte :** Les commerçants utilisent des codes courts mémorisables (ex: `BTQ-58C54` ou `SHOP-58C54` ou `58C54`), tandis que la base Supabase utilise des UUID pour les identifiants techniques. De plus, sur Vercel, la variable `SUPABASE_SERVICE_ROLE_KEY` peut ne pas être configurée, ce qui provoquait des erreurs HTTP 500 bloquantes lors des appels API.
- **Décision :**
  1. `getRealtimeChannelName(shopId)` extrait systématiquement le suffixe déterministe (les 5 derniers caractères) pour normaliser l'UUID et le code court sur le même topic canonique `realtime_shop_<5CHARS>`.
  2. Les requêtes backend et client utilisent `getDualShopIds(shopId)` pour interroger simultanément la forme courte et la forme UUID.
  3. `lib/server/shopAccess.ts` bascule proprement sur `getAuthorizedServerClient(accessToken)` avec le Bearer token du commerçant si `SUPABASE_SERVICE_ROLE_KEY` est absente, respectant les politiques RLS `authenticated` sans planter en HTTP 500.
- **Alternatives Rejetées :**
  - *Forcer une conversion stricte synchrone via une table de mapping à chaque requête* : Trop de latence réseau et point de défaillance unique hors-ligne.
- **Invariants Induits :** Voir Invariant 3 dans `.agents/ARCHITECTURAL_INVARIANTS.md`.

---

### ADR-003 : Restauration Définitive de Supabase Realtime WebSocket et Découplage de useJournalData
- **Date :** 2026-11-03
- **Statut :** Accepté (Actif - Commit `47dd367`)
- **Contexte :** Lors d'une tentative de résolution d'une mise en veille sur smartphone, le canal distant WebSocket Supabase avait été retiré de `lib/realtimeSync.ts` au profit d'un simple `BroadcastChannel`. Cela a brisé la synchronisation temps réel entre le PC et le téléphone, forçant l'utilisateur à actualiser manuellement. De plus, dans `hooks/useJournalData.ts`, `refreshTrigger` était présent dans le tableau de dépendances du `useEffect` gérant le WebSocket, provoquant une destruction/reconnexion perpétuelle toutes les 4 secondes.
- **Décision :**
  1. Restauration complète du canal distant `supabaseClient.channel` avec écoute `broadcast` (`cahier_instant_sync`) et `postgres_changes` sur `sales`, `products`, `shopping_list`, `cash_closings`.
  2. Conservation du `BroadcastChannel` local W3C en tant qu'accélérateur inter-onglets local à 0 ms (complémentaire et non exclusif).
  3. Découplage de `useJournalData.ts` : la souscription WebSocket dépend uniquement de `[shopId, isOnline]` et reste active en continu. `loadJournal` est enveloppé dans un `useCallback` stable.
  4. Réveil automatique des connexions via `visibilitychange` et `online` pour gérer la mise en veille des smartphones sans détruire le socket.
- **Alternatives Rejetées :**
  - *S'appuyer uniquement sur le polling HTTP toutes les 4 secondes* : Consommation de batterie excessive sur mobile, latence de 4 secondes inacceptable pour un encaissement direct.
  - *Utiliser un socket externe custom (Node.js/Socket.io)* : Complexité d'infrastructure inutile alors que Supabase Realtime est inclus et scalable.
- **Invariants Induits :** Voir Invariant 1 dans `.agents/ARCHITECTURAL_INVARIANTS.md`. Verrouillé par le test de garde automatique `scripts/guard_anti_duplicate.ts`.

---

### ADR-004 : Protocole de Conseil Actif, Anti-Amnésie et Garde-fous Automatisés
- **Date :** 2026-11-03
- **Statut :** Accepté (Actif)
- **Contexte :** L'agent IA change de session et risque d'oublier ses choix passés, oscillant entre des solutions contradictoires et causant des régressions chroniques qui fatiguent l'utilisateur.
- **Décision :**
  1. **Documentation vivante obligatoire :** Tout changement d'invariant technique doit être préalablement vérifié dans `.agents/ARCHITECTURAL_INVARIANTS.md` et documenté dans `.agents/DECISION_LOG.md`.
  2. **Garde automatique non-régression :** Le script `scripts/guard_anti_duplicate.ts` contrôle à chaque `npm test` la présence des fichiers de gouvernance, l'absence de régressions dans `lib/realtimeSync.ts` et la stabilité de `hooks/useJournalData.ts`.
  3. **Devoir de conseil proactif :** L'agent n'est pas un simple exécuteur aveugle. Il analyse l'impact sur l'ensemble du système, signale les risques et recommande la solution la plus pérenne pour le commerçant.
- **Invariants Induits :** Voir Invariant 5 dans `.agents/ARCHITECTURAL_INVARIANTS.md`.

---

## 🧭 Méthodologie Opérationnelle (Passé, Présent, Futur)

### 1. Pour les fonctionnalités DÉJÀ FAITES (Le Passé)
- Chaque brique existante majeure (Synchro temps réel, Tiroir-caisse, Gestion des stocks, Dettes) est ancrée dans `.agents/ARCHITECTURAL_INVARIANTS.md`.
- Tout code futur est testé pour vérifier qu'il ne détruit pas ces acquis grâce à la suite de tests automatisée `npm test`.

### 2. Pour la tâche EN COURS (Le Présent)
- Avant d'écrire une ligne de code, l'agent formule une **Fiche de Transparence d'Impact** :
  1. Pourquoi cette modification est nécessaire.
  2. Quels fichiers précis seront touchés.
  3. Quels composants ou routes dépendent de ce code.
  4. Quels risques de régression existent.
  5. Quelle vérification automatisée prouve le succès sans régression.

### 3. Pour les fonctionnalités À VENIR (Le Futur)
- Dès qu'un nouveau domaine technique est introduit (ex: nouvelle intégration de paiement mobile, imprimante Bluetooth, export comptable) :
  1. Discussion et conseil préalable avec l'utilisateur sur la meilleure architecture.
  2. Création de l'entrée correspondante (ADR-005, etc.) dans ce `DECISION_LOG.md`.
  3. Ajout de tests de non-régression automatisés correspondants.

