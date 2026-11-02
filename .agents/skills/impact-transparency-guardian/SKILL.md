---
name: impact-transparency-guardian
description: Protocole obligatoire de transparence radicale et d'analyse d'impact préventive. Impose d'avertir systématiquement l'utilisateur des impacts, risques et dépendances avant toute modification, ajout, suppression ou refactoring.
---

# 🛡️ Impact Transparency Guardian (Garde-Fous de Transparence & Prévention des Risques)

Ce protocole est **strictement obligatoire** pour toute intervention sur le projet Cahier Numérique.
Il interdit formellement d'appliquer des modifications structurelles, d'ajouter des fonctions ou de supprimer du code sans avoir préalablement détaillé et explicité tous les impacts directs et collatéraux.

---

## 🎯 Règle Fondamentale : "Zéro Surprise, Zéro Effet de Bord Silencieux"

L'agent DOIT toujours présenter une **Matrice d'Impact Préventive** avant de toucher au code structurel.
Si une opération comporte le moindre risque de casser un flux existant, l'agent doit l'exposer en toute transparence et expliquer comment ce risque est neutralisé.

---

## 📋 La Structure Obligatoire de la Fiche d'Impact

Pour chaque modification significative, refactoring ou ajout de fonctionnalité, la réponse DOIT contenir les 5 sections suivantes :

### 1. 🎯 Périmètre Exact des Fichiers Touchés
- Liste précise des fichiers créés, modifiés ou supprimés.
- Liste des fonctions, hooks ou routes API directement concernés.

### 2. ⚡ Impacts Directs & Fonctionnels
- **Ce que ça change pour le commerçant** : amélioration visible, comportement dans l'interface.
- **Ce qui reste strictement identique (Invariants)** : les données existantes, les ventes du jour, le solde de caisse, le mode hors-ligne.

### 3. ⚠️ Analyse des Risques & Effets de Bord Potentiels
L'agent doit répondre honnêtement aux questions suivantes :
- *Est-ce que cette fonction est appelée ailleurs dans le projet ?* (vérification par `git grep`).
- *Y a-t-il un risque de perte de données locales (IndexedDB / LocalStorage) ?*
- *Y a-t-il un risque d'interruption du mode hors-ligne ?*
- *Y a-t-il un risque de rupture avec Supabase ou les règles RLS ?*

### 4. 🛡️ Bouclier et Mesures de Protection
- Les garde-fous mis en place pour garantir que les risques sont éliminés à 100%.
- Préservation des signatures de fonctions pour éviter toute erreur de typage ou d'import.
- Sauvegardes ou mécanismes de repli (fallback).

### 5. ✅ Protocole de Validation Immédiate
- Exécution systématique de la suite de tests :
  1. `npx.cmd tsx scripts/guard_anti_duplicate.ts`
  2. `npx.cmd tsx scripts/test_critical_suite.ts`
  3. `npx.cmd tsx scripts/test_realtime_instant_sync.ts`
  4. `npm.cmd run build` (Zéro erreur TypeScript)

