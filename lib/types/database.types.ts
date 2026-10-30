export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string
          owner_id: string | null
          name: string
          shop_code: string | null
          activity: string | null
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          name?: string
          shop_code?: string | null
          activity?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string | null
          name?: string
          shop_code?: string | null
          activity?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          shop_id: string
          shop_code: string | null
          user_id: string | null
          email: string | null
          name: string
          role: string | null
          status: string | null
          invited_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          shop_code?: string | null
          user_id?: string | null
          email?: string | null
          name?: string
          role?: string | null
          status?: string | null
          invited_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          shop_code?: string | null
          user_id?: string | null
          email?: string | null
          name?: string
          role?: string | null
          status?: string | null
          invited_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          shop_id: string
          client_name: string
          date: string
          time: string
          total_amount: number
          paid_amount: number
          debt_amount: number
          status: string | null
          type: string | null
          pen_color: string | null
          raw_text: string | null
          category: string | null
          expense_category: string | null
          employee_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          client_name?: string
          date?: string
          time?: string
          total_amount?: number
          paid_amount?: number
          debt_amount?: number
          status?: string | null
          type?: string | null
          pen_color?: string | null
          raw_text?: string | null
          category?: string | null
          expense_category?: string | null
          employee_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          client_name?: string
          date?: string
          time?: string
          total_amount?: number
          paid_amount?: number
          debt_amount?: number
          status?: string | null
          type?: string | null
          pen_color?: string | null
          raw_text?: string | null
          category?: string | null
          expense_category?: string | null
          employee_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sold_articles: {
        Row: {
          id: string
          sale_id: string
          shop_id: string | null
          product_name: string
          product_name_raw: string | null
          product_name_canonical: string | null
          quantity: number
          unit_price: number
          unit_cost: number | null
          profit_margin: number | null
          margin: number | null
          subtotal: number | null
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          shop_id?: string | null
          product_name?: string
          product_name_raw?: string | null
          product_name_canonical?: string | null
          quantity?: number
          unit_price?: number
          unit_cost?: number | null
          profit_margin?: number | null
          margin?: number | null
          subtotal?: number | null
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          shop_id?: string | null
          product_name?: string
          product_name_raw?: string | null
          product_name_canonical?: string | null
          quantity?: number
          unit_price?: number
          unit_cost?: number | null
          profit_margin?: number | null
          margin?: number | null
          subtotal?: number | null
          category?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          shop_id: string
          name: string
          category: string | null
          unit: string | null
          alert_threshold: number | null
          initial_stock: number | null
          current_stock: number | null
          stock_quantity: number | null
          unit_cost: number | null
          unit_price: number | null
          wholesale_price: number | null
          semi_wholesale_price: number | null
          wholesale_min_qty: number | null
          semi_wholesale_min_qty: number | null
          lot_quantity: number | null
          lot_price: number | null
          multiplier: number | null
          packaging_name: string | null
          packaging: string | null
          packaging_qty: number | null
          trade_type: string | null
          barcode: string | null
          stock_tracked: boolean | null
          is_service: boolean | null
          is_unlimited: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name?: string
          category?: string | null
          unit?: string | null
          alert_threshold?: number | null
          initial_stock?: number | null
          current_stock?: number | null
          stock_quantity?: number | null
          unit_cost?: number | null
          unit_price?: number | null
          wholesale_price?: number | null
          semi_wholesale_price?: number | null
          wholesale_min_qty?: number | null
          semi_wholesale_min_qty?: number | null
          lot_quantity?: number | null
          lot_price?: number | null
          multiplier?: number | null
          packaging_name?: string | null
          packaging?: string | null
          packaging_qty?: number | null
          trade_type?: string | null
          barcode?: string | null
          stock_tracked?: boolean | null
          is_service?: boolean | null
          is_unlimited?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          category?: string | null
          unit?: string | null
          alert_threshold?: number | null
          initial_stock?: number | null
          current_stock?: number | null
          stock_quantity?: number | null
          unit_cost?: number | null
          unit_price?: number | null
          wholesale_price?: number | null
          semi_wholesale_price?: number | null
          wholesale_min_qty?: number | null
          semi_wholesale_min_qty?: number | null
          lot_quantity?: number | null
          lot_price?: number | null
          multiplier?: number | null
          packaging_name?: string | null
          packaging?: string | null
          packaging_qty?: number | null
          trade_type?: string | null
          barcode?: string | null
          stock_tracked?: boolean | null
          is_service?: boolean | null
          is_unlimited?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      debts: {
        Row: {
          id: string
          shop_id: string
          sale_id: string | null
          client_name: string
          client_phone: string | null
          amount_owed: number
          paid_amount: number | null
          status: string | null
          notes: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          sale_id?: string | null
          client_name?: string
          client_phone?: string | null
          amount_owed?: number
          paid_amount?: number | null
          status?: string | null
          notes?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          sale_id?: string | null
          client_name?: string
          client_phone?: string | null
          amount_owed?: number
          paid_amount?: number | null
          status?: string | null
          notes?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      supplier_debts: {
        Row: {
          id: string
          shop_id: string
          supplier_name: string
          supplier_phone: string | null
          invoice_number: string | null
          amount_owed: number
          paid_amount: number | null
          status: string | null
          due_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          supplier_name?: string
          supplier_phone?: string | null
          invoice_number?: string | null
          amount_owed?: number
          paid_amount?: number | null
          status?: string | null
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          supplier_name?: string
          supplier_phone?: string | null
          invoice_number?: string | null
          amount_owed?: number
          paid_amount?: number | null
          status?: string | null
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shopping_list: {
        Row: {
          id: string
          shop_id: string
          product_name: string
          requested_quantity: number
          unit_cost_est: number | null
          priority: string | null
          status: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          product_name?: string
          requested_quantity?: number
          unit_cost_est?: number | null
          priority?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          product_name?: string
          requested_quantity?: number
          unit_cost_est?: number | null
          priority?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cash_closings: {
        Row: {
          id: string
          shop_id: string
          date: string
          closing_time: string | null
          opening_cash: number
          theoretical_cash: number
          actual_cash: number
          difference: number
          cash_receipts: number
          expenses: number
          credit_sales: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          date?: string
          closing_time?: string | null
          opening_cash?: number
          theoretical_cash?: number
          actual_cash?: number
          difference?: number
          cash_receipts?: number
          expenses?: number
          credit_sales?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          date?: string
          closing_time?: string | null
          opening_cash?: number
          theoretical_cash?: number
          actual_cash?: number
          difference?: number
          cash_receipts?: number
          expenses?: number
          credit_sales?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          shop_id: string
          user_id: string | null
          user_email: string | null
          action: string
          target_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          user_id?: string | null
          user_email?: string | null
          action: string
          target_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          user_id?: string | null
          user_email?: string | null
          action?: string
          target_id?: string | null
          details?: Json | null
          created_at?: string
        }
      }
      market_knowledge: {
        Row: {
          id: string
          product_name: string
          product_name_normalized: string | null
          avg_unit_price: number | null
          avg_unit_cost: number | null
          observation_count: number | null
          last_seen_price: number | null
          last_seen_cost: number | null
          country: string | null
          city: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          product_name: string
          product_name_normalized?: string | null
          avg_unit_price?: number | null
          avg_unit_cost?: number | null
          observation_count?: number | null
          last_seen_price?: number | null
          last_seen_cost?: number | null
          country?: string | null
          city?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          product_name?: string
          product_name_normalized?: string | null
          avg_unit_price?: number | null
          avg_unit_cost?: number | null
          observation_count?: number | null
          last_seen_price?: number | null
          last_seen_cost?: number | null
          country?: string | null
          city?: string | null
          updated_at?: string
        }
      }
    }
  }
}
