# 🔒 RÈGLE ABSOLUE : ISOLATION STRICTE DES PROJETS & IDENTIFIANTS

## 🚫 INTERDICTIONS ABSOLUES
1. **JAMAIS de mélange de projets** : Il est formellement interdit d'aller chercher, copier, inspecter ou réutiliser des clés d'environnement (`.env`, `.env.local`), des URLs d'API, des bases de données Supabase, ou des fichiers appartenant à un autre projet/workspace.
2. **JAMAIS de supposition sur les identifiants manquants** : Si une variable d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, clé API, Token) est manquante, indéfinie ou incorrecte dans le projet en cours, l'agent DOIT EXCLUSIVEMENT demander à l'utilisateur de fournir les clés du projet concerné.
3. **Ségrégation totale des environnements** : Chaque projet possède son propre espace de données, ses propres tables, ses propres clés de chiffrement et son propre cycle de déploiement.

---

## ✅ BONNES PRATIQUES SYSTÉMATIQUES
- Toujours vérifier le dossier de travail courant (`Cwd`) avant toute manipulation.
- Ne jamais lire en dehors du projet actif pour tenter de "deviner" des identifiants.
- Demander directement et poliment à l'utilisateur toute clé API nécessaire.
