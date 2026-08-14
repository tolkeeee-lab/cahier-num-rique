'use client'

/**
 * useChangeCalculator.ts
 *
 * Responsabilité unique : calculateur de monnaie post-vente.
 *
 * - S'affiche automatiquement après une vente (triggerAfterSale)
 * - Calcule la monnaie à rendre : montant reçu - total vente
 * - Se ferme via dismiss()
 */

import { useState, useCallback } from 'react'

export interface UseChangeCalculatorReturn {
  show: boolean
  changeTotal: string
  setChangeTotal: (v: string) => void
  changeReceived: string
  setChangeReceived: (v: string) => void
  monnaie: number
  dismiss: () => void
  triggerAfterSale: (total: number) => void
}

export function useChangeCalculator(): UseChangeCalculatorReturn {
  const [show, setShow] = useState(false)
  const [changeTotal, setChangeTotal] = useState('')
  const [changeReceived, setChangeReceived] = useState('')

  const totalNum = parseFloat(changeTotal.replace(/\s/g, '')) || 0
  const receivedNum = parseFloat(changeReceived.replace(/\s/g, '')) || 0
  const monnaie = receivedNum - totalNum

  const triggerAfterSale = useCallback((total: number) => {
    setChangeTotal(String(total))
    setChangeReceived('')
    setShow(true)
  }, [])

  const dismiss = useCallback(() => {
    setShow(false)
    setChangeTotal('')
    setChangeReceived('')
  }, [])

  return {
    show,
    changeTotal,
    setChangeTotal,
    changeReceived,
    setChangeReceived,
    monnaie,
    dismiss,
    triggerAfterSale,
  }
}
