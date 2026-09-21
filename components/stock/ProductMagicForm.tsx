'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, Check, ArrowRight, HelpCircle, Tag } from 'lucide-react'
import { parseSmartProductText, ParsedProductResult } from '@/lib/stock/smartProductParser'
import { formatPrice } from '@/lib/penUtils'
import { StockFormState } from './types'

interface ProductMagicFormProps {
  formData: StockFormState
  setFormData: React.Dispatch<React.SetStateAction<StockFormState>>
  onSwitchToAdvanced?: () => void
}

const EXAMPLE_PHRASES = [
  'Savon BF 10 cartons de 24 achat 8000 vente piece 500 carton 10000 demi 5200 quart 2650',
  'Coca Cola 33cl 10 packs de 6 achat 2500 vente piece 600 pack 3200 a partir de 3 a 550',
  'Mayonnaise Calvé 5 cartons de 12 achat 12000 vente 1200 demi 6500 carton 13000',
  'Riz Papillon 25 sacs achat 18500 vente 21000 seuil 5',
  'Huile Dinor 5L 20 bidons achat 6000 vente 7500',
  'Sucre Saint Louis 30 paquets à 900',
  'Lait Nido 400g 15 boîtes pa 2500 pv 3200 alerte 3',
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
        packages_count: parsed.packages_count,
        package_cost: parsed.package_cost,
        wholesale_price: parsed.wholesale_price,
        half_package_price: parsed.half_package_price,
        quarter_package_price: parsed.quarter_package_price,
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

            {/* Quantité & Contenance */}
            <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="block text-[10px] text-blue-800 font-bold uppercase">Stock Déduit en Rayon</span>
              <span className="font-black text-blue-950 text-sm tabular-nums">
                {parsed.packages_count && parsed.packages_count > 0 && parsed.multiplier > 1 ? (
                  <span>{parsed.packages_count} ctn × {parsed.multiplier} = <span className="text-blue-700">{parsed.initial_stock} pcs</span></span>
                ) : (
                  <span>{parsed.initial_stock} {parsed.unit}</span>
                )}
              </span>
            </div>

            {/* Prix d'Achat Carton / Unitaire */}
            <div className="p-2 bg-rose-50/70 border border-rose-200 rounded-xl">
              <span className="block text-[10px] text-rose-800 font-bold uppercase">Prix d'Achat (PA)</span>
              <span className="font-black text-rose-950 text-sm tabular-nums">
                {parsed.package_cost && parsed.package_cost > 0 && parsed.multiplier > 1 ? (
                  <span>{formatPrice(parsed.package_cost)} / ctn <span className="text-[10px] font-bold text-rose-700">({formatPrice(Math.round(parsed.unit_cost))}/pc)</span></span>
                ) : (
                  <span>{parsed.unit_cost > 0 ? formatPrice(parsed.unit_cost) : '0 FCFA'}</span>
                )}
              </span>
            </div>

            {/* Prix de Vente Détail (1 pc) */}
            <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="block text-[10px] text-emerald-800 font-bold uppercase">Prix Détail (1 pc)</span>
              <span className="font-black text-emerald-950 text-sm tabular-nums">
                {parsed.unit_price > 0 ? formatPrice(parsed.unit_price) : '0 FCFA'}
              </span>
            </div>
          </div>

          {/* Grille des paliers détectés (Détail, Quart, Demi, Carton complet) */}
          {(Boolean(parsed.quarter_package_price) || Boolean(parsed.half_package_price) || Boolean(parsed.wholesale_price) || (parsed.lot_quantity > 0 && parsed.lot_price > 0)) && (
            <div className="p-2.5 bg-amber-50/80 border border-amber-300/80 rounded-xl space-y-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">
                <Tag className="w-3 h-3 text-amber-700" strokeWidth={1.75} />
                <span>Grille de Vente Multi-Paliers Automatique :</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
                {/* 1 Pièce */}
                <div className="p-1.5 bg-white border border-amber-200 rounded-lg">
                  <span className="block text-[9px] text-gray-500 uppercase">1 Pièce (Détail)</span>
                  <span className="font-black text-gray-900">{formatPrice(parsed.unit_price)}</span>
                </div>
                {/* 1/4 Carton */}
                {parsed.quarter_package_price ? (
                  <div className="p-1.5 bg-white border border-teal-200 rounded-lg">
                    <span className="block text-[9px] text-teal-700 uppercase font-bold">1/4 Carton</span>
                    <span className="font-black text-teal-950">{formatPrice(parsed.quarter_package_price)}</span>
                  </div>
                ) : null}
                {/* 1/2 Carton */}
                {parsed.half_package_price ? (
                  <div className="p-1.5 bg-white border border-indigo-200 rounded-lg">
                    <span className="block text-[9px] text-indigo-700 uppercase font-bold">1/2 Carton</span>
                    <span className="font-black text-indigo-950">{formatPrice(parsed.half_package_price)}</span>
                  </div>
                ) : null}
                {/* Carton Complet */}
                {parsed.wholesale_price ? (
                  <div className="p-1.5 bg-white border border-purple-200 rounded-lg">
                    <span className="block text-[9px] text-purple-700 uppercase font-bold">Carton Entier</span>
                    <span className="font-black text-purple-950">{formatPrice(parsed.wholesale_price)}</span>
                  </div>
                ) : null}
                {/* Lot dégressif */}
                {parsed.lot_quantity > 0 && parsed.lot_price > 0 && (
                  <div className="p-1.5 bg-white border border-emerald-200 rounded-lg col-span-2">
                    <span className="block text-[9px] text-emerald-700 uppercase font-bold">Seuil dégressif</span>
                    <span className="font-black text-emerald-950">{formatPrice(parsed.lot_price)} les {parsed.lot_quantity} pcs ({formatPrice(Math.round(parsed.lot_price / parsed.lot_quantity))}/pc)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Marge estimée */}
          {marginInfo && (
            <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-950">Marge brute au détail :</span>
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
