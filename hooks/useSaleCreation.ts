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
  saveOfflineProduct,
  OfflineSale,
} from '@/lib/offlineDb'
import { parseTextLocally } from '@/lib/sales/offlineSaleParser'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseSaleCreationOptions {
  shopId: string
  selectedPen: string
  onSaleCreated: () => void          // Appelé après chaque vente pour rafraîchir l'affichage
  onAfterSale?: (total: number) => void  // Optionnel : pour le calculateur de monnaie
}

export interface UseSaleCreationReturn {
  input: string
  setInput: Dispatch<SetStateAction<string>>
  isSubmitting: boolean
  postItWarning: string | null
  setPostItWarning: Dispatch<SetStateAction<string | null>>
  handleCreateSale: (e: FormEvent) => void
  submitText: (text: string, penColor?: string) => Promise<void>
  autoLearnData: { name: string; price: number } | null
  showAutoLearnModal: boolean
  setShowAutoLearnModal: Dispatch<SetStateAction<boolean>>
  handleConfirmAutoLearn: (name: string, price: number) => Promise<void>
  handleDismissAutoLearn: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSaleCreation({
  shopId,
  selectedPen,
  onSaleCreated,
  onAfterSale,
}: UseSaleCreationOptions): UseSaleCreationReturn {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [postItWarning, setPostItWarning] = useState<string | null>(null)
  const [autoLearnData, setAutoLearnData] = useState<{ name: string; price: number } | null>(null)
  const [showAutoLearnModal, setShowAutoLearnModal] = useState(false)

  // ── Construit et sauvegarde localement une vente à partir du texte libre ──
  const buildLocalSale = (text: string, penOverride?: string): OfflineSale => {
    const activePen = penOverride || selectedPen
    const parsed = parseTextLocally(text, activePen)
    const now = new Date()

    let type = 'cash_in'
    if (activePen === 'red') type = 'cash_out'
    else if (activePen === 'green') type = 'purchase_cash'
    else if (activePen === 'purple') type = 'purchase_credit'
    else if (activePen === 'yellow') type = 'sale_credit'

    const sale: OfflineSale = {
      id: generateOfflineId(),
      shop_id: shopId,
      date: getTodayDateString(),
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      client: parsed.nom_client || 'Client',
      articles: (parsed.articles || []).map(a => ({
        name: a.nom,
        quantity: a.quantite,
        unit_price: a.prix_unitaire,
      })),
      total: parsed.total_facture || 0,
      paid: parsed.montant_paye || 0,
      debt: parsed.montant_dette || 0,
      status: (parsed.montant_dette || 0) > 0 ? 'debt' : 'paid',
      type,
      pen_color: activePen,
      notes: text,
      category: parsed.categorie || 'Général',
      created_at: now.toISOString(),
      is_synced: false,
    }

    saveOfflineSale(shopId, sale)
    return sale
  }

  // ── Tente une sync API en arrière-plan (non bloquant) ──
  const syncWithApi = async (text: string, localSaleId: string, penOverride?: string) => {
    const activePen = penOverride || selectedPen
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shopId,
        },
        body: JSON.stringify({
          text,
          raw_text: text,
          penColor: activePen,
          pen_color: activePen,
          shop_id: shopId,
        }),
      })

      if (response.ok) {
        const resJson = await response.json().catch(() => ({}))
        // Si l'API renvoie une vente avec un nouvel ID serveur, on la sauvegarde en plus
        if (resJson.sale?.id && resJson.sale.id !== localSaleId) {
          saveOfflineSale(shopId, {
            id: resJson.sale.id,
            shop_id: shopId,
            date: resJson.sale.date,
            time: resJson.sale.time,
            client: resJson.sale.client_name || 'Client',
            articles: resJson.sale.articles || [],
            total: resJson.sale.total_amount || 0,
            paid: resJson.sale.paid_amount || 0,
            debt: resJson.sale.debt_amount || 0,
            status: resJson.sale.status || 'paid',
            type: resJson.sale.type || 'cash_in',
            pen_color: resJson.sale.pen_color || selectedPen,
            notes: resJson.sale.notes || text,
            category: resJson.sale.category || 'Général',
            created_at: resJson.sale.created_at || new Date().toISOString(),
            is_synced: true,
          })
          onSaleCreated()
        }
      }
    } catch {
      // Silencieux — la vente est déjà dans le localStorage
    }
  }

  // ── Détecter si un produit est nouveau pour proposer l'auto-apprentissage ──
  const checkAutoLearn = (text: string) => {
    // On ne détecte que pour les ventes cash (stylo bleu)
    if (selectedPen !== 'blue') return

    const match = text.match(/^(\d+)?\s*([A-Za-zÀ-ÿ0-9\s'-]+?)\s*(?:à|a|@)\s*(\d+)/i)
    if (!match) return

    const prodName = match[2].trim()
    const prodPrice = parseInt(match[3], 10)

    if (prodName.length < 3) return

    const existing = getOfflineProducts(shopId)?.find(
      p => p.name.toLowerCase().trim() === prodName.toLowerCase()
    )

    if (!existing) {
      setAutoLearnData({ name: prodName, price: prodPrice })
      setShowAutoLearnModal(true)
    }
  }

  // ── submitText : pour le pipeline et les modales d'interception ──
  const submitText = async (text: string, penOverride?: string): Promise<void> => {
    if (!text.trim() || isSubmitting) return
    setIsSubmitting(true)
    const localSale = buildLocalSale(text, penOverride)
    onSaleCreated()
    if (onAfterSale && localSale.total > 0) onAfterSale(localSale.total)
    syncWithApi(text, localSale.id, penOverride).finally(() => setIsSubmitting(false))
    checkAutoLearn(text)
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
    onSaleCreated()

    // 3. Notifier le calculateur de monnaie si besoin
    if (onAfterSale && localSale.total > 0) {
      onAfterSale(localSale.total)
    }

    // 4. Sync API en arrière-plan (ne bloque pas l'UI)
    syncWithApi(text, localSale.id).finally(() => {
      setIsSubmitting(false)
    })

    // 5. Proposer d'apprendre le produit (ne bloque pas)
    checkAutoLearn(text)
  }

  // ── Confirmer l'enregistrement d'un nouveau produit au catalogue ──
  const handleConfirmAutoLearn = async (name: string, price: number): Promise<void> => {
    saveOfflineProduct(shopId, {
      id: generateOfflineId(),
      shop_id: shopId,
      name,
      category: 'Général',
      unit: 'pièce',
      alert_threshold: 5,
      initial_stock: 0,
      unit_cost: 0,
      unit_price: price,
      created_at: new Date().toISOString(),
    })
    setShowAutoLearnModal(false)
    setAutoLearnData(null)
  }

  const handleDismissAutoLearn = () => {
    setShowAutoLearnModal(false)
    setAutoLearnData(null)
  }

  return {
    input,
    setInput,
    isSubmitting,
    postItWarning,
    setPostItWarning,
    handleCreateSale,
    submitText,
    autoLearnData,
    showAutoLearnModal,
    setShowAutoLearnModal,
    handleConfirmAutoLearn,
    handleDismissAutoLearn,
  }
}
