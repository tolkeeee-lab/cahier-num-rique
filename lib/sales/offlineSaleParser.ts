import { normalizeProductName, adjustLotRoundingArtifact } from '@/lib/productUtils'
import { ParsedSale } from './openAiSaleParser'

export function parseTextLocally(text: string, penColor: string): ParsedSale {
  const articles: any[] = []
  let totalFacture = 0
  
  const rawCleaned = text.replace(/[,;\.\s]+$/, '').trim()

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

    const matchLotPour = cleanedText.match(lotPourRegex)
    if (matchLotPour) {
      const qty = parseInt(matchLotPour[1], 10)
      const lotPrice = parseInt(matchLotPour[2], 10)
      const prodName = matchLotPour[3].trim()

      if (qty >= 1 && !isNaN(lotPrice) && lotPrice > 0) {
        const unitPrice = Math.round(lotPrice / qty)
        articles.push({
          nom: normalizeProductName(prodName),
          quantite: qty,
          prix_unitaire: unitPrice
        })
        totalFacture += lotPrice
        segmentMatched = true
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

          articles.push({
            nom: normalizeProductName(prodName),
            quantite: qty,
            prix_unitaire: unitPrice
          })
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
          articles.push({
            nom: normalizeProductName(prodName),
            quantite: 1,
            prix_unitaire: price
          })
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

        articles.push({
          nom: simplifiedName,
          quantite: finalQty,
          prix_unitaire: finalUnitPrice,
          unite_achat: uniteAchat,
          unite_vente: uniteVente,
          quantite_par_boite: quantiteParBoite,
          prix_vente_unitaire: prixVenteUnitaire
        })
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
  const clientRegex = /(?:pour|de|client|grossiste|fournisseur|a)\s+([A-Za-z]+)/i
  const clientMatch = text.match(clientRegex)
  if (clientMatch) {
    nomClient = clientMatch[1].trim()
    nomClient = nomClient.charAt(0).toUpperCase() + nomClient.slice(1)
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
