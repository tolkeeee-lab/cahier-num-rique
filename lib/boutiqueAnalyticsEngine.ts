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
