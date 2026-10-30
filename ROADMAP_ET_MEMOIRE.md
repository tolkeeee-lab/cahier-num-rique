# 📘 Cahier Numérique — Mémoire du Projet & Feuille de Route

Ce document récapitule l'état exact du projet, les acquis techniques garantis par le **Verdict CTO (100% validé)**, et les priorités de développement pour la suite.

> 📄 **Document de référence complet du CTO** : Voir [`PLAN_TECHNIQUE_CTO.md`](./PLAN_TECHNIQUE_CTO.md)  
> 🛡️ **Règles d'architecture actives** : Voir [`.agents/rules/architecture-memory.md`](./.agents/rules/architecture-memory.md)

---

## 🏛️ 1. Ce qui est Acquis, Testé et Gravé dans le Marbre

| Domaine | Ce qui est garanti |
| :--- | :--- |
| **Sécurité & Authentification** | 40 commits de durcissement intégrés (`lib/server/auth.ts`, RLS Supabase 022, tokens Bearer). |
| **Vente Offline-First (0 ms)** | Écriture locale instantanée. Aucune attente réseau. Aucune perte de vente. |
| **Expérience Caisse Express** | Bandeau post-vente avec coupures FCFA (`500 F` à `10 000 F`, compte juste) et calcul automatique de monnaie. |
| **Reçu WhatsApp 1-Clic** | Partage direct du ticket de caisse en 1 clic + envoi ciblé au numéro WhatsApp sans enregistrer le contact. |
| **Relance Dettes WhatsApp** | Détection automatique du numéro et génération du message personnalisé poli avec solde FIFO. |
| **Clôture de Caisse (Z)** | Billetage physique vs théorique, détection d'écarts et export du bilan journalier. |
| **Synchronisation Supabase** | `useOfflineSync` orchestre l'envoi en arrière-plan. Zéro conflit d'écrasement. |
| **Temps réel Inter-appareils** | WebSockets Supabase Realtime + actualisation automatique dès réouverture de l'écran sur mobile. |
| **Stockage & Quotas** | IndexedDB stocke 100% de l'historique sans limite. LocalStorage allégé à 250 ventes + alerte `cahier_storage_full`. |
| **Intégrité Comptable** | La suppression d'un produit ne détruit jamais l'historique des ventes passées. Réconciliation FIFO automatique des dettes. |
| **Audit Logs Offline** | Stockage dans `sync_queue` et dépilement automatique à la reconnexion. |
| **Compilation & Tests** | `npm run build` passe à 100% (20/20 pages), `npm test` passe à 10/10. |

---

## 🚫 2. Invariants CTO — Ce qu'on ne reconstruit PAS

1. **`useOfflineSync`** : La logique est stabilisée et vérifiée, on ne la reconstruit pas.
2. **Migrations RLS** : La migration 022 est solide, aucun retour en arrière.
3. **`localDb.ts`** : Fallback mémoire dev/test, ne jamais réintroduire d'écriture disque.
4. **`offlineDb.ts`** : Pas de refonte complète, chirurgie ciblée uniquement.
5. **Persistence v2 (DT-1)** : Fusion IndexedDB/localStorage réservée pour une phase ultérieure sous couverture de tests E2E.

---

## 🧭 3. Feuille de Route Métier

| Chantier | Statut | Détails |
| :--- | :---: | :--- |
| **Option A : Caisse & Reçu WhatsApp** | ✅ **Livré** | Bandeau caisse post-vente, coupures rapides FCFA, reçu WhatsApp 1-clic et bouton direct sur chaque ligne du journal (`ab4ceeb`). |
| **Option C : Clôture Z & Dettes WhatsApp** | ✅ **Livré** | Billetage physique, sécurisation multi-boutique et relances clients WhatsApp directes (`deb795c`). |
| **Option B : Stock Avancé & Cartons/Pièces** | ✅ **Livré** | Décomposition cartons ↔ pièces, valorisation/marges en direct, et approvisionnement automatique 1-clic des alertes stock bas vers la liste de courses (`f6bf718`). |
| **Phase 3 : Tests E2E Playwright** | 📋 **Planifié** | Scénarios offline 30 min → reconnexion réseau → intégrité Supabase. |
