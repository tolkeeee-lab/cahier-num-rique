/**
 * useInputPipeline.ts
 *
 * Cerveau intelligent entre la saisie utilisateur et submitTransaction.
 *
 * Pipeline (dans l'ordre) :
 * 1. Nettoyage séparateurs milliers (12 000 → 12000)
 * 2. Résolution automatique des prix depuis le catalogue offline
 * 3. Alerte produit inconnu sans prix
 * 4. Interception stock connu → StockConfirmationModal
 * 5. Interception nouveau produit sans prix → StockWizardModal
 * 6. Alerte changement de prix si écart > 5F → PriceChangeDialog
 */

import { useCallback } from 'react'
import { getOfflineProducts } from '@/lib/offlineDb'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PipelineCallbacks {
  shopId: string
  selectedPen: string
  journalMenuItems: Array<{ id: string; name: string; price: number; category: string }>

  // Résultat final si tout est bon
  onSubmit: (text: string, penColor: string) => Promise<void>

  // Interceptions
  onShowStockConfirmation: (data: StockConfirmationData) => void
  onShowStockWizard: (data: WizardPrefill) => void
  onShowPriceChangeDialog: (data: PriceChangeData) => void
  onWarning: (msg: string) => void
}

export interface StockConfirmationData {
  product: any
  quantity: number
  packaging: string
  multiplier: number
  unit: string
  rawText: string
}

export interface PriceChangeData {
  product: any
  newLotPrice: number
  oldLotPrice: number
  rawText: string
  penColor: string
}

export interface WizardPrefill {
  productName: string
  quantity: number
  packaging: string
  multiplier: string
  unit: string
}

// ─── Utilitaires purs ──────────────────────────────────────────────────────

/** Nettoie les séparateurs de milliers : "12 000" ou "12.000" → "12000" */
export function cleanThousandSeparators(text: string): string {
  let result = text.trim()
  let prev = ''
  while (result !== prev) {
    prev = result
    result = result.replace(/(\d)[.,\s]+(\d{3})(?!\d)/g, '$1$2')
  }
  return result.replace(/[\s,;]+$/, '').trim()
}

/** Vérifie si un prix est explicitement écrit dans la saisie */
export function checkIfInputHasPrice(text: string): boolean {
  if (text.match(/\b(?:à|a|@)\s*\d+/i) || text.match(/\b\d+\s*(?:à|a|@)\s*\d+/i)) {
    return true
  }
  const parts = text.split(/\s*(?:\+|,|\bet\b)\s*/i)
  return parts.every(part => {
    const match = part.trim().match(/(\d+)\s+(.+?)\s+(\d+)$/)
    if (match) {
      const qty = parseInt(match[1], 10)
      const price = parseInt(match[3], 10)
      if (price >= 10 && price > qty) return true
    }
    return false
  })
}

/** Parse la saisie stock simple : "2 carton de Flag" → { qty, packaging, productName } */
export function parseSimpleStockInput(text: string): { qty: number; packaging?: string; productName: string } {
  let cleaned = text.replace(/^(?:stock|achat)\s+de\s+/i, '').replace(/^(?:stock|achat)\s+/i, '').trim()

  let qty = 1
  let packaging: string | undefined = undefined
  let productName = cleaned

  const qtyMatch = cleaned.match(/^(\d+)\s+(.+)$/)
  if (qtyMatch) {
    qty = parseInt(qtyMatch[1], 10)
    const rest = qtyMatch[2].trim()
    const packMatch = rest.match(/^(caissier|carton|sac|boite|boîte|paquet|unité|unite)\s+(?:de\s+)?(.+)$/i)
    if (packMatch) {
      packaging = packMatch[1].toLowerCase()
      productName = packMatch[2].trim()
    } else {
      productName = rest
    }
  } else {
    const packMatch = cleaned.match(/^(caissier|carton|sac|boite|boîte|paquet|unité|unite)\s+(?:de\s+)?(.+)$/i)
    if (packMatch) {
      packaging = packMatch[1].toLowerCase()
      productName = packMatch[2].trim()
    }
  }

  // Retirer d'éventuels suffixes de prix
  productName = productName.split(/\s+(?:à|a|@|vente|prix)\b/i)[0].trim()

  return { qty, packaging, productName }
}

