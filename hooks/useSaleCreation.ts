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
  OfflineSale,
} from '@/lib/offlineDb'
import { parseTextLocally } from '@/lib/sales/offlineSaleParser'

import {
  parseRequestedProductFromNotebookText,
  recordRequestedProductInStorage,
} from '@/lib/requestedProductsUtils'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'

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

    const parsed = parseTextLocally(text, activePen)

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
          })),
      total: isClientRequest ? 0 : (parsed.total_facture || 0),
      paid: isClientRequest ? 0 : (parsed.montant_paye || 0),
      debt: isClientRequest ? 0 : (parsed.montant_dette || 0),
      status: 'paid',
      type,
      pen_color: activePen,
      notes: text,
      category: isClientRequest ? 'Demande Client' : (parsed.categorie || 'Général'),
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
      if (isSupabaseClientConfigured()) {
        const parsed = parseTextLocally(text, activePen)
        const now = new Date()
        const saleRecord = {
          id: localSaleId,
          shop_id: shopId,
          created_at: now.toISOString(),
          date: getTodayDateString(),
          time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          type: activePen === 'red' ? 'cash_out' : activePen === 'green' ? 'purchase_cash' : activePen === 'purple' ? 'purchase_credit' : activePen === 'yellow' ? 'sale_credit' : 'cash_in',
          notes: text,
          total_amount: parsed?.total_facture || 0,
          paid_amount: parsed?.montant_paye || 0,
          debt_amount: parsed?.montant_dette || 0,
          client_name: parsed?.nom_client || 'Client',
          status: parsed?.montant_dette && parsed.montant_dette > 0 ? 'debt' : 'paid',
          category: parsed?.categorie || 'Général',
          pen_color: activePen,
        }

        const { error: insertErr } = await supabaseClient.from('sales').insert([saleRecord])
        if (!insertErr) {
          if (parsed?.articles && parsed.articles.length > 0) {
            const articlesRecords = parsed.articles.map((a: any) => ({
              sale_id: localSaleId,
              product_name: a.nom || a.name,
              quantity: a.quantite || a.quantity,
              unit_price: a.prix_unitaire || a.unit_price,
              subtotal: (a.quantite || 1) * (a.prix_unitaire || 0),
            }))
            await supabaseClient.from('sold_articles').insert(articlesRecords)

            // Alimenter la base d'intelligence de marché avec le vrai pays & la vraie ville de la boutique
            const shopCountry = typeof window !== 'undefined' ? (localStorage.getItem(`cahier_shop_country_${shopId}`) || 'BJ') : 'BJ'
            const shopCity = typeof window !== 'undefined' ? (localStorage.getItem(`cahier_shop_city_${shopId}`) || '') : ''

            for (const art of parsed.articles) {
              if (art.nom && (art.prix_unitaire || 0) > 0) {
                try {
                  await supabaseClient.rpc('update_market_knowledge', {
                    p_product_name: art.nom.toLowerCase(),
                    p_unit_price: saleRecord.type === 'cash_in' || saleRecord.type === 'sale_credit' ? art.prix_unitaire : 0,
                    p_unit_cost: saleRecord.type === 'purchase_cash' || saleRecord.type === 'purchase_credit' ? art.prix_unitaire : 0,
                    p_country: shopCountry,
                    p_city: shopCity || null,
                  })
                } catch {}
              }
            }
          }
          onSaleCreated()
          return
        }
      }

      const shopCountry = typeof window !== 'undefined' ? (localStorage.getItem(`cahier_shop_country_${shopId}`) || 'BJ') : 'BJ'
      const shopCity = typeof window !== 'undefined' ? (localStorage.getItem(`cahier_shop_city_${shopId}`) || '') : ''

      // Fallback via API route serveur
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-id': shopId,
          'x-shop-country': shopCountry,
          'x-shop-city': shopCity,
        },
        body: JSON.stringify({
          text,
          raw_text: text,
          penColor: activePen,
          pen_color: activePen,
          shop_id: shopId,
          country: shopCountry,
          city: shopCity,
        }),
      })


      if (response.ok) {
        onSaleCreated()
      }
    } catch {
      // Silencieux — la vente est déjà préservée dans le localStorage
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
