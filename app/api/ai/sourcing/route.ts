import { NextRequest, NextResponse } from 'next/server'
import { callNvidiaAI, ChatMessage } from '@/lib/nvidia'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productName, category, supplierPrice, targetSalePrice, sourcePlatform, notes } = body

    if (!productName) {
      return NextResponse.json({ error: 'Le nom du produit est requis' }, { status: 400 })
    }

    const margin = (targetSalePrice || 0) - (supplierPrice || 0)
    const marginPercent = targetSalePrice > 0 ? Math.round((margin / targetSalePrice) * 100) : 0

    const prompt = `Tu es l'expert en Sourcing E-Commerce & Dropshipping de CumuluShop, propulsé par l'IA NVIDIA.
Analyse ce produit potentiel pour un e-commerçant :

- **Nom du Produit** : ${productName}
- **Niche / Catégorie** : ${category || 'Général'}
- **Prix d'Achat Fournisseur estimé** : ${supplierPrice || 'Non spécifié'} €
- **Prix de Vente Cible** : ${targetSalePrice || 'Non spécifié'} €
- **Marge Brute estimée** : ${margin} € (${marginPercent}%)
- **Source / Plateforme** : ${sourcePlatform || 'TikTok / AliExpress'}
- **Notes additionnelles** : ${notes || 'Aucune'}

Fournis une analyse structurée, professionnelle et très actionnable comprenant :
1. 🌟 **Score de Viralité & Potentiel Global (Note sur 100)** avec justification rapide.
2. 💡 **Facteur "Effet Wow" & Résolution de Problème** (Pourquoi le client achèterait immédiatement).
3. 🎯 **Audience Cible Idéale & Canaux d'Acquisition** (TikTok Ads, Meta Ads, Influenceurs, Google Shopping).
4. 💰 **Analyse Financière & Pricing Stratégique** (Coût par Acquisition max tolérable, recommandations de packaging / bundles pour monter le panier moyen).
5. ⚠️ **Points de Vigilance & Risques** (Qualité, délais de livraison, concurrence, retours).
6. 🚀 **Plan d'Action Immédiat en 3 Étapes pour tester ce produit**.

Sois direct, dynamique, orienté ROI et utilise une mise en forme Markdown soignée avec des emojis.`

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Tu es le moteur de Sourcing E-Commerce IA de CumuluShop. Tu analyses les produits gagnants avec une précision chirurgicale, un sens aigu du marketing et de la rentabilité.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]

    const analysis = await callNvidiaAI(messages, 0.7, 3000)

    return NextResponse.json({
      success: true,
      analysis,
      product: {
        productName,
        category,
        supplierPrice,
        targetSalePrice,
        margin,
        marginPercent,
      },
    })
  } catch (error: any) {
    console.error('Erreur API Sourcing:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la génération de l’analyse produit' },
      { status: 500 }
    )
  }
}
