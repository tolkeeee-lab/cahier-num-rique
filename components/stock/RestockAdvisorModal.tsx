'use client'

import React, { useState, useMemo } from 'react'
import { X, ShoppingBag, Share2, Copy, Check, Sparkles } from 'lucide-react'

interface Product {
  id: string
  name: string
  current_stock?: number
  initial_stock?: number
  alert_threshold?: number
  multiplier?: number
  packaging_name?: string
  unit_cost?: number
}

interface Sale {
  status: string
  date: string
  articles?: Array<{ name: string; quantity: number }>
}

interface RestockAdvisorModalProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  sales: Sale[]
  shopName?: string
}

export const RestockAdvisorModal: React.FC<RestockAdvisorModalProps> = ({
  isOpen,
  onClose,
  products,
  sales,
  shopName = 'Ma Boutique',
}) => {
  const [copied, setCopied] = useState(false)

  // Calcul intelligent des besoins de réapprovisionnement
  const suggestions = useMemo(() => {
    // Calculer les quantités vendues par produit sur les 7 derniers jours
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoffStr = sevenDaysAgo.toISOString().slice(0, 10)

    const salesVelocity: Record<string, number> = {}
    sales
      .filter(s => s.status !== 'crossed_out' && s.date >= cutoffStr)
      .forEach(s => {
        (s.articles || []).forEach(art => {
          const key = (art.name || '').toLowerCase().trim()
          salesVelocity[key] = (salesVelocity[key] || 0) + (art.quantity || 1)
        })
      })

    const results: Array<{
      product: Product
      currentStock: number
      dailyRunRate: number
      suggestedUnits: number
      suggestedPackages: number
      packageName: string
    }> = []

    products.forEach(p => {
      const currentStock = p.current_stock ?? p.initial_stock ?? 0
      const key = p.name.toLowerCase().trim()
      const totalSold7d = salesVelocity[key] || 0
      const dailyRunRate = totalSold7d > 0 ? totalSold7d / 7 : 0
      const threshold = p.alert_threshold || 5
      const mult = p.multiplier && p.multiplier > 1 ? p.multiplier : 1
      const packName = p.packaging_name || (mult > 1 ? 'carton' : 'unité')

      // S'il est sous le seuil ou s'il reste moins de 3 jours de stock
      const daysOfStockLeft = dailyRunRate > 0 ? currentStock / dailyRunRate : 999
      if (currentStock <= threshold || daysOfStockLeft <= 3) {
        // Quantité suggérée pour 7 jours de réserve
        const neededUnits = Math.max(mult, Math.ceil(dailyRunRate * 7) - currentStock)
        const suggestedPackages = Math.max(1, Math.ceil(neededUnits / mult))
        results.push({
          product: p,
          currentStock,
          dailyRunRate: Math.round(dailyRunRate * 10) / 10,
          suggestedUnits: suggestedPackages * mult,
          suggestedPackages,
          packageName: packName,
        })
      }
    })

    return results
  }, [products, sales])

  if (!isOpen) return null

  const todayStr = new Date().toLocaleDateString('fr-FR')
  const orderListText = suggestions.length > 0
    ? suggestions.map(s => `• ${s.suggestedPackages} ${s.packageName}(s) de ${s.product.name} (soit ~${s.suggestedUnits} pièces)`).join('\n')
    : '• Aucun réapprovisionnement urgent requis. Stock en bon état !'

  const messageWhatsApp = `📦 *BON DE COMMANDE FOURNISSEUR* — ${shopName}
📅 *Date :* ${todayStr}

Bonjour, merci de nous préparer la commande suivante :
${orderListText}

Merci de nous confirmer la disponibilité et le montant total !`

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(messageWhatsApp)}`, '_blank')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageWhatsApp)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#fdfaf2] border-2 border-amber-300 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-200 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-200 text-amber-950 font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 font-handwritten">
                Assistant Réapprovisionnement Grossiste
              </h3>
              <p className="text-[11px] font-mono text-gray-600">Calcul basé sur vos ventes réelles des 7 derniers jours</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Liste des Recommandations */}
        <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs pr-1">
          {suggestions.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-2xl border border-amber-200 space-y-2">
              <Sparkles className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-extrabold text-sm text-gray-900">Vos stocks sont au vert !</p>
              <p className="text-gray-500 text-xs">Aucun article ne risque de rupture pour les 7 prochains jours.</p>
            </div>
          ) : (
            suggestions.map((item, idx) => (
              <div key={idx} className="p-3 bg-white border border-amber-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="font-extrabold text-sm text-gray-900">{item.product.name}</div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-2 pt-0.5">
                    <span className="text-rose-700 font-bold">Stock actuel : {item.currentStock}</span>
                    <span>•</span>
                    <span>Vente : ~{item.dailyRunRate}/jour</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 font-black text-xs">
                    + {item.suggestedPackages} {item.packageName}(s)
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Aperçu Message WhatsApp & Actions */}
        <div className="pt-2 border-t border-amber-200 flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4 text-amber-800" />}
            <span>{copied ? 'Copié !' : 'Copier Bon'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md font-mono"
          >
            <Share2 className="w-4 h-4" />
            <span>Commander (WhatsApp)</span>
          </button>
        </div>

      </div>
    </div>
  )
}
