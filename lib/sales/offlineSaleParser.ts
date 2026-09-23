import { normalizeProductName, adjustLotRoundingArtifact } from '@/lib/productUtils'
import { ParsedSale } from './openAiSaleParser'

export interface ExtractedPackagingInfo {
  cleanName: string
  packagingType?: 'quarter' | 'half' | 'carton' | 'lot' | 'unit'
  packagingLabel?: string
  multiplierFraction?: number
  lotSize?: number
}

export function extractPackagingFromText(rawName: string): ExtractedPackagingInfo {
  let name = rawName.trim()
  
  // 1. Quarts (1/4 carton, quart carton, quart de carton, 1/4 pack, quart sac)
  const quarterMatch = name.match(/^(?:1\/4|quart|quart\s+de)\s*(?:cartons?|packs?|sacs?|casiers?|fardeaux?|caisses?|boites?|boîtes?|paquets?)?\s*(?:de\s+)?(.+)$/i)
  if (quarterMatch) {
    return {
      cleanName: quarterMatch[1].trim(),
      packagingType: 'quarter',
      packagingLabel: '1/4 carton',
      multiplierFraction: 0.25,
    }
  }

  // 2. Demis (1/2 carton, demi carton, demi-carton, demi sac, 1/2 pack)
  const halfMatch = name.match(/^(?:1\/2|demi|demi-carton|demi\s+de)\s*(?:cartons?|packs?|sacs?|casiers?|fardeaux?|caisses?|boites?|boîtes?|paquets?)?\s*(?:de\s+)?(.+)$/i)
  if (halfMatch) {
    return {
      cleanName: halfMatch[1].trim(),
      packagingType: 'half',
      packagingLabel: '1/2 carton',
      multiplierFraction: 0.5,
    }
  }

  // 3. Trois-quarts (3/4 carton)
  const threeQuarterMatch = name.match(/^(?:3\/4)\s*(?:cartons?|packs?|sacs?|casiers?|fardeaux?|caisses?)?\s*(?:de\s+)?(.+)$/i)
  if (threeQuarterMatch) {
    return {
      cleanName: threeQuarterMatch[1].trim(),
      packagingType: 'quarter',
      packagingLabel: '3/4 carton',
      multiplierFraction: 0.75,
    }
  }

  // 4. Cartons / Packs / Sacs entiers
  const cartonMatch = name.match(/^(?:cartons?|packs?|sacs?|casiers?|fardeaux?|caisses?|boites?|boîtes?|paquets?)\s*(?:de\s+)?(.+)$/i)
  if (cartonMatch) {
    return {
      cleanName: cartonMatch[1].trim(),
      packagingType: 'carton',
      packagingLabel: 'Carton',
      multiplierFraction: 1,
    }
  }

  // 5. Lots dégressifs (lot de 3, lot 6)
  const lotMatch = name.match(/^(?:lot\s+de\s+(\d+)|lot\s+(\d+)|par\s+(\d+))\s*(?:de\s+)?(.+)$/i)
  if (lotMatch) {
    const lotCount = parseInt(lotMatch[1] || lotMatch[2] || lotMatch[3], 10) || 3
    return {
      cleanName: lotMatch[4].trim(),
      packagingType: 'lot',
      packagingLabel: `Lot de ${lotCount}`,
      lotSize: lotCount,
    }
  }

  return { cleanName: name, packagingType: 'unit' }
}

