# ☁️ CumuluShop — Copilote E-Commerce & Vente Intelligente

> **Plateforme E-Commerce tout-en-un propulsée par l'IA NVIDIA : sourcing de produits gagnants, studio de création publicitaire, gestion autonome des commandes et caisse connectée.**

---

## 🚀 Fonctionnalités Clés

### 1. 🎯 Dénicheur de Produits Gagnants (NVIDIA Sourcing Engine)
- **Score de Viralité & Détection des Tendances** : Analyse automatique des produits viraux sur TikTok, AliExpress et CJ Dropshipping.
- **Calculateur de Rentabilité & Marge Nette** : Simulation instantanée du prix d'achat, prix de vente conseillé, CPA max et marges réelles.
- **Audit Approfondi IA** : Rapports stratégiques personnalisés générés par le modèle de raisonnement **NVIDIA Nemotron 30B**.

### 2. 🎬 Studio Créatif & Copywriting Ads
- **Générateur de Scripts Vidéo UGC (TikTok / Reels / Shorts)** : 
  - Hooks accrocheurs pour stopper le scroll dans les 3 premières secondes.
  - Découpage scène par scène (visuel, texte à l'écran, voix-off).
  - Conseils de rythme et musique tendance.
- **Copywriting Meta Ads (Facebook / Instagram)** : Textes primaires à fort taux de clic, titres percutants et angles marketing AIDA / PAS.
- **Fiches Produits Haute Conversion (CRO)** : Storytelling, bénéfices clés, réassurance et FAQ intégrée.

### 3. 🛍️ Gestionnaire de Commandes & Vitrine
- **Suivi des Ventes en Temps Réel** : Statuts de commande (En attente, En préparation, Expédiée, Livrée, Annulée).
- **Synchronisation d'Inventaire** : Décompte automatique du stock physique et en ligne.
- **Multi-Paiement** : Prise en charge Carte Bancaire, Paiement à la livraison, Wave & Mobile Money.

### 4. 💬 Copilote Stratégique IA 24/7
- **Assistant E-Commerce Interactif** : Réponses instantanées aux questions de scaling publicitaire, négociation de fournisseurs, optimisation du taux de conversion et fidélisation client.

### 5. 📦 Caisse & Gestion Physique Intégrée
- **Scanner Code-Barres Multi-Moteur** : BarcodeDetector natif + ZXing HD avec bip sonore et recherche automatique Open Food Facts.
- **Cahier de Caisse Intelligent** : Saisie vocale/texte libre, gestion des dettes clients, journal de clôture de caisse et export comptable SYSCOHADA.

---

## 🛠️ Stack Technique

- **Framework** : [Next.js 15](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Intelligence Artificielle** : API [NVIDIA NIM](https://build.nvidia.com/) (Nemotron-3 30B Reasoning / Llama 3.1 70B Instruct)
- **Base de Données & Auth** : [Supabase](https://supabase.com/) (PostgreSQL & Row Level Security)
- **Styling** : [Tailwind CSS](https://tailwindcss.com/) avec design système Dark Mode néon & glassmorphism
- **Décodage Code-barres** : ZXing Browser & HTML5-QRCode

---

## ⚙️ Installation & Démarrage

### 1. Cloner le Dépôt
```bash
git clone https://github.com/tolkeeee-lab/Cumulushop.git
cd Cumulushop
```

### 2. Installer les Dépendances
```bash
npm install
```

### 3. Configurer les Variables d'Environnement
Créez un fichier `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
NVIDIA_API_KEY=nvapi-votre-cle-nvidia-nim
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Lancer le Serveur de Développement
```bash
npm run dev
```
Ouvrez [http://localhost:3000/cumulushop](http://localhost:3000/cumulushop) dans votre navigateur.

---

## 🌐 Liens Utiles
- Dépôt GitHub : [https://github.com/tolkeeee-lab/Cumulushop](https://github.com/tolkeeee-lab/Cumulushop)
- Plateforme Live : [http://localhost:3000/cumulushop](http://localhost:3000/cumulushop)
