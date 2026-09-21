-- ==============================================================================
-- Migration 016 : Persistance des Clôtures de Caisse Journalières (Z)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.cash_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  closing_time VARCHAR(10),
  opening_cash NUMERIC NOT NULL DEFAULT 0,
  theoretical_cash NUMERIC NOT NULL DEFAULT 0,
  actual_cash NUMERIC NOT NULL DEFAULT 0,
  difference NUMERIC NOT NULL DEFAULT 0,
  cash_receipts NUMERIC NOT NULL DEFAULT 0,
  expenses NUMERIC NOT NULL DEFAULT 0,
  credit_sales NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_cash_closings_shop_date UNIQUE (shop_id, date)
);

CREATE INDEX IF NOT EXISTS idx_cash_closings_shop ON public.cash_closings(shop_id);
CREATE INDEX IF NOT EXISTS idx_cash_closings_date ON public.cash_closings(date DESC);

-- RLS
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_cash_closings_select" ON public.cash_closings;
CREATE POLICY "tenant_isolation_cash_closings_select" ON public.cash_closings
  FOR SELECT USING (
    shop_id IN (SELECT shop_id FROM public.get_user_authorized_shop_ids())
  );

DROP POLICY IF EXISTS "tenant_isolation_cash_closings_insert" ON public.cash_closings;
CREATE POLICY "tenant_isolation_cash_closings_insert" ON public.cash_closings
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT shop_id FROM public.get_user_authorized_shop_ids())
  );

DROP POLICY IF EXISTS "tenant_isolation_cash_closings_update" ON public.cash_closings;
CREATE POLICY "tenant_isolation_cash_closings_update" ON public.cash_closings
  FOR UPDATE USING (
    shop_id IN (SELECT shop_id FROM public.get_user_authorized_shop_ids())
  ) WITH CHECK (
    shop_id IN (SELECT shop_id FROM public.get_user_authorized_shop_ids())
  );

DROP POLICY IF EXISTS "tenant_isolation_cash_closings_delete" ON public.cash_closings;
CREATE POLICY "tenant_isolation_cash_closings_delete" ON public.cash_closings
  FOR DELETE USING (
    shop_id IN (SELECT shop_id FROM public.get_user_authorized_shop_ids())
  );