/** Multiplicateurs par défaut selon l'emballage */
function defaultMultiplierForPackaging(packaging: string): { multiplier: string; unit: string } {
  switch (packaging.toLowerCase()) {
    case 'caissier': return { multiplier: '12', unit: 'bouteille' }
    case 'carton': return { multiplier: '24', unit: 'paquet' }
    case 'sac': return { multiplier: '50', unit: 'kg' }
    default: return { multiplier: '1', unit: 'pièce' }
  }
}

// ─── Résolution des prix depuis le catalogue ────────────────────────────────

function findInCatalog(
  nameToSearch: string,
  offlineProducts: any[],
  menuItems: Array<{ name: string; price: number }>
): { name: string; unit_price: number; unit_cost: number; multiplier?: number } | null {
  const sLower = nameToSearch.toLowerCase().trim()
  const p1 = offlineProducts.find(p => p.name.toLowerCase().trim() === sLower)
  if (p1) return { name: p1.name, unit_price: p1.unit_price || 0, unit_cost: p1.unit_cost || 0, multiplier: p1.multiplier }
  const p2 = menuItems.find(m => m.name.toLowerCase().trim() === sLower)
  if (p2) return { name: p2.name, unit_price: p2.price, unit_cost: p2.price, multiplier: 1 }
  return null
}

/**
 * Résout les prix depuis le catalogue pour un texte sans prix explicite.
 * Retourne null si aucune résolution n'est possible (laisser passer le flux normal).
 */
