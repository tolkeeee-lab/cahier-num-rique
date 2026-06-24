# 📔 Cahier Numérique

> Gestion de boutique ultra-simple, comme un cahier physique. Pensé pour les commerçants à Cotonou et partout en Afrique.

## 🎯 Concept

Une interface épurée où l'utilisateur saisit ou dicte ses ventes en **texte libre**. Pas de formulaire complexe. L'IA transforme le texte en données structurées et les enregistre automatiquement.

### Exemple de saisie

```
10 mèches xpression à 2000 et 5 darling à 1500 pour Maman Tantie, elle a payé 25000 reste 10000
```

**Résultat automatique:**
- 10 × mèches xpression @ 2000 = 20 000 CFA
- 5 × darling @ 1500 = 7 500 CFA
- **Total:** 27 500 CFA
- **Encaissé:** 25 000 CFA ✓
- **Dû:** 2 500 CFA ⚠️

---

## 🛠️ Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend:** API Routes (Next.js)
- **BDD:** Supabase (PostgreSQL)
- **IA:** OpenAI GPT-4o-mini
- **Déploiement:** Vercel

---

## 📦 Installation

### 1. Cloner le repo

```bash
git clone https://github.com/tolkeeee-lab/cahier-num-rique.git
cd cahier-num-rique
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Copier `.env.local.example` en `.env.local` et remplir:

```bash
cp .env.local.example .env.local
```

**Variables obligatoires:**

- `NEXT_PUBLIC_SUPABASE_URL` - URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clé service role Supabase
- `OPENAI_API_KEY` - Clé API OpenAI

### 4. Configurer la base de données (Supabase)

1. Créer un compte [Supabase](https://supabase.com)
2. Créer un nouveau projet
3. Aller à **SQL Editor** → **New Query**
4. Copier/coller le contenu de `supabase/migrations/001_init.sql`
5. Exécuter la requête

### 5. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.

---

## 🚀 Utilisation

### Enregistrer une vente

1. Écrire dans le champ texte (ex: `10 mèches xpression à 2000 pour Maman Tantie, elle a payé 25000`)
2. Cliquer sur **Enregistrer**
3. L'IA parse le texte → les données sont insérées en base
4. La vente s'affiche immédiatement dans l'historique

### Voir les ventes du jour

L'historique s'affiche automatiquement avec:
- ✓ **Vert** = Vente encaissée complètement
- ⚠️ **Rouge** = Vente avec dette client

---

## 📂 Structure du projet

```
cahier-num-rique/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Page d'accueil
│   ├── globals.css             # Styles globaux
│   └── api/
│       └── sales/
│           └── route.ts        # API POST/GET pour les ventes
│
├── components/
│   ├── SalesInput.tsx          # Champ de saisie et bouton
│   └── SalesHistory.tsx        # Historique du jour
│
├── supabase/
│   └── migrations/
│       └── 001_init.sql        # Schéma de base de données
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 🧠 Comment fonctionne le parsing IA

### Flow complet:

1. **Utilisateur** → Tape texte libre dans le textarea
2. **Frontend** → Envoie POST à `/api/sales` avec le texte
3. **Backend (API Route)**:
   - Envoie le texte à OpenAI avec un **system prompt strict**
   - OpenAI retourne JSON structuré
   - Valide le JSON reçu
4. **Supabase (Atomic transaction)**:
   - Insère la vente dans `sales`
   - Insère les articles dans `sold_articles`
   - Insère la dette (si applicable) dans `debts`
5. **Frontend** → Affiche la vente en temps réel

### Exemple de réponse OpenAI:

```json
{
  "articles": [
    { "nom": "mèches xpression", "quantite": 10, "prix_unitaire": 2000 },
    { "nom": "darling", "quantite": 5, "prix_unitaire": 1500 }
  ],
  "total_facture": 27500,
  "montant_paye": 25000,
  "montant_dette": 2500,
  "nom_client": "Maman Tantie"
}
```

---

## 📊 Schéma base de données

### `sales`
Une vente = une ligne avec:
- `client_name` - Nom du client
- `date` & `time` - Quand
- `total_amount` - Total facture
- `paid_amount` - Montant payé
- `debt_amount` - Montant dû
- `status` - État (paid/debt/pending)

### `sold_articles`
Détail des articles dans une vente (relation 1-N avec `sales`):
- `product_name` - Nom du produit
- `quantity` - Quantité
- `unit_price` - Prix unitaire
- `subtotal` - Quantité × Prix unitaire

### `debts`
Gestion des dettes clients:
- `amount_owed` - Montant dû
- `status` - État (pending/partially_paid/paid)
- `due_date` - Date limite de paiement

---

## 🔐 Sécurité

- **API Keys** côté serveur uniquement (`.env.local` jamais exposé)
- OpenAI API key stockée côté serveur
- Supabase service role key jamais exposé au client
- Clé anonyme utilisée pour les requêtes côté client (à implémenter)

---

## 💰 Coûts estimés

### Supabase
- **Gratuit jusqu'à:** 500 MB stockage + 2 GB bandwidth/mois
- **Après:** ~$25/mois pour small app

### OpenAI
- **GPT-4o-mini:** ~$0.15 pour 1M tokens input + $0.60 pour 1M tokens output
- Pour 100 ventes/jour ≈ $1-2/mois

### Vercel
- **Gratuit** pour la plupart des projets
- **Pro:** $20/mois si besoin de fonctionnalités avancées

---

## 🎨 Améliorations futures

- [ ] Gestion des stocks
- [ ] Rappels pour dettes clients
- [ ] Statistiques et graphiques
- [ ] Synchronisation offline (PWA)
- [ ] Export en PDF/Excel
- [ ] Intégration paiement (Porte, Wave...)
- [ ] Support multi-devise
- [ ] Authentification utilisateur

---

## 🚀 Déploiement

### Vercel (recommandé)

1. Pousser le code sur GitHub
2. Connecter le repo à Vercel
3. Ajouter les variables d'environnement
4. Déployer!

```bash
git push origin main
```

---

## 📞 Support

Questions? Issues? PRs bienvenues! 🚀

**Contact:** Maestro Mafro | Cotonou, Bénin

---

## 📝 Licence

MIT - Libre d'utilisation
