import { getTodayDateString } from './dateUtils'

export interface AnalyticsAnswer {
  question: string
  answer: string
  details?: string[]
  type: 'money' | 'quantity' | 'debt' | 'stock' | 'general'
  data?: any
}

/**
 * Analyse une question posée en langage naturel par le commerçant et produit une réponse instantanée.
 */
export function answerBoutiqueQuestion(
  question: string,
  sales: any[],
  products: any[] = []
): AnalyticsAnswer {
  const q = question.toLowerCase().trim()
  const todayStr = getTodayDateString()

  // Calcul de la date du mois passé
  const now = new Date()
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthYear = lastMonthDate.getFullYear()
  const lastMonthNum = String(lastMonthDate.getMonth() + 1).padStart(2, '0')
  const lastMonthPrefix = `${lastMonthYear}-${lastMonthNum}`

  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // 1. QUESTION : "Combien j'ai gagné aujourd'hui ?" / "Bénéfice aujourd'hui"
  if (q.includes('gagné aujourd') || q.includes('bénéfice aujourd') || q.includes('profit aujourd')) {
    const todaySales = sales.filter(s => s.date === todayStr && s.pen_color !== 'red')
    const todayExpenses = sales.filter(s => s.date === todayStr && s.pen_color === 'red')

    const totalCa = todaySales.reduce((sum, s) => sum + (s.total || 0), 0)
    const totalExp = todayExpenses.reduce((sum, s) => sum + (s.total || 0), 0)

    // Calcul de l'estimation de marge brute si unit_cost disponible
    let estimatedCost = 0
    todaySales.forEach(s => {
      s.articles?.forEach((art: any) => {
        const prod = products.find(p => p.name.toLowerCase() === art.name.toLowerCase())
        const cost = prod?.unit_cost || 0
        estimatedCost += cost * (art.quantity || 1)
      })
    })

    const estimatedProfit = Math.max(0, totalCa - estimatedCost - totalExp)

    return {
      question,
      answer: `Aujourd'hui, vous avez réalisé un chiffre d'affaires de **${totalCa.toLocaleString('fr-FR')} FCFA**.${totalExp > 0 ? ` (Dépenses : ${totalExp.toLocaleString('fr-FR')} F)` : ''}`,
      details: [
        `Ventes brutes : ${totalCa.toLocaleString('fr-FR')} F`,
        `Dépenses de la journée : ${totalExp.toLocaleString('fr-FR')} F`,
        estimatedCost > 0 ? `Estimation du Bénéfice Net : ${estimatedProfit.toLocaleString('fr-FR')} F` : `Bénéfice estimé : ~${Math.round(totalCa * 0.25).toLocaleString('fr-FR')} F`
      ],
      type: 'money'
    }
  }

  // 2. QUESTION : "Combien j'ai vendu ce mois / le mois passé ?"
  if (q.includes('mois pass') || q.includes('mois dernier') || q.includes('le mois passé')) {
    const lastMonthSales = sales.filter(s => s.date.startsWith(lastMonthPrefix) && s.pen_color !== 'red')
    const lastMonthCa = lastMonthSales.reduce((sum, s) => sum + (s.total || 0), 0)
    const nbVentes = lastMonthSales.length

    return {
      question,
      answer: `Le mois passé (${lastMonthPrefix}), vous avez réalisé **${lastMonthCa.toLocaleString('fr-FR')} FCFA** de ventes au total sur ${nbVentes} transactions.`,
      details: [
        `Période : ${lastMonthPrefix}`,
        `Total des ventes : ${lastMonthCa.toLocaleString('fr-FR')} FCFA`,
        `Nombre de ventes : ${nbVentes}`
      ],
      type: 'money'
    }
  }

  if (q.includes('ce mois') || q.includes('mois ci') || q.includes('mois en cours')) {
    const thisMonthSales = sales.filter(s => s.date.startsWith(thisMonthPrefix) && s.pen_color !== 'red')
    const thisMonthCa = thisMonthSales.reduce((sum, s) => sum + (s.total || 0), 0)

    return {
      question,
      answer: `Depuis le début de ce mois (${thisMonthPrefix}), votre chiffre d'affaires est de **${thisMonthCa.toLocaleString('fr-FR')} FCFA** (${thisMonthSales.length} ventes).`,
      type: 'money'
    }
  }

  // 3. QUESTION : "Combien les clients me doivent ?" / "Dettes clients"
  if (q.includes('doivent') || q.includes('dette') || q.includes('crédit client') || q.includes('impayé')) {
    const debtSales = sales.filter(s => (s.debt || 0) > 0 && s.status !== 'crossed_out')
    const totalDebt = debtSales.reduce((sum, s) => sum + (s.debt || 0), 0)

    const clientDebts: Record<string, number> = {}
    debtSales.forEach(s => {
      const c = s.client || 'Client anonyme'
      clientDebts[c] = (clientDebts[c] || 0) + (s.debt || 0)
    })

    const topDebtors = Object.entries(clientDebts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => `${name} : ${amount.toLocaleString('fr-FR')} F`)

    return {
      question,
      answer: `Les clients vous doivent actuellement un total de **${totalDebt.toLocaleString('fr-FR')} FCFA** répartis sur ${debtSales.length} fiches de crédit.`,
      details: topDebtors.length > 0 ? [`Top débiteurs :`, ...topDebtors] : undefined,
      type: 'debt'
    }
  }

  // 4. QUESTION : "Combien de [produit] vendu ?" (ex: Riz, Huile, Sucre, Savon...)
  const matchQty = q.match(/(?:quantité|combien|nombre)(?:\s+de|\s+d')?\s+([a-z0-9\s]+?)(?:\s+vendus?|\s+vendue?|\s+ce mois|\s+aujourd'hui|$)/i)
  if (matchQty || q.includes('vendue') || q.includes('vendu')) {
    const searchTerm = (matchQty ? matchQty[1] : q.replace(/(combien|quantité|de|d'|vendu|vendue|aujourd'hui|ce mois)/g, '')).trim().toLowerCase()

    if (searchTerm.length >= 2) {
      let totalQty = 0
      let totalAmount = 0
      let productUnit = 'unités'

      sales.forEach(s => {
        if (s.pen_color === 'red') return
        s.articles?.forEach((art: any) => {
          if (art.name.toLowerCase().includes(searchTerm)) {
            totalQty += Number(art.quantity) || 0
            totalAmount += (Number(art.quantity) || 0) * (Number(art.unit_price) || 0)
          }
        })
      })

      const matchedProd = products.find(p => p.name.toLowerCase().includes(searchTerm))
      if (matchedProd && matchedProd.unit) {
        productUnit = matchedProd.unit
      }

      if (totalQty > 0) {
        return {
          question,
          answer: `Vous avez vendu au total **${totalQty} ${productUnit}** de **${searchTerm.toUpperCase()}** pour un montant de **${totalAmount.toLocaleString('fr-FR')} FCFA**.`,
          details: [
            `Article : ${searchTerm}`,
            `Quantité totale : ${totalQty} ${productUnit}`,
            `Recette générée : ${totalAmount.toLocaleString('fr-FR')} FCFA`
          ],
          type: 'quantity'
        }
      }
    }
  }

  // 5. QUESTION : "Quels sont les produits en rupture ?" / "Stock faible"
  if (q.includes('rupture') || q.includes('manque') || q.includes('stock faible') || q.includes('alerte')) {
    const lowStockItems = products.filter(p => (p.current_stock ?? p.initial_stock ?? 0) <= (p.alert_threshold || 5))

    if (lowStockItems.length === 0) {
      return {
        question,
        answer: `🎉 Bonne nouvelle ! Aucun produit n'est actuellement en rupture de stock.`,
        type: 'stock'
      }
    }

    const itemsList = lowStockItems.map(p => `- **${p.name}** : Reste ${p.current_stock ?? p.initial_stock ?? 0} ${p.unit || 'pcs'} (Seuil: ${p.alert_threshold || 5})`)

    return {
      question,
      answer: `⚠️ Vous avez **${lowStockItems.length} produit(s)** en alerte ou en rupture de stock :`,
      details: itemsList,
      type: 'stock'
    }
  }

  // 6. QUESTION GÉNÉRALE : Totaux généraux aujourd'hui
  const todaySales = sales.filter(s => s.date === todayStr && s.pen_color !== 'red')
  const todayCa = todaySales.reduce((sum, s) => sum + (s.total || 0), 0)

  return {
    question,
    answer: `Aujourd'hui, vous avez **${todaySales.length} vente(s)** enregistrée(s) pour un total de **${todayCa.toLocaleString('fr-FR')} FCFA**.`,
    details: [
      `Essayez de demander :`,
      `• "Combien j'ai gagné aujourd'hui ?"`,
      `• "Combien j'ai vendu le mois passé ?"`,
      `• "Quelle est la quantité de riz vendue ?"`,
      `• "Combien les clients me doivent ?"`,
      `• "Quels sont les produits en rupture ?"`
    ],
    type: 'general'
  }
}

