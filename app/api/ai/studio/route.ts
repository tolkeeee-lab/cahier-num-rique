import { NextRequest, NextResponse } from 'next/server'
import { callNvidiaAI, ChatMessage } from '@/lib/nvidia'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productName, productDescription, type, platform, angle, targetAudience } = body

    if (!productName) {
      return NextResponse.json({ error: 'Le nom du produit est requis' }, { status: 400 })
    }

    let prompt = ''

    if (type === 'video_script') {
      prompt = `Tu es le Directeur Créatif & Expert TikTok UGC de CumuluShop.
Génère 2 scripts vidéo ultra-viraux et engageants pour ce produit :

- **Produit** : ${productName}
- **Description / Bénéfices** : ${productDescription || 'Non spécifié'}
- **Plateforme cible** : ${platform || 'TikTok / Reels / Shorts'}
- **Angle marketing** : ${angle || 'Problème -> Solution & Effet Wow'}
- **Audience Cible** : ${targetAudience || 'Grand public 18-35 ans'}

Pour chaque script, inclus obligatoirement :
1. 🪝 **3 Variantes de Hooks Visuels & Textuels (0-3s)** pour stopper le scroll immédiatement.
2. 🎬 **Déroulé Scène par Scène** (Format tableau ou liste avec [Visuel/Action caméra], [Texte affiché à l'écran], [Voix off / Réplique]).
3. 🎵 **Recommandation Sonore / Rythme** (Style musical tendance, voix off dynamique).
4. 🛒 **Appel à l'action (CTA) percutant**.

Structure la réponse avec un formatage clair et moderne.`
    } else if (type === 'ad_copy') {
      prompt = `Tu es le Copywriter Senior Spécialisé Meta Ads (Facebook & Instagram) de CumuluShop.
Génère 3 variations de textes publicitaires haute conversion pour ce produit :

- **Produit** : ${productName}
- **Description** : ${productDescription || 'Non spécifié'}
- **Angle marketing** : ${angle || 'Bénéfice Émotionnel + Preuve Sociale'}
- **Audience Cible** : ${targetAudience || 'Acheteurs impulsifs en ligne'}

Fournis pour chaque variation :
1. 📌 **Texte Principal (Primary Text)** : Court, percutant, utilisant des emojis pertinents et des retours à la ligne pour une lisibilité maximale.
2. 🏷️ **Titre Accrocheur (Headline)** (Max 5-8 mots).
3. 📝 **Description de lien** (Preuve sociale, réassurance : "Livraison Offerte", "Déjà +5000 clients satisfaits").
4. 🔘 **Bouton d'appel à l'action recommandé** (Commander, En savoir plus, Profiter de l'offre).`
    } else {
      // Fiche produit e-commerce
      prompt = `Tu es le Responsable E-Commerce & Conversion Rate Optimization (CRO) de CumuluShop.
Rédige une fiche produit irrésistible et optimisée pour la conversion pour ce produit :

- **Produit** : ${productName}
- **Description de base** : ${productDescription || 'Non spécifié'}
- **Audience** : ${targetAudience || 'Clients e-commerce exigeants'}

La fiche doit contenir :
1. 💎 **Titre Produit Vendeur & Optimisé SEO**.
2. 🚀 **Sous-titre d'accroche (Hook de proposition de valeur)**.
3. 🌟 **4 à 5 Points Forts & Bénéfices Clés (Format puces percutantes)**.
4. 📖 **Description Émotionnelle du Produit (Storytelling court centré sur la transformation apportée au client)**.
5. 🛡️ **Bloc Réassurance & Garantie (Livraison, retours, support client)**.
6. ❓ **Mini FAQ (3 questions fréquentes avec réponses rassurantes)**.`
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Tu es le Studio Créatif Publicitaire & Copywriting IA de CumuluShop. Tu produis des contenus publicitaires et scripts à fort taux de conversion.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]

    const result = await callNvidiaAI(messages, 0.7, 3500)

    return NextResponse.json({
      success: true,
      content: result,
      meta: { productName, type, platform, angle },
    })
  } catch (error: any) {
    console.error('Erreur API Studio:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la génération du contenu publicitaire' },
      { status: 500 }
    )
  }
}
