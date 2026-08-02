/**
 * syscohadaEngine.ts — Moteur Comptable Référentiel SYSCOHADA révisé (OHADA SMT)
 *
 * Ce module associe automatiquement chaque écriture de caisse (stylos 4-couleurs)
 * aux numéros de comptes officiels du Plan Comptable Général OHADA (Système Minimal de Trésorerie).
 */

export interface SyscohadaAccount {
  code: string
  label: string
  class: '1' | '2' | '3' | '4' | '5' | '6' | '7'
  type: 'debit' | 'credit'
}

export interface DoubleEntryRow {
  id: string
  date: string
  time: string
  pieceRef: string
  description: string
  debitAccountCode: string
  debitAccountLabel: string
  creditAccountCode: string
  creditAccountLabel: string
  amount: number
  category: string
  penColor: string
}

export interface SyscohadaSMTSummary {
  chiffreAffaires701: number      // 7011 Ventes de marchandises
  prestationsServices706: number  // 7061 Prestations de services
  totalProduits: number            // Total Classe 7
  achatsMarchandises601: number   // 6011 Achats de marchandises (Stock)
  margeBrute: number               // Total Produits - Achats Marchandises
  chargesLoyer622: number          // 6221 Loyer commercial
  chargesEnergie605: number        // 6051 Électricité / Eau / Net
  chargesTransport611: number      // 6111 Transport & Livraison
  chargesSalaires661: number       // 6611 Salaires & Personnel
  autresCharges658: number         // 6581 Autres charges de gestion
  totalCharges: number             // Total Classe 6
  resultatNetSMT: number           // Total Produits - Total Charges
  soldeCaisse571: number           // Entrées cash - Sorties cash
  creancesClients411: number       // Solde restant Dettes Clients
  dettesFournisseurs401: number    // Solde restant Dettes Grossistes
}

// ─── DICTIONNAIRE DES COMPTES OFFICIELS SYSCOHADA ─────────────────────────────
export const SYSCOHADA_ACCOUNTS: Record<string, SyscohadaAccount> = {
  '7011': { code: '7011', label: 'Ventes de marchandises dans la Région (OHADA)', class: '7', type: 'credit' },
  '7061': { code: '7061', label: 'Services vendus / Prestations', class: '7', type: 'credit' },
  '6011': { code: '6011', label: 'Achats de marchandises', class: '6', type: 'debit' },
  '6051': { code: '6051', label: 'Fournitures non stockables (Eau, Électricité, Internet)', class: '6', type: 'debit' },
  '6111': { code: '6111', label: 'Transports sur achats et ventes / Livraisons', class: '6', type: 'debit' },
  '6221': { code: '6221', label: 'Locations et charges locatives (Loyer)', class: '6', type: 'debit' },
  '6611': { code: '6611', label: 'Rémunérations du personnel (Salaires)', class: '6', type: 'debit' },
  '6581': { code: '6581', label: 'Autres charges diverses de gestion courante', class: '6', type: 'debit' },
  '4111': { code: '4111', label: 'Clients - Créances sur ventes à crédit', class: '4', type: 'debit' },
  '4011': { code: '4011', label: 'Fournisseurs - Dettes sur achats à crédit', class: '4', type: 'debit' },
  '5711': { code: '5711', label: 'Caisse Principale (Espèces FCFA)', class: '5', type: 'debit' },
  '5211': { code: '5211', label: 'Banques & Mobile Money', class: '5', type: 'debit' },
}

/**
 * Détermine le compte de charge OHADA (Classe 6) selon les mots-clés de la note d'écriture.
 */
