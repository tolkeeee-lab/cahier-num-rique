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
import { usePowerSync } from '@powersync/react'

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

  // ── Tente une sync API en arrière-plan (non bloquant) ──
  const syncWithApi = async (text: string, localSaleId: string, penOverride?: string) => {
    const db = usePowerSync();
    const activePen = penOverride || selectedPen
    try {
      const reqMatch = parseRequestedProductFromNotebookText(text.trim())
      const isClientRequest = !['blue', 'yellow'].includes(activePen) && !!(reqMatch && reqMatch.isRequestedProduct)

      let syncType = 'cash_in'
      if (isClientRequest) {
        syncType = 'client_request'
      } else if (activePen === 'red') {
        syncType = 'cash_out'
      } else if (activePen === 'green') {
        syncType = 'purchase_cash'
      } else if (activePen === 'purple') {
        syncType = 'purchase_credit'
      } else if (activePen === 'yellow') {
        syncType = 'sale_credit'
      }

      const parsed = parseTextLocally(text, activePen)
      const now = new Date()

      // 1. Insert into local PowerSync SQLite (Background sync handles Supabase)
      await db.execute(
        'INSERT INTO sales (id, shop_id, date, time, type, status, category, notes, pen_color, total_amount, paid_amount, debt_amount, client_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          localSaleId,
          shopId,
          getTodayDateString(),
          now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          syncType,
          (!isClientRequest && parsed?.montant_dette && parsed.montant_dette > 0) ? 'debt' : 'paid',
          isClientRequest ? 'Demande Client' : (parsed?.categorie || 'Général'),
          text,
          activePen,
          isClientRequest ? 0 : (parsed?.total_facture || 0),
          isClientRequest ? 0 : (parsed?.montant_paye || 0),
          isClientRequest ? 0 : (parsed?.montant_dette || 0),
          isClientRequest ? 'Demande Client' : (parsed?.nom_client || 'Client'),
          now.toISOString()
        ]
      );

      const articlesToSync = isClientRequest
        ? [{ nom: reqMatch?.cleanName || 'Produit demandé', quantite: 1, prix_unitaire: reqMatch?.price || 0 }]
        : (parsed?.articles || [])

      if (articlesToSync.length > 0) {
        for (const a of articlesToSync) {
          const qty = Number(a.quantite || (a as any).quantity || 1)
          const price = Number(a.prix_unitaire || (a as any).unit_price || 0)
          await db.execute(
            'INSERT INTO sold_articles (sale_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?)',
            [localSaleId, a.nom || (a as any).name || 'Article', qty, price]
          );
        }
      }

      // We no longer manually track is_synced or call markAsSynced, as PowerSync handles it.
      onSaleCreated()
    } catch (e) {
      console.error('PowerSync write error:', e)
      if (onError) onError('⚠️ Erreur écriture locale.')
    }
  }
  // ── Fonction utilitaire pour propager l'événement global de mise à jour de vente ──
  const triggerSaleEvents = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cahier_sale_created'))
      window.dispatchEvent(new CustomEvent('cahier_sales_updated'))
    }
    onSaleCreated()
  }

  // ── submitText : pour le pipeline et les modales d'interception ──
  const submitText = async (text: string, penOverride?: string): Promise<void> => {
    if (!text.trim() || isSubmitting) return
    setIsSubmitting(true)
    const localSale = buildLocalSale(text, penOverride)
    triggerSaleEvents()
    if (onAfterSale && localSale.total > 0) onAfterSale(localSale.total)
    syncWithApi(text, localSale.id, penOverride).finally(() => setIsSubmitting(false))
  }

  // ── Handler principal de création de vente ──
  const handleCreateSale = async (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isSubmitting) return

    setIsSubmitting(true)

    // 1. Sauvegarder localement IMMÉDIATEMENT — affichage garanti
    const localSale = buildLocalSale(text)

    // 2. Vider le champ et rafraîchir l'affichage sans attendre l'API
    setInput('')
    triggerSaleEvents()

    // 3. Notifier le calculateur de monnaie si besoin
    if (onAfterSale && localSale.total > 0) {
      onAfterSale(localSale.total)
    }

    // 4. Sync API en arrière-plan (ne bloque pas l'UI)
    syncWithApi(text, localSale.id).finally(() => {
      setIsSubmitting(false)
    })
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
