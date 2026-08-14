/**
 * activityLabels.ts
 *
 * Centralise les intitulés adaptatifs selon le domaine d'activité de la boutique :
 * - boutique : commerce général / alimentation
 * - resto : maquis, restaurant, bar, cafétéria
 * - prestations : salon de coiffure, couture, atelier, services
 * - particulier : budget du ménage et du foyer
 */

export interface ActivityLabels {
  title: string
  spine: string
  soldeJour: string
  tiroirCash: string
  creditsDehors: string
  nosDettes: string
  tabCahier: string
  tabDettes: string
  tabTrends: string
  tabStock: string
  tabShopping: string
  tabDemandes: string
  clientTitle: string
  newSalePlaceholder: string
  stockUnitLabel: string
}

export function getActivityLabels(activity: string = 'boutique'): ActivityLabels {
  const act = (activity || 'boutique').toLowerCase()

  if (act === 'particulier') {
    return {
      title: 'Cahier du Foyer & Budget',
      spine: 'CAHIER DU FOYER & BUDGET',
      soldeJour: '☀️ Solde du jour',
      tiroirCash: '💵 Portefeuille / Budget',
      creditsDehors: '🔴 Prêts accordés',
      nosDettes: '🟣 Mes Dettes (Boutique/Factures)',
      tabCahier: 'Mon Foyer (Budget)',
      tabDettes: 'Prêts & Emprunts',
      tabTrends: 'Analyse Budget',
      tabStock: 'Réserve Foyer',
      tabShopping: 'Liste de Marché',
      tabDemandes: 'Achats Souhaités',
      clientTitle: 'Ménage / Famille',
      newSalePlaceholder: 'ex: 2kg riz à 1200, électricité 5000...',
      stockUnitLabel: 'Articles en réserve',
    }
  }

  if (act === 'resto') {
    return {
      title: 'Cahier de Caisse Resto & Bar',
      spine: 'COMPAGNON DE CUISINE & CAISSE',
      soldeJour: '☀️ Recette du jour',
      tiroirCash: '💵 Caisse Resto',
      creditsDehors: '🔴 Arriérés Clients',
      nosDettes: '🟣 Dettes Fournisseurs',
      tabCahier: 'Mon Cahier Resto',
      tabDettes: 'Carnet des Dettes',
      tabTrends: 'Analyse Ventes',
      tabStock: 'Cuisine & Bar',
      tabShopping: 'Ravitaillement Cuisine',
      tabDemandes: 'Plats & Demandes',
      clientTitle: 'Client / Table',
      newSalePlaceholder: 'ex: 2 poulets braisés à 3500, 3 Flag à 600...',
      stockUnitLabel: 'Plats & Boissons',
    }
  }

  if (act === 'prestations') {
    return {
      title: 'Cahier des Prestations & Services',
      spine: 'CAHIER DE CAISSE SERVICES',
      soldeJour: '☀️ Recette Services',
      tiroirCash: '💵 Caisse Services',
      creditsDehors: '🔴 Crans & Reste à Payer',
      nosDettes: '🟣 Dettes Matériel',
      tabCahier: 'Mes Prestations',
      tabDettes: 'Carnet des Dettes',
      tabTrends: 'Analyse Services',
      tabStock: 'Produits & Matériel',
      tabShopping: 'Achats Fournitures',
      tabDemandes: 'Services Demandés',
      clientTitle: 'Client / Patient',
      newSalePlaceholder: 'ex: Tresses rasta 5000 pour Awa, shampoing 1500...',
      stockUnitLabel: 'Fournitures & Produits',
    }
  }

  // Default: boutique
  return {
    title: 'Cahier de Caisse Intelligent',
    spine: 'CAHIER DE CAISSE INTELLIGENT',
    soldeJour: "☀️ Aujourd'hui",
    tiroirCash: '💵 Tiroir Cash',
    creditsDehors: '🔴 Crédits dehors',
    nosDettes: '🟣 Nos Dettes',
    tabCahier: 'Mon Cahier',
    tabDettes: 'Livre des Dettes',
    tabTrends: 'Analyse Marché',
    tabStock: 'Stock Produits',
    tabShopping: 'Courses & Ravitaillement',
    tabDemandes: 'Produits Demandés',
    clientTitle: 'Client',
    newSalePlaceholder: 'ex: 2 Beaufort à 360, 3 oeufs à 275...',
    stockUnitLabel: 'Stock d\'articles',
  }
}