export function getSyscohadaExpenseAccount(notes: string, category?: string): { code: string; label: string } {
  const text = (notes || '').toLowerCase().trim()
  const cat = (category || '').toLowerCase().trim()

  if (cat === 'loyer' || text.includes('loyer') || text.includes('emplacement') || text.includes('magasin')) {
    return { code: '6221', label: SYSCOHADA_ACCOUNTS['6221'].label }
  }
  if (cat === 'factures' || text.includes('cie') || text.includes('sodeci') || text.includes('courant') || text.includes('electricite') || text.includes('eau') || text.includes('wifi') || text.includes('internet')) {
    return { code: '6051', label: SYSCOHADA_ACCOUNTS['6051'].label }
  }
  if (cat === 'transport' || text.includes('carburant') || text.includes('essence') || text.includes('taxi') || text.includes('transport') || text.includes('livraison')) {
    return { code: '6111', label: SYSCOHADA_ACCOUNTS['6111'].label }
  }
  if (cat === 'salaires' || text.includes('salaire') || text.includes('ration') || text.includes('paie') || text.includes('employe')) {
    return { code: '6611', label: SYSCOHADA_ACCOUNTS['6611'].label }
  }
  if (cat === 'fournitures' || text.includes('achat stock') || text.includes('marchandise') || text.includes('fourniture')) {
    return { code: '6011', label: SYSCOHADA_ACCOUNTS['6011'].label }
  }

  return { code: '6581', label: SYSCOHADA_ACCOUNTS['6581'].label }
}

/**
 * Convertit les écritures de caisse du Cahier en partie double conforme au SYSCOHADA.
 */
export function generateSyscohadaJournal(sales: any[]): DoubleEntryRow[] {
  const journal: DoubleEntryRow[] = []

  sales.forEach((sale, index) => {
    if (sale.status === 'crossed_out') return

    const pieceRef = `PIECE-${String(index + 1).padStart(4, '0')}`
    const dateStr = sale.date
    const timeStr = sale.time || ''
    const totalAmount = sale.total_amount ?? sale.total ?? 0
    const paidAmount = sale.paid_amount ?? sale.paid ?? 0
    const debtAmount = sale.debt_amount ?? sale.debt ?? 0
    const clientName = sale.client_name || sale.client || 'Client Anonyme'
    const notesStr = sale.notes || (sale.articles?.map((a: any) => `${a.quantity}x ${a.name}`).join(', ')) || 'Écriture de caisse'
    const type = sale.type || 'cash_in'
    const penColor = sale.pen_color || 'blue'

    if (totalAmount <= 0) return

    // 1. Vente Cash (Stylo Bleu) -> Débit 5711 Caisse / Crédit 7011 Ventes
    if (type === 'cash_in') {
      journal.push({
        id: `${sale.id}_1`,
        date: dateStr,
        time: timeStr,
        pieceRef,
        description: `Vente Cash : ${notesStr}`,
        debitAccountCode: '5711',
        debitAccountLabel: SYSCOHADA_ACCOUNTS['5711'].label,
        creditAccountCode: '7011',
        creditAccountLabel: SYSCOHADA_ACCOUNTS['7011'].label,
        amount: paidAmount || totalAmount,
        category: sale.category || 'Vente',
        penColor
      })
    }
    // 2. Dépense Cash (Stylo Rouge) -> Débit 6xx1 Charge / Crédit 5711 Caisse
    else if (type === 'cash_out') {
      const expAcc = getSyscohadaExpenseAccount(notesStr, sale.category)
      journal.push({
        id: `${sale.id}_1`,
        date: dateStr,
        time: timeStr,
        pieceRef,
        description: `Dépense Cash : ${notesStr}`,
        debitAccountCode: expAcc.code,
        debitAccountLabel: expAcc.label,
        creditAccountCode: '5711',
        creditAccountLabel: SYSCOHADA_ACCOUNTS['5711'].label,
        amount: totalAmount,
        category: sale.category || 'Dépense',
        penColor
      })
    }
    // 3. Achat Stock Cash (Stylo Vert) -> Débit 6011 Achats Marchandises / Crédit 5711 Caisse
    else if (type === 'purchase_cash' || type === 'stock_cash') {
      journal.push({
        id: `${sale.id}_1`,
        date: dateStr,
        time: timeStr,
        pieceRef,
        description: `Achat Stock Cash : ${notesStr}`,
        debitAccountCode: '6011',
        debitAccountLabel: SYSCOHADA_ACCOUNTS['6011'].label,
        creditAccountCode: '5711',
        creditAccountLabel: SYSCOHADA_ACCOUNTS['5711'].label,
        amount: totalAmount,
        category: sale.category || 'Stock',
        penColor
      })
    }
    // 4. Achat à Crédit Grossiste (Stylo Violet) -> Débit 6011 Achats / Crédit 4011 Fournisseurs
    else if (type === 'purchase_credit') {
      journal.push({
        id: `${sale.id}_1`,
        date: dateStr,
        time: timeStr,
        pieceRef,
        description: `Achat Crédit Fournisseur (${clientName}) : ${notesStr}`,
        debitAccountCode: '6011',
        debitAccountLabel: SYSCOHADA_ACCOUNTS['6011'].label,
        creditAccountCode: '4011',
        creditAccountLabel: SYSCOHADA_ACCOUNTS['4011'].label,
        amount: debtAmount || totalAmount,
        category: sale.category || 'Dette Fournisseur',
        penColor
      })
    }
    // 5. Vente à Crédit Client (Stylo Jaune) -> Débit 4111 Clients / Crédit 7011 Ventes
    else if (type === 'sale_credit') {
      journal.push({
        id: `${sale.id}_1`,
        date: dateStr,
        time: timeStr,
        pieceRef,
        description: `Vente Crédit Client (${clientName}) : ${notesStr}`,
        debitAccountCode: '4111',
        debitAccountLabel: SYSCOHADA_ACCOUNTS['4111'].label,
        creditAccountCode: '7011',
        creditAccountLabel: SYSCOHADA_ACCOUNTS['7011'].label,
        amount: debtAmount || totalAmount,
        category: sale.category || 'Crédit Client',
        penColor
      })
    }
  })

  return journal
}

