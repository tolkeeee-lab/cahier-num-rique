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
| **Synchronisation Supabase** | `useOfflineSync` orchestre l'envoi en arrière-plan. Zéro conflit d'écrasement. |
| **Temps réel Inter-appareils** | WebSockets Supabase Realtime + actualisation automatique dès réouverture de l'écran sur mobile. |
| **Stockage & Quotas** | IndexedDB stocke 100% de l'historique sans limite. LocalStorage allégé à 250 ventes pour éviter tout plantage mémoire + alerte `cahier_storage_full`. |
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

## 🧭 3. Par quoi commence-t-on maintenant ? (Options Prioritaires)

Le socle technique étant désormais parfaitement stable et testé, voici les **3 grands chantiers métier** au choix pour faire évoluer le produit :

### 🚀 Option A : L'Expérience Caisse & Vente Terrain (UX Vendeur) — *Recommandé*
- **Objectif** : Rendre la saisie de vente encore plus rapide qu'un cahier papier sur smartphone.
- **Fonctionnalités** :
  - Clavier tactile optimisé avec raccourcis espèces rapides (ex: 500 F, 1 000 F, 2 000 F, 5 000 F, 10 000 F CFA).
  - Génération et partage instantané de tickets de reçu via **WhatsApp** en 1 clic.
  - Recherche et scan de code-barres ultra-réactif avec la caméra du téléphone.

### 📦 Option B : Gestion Avancée du Stock & Alertes Réapprovisionnement
- **Objectif** : Ne jamais tomber en rupture de stock et maîtriser les marges réelles.
- **Fonctionnalités** :
  - Décomposition visuelle cartons / pièces (vente au détail ou en gros avec conversion automatique de stock).
  - Alertes automatiques de stock bas et liste de courses intelligente (`shopping_list`).
  - Suivi des marges bénéficiaires réelles par produit.

### 💰 Option C : Clôture de Caisse & Recouvrement des Dettes
- **Objectif** : Sécuriser la trésorerie journalière du commerçant.
- **Fonctionnalités** :
  - Écran de fin de journée : comptage de caisse physique vs théorique avec calcul automatique des écarts.
  - Relances clients par WhatsApp avec décompte exact du solde restant dû (FIFO).
  - Export PDF / Excel des bilans de la journée ou du mois.

---

## 🔒 4. Recommandation du Chef d'Orchestre

La priorité logique pour un commerçant est d'abord de **vendre sans friction et de partager le reçu WhatsApp (Option A)**, puis de **sécuriser sa clôture de caisse quotidienne (Option C)**.
