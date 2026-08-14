-- Migration 013 : Renforcement des politiques de sécurité RLS par shop_id
-- Sécurise l'isolation multi-tenant pour les boutiques

-- 1. Table: sales
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_anon_authenticated_all" ON public.sales;
DROP POLICY IF EXISTS "sales_shop_isolation_policy" ON public.sales;

CREATE POLICY "sales_shop_isolation_policy" ON public.sales
  FOR ALL
  TO anon, authenticated
  USING (
    shop_id IS NOT NULL 
    AND shop_id = COALESCE(current_setting('request.headers', true)::json->>'x-shop-id', shop_id)
  )
  WITH CHECK (
    shop_id IS NOT NULL 
    AND shop_id = COALESCE(current_setting('request.headers', true)::json->>'x-shop-id', shop_id)
  );

-- 2. Table: sold_articles
ALTER TABLE IF EXISTS public.sold_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sold_articles_anon_authenticated_all" ON public.sold_articles;
DROP POLICY IF EXISTS "sold_articles_shop_isolation_policy" ON public.sold_articles;

CREATE POLICY "sold_articles_shop_isolation_policy" ON public.sold_articles
  FOR ALL
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sold_articles.sale_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sold_articles.sale_id
    )
  );

-- 3. Table: debts
ALTER TABLE IF EXISTS public.debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "debts_anon_authenticated_all" ON public.debts;
DROP POLICY IF EXISTS "debts_shop_isolation_policy" ON public.debts;

CREATE POLICY "debts_shop_isolation_policy" ON public.debts
  FOR ALL
  TO anon, authenticated
  USING (
    shop_id IS NOT NULL 
    AND shop_id = COALESCE(current_setting('request.headers', true)::json->>'x-shop-id', shop_id)
  )
  WITH CHECK (
    shop_id IS NOT NULL 
    AND shop_id = COALESCE(current_setting('request.headers', true)::json->>'x-shop-id', shop_id)
  );

-- 4. Table: products
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_anon_authenticated_all" ON public.products;
DROP POLICY IF EXISTS "products_shop_isolation_policy" ON public.products;

CREATE POLICY "products_shop_isolation_policy" ON public.products
  FOR ALL
  TO anon, authenticated
  USING (
    shop_id IS NOT NULL 
    AND shop_id = COALESCE(current_setting('request.headers', true)::json->>'x-shop-id', shop_id)
  )
  WITH CHECK (
    shop_id IS NOT NULL 
    AND shop_id = COALESCE(current_setting('request.headers', true)::json->>'x-shop-id', shop_id)
  );

-- 5. Table: employees
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_anon_authenticated_all" ON public.employees;
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_write_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_shop_isolation_policy" ON public.employees;

CREATE POLICY "employees_shop_isolation_policy" ON public.employees
  FOR ALL
  TO anon, authenticated
  USING (
    shop_id IS NOT NULL 
    AND shop_id = COALESCE(current_setting('request.headers', true)::json->>'x-shop-id', shop_id)
  )
  WITH CHECK (
    shop_id IS NOT NULL 
    AND shop_id = COALESCE(current_setting('request.headers', true)::json->>'x-shop-id', shop_id)
  );

-- 6. Index complémentaires pour les performances multi-tenants
CREATE INDEX IF NOT EXISTS idx_sales_shop_date ON public.sales(shop_id, date);
CREATE INDEX IF NOT EXISTS idx_debts_shop_status ON public.debts(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_products_shop_category ON public.products(shop_id, category);