function resolveArticleWithPackaging(
  rawProdName: string,
  qty: number,
  unitPrice: number,
  catalog?: any[]
) {
  const packInfo = extractPackagingFromText(rawProdName)
  const canonicalName = normalizeProductName(packInfo.cleanName)
  
  let piecesCount = qty
  let matchedProd: any = undefined

  if (catalog && catalog.length > 0) {
    const norm = canonicalName.toLowerCase().trim()
    matchedProd = catalog.find(p => normalizeProductName(p.name).toLowerCase().trim() === norm)
  }

  const multiplier = matchedProd?.multiplier && matchedProd.multiplier > 1 
    ? matchedProd.multiplier 
    : (matchedProd?.package_size && matchedProd.package_size > 1 ? matchedProd.package_size : 1)

  if (packInfo.packagingType === 'quarter') {
    piecesCount = Math.max(1, Math.round(multiplier * (packInfo.multiplierFraction || 0.25))) * qty
  } else if (packInfo.packagingType === 'half') {
    piecesCount = Math.max(1, Math.round(multiplier * (packInfo.multiplierFraction || 0.5))) * qty
  } else if (packInfo.packagingType === 'carton') {
    piecesCount = multiplier * qty
  } else if (packInfo.packagingType === 'lot') {
    piecesCount = (packInfo.lotSize || matchedProd?.lot_quantity || 3) * qty
  }

  const displayName = packInfo.packagingLabel
    ? `${canonicalName} (${packInfo.packagingLabel})`
    : canonicalName

  return {
    nom: displayName,
    canonical_name: canonicalName,
    quantite: qty,
    prix_unitaire: unitPrice,
    packaging_type: packInfo.packagingType,
    packaging_label: packInfo.packagingLabel,
    pieces_count: piecesCount,
    unite_achat: undefined as string | undefined,
    unite_vente: undefined as string | undefined,
    quantite_par_boite: undefined as number | undefined,
    prix_vente_unitaire: undefined as number | undefined,
  }
}

/**
 * Développe les abréviations monétaires informelles (ex: 20k -> 20000, 1.5k -> 1500, 6k5 -> 6500, 20 mille -> 20000)
 */
export function expandShorthandThousands(input: string): string {
  if (!input) return ''
  let text = input

  // 1. Notation 6k5 -> 6500, 1k2 -> 1200
  text = text.replace(/\b(\d+)[kK](\d+)\b/g, (_, p1, p2) => {
    const dec = p2.length === 1 ? Number(p2) * 100 : Number(p2)
    return String(Number(p1) * 1000 + dec)
  })

  // 2. Notation 20k, 1.5k, 1,5k, 20 k
  text = text.replace(/\b(\d+(?:[.,]\d+)?)\s*[kK]\b/g, (_, num) => {
    return String(Math.round(parseFloat(num.replace(',', '.')) * 1000))
  })

  // 3. Notation 20 mille, 20 mil
  text = text.replace(/\b(\d+(?:[.,]\d+)?)\s*(?:mille|milles|mil)\b/gi, (_, num) => {
    return String(Math.round(parseFloat(num.replace(',', '.')) * 1000))
  })

  return text
}

