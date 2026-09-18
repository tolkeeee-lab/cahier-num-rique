'use client'

import React, { useMemo } from 'react'
import { Package, Box, Check, Sparkles, ArrowDownRight } from 'lucide-react'
import { audioFeedback } from '@/lib/audioFeedback'

export interface VisualCartonDecomposerProps {
  currentStock: number
  multiplier: number
  packagingName?: string
  unit?: string
  selectedPieces?: number
  onSelectPieces?: (pieces: number, label: string) => void
  readOnly?: boolean
  className?: string
}

export const VisualCartonDecomposer: React.FC<VisualCartonDecomposerProps> = ({
  currentStock,
  multiplier,
  packagingName = 'carton',
  unit = 'pcs',
  selectedPieces = 0,
  onSelectPieces,
  readOnly = false,
  className = '',
}) => {
  const mult = Math.max(2, multiplier || 1)
  const stock = Math.max(0, currentStock || 0)

  // Calcul des cartons pleins et du carton entamé
  const { fullCartons, openCartonPieces, emptySlots, isFullyPacked } = useMemo(() => {
    const full = Math.floor(stock / mult)
    const rem = stock % mult
    return {
      fullCartons: full,
      openCartonPieces: rem,
      emptySlots: rem === 0 ? 0 : mult - rem,
      isFullyPacked: rem === 0,
    }
  }, [stock, mult])

  // Normalisation du nombre de cases affichées pour la grille (max 48 pour rester lisible)
  const displaySlotsCount = Math.min(mult, 48)
  const groupingRatio = mult > 48 ? Math.ceil(mult / 48) : 1

  // Paliers interactifs prédéfinis
  const tiers = useMemo(() => {
    const list: Array<{ label: string; pieces: number; sub: string }> = []

    // 1. Détail (1 pc)
    list.push({
      label: '1 Pièce',
      pieces: 1,
      sub: 'Détail',
    })

    // 2. Quart (si mult >= 4)
    if (mult >= 4) {
      const qPieces = Math.max(1, Math.round(mult * 0.25))
      list.push({
        label: `1/4 ${packagingName}`,
        pieces: qPieces,
        sub: `${qPieces} ${unit}`,
      })
    }

    // 3. Demi (si mult >= 2)
    if (mult >= 2) {
      const hPieces = Math.max(1, Math.round(mult * 0.5))
      list.push({
        label: `1/2 ${packagingName}`,
        pieces: hPieces,
        sub: `${hPieces} ${unit}`,
      })
    }

    // 4. Carton complet
    list.push({
      label: `${packagingName} Entier`,
      pieces: mult,
      sub: `${mult} ${unit}`,
    })

    return list
  }, [mult, packagingName, unit])

  const handleSelectTier = (pieces: number, label: string) => {
    if (readOnly || !onSelectPieces) return
    audioFeedback.playTick()
    onSelectPieces(pieces, label)
  }

  return (
    <div
      className={`bg-gradient-to-b from-amber-50/70 via-[#fffdfa] to-amber-100/30 border border-amber-200/90 rounded-2xl p-3 sm:p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_2px_8px_-2px_rgba(120,53,15,0.06)] space-y-3 select-none ${className}`}
    >
      {/* En-tête : Vue d'ensemble du stock physique */}
      <div className="flex items-center justify-between gap-2 border-b border-amber-200/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-200/70 text-amber-900 border border-amber-300/80 rounded-lg shadow-2xs">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-amber-950 tracking-tight uppercase">
              Décomposition Physique du {packagingName}
            </div>
            <div className="text-[10px] font-mono text-amber-800/80">
              1 {packagingName} = <span className="font-bold text-amber-950">{mult} {unit}</span>
            </div>
          </div>
        </div>

        {/* Badge récapitulatif stock total */}
        <div className="text-right">
          <div className="font-mono text-xs font-black text-amber-950 tabular-nums">
            {stock} <span className="text-[10px] font-sans font-normal text-amber-800">{unit}</span>
          </div>
          <div className="text-[9px] font-mono text-amber-700/80">
            {fullCartons > 0 ? `${fullCartons} plein${fullCartons > 1 ? 's' : ''}` : '0 carton plein'}
            {openCartonPieces > 0 ? ` + ${openCartonPieces} en cours` : ''}
          </div>
        </div>
      </div>

      {/* Cartons intacts en réserve (s'il y en a) */}
      {fullCartons > 0 && (
        <div className="flex items-center gap-2 p-2 bg-white/80 border border-amber-200/80 rounded-xl">
          <Box className="w-3.5 h-3.5 text-amber-800 flex-shrink-0" />
          <div className="text-[11px] text-amber-900 flex-grow">
            <span className="font-bold">{fullCartons} {packagingName}{fullCartons > 1 ? 's' : ''} scellé{fullCartons > 1 ? 's' : ''}</span>
            <span className="font-mono text-[10px] text-amber-700/80 ml-1.5 tabular-nums">
              ({fullCartons * mult} {unit} intactes en réserve)
            </span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(fullCartons, 5) }).map((_, i) => (
              <span
                key={i}
                className="w-2.5 h-3 bg-amber-700 border border-amber-800 rounded-xs inline-block shadow-2xs"
                title="Carton scellé"
              />
            ))}
            {fullCartons > 5 && (
              <span className="text-[10px] font-mono font-bold text-amber-800">+{fullCartons - 5}</span>
            )}
          </div>
        </div>
      )}

      {/* Grille visuelle du carton ouvert / en cours */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-amber-950 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-amber-700" />
            {openCartonPieces > 0
              ? `Carton entamé en cours de vente (${openCartonPieces} restantes / ${mult})`
              : isFullyPacked && stock > 0
              ? `Prochain ${packagingName} à ouvrir (${mult} ${unit})`
              : `Carton vide (Rupture)`}
          </span>
          <span className="text-[10px] font-mono text-amber-800/80">
            {emptySlots > 0 ? `${emptySlots} alvéole${emptySlots > 1 ? 's' : ''} vide${emptySlots > 1 ? 's' : ''}` : 'Plein'}
          </span>
        </div>

        {/* Le caisson / La grille d'alvéoles */}
        <div className="p-2.5 bg-amber-950/5 border border-amber-300/80 rounded-xl shadow-inner">
          <div
            className="grid gap-1 sm:gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${
                displaySlotsCount <= 6
                  ? displaySlotsCount
                  : displaySlotsCount <= 12
                  ? 6
                  : displaySlotsCount <= 24
                  ? 8
                  : 12
              }, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: displaySlotsCount }).map((_, idx) => {
              // Si le carton est entamé, les premières cases vides représentent ce qui est déjà sorti
              const slotIdx = idx * groupingRatio
              const isAvailable = openCartonPieces > 0
                ? slotIdx < openCartonPieces
                : isFullyPacked && stock > 0

              // Vérifie si cette alvéole fait partie de la sélection en cours
              const isSelected = selectedPieces > 0 && isAvailable && slotIdx < selectedPieces

              return (
                <div
                  key={idx}
                  className={`relative aspect-square rounded-md flex items-center justify-center transition-all duration-150 ${
                    isSelected
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 border-2 border-amber-700 text-white shadow-xs scale-95'
                      : isAvailable
                      ? 'bg-amber-100 hover:bg-amber-200 border border-amber-300/90 text-amber-950'
                      : 'bg-amber-900/10 border border-dashed border-amber-300/40 opacity-40 text-amber-900/30'
                  }`}
                  title={
                    isSelected
                      ? `Prévu pour la vente (${groupingRatio} ${unit})`
                      : isAvailable
                      ? `Disponible dans le carton (${groupingRatio} ${unit})`
                      : `Alvéole déjà vendue / vide`
                  }
                >
                  {isSelected ? (
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  ) : isAvailable ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-800/70" />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-amber-900/20" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Légende rapide */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-amber-200/60 text-[10px] text-amber-900/80">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-800/70 inline-block" /> En rayon
              </span>
              {selectedPieces > 0 && (
                <span className="inline-flex items-center gap-1 font-bold text-amber-900">
                  <span className="w-2 h-2 rounded-xs bg-amber-500 border border-amber-700 inline-block" /> Vendu ({selectedPieces})
                </span>
              )}
              <span className="inline-flex items-center gap-1 opacity-60">
                <span className="w-2 h-2 rounded-xs border border-dashed border-amber-600 inline-block" /> Sorti
              </span>
            </div>

            {groupingRatio > 1 && (
              <span className="font-mono text-[9px] text-amber-800 italic">
                1 case = {groupingRatio} {unit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Boutons d'action / Sélection interactive des portions */}
      {!readOnly && onSelectPieces && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-700" />
            <span>Sélection tactile par fraction de carton</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {tiers.map((t) => {
              const isActive = selectedPieces === t.pieces
              const isDisabled = stock < t.pieces

              return (
                <button
                  key={t.label}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectTier(t.pieces, t.label)}
                  className={`p-2 rounded-xl text-left border transition-all duration-100 ease-out active:scale-[0.97] cursor-pointer ${
                    isActive
                      ? 'bg-amber-900 text-white border-amber-950 shadow-xs'
                      : isDisabled
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                      : 'bg-white hover:bg-amber-100/70 text-amber-950 border-amber-300/80 shadow-2xs hover:border-amber-400'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{t.label}</div>
                  <div
                    className={`font-mono text-[10px] tabular-nums ${
                      isActive ? 'text-amber-200' : 'text-amber-800/80'
                    }`}
                  >
                    {t.sub}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