export function resolveTransactionPricesFromCatalog(
  text: string,
  penColor: string,
  shopId: string,
  menuItems: Array<{ name: string; price: number }>
): { resolvedText: string; articles: any[]; unresolvedNames: string[] } | null {
  if (!text.trim()) return null
  if (text.match(/^(?:apport|monnaie|retrait|caisse|ajustement|remboursement|dette)/i)) return null

  const cleanedText = text
    .replace(/^(?:stock|achat)\s+de\s+/i, '')
    .replace(/^(?:stock|achat)\s+/i, '')
    .trim()

  const hasExplicitPrice = checkIfInputHasPrice(cleanedText)
  const parts = cleanedText.split(/\s*(?:\+|,|\bet\b)\s*/i).map(p => p.trim()).filter(Boolean)
  const isSinglePart = parts.length <= 1

  const offlineProducts = getOfflineProducts(shopId) || []
  const isPurchase = ['green', 'purple'].includes(penColor)

  // ─── Produit unique sans prix → recherche catalogue
  if (isSinglePart && !hasExplicitPrice) {
    const part = parts[0]
    if (!part) return null

    let qty = 1
    let productName = part
    const qtyMatch = part.match(/^(\d+)\s+(.+)$/)
    if (qtyMatch) { qty = parseInt(qtyMatch[1], 10); productName = qtyMatch[2].trim() }

    let searchName = productName
    const packMatch = productName.match(/^(caissier|carton|sac|boite|boîte|paquet|unité|unite)\s+(?:de\s+)?(.+)$/i)
    if (packMatch) searchName = packMatch[2].trim()

    const product = findInCatalog(searchName, offlineProducts, menuItems)
    if (!product) return null

    let unitPrice = isPurchase
      ? (packMatch ? product.unit_cost * (product.multiplier || 1) : product.unit_cost)
      : product.unit_price
    if (!unitPrice || unitPrice <= 0) return null

    const textOut = packMatch
      ? `${qty} ${packMatch[1]} de ${product.name} à ${unitPrice}`
      : `${qty} ${product.name} à ${unitPrice}`

    return {
      resolvedText: textOut,
      articles: [{ nom: product.name, quantite: qty, prix_unitaire: unitPrice }],
      unresolvedNames: [],
    }
  }

  // ─── Produit unique avec prix → laisser passer
  if (hasExplicitPrice && isSinglePart) return null

  // ─── Multi-produits → résolution individuelle
  const resolvedArticles: any[] = []
  const resolvedTextParts: string[] = []
  const unresolvedNames: string[] = []

  for (const part of parts) {
    let qty = 1
    let productName = part
    let explicitPrice: number | null = null

    const priceSepMatch = part.match(/\s*(?:à|a|@)\s*(\d+)$/i)
    if (priceSepMatch) {
      explicitPrice = parseInt(priceSepMatch[1], 10)
      productName = part.substring(0, priceSepMatch.index).trim()
    } else {
      const implicitPriceMatch = part.match(/^(\d+)\s+(.+?)\s+(\d+)$/)
      if (implicitPriceMatch) {
        const qtyVal = parseInt(implicitPriceMatch[1], 10)
        const priceVal = parseInt(implicitPriceMatch[3], 10)
        if (priceVal >= 10 && priceVal > qtyVal) {
          explicitPrice = priceVal
          productName = `${qtyVal} ${implicitPriceMatch[2].trim()}`
        }
      }
    }

    const qtyMatch = productName.match(/^(\d+)\s+(.+)$/)
    if (qtyMatch) { qty = parseInt(qtyMatch[1], 10); productName = qtyMatch[2].trim() }

    let searchName = productName
    const packMatch = productName.match(/^(caissier|carton|sac|boite|boîte|paquet|unité|unite)\s+(?:de\s+)?(.+)$/i)
    if (packMatch) searchName = packMatch[2].trim()

    if (explicitPrice !== null) {
      const textOut = packMatch
        ? `${qty} ${packMatch[1]} de ${searchName} à ${explicitPrice}`
        : `${qty} ${searchName} à ${explicitPrice}`
      resolvedTextParts.push(textOut)
      resolvedArticles.push({ nom: searchName, quantite: qty, prix_unitaire: explicitPrice })
    } else {
      const product = findInCatalog(searchName, offlineProducts, menuItems)
      if (product) {
        let unitPrice = isPurchase
          ? (packMatch ? product.unit_cost * (product.multiplier || 1) : product.unit_cost)
          : product.unit_price
        if (unitPrice && unitPrice > 0) {
          const textOut = packMatch
            ? `${qty} ${packMatch[1]} de ${product.name} à ${unitPrice}`
            : `${qty} ${product.name} à ${unitPrice}`
          resolvedTextParts.push(textOut)
          resolvedArticles.push({ nom: product.name, quantite: qty, prix_unitaire: unitPrice })
        } else {
          unresolvedNames.push(productName)
        }
      } else {
        unresolvedNames.push(productName)
      }
    }
  }

  if (resolvedTextParts.length === 0 && unresolvedNames.length === 0) return null

  return {
    resolvedText: resolvedTextParts.join(', '),
    articles: resolvedArticles,
    unresolvedNames,
  }
}

// ─── Hook principal ─────────────────────────────────────────────────────────

