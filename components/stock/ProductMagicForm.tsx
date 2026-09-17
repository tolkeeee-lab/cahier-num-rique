'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, Check, Truck, Layers, Store, ArrowRight, HelpCircle } from 'lucide-react'
import { parseSmartProductText, ParsedProductResult } from '@/lib/stock/smartProductParser'
import { formatPrice } from '@/lib/penUtils'
import { StockFormState } from './types'

interface ProductMagicFormProps {
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
  onSwitchToAdvanced?: () => void
}

const EXAMPLE_PHRASES = [
  'Savon BF 50 cartons achat 8000 vente 10000',
  'Coca Cola 33cl 10 packs de 6 achat 2500 vente 3200',
  'Sucre Saint Louis 30 paquets à 900',
  'Riz Papillon 25 sacs achat 18500 vente 21000 seuil 5',
  'Huile Dinor 5L 20 bidons achat 6000 vente 7500',
  'Lait Nido 400g 15 boîtes pa 2500 pv 3200 alerte 3',
  'Mayonnaise Calvé 40 pots à 1200',
]

export const ProductMagicForm: React.FC<ProductMagicFormProps> = ({
  formData: _formData,
  setFormData,
  onSwitchToAdvanced,
}) => {
  const [magicText, setMagicText] = useState('')

  const parsed: ParsedProductResult = React.useMemo(() => {
    return parseSmartProductText(magicText)
  }, [magicText])

  // Synchroniser automatiquement avec formData dès que la saisie change
  useEffect(() => {
    if (parsed.name) {
      setFormData(prev => ({
        ...prev,
        name: parsed.name,
        initial_stock: parsed.initial_stock,
        unit_cost: parsed.unit_cost,
        unit_price: parsed.unit_price,
        alert_threshold: parsed.alert_threshold,
        category: parsed.category,
        unit: parsed.unit,
        multiplier: parsed.multiplier,
        packaging_name: parsed.packaging_name,
        lot_quantity: parsed.lot_quantity,
        lot_price: parsed.lot_price,
        trade_type: parsed.trade_type,
      }))
    }
  }, [parsed, setFormData])

  const marginInfo = React.useMemo(() => {
    if (parsed.unit_price > 0 && parsed.unit_cost > 0 && parsed.unit_price > parsed.unit_cost) {
      const margin = parsed.unit_price - parsed.unit_cost
      const percent = Math.round((margin / parsed.unit_cost) * 100)
      return { margin, percent }
    }
    return null
  }, [parsed.unit_price, parsed.unit_cost])

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Bannière explicative */}
      <div className="p-3 bg-gradient-to-r from-amber-100/90 to-yellow-50/90 rounded-2xl border border-amber-300 shadow-2xs space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-amber-950">
          <Sparkles className="w-4 h-4 text-amber-800" />
          <span className="font-handwritten text-sm">Tapez votre produit naturellement</span>
        </div>
        <p className="text-[11px] text-amber-900/90 leading-relaxed font-sans">
          Le logiciel extrait tout automatiquement : le nom, la quantité, les prix d'achat et de vente, le conditionnement (carton, sac, pack, unité) et la catégorie.
        </p>
      </div>

      {/* Champ de saisie unique */}
      <div className="space-y-1.5">
        <label className="block text-amber-950 font-black uppercase text-[11px]">
          Votre phrase magique :
        </label>
        <textarea
          rows={3}
          value={magicText}
          onChange={(e) => setMagicText(e.target.value)}
          placeholder="Ex: Savon BF 50 cartons achat 8000 vente 10000 (ou Sucre 30 paquets à 900)..."
          className="w-full p-3 bg-white border-2 border-amber-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 font-mono font-bold focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-400/40 shadow-inner resize-none"
          autoFocus
        />
      </div>

      {/* Exemples cliquables pour inspirer le commerçant */}
      {!magicText && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            <span>Exemples prêts à l'emploi (cliquez pour tester) :</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_PHRASES.slice(0, 4).map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMagicText(ex)}
                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-mono transition-all active:scale-[0.97] cursor-pointer"
              >
                « {ex} »
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rendu des éléments détectés en temps réel */}
      {magicText.trim().length >= 2 && (
        <div className="p-3 bg-white rounded-2xl border border-amber-300 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between border-b border-amber-100 pb-1.5 text-[11px]">
            <span className="font-extrabold text-amber-950 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
              <span>Informations comprises par le logiciel :</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Nom */}
            <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-xl">
              <span className="block text-[10px] text-amber-800 font-bold uppercase">Nom du Produit</span>
              <span className="font-black text-amber-950 text-sm">{parsed.name || 'En attente...'}</span>
            </div>

            {/* Quantité & Unité */}
            <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="block text-[10px] text-blue-800 font-bold uppercase">Stock Initial</span>
              <span className="font-black text-blue-950 text-sm tabular-nums">
                {parsed.initial_stock} {parsed.unit}
                {parsed.multiplier > 1 ? ` (x${parsed.multiplier})` : ''}
              </span>
            </div>

            {/* Mode commercial */}
            <div className="p-2 bg-purple-50/70 border border-purple-200 rounded-xl">
              <span className="block text-[10px] text-purple-800 font-bold uppercase">Mode de Vente</span>
              <span className="font-bold text-purple-950 flex items-center gap-1 text-[11px] mt-0.5">
                {parsed.trade_type === 'wholesale' ? (
                  <>
                    <Truck className="w-3 h-3 text-purple-700" />
                    <span>Grossiste (Carton / Sac)</span>
                  </>
                ) : parsed.trade_type === 'semi_wholesale' ? (
                  <>
                    <Layers className="w-3 h-3 text-emerald-700" />
                    <span>Demi-Gros (Pack de {parsed.lot_quantity || 6})</span>
                  </>
                ) : (
                  <>
                    <Store className="w-3 h-3 text-stone-700" />
                    <span>Détail (À l'unité)</span>
                  </>
                )}
              </span>
            </div>

            {/* Catégorie */}
            <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-xl">
              <span className="block text-[10px] text-amber-800 font-bold uppercase">Catégorie</span>
              <span className="font-bold text-amber-950 text-xs">📁 {parsed.category}</span>
            </div>

            {/* Prix d'Achat */}
            <div className="p-2 bg-rose-50/70 border border-rose-200 rounded-xl">
              <span className="block text-[10px] text-rose-800 font-bold uppercase">Prix d'Achat (PA)</span>
              <span className="font-black text-rose-950 text-sm tabular-nums">
                {parsed.unit_cost > 0 ? formatPrice(parsed.unit_cost) : '0 FCFA'}
              </span>
            </div>

            {/* Prix de Vente */}
            <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="block text-[10px] text-emerald-800 font-bold uppercase">Prix de Vente (PV)</span>
              <span className="font-black text-emerald-950 text-sm tabular-nums">
                {parsed.unit_price > 0 ? formatPrice(parsed.unit_price) : '0 FCFA'}
              </span>
            </div>
          </div>

          {/* Marge estimée */}
          {marginInfo && (
            <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-950">Marge bénéficiaire unitaire estimée :</span>
              <span className="font-black text-emerald-800 font-mono tabular-nums">
                +{formatPrice(marginInfo.margin)} (+{marginInfo.percent}%)
              </span>
            </div>
          )}

          {/* Bouton pour basculer en mode avancé */}
          {onSwitchToAdvanced && (
            <div className="pt-1 text-right">
              <button
                type="button"
                onClick={onSwitchToAdvanced}
                className="text-amber-900 hover:text-amber-950 font-bold text-[11px] underline flex items-center gap-1 ml-auto cursor-pointer"
              >
                <span>Ajouter un code-barres ou régler le seuil en mode avancé</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
