/**
 * requestedProductsUtils.ts — Gestion et synchronisation des produits réclamés par les clients
 */

export interface RequestedProduct {
  id: string
  name: string
  category: string
  requestCount: number
  estimatedPrice?: number
  notes?: string
  date: string
  status: 'pending' | 'ordered' | 'added_to_stock'
}

/**
 * Mots-clés déclencheurs d'une demande client écrite dans le cahier
 */
export const DEMANDE_KEYWORDS = [
  'demande client',
  'demande',
  'client demande',
  'manque client',
  'manque',
  'besoin client',
  'besoin',
  'réclamation',
  'reclamation'
]

/**
 * Détecte si le texte tapé dans le cahier correspond à une demande client
 */
export function parseRequestedProductFromNotebookText(text: string): { isRequestedProduct: boolean; cleanName: string; price?: number } | null {
  const lower = text.toLowerCase().trim()

  for (const keyword of DEMANDE_KEYWORDS) {
    if (lower.startsWith(keyword) || lower.includes(` ${keyword} `) || lower.includes(`${keyword} :`)) {
      // Extraire le nom nettoyé du produit
      let cleanName = text
        .replace(new RegExp(keyword, 'gi'), '')
        .replace(/^[\s:\-\.]+/, '')
        .trim()

      // Détecter un prix éventuel (ex: "à 500" ou "500f")
      let price: number | undefined = undefined
      const priceMatch = cleanName.match(/(?:à\s*|:\s*)?(\d+)\s*(?:f|fcfa)?$/i)
      if (priceMatch) {
        price = parseInt(priceMatch[1], 10)
        cleanName = cleanName.replace(priceMatch[0], '').trim()
      }

      if (cleanName.length >= 2) {
        return {
          isRequestedProduct: true,
          cleanName: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
          price
        }
      }
    }
  }

  return null
}

/**
 * Enregistre ou incrémente une demande client dans localStorage / IndexedDB
 */
export function recordRequestedProductInStorage(shopId: string, productName: string, estimatedPrice?: number, notes?: string): RequestedProduct[] {
  if (typeof window === 'undefined') return []
  const storageKey = `cahier_requested_products_${shopId}`

  try {
    const existingRaw = localStorage.getItem(storageKey)
    const items: RequestedProduct[] = existingRaw ? JSON.parse(existingRaw) : []

    const normTarget = productName.toLowerCase().trim()
    const existingIndex = items.findIndex(i => i.name.toLowerCase().trim() === normTarget)

    if (existingIndex >= 0) {
      items[existingIndex].requestCount += 1
      if (estimatedPrice && !items[existingIndex].estimatedPrice) {
        items[existingIndex].estimatedPrice = estimatedPrice
      }
      if (notes && !items[existingIndex].notes) {
        items[existingIndex].notes = notes
      }
    } else {
      const newReq: RequestedProduct = {
        id: `req_${Date.now()}`,
        name: productName.trim(),
        category: 'Alimentation',
        requestCount: 1,
        estimatedPrice,
        notes,
        date: new Date().toISOString().slice(0, 10),
        status: 'pending'
      }
      items.unshift(newReq)
    }

    localStorage.setItem(storageKey, JSON.stringify(items))
    return items
  } catch (e) {
    console.warn('Erreur stockage demande client:', e)
    return []
  }
}
