import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key-for-build',
})

export interface ParsedSaleArticle {
  nom: string
  quantite: number
  prix_unitaire: number
  unite_achat?: string
  unite_vente?: string
  quantite_par_boite?: number
  prix_vente_unitaire?: number
  seuil_alerte?: number
  categorie?: string
}

export interface ParsedSale {
  articles: ParsedSaleArticle[]
  total_facture: number
  montant_paye: number
  montant_dette: number
  nom_client: string
  categorie?: string
}

export async function parseTextWithOpenAI(text: string, penColor: string): Promise<ParsedSale | null> {
  try {
    const prompt = `Tu es un assistant comptable pour boutiquiers en Afrique de l'Ouest.
Analyse le texte suivant issu d'une écriture manuscrite au stylo "${penColor}" :
"${text}"

Extrais un JSON strict avec la structure suivante :
{
  "articles": [
    { "nom": "string", "quantite": number, "prix_unitaire": number }
  ],
  "total_facture": number,
  "montant_paye": number,
  "montant_dette": number,
  "nom_client": "string",
  "categorie": "string"
}

Règles :
1. "nom_client": Si non spécifié, mets "Client anonyme".
2. Tout prix exprimé est en FCFA.
3. Ne réponds QUE du JSON valide.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tu es un parseur JSON comptable strict.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const rawJson = completion.choices[0]?.message?.content
    if (!rawJson) return null

    const data = JSON.parse(rawJson)
    return {
      articles: Array.isArray(data.articles) ? data.articles : [],
      total_facture: Number(data.total_facture) || 0,
      montant_paye: Number(data.montant_paye) || 0,
      montant_dette: Number(data.montant_dette) || 0,
      nom_client: data.nom_client || 'Client anonyme',
      categorie: data.categorie || 'Divers'
    }
  } catch (err) {
    console.warn('Erreur parsing OpenAI, bascule sur regex local:', err)
    return null
  }
}