/**
 * Calcule les indicateurs financiers du Système Minimal de Trésorerie SMT (Bilan & Compte de Résultat OHADA).
 */
export function calculateSyscohadaSMT(sales: any[]): SyscohadaSMTSummary {
  let chiffreAffaires701 = 0
  let prestationsServices706 = 0
  let achatsMarchandises601 = 0
  let chargesLoyer622 = 0
  let chargesEnergie605 = 0
  let chargesTransport611 = 0
  let chargesSalaires661 = 0
  let autresCharges658 = 0
  let soldeCaisse571 = 0
  let creancesClients411 = 0
  let dettesFournisseurs401 = 0

  sales.forEach((sale) => {
    if (sale.status === 'crossed_out') return

    const type = sale.type || 'cash_in'
    const total = sale.total_amount ?? sale.total ?? 0
    const paid = sale.paid_amount ?? sale.paid ?? 0
    const debt = sale.debt_amount ?? sale.debt ?? 0
    const notes = sale.notes || ''
    const category = sale.category || ''

    if (type === 'cash_in') {
      chiffreAffaires701 += total
      soldeCaisse571 += paid
    } else if (type === 'sale_credit') {
      chiffreAffaires701 += total
      soldeCaisse571 += paid
      creancesClients411 += debt
    } else if (type === 'purchase_cash' || type === 'stock_cash') {
      achatsMarchandises601 += total
      soldeCaisse571 -= total
    } else if (type === 'purchase_credit') {
      achatsMarchandises601 += total
      dettesFournisseurs401 += debt
    } else if (type === 'cash_out') {
      soldeCaisse571 -= total
      const exp = getSyscohadaExpenseAccount(notes, category)
      if (exp.code === '6221') chargesLoyer622 += total
      else if (exp.code === '6051') chargesEnergie605 += total
      else if (exp.code === '6111') chargesTransport611 += total
      else if (exp.code === '6611') chargesSalaires661 += total
      else if (exp.code === '6011') achatsMarchandises601 += total
      else autresCharges658 += total
    }
  })

  const totalProduits = chiffreAffaires701 + prestationsServices706
  const margeBrute = totalProduits - achatsMarchandises601
  const totalCharges = achatsMarchandises601 + chargesLoyer622 + chargesEnergie605 + chargesTransport611 + chargesSalaires661 + autresCharges658
  const resultatNetSMT = totalProduits - totalCharges

  return {
    chiffreAffaires701,
    prestationsServices706,
    totalProduits,
    achatsMarchandises601,
    margeBrute,
    chargesLoyer622,
    chargesEnergie605,
    chargesTransport611,
    chargesSalaires661,
    autresCharges658,
    totalCharges,
    resultatNetSMT,
    soldeCaisse571,
    creancesClients411,
    dettesFournisseurs401,
  }
}
