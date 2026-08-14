export interface Pen {
  id: string
  name: string
  color: string
  bg: string
  border: string
  textClass: string
  dotBg: string
  placeholder: string
}

export type FilterId = 'all' | 'blue' | 'red' | 'green' | 'purple' | 'yellow'

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(price) + ' FCFA'
}

export function getPens(activity?: string): Pen[] {
  const act = activity || 'boutique'
  if (act === 'particulier') {
    return [
      {
        id: 'blue',
        name: 'REVENU / ENTRÉE',
        color: '#1d4ed8',
        bg: 'bg-blue-600',
        border: 'border-blue-600',
        textClass: 'ink-blue',
        dotBg: 'bg-[#1d4ed8]',
        placeholder: 'Stylo Bleu : Entrée d\'argent, Salaire, Tontine... (ex: Salaire mois 150000, Tontine 20000)'
      },
      {
        id: 'red',
        name: 'DÉPENSE FOYER',
        color: '#e11d48',
        bg: 'bg-rose-600',
        border: 'border-rose-600',
        textClass: 'ink-red',
        dotBg: 'bg-[#e11d48]',
        placeholder: 'Stylo Rouge : Dépense cash de la maison... (ex: Marché 5000, Loyer 35000, CIE 12000)'
      },
      {
        id: 'green',
        name: 'RÉSERVE FOYER',
        color: '#047857',
        bg: 'bg-emerald-700',
        border: 'border-emerald-700',
        textClass: 'ink-green',
        dotBg: 'bg-[#047857]',
        placeholder: 'Stylo Vert : Achat de réserve maison payé cash... (ex: 2 sacs de riz 50kg à 45000, Bidon d\'huile)'
      },
      {
        id: 'purple',
        name: 'CARNET BOUTIQUIER',
        color: '#7e22ce',
        bg: 'bg-purple-700',
        border: 'border-purple-700',
        textClass: 'ink-purple',
        dotBg: 'bg-purple-700',
        placeholder: 'Stylo Violet : Achat pris à crédit chez le boutiquier... (ex: Pris 2 pains et 1 lait chez Maman Rose)'
      },
      {
        id: 'yellow',
        name: 'PRÊT À UN PROCHE',
        color: '#b45309',
        bg: 'bg-amber-600',
        border: 'border-amber-600',
        textClass: 'ink-yellow',
        dotBg: 'bg-[#b45309]',
        placeholder: 'Stylo Jaune : Argent prêté à un ami ou proche... (ex: Prêté 10000 à Marc)'
      },
    ]
  } else if (act === 'resto') {
    return [
      {
        id: 'blue',
        name: 'RECETTE RESTO',
        color: '#1d4ed8',
        bg: 'bg-blue-600',
        border: 'border-blue-600',
        textClass: 'ink-blue',
        dotBg: 'bg-[#1d4ed8]',
        placeholder: 'Stylo Bleu : Vente cash de plats ou boissons... (ex: 2 plats de riz poisson à 3000, 3 beaufort)'
      },
      {
        id: 'red',
        name: 'DÉPENSE CUISINE',
        color: '#e11d48',
        bg: 'bg-rose-600',
        border: 'border-rose-600',
        textClass: 'ink-red',
        dotBg: 'bg-[#e11d48]',
        placeholder: 'Stylo Rouge : Dépense ingrédients... (ex: Marché épices 4500, charbon 2000)'
      },
      {
        id: 'green',
        name: 'STOCK BAR/CUISINE',
        color: '#047857',
        bg: 'bg-emerald-700',
        border: 'border-emerald-700',
        textClass: 'ink-green',
        dotBg: 'bg-[#047857]',
        placeholder: 'Stylo Vert : Ravitaillement payé cash... (ex: 5 caisses de bière à 45000)'
      },
      {
        id: 'purple',
        name: 'CRÉDIT FOURNISSEUR',
        color: '#7e22ce',
        bg: 'bg-purple-700',
        border: 'border-purple-700',
        textClass: 'ink-purple',
        dotBg: 'bg-purple-700',
        placeholder: 'Stylo Violet : Commande de stock prise à crédit... (ex: Brasserie 10 casiers à crédit 85000)'
      },
      {
        id: 'yellow',
        name: 'ARRIÉRÉ CLIENT',
        color: '#b45309',
        bg: 'bg-amber-600',
        border: 'border-amber-600',
        textClass: 'ink-yellow',
        dotBg: 'bg-[#b45309]',
        placeholder: 'Stylo Jaune : Consommation client non réglée... (ex: Table 4 prend 3 repas crédit 7500)'
      },
    ]
  } else if (act === 'prestations') {
    return [
      {
        id: 'blue',
        name: 'RECETTE SERVICE',
        color: '#1d4ed8',
        bg: 'bg-blue-600',
        border: 'border-blue-600',
        textClass: 'ink-blue',
        dotBg: 'bg-[#1d4ed8]',
        placeholder: 'Stylo Bleu : Prestation encaissée... (ex: Coiffure homme 2500, Manucure 3000)'
      },
      {
        id: 'red',
        name: 'DÉPENSE SALON',
        color: '#e11d48',
        bg: 'bg-rose-600',
        border: 'border-rose-600',
        textClass: 'ink-red',
        dotBg: 'bg-[#e11d48]',
        placeholder: 'Stylo Rouge : Dépense du salon... (ex: Loyer salon 20000, Électricité 5000)'
      },
      {
        id: 'green',
        name: 'ACHAT MATÉRIEL',
        color: '#047857',
        bg: 'bg-emerald-700',
        border: 'border-emerald-700',
        textClass: 'ink-green',
        dotBg: 'bg-[#047857]',
        placeholder: 'Stylo Vert : Produits & matériel payés cash... (ex: 3 gel coiffant à 6000)'
      },
      {
        id: 'purple',
        name: 'FOURNISSEUR CRÉDIT',
        color: '#7e22ce',
        bg: 'bg-purple-700',
        border: 'border-purple-700',
        textClass: 'ink-purple',
        dotBg: 'bg-purple-700',
        placeholder: 'Stylo Violet : Matériel pris à crédit... (ex: Fournisseur 2 tondeuses crédit 25000)'
      },
      {
        id: 'yellow',
        name: 'RESTE À PAYER',
        color: '#b45309',
        bg: 'bg-amber-600',
        border: 'border-amber-600',
        textClass: 'ink-yellow',
        dotBg: 'bg-[#b45309]',
        placeholder: 'Stylo Jaune : Client ayant un reste à payer... (ex: Dame Yemi tresse reste 5000)'
      },
    ]
  } else {
    return [
      {
        id: 'blue',
        name: 'ENTRÉE',
        color: '#1d4ed8',
        bg: 'bg-blue-600',
        border: 'border-blue-600',
        textClass: 'ink-blue',
        dotBg: 'bg-[#1d4ed8]',
        placeholder: 'Stylo Bleu : Écrivez une vente cash... (ex: 2 sacs de riz à 22000)'
      },
      {
        id: 'red',
        name: 'DÉPENSE',
        color: '#e11d48',
        bg: 'bg-rose-600',
        border: 'border-rose-600',
        textClass: 'ink-red',
        dotBg: 'bg-[#e11d48]',
        placeholder: 'Stylo Rouge : Écrivez une dépense... (ex: achat emballages plastiques 2500)'
      },
      {
        id: 'green',
        name: 'STOCK CASH',
        color: '#047857',
        bg: 'bg-emerald-700',
        border: 'border-emerald-700',
        textClass: 'ink-green',
        dotBg: 'bg-[#047857]',
        placeholder: 'Stylo Vert : Écrivez un achat de stock payé cash... (ex: 5 cartons lait à 15000)'
      },
      {
        id: 'purple',
        name: 'STOCK CRÉDIT',
        color: '#7e22ce',
        bg: 'bg-purple-700',
        border: 'border-purple-700',
        textClass: 'ink-purple',
        dotBg: 'bg-purple-700',
        placeholder: 'Stylo Violet : Écrivez un achat à crédit fournisseur... (ex: Grossiste Chantal carton peak credit 35000)'
      },
      {
        id: 'yellow',
        name: 'CRÉDIT CLIENT',
        color: '#b45309',
        bg: 'bg-amber-600',
        border: 'border-amber-600',
        textClass: 'ink-yellow',
        dotBg: 'bg-[#b45309]',
        placeholder: 'Stylo Jaune : Écrivez un crédit donné à un client... (ex: Koffi prend 2 sacs de riz crédit 12000)'
      },
    ]
  }
}

export function getFilters(activity?: string): { id: FilterId; label: string }[] {
  const pens = getPens(activity)
  return [
    { id: 'all', label: 'TOUT' },
    ...pens.map(p => ({ id: p.id as FilterId, label: p.name }))
  ]
}
