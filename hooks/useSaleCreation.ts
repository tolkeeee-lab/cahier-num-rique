'use client'

/**
 * useSaleCreation.ts
 * 
 * Responsabilité unique : gérer tout le cycle de vie de la création d'une vente.
 * 
 * - Sauvegarde locale immédiate (garantie d'affichage instantané)
 * - Sync API en arrière-plan (silencieux)
 * - Détection auto-apprentissage (nouveau produit inconnu du catalogue)
 * - Pas de logique UI — expose uniquement des données et des handlers
 */

import { useState, FormEvent, Dispatch, SetStateAction } from 'react'
import { getTodayDateString } from '@/lib/dateUtils'
import {
  generateOfflineId,
  saveOfflineSale,
  getOfflineProducts,
  OfflineSale,
} from '@/lib/offlineDb'
import { parseTextLocally } from '@/lib/sales/offlineSaleParser'

import {
  parseRequestedProductFromNotebookText,
  recordRequestedProductInStorage,
} from '@/lib/requestedProductsUtils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseSaleCreationOptions {
  shopId: string
  selectedPen: string
  onSaleCreated: () => void          // Appelé après chaque vente pour rafraîchir l'affichage
  onAfterSale?: (total: number) => void  // Optionnel : pour le calculateur de monnaie
  onError?: (msg: string) => void
}

export interface UseSaleCreationReturn {
  input: string
  setInput: Dispatch<SetStateAction<string>>
  isSubmitting: boolean
  postItWarning: string | null
  setPostItWarning: Dispatch<SetStateAction<string | null>>
  handleCreateSale: (e: FormEvent) => void
  submitText: (text: string, penColor?: string) => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSaleCreation({
  shopId,
  selectedPen,
  onSaleCreated,
  onAfterSale,
  onError,
}: UseSaleCreationOptions): UseSaleCreationReturn {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [postItWarning, setPostItWarning] = useState<string | null>(null)

  // ── Construit et sauvegarde localement une vente à partir du texte libre ──
  const buildLocalSale = (text: string, penOverride?: string): OfflineSale => {
    const activePen = penOverride || selectedPen
    const now = new Date()

    // Détection automatique d'une demande client saisie au cahier
    const reqMatch = parseRequestedProductFromNotebookText(text.trim())
    let isClientRequest = false

    if (reqMatch && reqMatch.isRequestedProduct) {
      recordRequestedProductInStorage(shopId, reqMatch.cleanName, reqMatch.price)
      isClientRequest = true
      setPostItWarning(`✓ Demande client enregistrée pour « ${reqMatch.cleanName} » !`)
    }

    const offlineCatalog = getOfflineProducts(shopId) || []
    const parsed = parseTextLocally(text, activePen, offlineCatalog)

    let type: OfflineSale['type'] = 'cash_in'
    if (isClientRequest) {
      type = 'client_request'
    } else if (activePen === 'red') {
      type = 'cash_out'
    } else if (activePen === 'green') {
      type = 'purchase_cash'
    } else if (activePen === 'purple') {
      type = 'purchase_credit'
    } else if (activePen === 'yellow') {
      type = 'sale_credit'
    }

    const sale: OfflineSale = {
      id: generateOfflineId(),
      shop_id: shopId,
      date: getTodayDateString(),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      client: isClientRequest ? 'Demande Client' : (parsed.nom_client || 'Client'),
      articles: isClientRequest
        ? [{ name: reqMatch?.cleanName || 'Produit demandé', quantity: 1, unit_price: reqMatch?.price || 0 }]
        : (parsed.articles || []).map(a => ({
            name: a.nom,
            quantity: a.quantite,
            unit_price: a.prix_unitaire,
            category: a.categorie,
            packaging_type: a.packaging_type,
            packaging_label: a.packaging_label,
            pieces_count: a.pieces_count,
            canonical_name: a.canonical_name,
          })),
      total: isClientRequest ? 0 : (parsed.total_facture || 0),
      paid: isClientRequest ? 0 : (parsed.montant_paye || 0),
      debt: isClientRequest ? 0 : (parsed.montant_dette || 0),
      status: (!isClientRequest && (parsed.montant_dette || 0) > 0 && (type === 'sale_credit' || type === 'purchase_credit')) ? 'debt' : 'paid',
      type,
      pen_color: activePen,
      notes: text,
      category: isClientRequest ? 'Demande Client' : (parsed.categorie || 'Général'),
      created_at: now.toISOString(),
      is_synced: false,
    }

    saveOfflineSale(shopId, sale)

    // Notifier le sous-système de synchronisation (useOfflineSync) qu'une nouvelle vente locale est prête
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cahier_local_sale_created', { detail: { saleId: sale.id } }))
    }

    // Vérification du stock après vente (Stylo Bleu ou Jaune)
    if (activePen === 'blue' || activePen === 'yellow') {
      const offlineStock = getOfflineProducts(shopId) || []
      const warnings: string[] = []
      
      for (const art of sale.articles || []) {
        const lookup = (art.canonical_name || art.name || '').toLowerCase().trim()
        const stockItem = offlineStock.find((p: any) => {
          const pName = (p.name || '').toLowerCase().trim()
          return pName === lookup || lookup.includes(pName)
        })
        if (stockItem) {
          const currentStock = stockItem.current_stock ?? stockItem.initial_stock ?? 0
          const neededPieces = art.pieces_count || art.quantity || 1
          if (currentStock <= 0) {
            warnings.push(`⚠️ Le produit "${stockItem.name}" est déjà en rupture de stock (0).`)
          } else if (currentStock - neededPieces <= 0) {
            warnings.push(`⚠️ Attention : Le stock de "${stockItem.name}" est maintenant épuisé.`)
          }
        }
      }
      
      if (warnings.length > 0) {
        setPostItWarning(warnings.join('\n'))
      }
    }

    return sale
  }

  // ── submitText : pour le pipeline et les modales d'interception ──
  const submitText = async (text: string, penOverride?: string): Promise<void> => {
    if (!text.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const localSale = buildLocalSale(text, penOverride)
      onSaleCreated()
      if (onAfterSale && localSale.total > 0) onAfterSale(localSale.total)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Handler principal de création de vente ──
  const handleCreateSale = async (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isSubmitting) return

    setIsSubmitting(true)
    try {
      // 1. Sauvegarder localement IMMÉDIATEMENT — affichage instantané (0 ms)
      const localSale = buildLocalSale(text)

      // 2. Vider le champ et rafraîchir l'affichage sans attendre le réseau
      setInput('')
      onSaleCreated()

      // 3. Notifier le calculateur de monnaie si besoin
      if (onAfterSale && localSale.total > 0) {
        onAfterSale(localSale.total)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    input,
    setInput,
    isSubmitting,
    postItWarning,
    setPostItWarning,
    handleCreateSale,
    submitText,
  }
}
