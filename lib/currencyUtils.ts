/**
 * currencyUtils.ts — Gestion des devises régionales et internationales
 */

export interface CurrencyConfig {
  code: string
  symbol: string
  name: string
  decimals: number
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  XOF: { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA (UEMOA)', decimals: 0 },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (CEMAC)', decimals: 0 },
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Cedi (Ghana)', decimals: 2 },
  GNF: { code: 'GNF', symbol: 'FG', name: 'Franc Guinéen', decimals: 0 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'Dollar US', decimals: 2 },
}

/**
 * Formate un montant dans la devise spécifiée.
 */
export function formatCurrency(amount: number, currencyCode: string = 'XOF'): string {
  const config = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.XOF
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount)

  return `${formatted} ${config.symbol}`
}

/**
 * Récupère la devise configurée pour une boutique.
 */
export function getShopCurrency(shopId: string = 'default-shop'): string {
  if (typeof window === 'undefined') return 'XOF'
  return localStorage.getItem(`cahier_currency_${shopId}`) || 'XOF'
}

/**
 * Sauvegarde la devise configurée pour une boutique.
 */
export function setShopCurrency(shopId: string = 'default-shop', currencyCode: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`cahier_currency_${shopId}`, currencyCode)
}