export function parseTextLocally(text: string, penColor: string, catalog?: any[]): ParsedSale {
  const articles: any[] = []
  let totalFacture = 0
  
  const expanded = expandShorthandThousands(text)
  const rawCleaned = expanded.replace(/[,;\.\s]+$/, '').trim()

  const segments = rawCleaned.includes('\n') 
    ? rawCleaned.split('\n')
    : (/,/g.test(rawCleaned) && /\d/.test(rawCleaned) ? rawCleaned.split(',') : [rawCleaned])

  for (const seg of segments) {
    const cleanedText = seg.replace(/[,;\.\s]+$/, '').trim()
    if (!cleanedText) continue

    const lotPourRegex = /^(\d+)\s+(?:pour|a|à)?\s*(\d{2,6})\s*(?:f|fcfa|cfa|francs)?\s+(.+)$/i
    const qtyItemPriceRegex = /^(\d+)\s+([A-Za-zÀ-ÿ0-9\s'-]+?)\s+(?:à|a|@|pour)?\s*(\d{1,6})\s*(?:f|fcfa|cfa|francs)?$/i
    const singleItemNoQtyRegex = /^([A-Za-zÀ-ÿ0-9\s'-]+?)\s*(?:à|a|@|pour)?\s*(\d{1,6})\s*(?:f|fcfa|cfa|francs)?$/i

    const hasExplicitSeparator = /(?:^|\s)(?:à|a|@)(?:\s|$)/i.test(cleanedText)
    let segmentMatched = false
    // Détection explicite des fractions en tête : "1/2 carton de Savon BF 5200", "demi carton Savon BF 5200", "1/4 carton Savon BF 2650"
    const fractionPriceRegex = /^(?:(\d+)\s+)?(1\/2|demi|demi-carton|1\/4|quart|3\/4)\s*(?:de\s+)?(?:cartons?|packs?|sacs?|casiers?|fardeaux?|caisses?|boites?|boîtes?|paquets?)?\s*(?:de\s+)?([A-Za-zÀ-ÿ0-9\s'-]+?)\s+(?:à|a|@|pour)?\s*(\d{1,6})\s*(?:f|fcfa|cfa|francs)?$/i
    const matchFractionPrice = cleanedText.match(fractionPriceRegex)
    if (matchFractionPrice) {
      const outerQty = matchFractionPrice[1] ? parseInt(matchFractionPrice[1], 10) : 1
      const fracWord = matchFractionPrice[2].toLowerCase()
      const prodName = matchFractionPrice[3].trim()
      const givenPrice = parseInt(matchFractionPrice[4], 10)

      if (prodName && !['demande', 'stock', 'achat', 'recette'].includes(prodName.toLowerCase())) {
        let fracLabel = '1/2 carton'
        let fracType: 'half' | 'quarter' = 'half'
        let fracMult = 0.5

        if (fracWord === '1/4' || fracWord.startsWith('quart')) {
          fracLabel = '1/4 carton'
          fracType = 'quarter'
          fracMult = 0.25
        } else if (fracWord === '3/4') {
          fracLabel = '3/4 carton'
          fracType = 'quarter'
          fracMult = 0.75
        }

        const canonicalName = normalizeProductName(prodName)
        let matchedProd: any = undefined
        if (catalog && catalog.length > 0) {
          const norm = canonicalName.toLowerCase().trim()
          matchedProd = catalog.find(p => normalizeProductName(p.name).toLowerCase().trim() === norm)
        }
        const mult = matchedProd?.multiplier && matchedProd.multiplier > 1 ? matchedProd.multiplier : 24
        const piecesCount = Math.max(1, Math.round(mult * fracMult)) * outerQty

        articles.push({
          nom: `${canonicalName} (${fracLabel})`,
          canonical_name: canonicalName,
          quantite: outerQty,
          prix_unitaire: givenPrice,
          packaging_type: fracType,
          packaging_label: fracLabel,
          pieces_count: piecesCount,
          unite_achat: undefined,
          unite_vente: undefined,
          quantite_par_boite: undefined,
          prix_vente_unitaire: undefined,
        })
        totalFacture += givenPrice * outerQty
        segmentMatched = true
      }
    }

    if (!segmentMatched) {
      const matchLotPour = cleanedText.match(lotPourRegex)
      if (matchLotPour) {
        const qty = parseInt(matchLotPour[1], 10)
        const lotPrice = parseInt(matchLotPour[2], 10)
        const prodName = matchLotPour[3].trim()

        if (qty >= 1 && !isNaN(lotPrice) && lotPrice > 0) {
          const unitPrice = Math.round(lotPrice / qty)
          const art = resolveArticleWithPackaging(prodName, qty, unitPrice, catalog)
          articles.push(art)
          totalFacture += lotPrice
          segmentMatched = true
        }
      }
    }

    if (!segmentMatched) {
      const matchQtyItemPrice = cleanedText.match(qtyItemPriceRegex)
      if (matchQtyItemPrice) {
        const qty = parseInt(matchQtyItemPrice[1], 10)
        const prodName = matchQtyItemPrice[2].trim()
        const givenPrice = parseInt(matchQtyItemPrice[3], 10)

        if (prodName && isNaN(Number(prodName)) && !['demande', 'stock', 'achat', 'recette'].includes(prodName.toLowerCase())) {
          const hasPourOrLot = /(?:^|\s)(?:pour|lot)(?:\s|$)/i.test(cleanedText)
          const isLotPrice = hasPourOrLot
          let lotTotal = isLotPrice ? givenPrice : (qty * givenPrice)
          lotTotal = adjustLotRoundingArtifact(qty, givenPrice, lotTotal)
          const unitPrice = isLotPrice ? Math.round(givenPrice / qty) : givenPrice

          const art = resolveArticleWithPackaging(prodName, qty, unitPrice, catalog)
          articles.push(art)
          totalFacture += lotTotal
          segmentMatched = true
        }
      }
    }

    if (!segmentMatched) {
      const matchSingleNoQty = cleanedText.match(singleItemNoQtyRegex)
      if (matchSingleNoQty) {
        const prodName = matchSingleNoQty[1].trim()
        const price = parseInt(matchSingleNoQty[2], 10)

        if (prodName && isNaN(Number(prodName)) && !['demande', 'stock', 'achat', 'recette'].includes(prodName.toLowerCase())) {
          const art = resolveArticleWithPackaging(prodName, 1, price, catalog)
          articles.push(art)
          totalFacture += price
          segmentMatched = true
        }
      }
    }

    if (!segmentMatched) {
      const articleRegex = hasExplicitSeparator
        ? /(\d+)\s*(.*?)\s*(?:à|a|@)\s*(\d+)/gi
        : /(\d+)\s+(.+?)\s+(\d+)/gi
      const packRegex = /de\s+(\d+)\s+([A-Za-zÀ-ÿ]+)/i
      const salePriceRegex = /(?:prix de vente|vente|prix de vente a l'unite|prix de vente a l'unité)\s+(?:de\s+|a\s+|à\s+|@\s+|l'unite\s+|l'unité\s+)*(\d+)/i

      let match: RegExpExecArray | null
      while ((match = articleRegex.exec(cleanedText)) !== null) {
        const qty = parseInt(match[1], 10)
        const name = match[2].trim() || "Article(s)"
        const price = parseInt(match[3], 10)

        const hasPourOrLot = /(?:^|\s)(?:pour|lot)(?:\s|$)/i.test(cleanedText)
        const isLotSale = hasPourOrLot

        const packMatch = name.match(packRegex)
        const salePriceMatch = cleanedText.match(salePriceRegex)

        let finalQty = qty
        let finalUnitPrice = isLotSale ? Math.round(price / qty) : price
        let uniteAchat = undefined
        let uniteVente = undefined
        let quantiteParBoite = undefined
        let prixVenteUnitaire = salePriceMatch ? parseInt(salePriceMatch[1], 10) : undefined
        let simplifiedName = name

        if (packMatch) {
          const multiplier = parseInt(packMatch[1], 10)
          uniteVente = packMatch[2].trim()
          quantiteParBoite = multiplier
          
          const firstWord = name.split(/\s+/)[0]
          if (['caissier', 'carton', 'sac', 'boite', 'boîte', 'paquet'].includes(firstWord.toLowerCase())) {
            uniteAchat = firstWord
            simplifiedName = name.replace(new RegExp(`^${firstWord}\\s+(?:de\\s+)?`, 'i'), '')
          }
          
          simplifiedName = simplifiedName.replace(packRegex, '').replace(/\s+de\s*$/, '').trim()
          finalQty = qty * multiplier
          finalUnitPrice = Math.round(price / multiplier)
        }

        const art = resolveArticleWithPackaging(simplifiedName, finalQty, finalUnitPrice, catalog)
        art.unite_achat = uniteAchat
        art.unite_vente = uniteVente
        art.quantite_par_boite = quantiteParBoite
        art.prix_vente_unitaire = prixVenteUnitaire

        articles.push(art)
        const segmentTotal = isLotSale ? price : (qty * price)
        totalFacture += adjustLotRoundingArtifact(finalQty, finalUnitPrice, segmentTotal)
      }
    }
  }

  if (articles.length === 0) {
    const amountRegex = /(?:total|montant|somme|de)?\s*(\d{2,7})(?:\s*f|\s*fcfa|\s*cfa|\s*francs)?/i
    const amountMatch = rawCleaned.match(amountRegex)
    if (amountMatch) {
      const amount = parseInt(amountMatch[1], 10)
      totalFacture = amount
      articles.push({
        nom: "Transaction générale",
        quantite: 1,
        prix_unitaire: amount
      })
    }
  }

  let nomClient = "Client anonyme"
  const explicitClientMatch = text.match(/(?:client|grossiste|fournisseur)\s*[:=]?\s*([^,\n\r;]+?)(?=\s+(?:reste|dette|credit|crédit|payé|paye|recu|avance|total|\d+[\s\w]*$|$))/i)
  const pourClientMatch = text.match(/(?:^|\s)pour\s+([A-Za-zÀ-ÿ]+(?:[-'\s][A-Za-zÀ-ÿ]+)?)(?=\s+(?:reste|dette|credit|crédit|payé|paye|recu|avance|total|\d+|$))/i)
  const rawCandidate = explicitClientMatch ? explicitClientMatch[1].trim() : (pourClientMatch ? pourClientMatch[1].trim() : null)
  const reservedWords = new Set(['stock', 'achat', 'recette', 'vente', 'carton', 'boite', 'boîte', 'sac', 'pack', 'demande', 'reste', 'dette', 'credit', 'crédit', 'total', 'loyer', 'transport', 'lui', 'moi', 'elle', 'eux', 'ce', 'cet', 'cette', 'un', 'une', 'des', 'le', 'la', 'les', 'du'])

  if (rawCandidate) {
    const cleaned = rawCandidate.replace(/^[:=\-\s]+|[:=\-\s]+$/g, '')
    if (cleaned && !reservedWords.has(cleaned.toLowerCase())) {
      // Formater chaque segment en Title Case propre (ex: "mamadou traoré" -> "Mamadou Traoré", "jean-paul" -> "Jean-Paul")
      nomClient = cleaned
        .split(/(\s+|-)/)
        .map(part => {
          if (/^[\s-]+$/.test(part)) return part
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        })
        .join('')
    }
  }

  let montantPaye = totalFacture
  let montantDette = 0

  const payeRegex = /(?:payé|paye|recu|donne)\s+(\d+)/i
  const payeMatch = text.match(payeRegex)
  if (payeMatch) {
    montantPaye = parseInt(payeMatch[1], 10)
  }

  const resteRegex = /(?:reste|dette|credit|dû|du)\s+(\d+)/i
  const resteMatch = text.match(resteRegex)
  if (resteMatch) {
    montantDette = parseInt(resteMatch[1], 10)
    if (penColor === 'yellow' || penColor === 'purple') {
      montantPaye = totalFacture - montantDette
    }
  }

  if (penColor === 'yellow' || penColor === 'purple') {
    if (!payeMatch && !resteMatch) {
      montantPaye = 0
      montantDette = totalFacture
    } else {
      montantDette = Math.max(0, totalFacture - montantPaye)
    }
  } else {
    montantPaye = totalFacture
    montantDette = 0
  }

  let category = 'Divers'
  if (penColor === 'red') {
    const textLower = text.toLowerCase()
    if (textLower.includes('loyer') || textLower.includes('boutique') || textLower.includes('emplacement') || textLower.includes('magasin')) {
      category = 'Loyer'
    } else if (textLower.includes('cie') || textLower.includes('sodeci') || textLower.includes('electricite') || textLower.includes('eau')) {
      category = 'Factures'
    } else if (textLower.includes('carburant') || textLower.includes('essence') || textLower.includes('taxi') || textLower.includes('transport')) {
      category = 'Transport'
    } else if (textLower.includes('salaire') || textLower.includes('ration') || textLower.includes('paie')) {
      category = 'Salaires'
    }
  }

  return {
    articles,
    total_facture: totalFacture,
    montant_paye: montantPaye,
    montant_dette: montantDette,
    nom_client: nomClient,
    categorie: category
  }
}