export function useInputPipeline(callbacks: PipelineCallbacks) {
  const {
    shopId,
    selectedPen,
    journalMenuItems,
    onSubmit,
    onShowStockConfirmation,
    onShowStockWizard,
    onShowPriceChangeDialog,
    onWarning,
  } = callbacks

  /**
   * Point d'entrée principal — à connecter au `onSubmit` du formulaire.
   */
  const processInput = useCallback(async (rawInput: string) => {
    if (!rawInput.trim()) return

    // ── Étape 1 : Nettoyage séparateurs milliers ──────────────────────────
    let sanitized = cleanThousandSeparators(rawInput)

    // ── Étape 2 : Résolution automatique des prix depuis catalogue ─────────
    const resolvedResult = resolveTransactionPricesFromCatalog(
      sanitized,
      selectedPen,
      shopId,
      journalMenuItems
    )

    let finalInput = sanitized

    if (resolvedResult) {
      // Des noms non résolus → avertissement et STOP
      if (resolvedResult.unresolvedNames.length > 0) {
        const productsList = resolvedResult.unresolvedNames.map(n => `« ${n} »`).join(', ')
        onWarning(
          resolvedResult.unresolvedNames.length === 1
            ? `Le produit ${productsList} n'a pas été trouvé dans le catalogue. Précisez son prix (ex: ${resolvedResult.unresolvedNames[0]} à 600) ou ajoutez-le au stock.`
            : `Les produits ${productsList} n'ont pas été trouvés dans le catalogue. Précisez leurs prix.`
        )
        return
      }

      // Conserver le préfixe "stock (de)" ou "achat (de)" si présent
      const prefixMatch = sanitized.match(/^(?:stock|achat)\s+(?:de\s+)?/i)
      const prefix = prefixMatch ? prefixMatch[0] : ''
      finalInput = prefix + resolvedResult.resolvedText

    } else {
      // ── Étape 3 : Produit inconnu sans prix (quantité + nom mais pas dans catalogue) ──
      const isStockOp = sanitized.match(/^(?:stock|achat)\s+/i) || selectedPen === 'green'
      const qtyProductMatch = sanitized
        .replace(/^(?:stock|achat)\s+(?:de\s+)?/i, '')
        .trim()
        .match(/^(\d+)\s+(.+)$/)
      const hasPrice = checkIfInputHasPrice(sanitized)

      if (qtyProductMatch && !hasPrice && !isStockOp) {
        const productNameClean = qtyProductMatch[2]
          .split(/\s+(?:à|a|@|vente|prix)\b/i)[0]
          .trim()
        onWarning(
          `Le produit « ${productNameClean} » n'a pas été trouvé dans le catalogue. ` +
          `Précisez le prix (ex: ${sanitized} à 600) ou ajoutez-le au stock.`
        )
        return
      }
    }

    // ── Étape 4 : Interception opération STOCK ─────────────────────────────
    const isMultiple = finalInput.includes(',') || finalInput.includes('+') ||
      (resolvedResult && resolvedResult.articles.length > 1)
    const isStockOp = (finalInput.match(/^(?:stock|achat)\s+/i) || selectedPen === 'green') && !isMultiple

    if (isStockOp) {
      const { qty, packaging, productName } = parseSimpleStockInput(finalInput)

      if (productName && productName !== 'transaction générale') {
        const offlineProducts = getOfflineProducts(shopId) || []
        const existing = offlineProducts.find(
          p => p.name.toLowerCase().trim() === productName.toLowerCase().trim()
        )
        const hasPrice = checkIfInputHasPrice(finalInput)

        if (existing && existing.unit_cost > 0) {
          if (!hasPrice) {
            // ── CAS A : Produit connu, pas de prix → confirmer avec tarifs mémorisés ──
            onShowStockConfirmation({
              product: existing,
              quantity: qty,
              packaging: packaging || existing.packaging_name || 'unité',
              multiplier: existing.multiplier || 1,
              unit: existing.unit || 'pièce',
              rawText: finalInput,
            })
            return
          } else {
            // ── CAS B : Produit connu, prix écrit → vérifier l'écart ──────────────
            const matchPrice = finalInput.match(/(\d+)\s*(?:à|a|@)\s+(\d+)/i)
            if (matchPrice) {
              const enteredLotPrice = parseInt(matchPrice[2], 10)
              const expectedLotPrice = existing.unit_cost * (existing.multiplier || 1)
              if (Math.abs(enteredLotPrice - expectedLotPrice) > 5) {
                onShowPriceChangeDialog({
                  product: existing,
                  newLotPrice: enteredLotPrice,
                  oldLotPrice: expectedLotPrice,
                  rawText: finalInput,
                  penColor: 'green',
                })
                return
              }
            }
          }
        } else if (!existing) {
          // ── CAS C : Nouveau produit sans prix → ouvre le wizard ───────────────
          if (!hasPrice) {
            const packDef = packaging ? defaultMultiplierForPackaging(packaging) : { multiplier: '1', unit: 'pièce' }
            onShowStockWizard({
              productName,
              quantity: qty,
              packaging: packaging || 'unité',
              multiplier: packDef.multiplier,
              unit: packDef.unit,
            })
            return
          }
        }
      }
    }

    // ── Étape 5 : Soumission normale ──────────────────────────────────────
    await onSubmit(finalInput, selectedPen)
  }, [shopId, selectedPen, journalMenuItems, onSubmit, onShowStockConfirmation, onShowStockWizard, onShowPriceChangeDialog, onWarning])

  return { processInput }
}
