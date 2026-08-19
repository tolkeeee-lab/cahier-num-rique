import { type OfflineProduct } from '@/lib/offlineDb'

export interface Movement {
  date: string
  type: 'in' | 'out'
  quantity: number
  unit_price: number
  notes: string
  sale_type?: string
}

export interface StockItem extends OfflineProduct {
  total_in: number
  total_out: number
  current_stock: number
  movements: Movement[]
  is_orphan?: boolean
  stock_tracked?: boolean
  is_unlimited?: boolean
}

export interface StockManagerProps {
  shopId?: string
  shopActivity?: string
  userRole?: string
  onError?: (err: string) => void
}

export interface StockFormState {
  name: string
  category: string
  unit: string
  alert_threshold: number
  initial_stock: number
  unit_cost: number
  unit_price: number
  multiplier: number
  packaging_name: string
  lot_quantity: number
  lot_price: number
}

export type StockStatus = 'ok' | 'low' | 'out' | 'untracked'
export type TradeType = 'retail' | 'semi_wholesale' | 'wholesale'