export interface CategoryCashboxGroup {
  name: string
  key: 'boissons' | 'divers' | 'resto' | 'services'
  icon: string
  revenue: number
  paidCash: number
  debt: number
  expenses: number
  stockValueCost: number
  stockValueSale: number
  itemCount: number
  outOfStockCount: number
}

export interface MultiCashboxBreakdown {
  boissons: CategoryCashboxGroup
  divers: CategoryCashboxGroup
  resto: CategoryCashboxGroup
  services: CategoryCashboxGroup
  totalCa: number
  totalCash: number
}

export function isBoissonCategory(nameOrCat: string): boolean {
  const text = (nameOrCat || '').toLowerCase().trim()
  return /boisson|jus|biere|bière|eau|soda|coca|fanta|sprite|vin|whisky|canette|bouteille|casier|bar|champagne|liqueur/i.test(text)
}

export function isPrestationCategory(nameOrCat: string): boolean {
  const text = (nameOrCat || '').toLowerCase().trim()
  return /prestation|service|coiffure|couture|réparation|reparation|main d'oeuvre|lavage|atelier/i.test(text)
}

export function isRestoCategory(nameOrCat: string): boolean {
  const text = (nameOrCat || '').toLowerCase().trim()
  return /cuisiné|plat|cafétéria|cafeteria|menu|repas|restaurant|nourriture/i.test(text)
}

/**
 * Calcule la ventilation des caisses et du capital par catégorie de produits (Boissons vs Divers vs Resto vs Services).
 */
export function calculateCategoryCashboxBreakdown(
  sales: any[],
  products: any[] = []
): MultiCashboxBreakdown {
  const breakdown: MultiCashboxBreakdown = {
    boissons: {
      name: 'Caisse Boissons & Dépôt',
      key: 'boissons',
      icon: '🥤',
      revenue: 0,
      paidCash: 0,
      debt: 0,
      expenses: 0,
      stockValueCost: 0,
      stockValueSale: 0,
      itemCount: 0,
      outOfStockCount: 0,
    },
    divers: {
      name: 'Caisse Divers & Alimentation',
      key: 'divers',
      icon: '📦',
      revenue: 0,
      paidCash: 0,
      debt: 0,
      expenses: 0,
      stockValueCost: 0,
      stockValueSale: 0,
      itemCount: 0,
      outOfStockCount: 0,
    },
    resto: {
      name: 'Caisse Plats & Carte',
      key: 'resto',
      icon: '🍽️',
      revenue: 0,
      paidCash: 0,
      debt: 0,
      expenses: 0,
      stockValueCost: 0,
      stockValueSale: 0,
      itemCount: 0,
      outOfStockCount: 0,
    },
    services: {
      name: 'Caisse Prestations & Services',
      key: 'services',
      icon: '✂️',
      revenue: 0,
      paidCash: 0,
      debt: 0,
      expenses: 0,
      stockValueCost: 0,
      stockValueSale: 0,
      itemCount: 0,
      outOfStockCount: 0,
    },
    totalCa: 0,
    totalCash: 0,
  }

  // 1. Ventilation des Ventes & Encaissements
  sales.forEach(sale => {
    if (sale.status === 'crossed_out') return

    const type = sale.type || 'cash_in'
    const total = sale.total_amount ?? sale.total ?? 0
    const paid = sale.paid_amount ?? sale.paid ?? 0
    const debt = sale.debt_amount ?? sale.debt ?? 0

    if (type === 'cash_out') {
      const catText = `${sale.category || ''} ${sale.notes || ''}`
      if (isBoissonCategory(catText)) breakdown.boissons.expenses += total
      else if (isPrestationCategory(catText)) breakdown.services.expenses += total
      else if (isRestoCategory(catText)) breakdown.resto.expenses += total
      else breakdown.divers.expenses += total
      return
    }

    // Vente ou Vente à crédit
    if (type === 'cash_in' || type === 'sale_credit') {
      breakdown.totalCa += total
      breakdown.totalCash += paid

      if (sale.articles && sale.articles.length > 0) {
        sale.articles.forEach((art: any) => {
          const artName = art.name || ''
          const artCat = art.category || ''
          const artTotal = (art.quantity || 1) * (art.unit_price || 0)
          const ratio = total > 0 ? artTotal / total : 1 / sale.articles.length
          const artPaid = Math.round(paid * ratio)
          const artDebt = Math.round(debt * ratio)

          if (isBoissonCategory(artCat) || isBoissonCategory(artName)) {
            breakdown.boissons.revenue += artTotal
            breakdown.boissons.paidCash += artPaid
            breakdown.boissons.debt += artDebt
          } else if (isPrestationCategory(artCat) || isPrestationCategory(artName)) {
            breakdown.services.revenue += artTotal
            breakdown.services.paidCash += artPaid
            breakdown.services.debt += artDebt
          } else if (isRestoCategory(artCat) || isRestoCategory(artName)) {
            breakdown.resto.revenue += artTotal
            breakdown.resto.paidCash += artPaid
            breakdown.resto.debt += artDebt
          } else {
            breakdown.divers.revenue += artTotal
            breakdown.divers.paidCash += artPaid
            breakdown.divers.debt += artDebt
          }
        })
      } else {
        const text = `${sale.category || ''} ${sale.notes || ''}`
        if (isBoissonCategory(text)) {
          breakdown.boissons.revenue += total
          breakdown.boissons.paidCash += paid
          breakdown.boissons.debt += debt
        } else if (isPrestationCategory(text)) {
          breakdown.services.revenue += total
          breakdown.services.paidCash += paid
          breakdown.services.debt += debt
        } else if (isRestoCategory(text)) {
          breakdown.resto.revenue += total
          breakdown.resto.paidCash += paid
          breakdown.resto.debt += debt
        } else {
          breakdown.divers.revenue += total
          breakdown.divers.paidCash += paid
          breakdown.divers.debt += debt
        }
      }
    }
  })

  // 2. Ventilation du Stock & Capital Immobilisé
  products.forEach(p => {
    const text = `${p.category || ''} ${p.name || ''}`
    const stockQty = Math.max(0, p.current_stock ?? p.initial_stock ?? 0)
    const cost = p.unit_cost || 0
    const price = p.unit_price || 0
    const isOut = stockQty <= (p.alert_threshold || 0)

    let targetGroup: CategoryCashboxGroup = breakdown.divers
    if (isBoissonCategory(text)) targetGroup = breakdown.boissons
    else if (isPrestationCategory(text)) targetGroup = breakdown.services
    else if (isRestoCategory(text)) targetGroup = breakdown.resto

    targetGroup.itemCount += 1
    if (isOut) targetGroup.outOfStockCount += 1
    targetGroup.stockValueCost += stockQty * cost
    targetGroup.stockValueSale += stockQty * price
  })

  return breakdown
}
