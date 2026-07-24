-- Migration 011 : Correction des permissions RLS et attribution des privilèges anon / authenticated
-- Résout les erreurs HTTP 401 Unauthorized sur l'API REST Supabase

-- 1. Attribuer les autorisations de schéma aux rôles Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 2. Configuration RLS sur les tables principales

-- Table: sales
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_anon_authenticated_all" ON public.sales;
CREATE POLICY "sales_anon_authenticated_all" ON public.sales
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Table: sold_articles
ALTER TABLE IF EXISTS public.sold_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sold_articles_anon_authenticated_all" ON public.sold_articles;
CREATE POLICY "sold_articles_anon_authenticated_all" ON public.sold_articles
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Table: debts
ALTER TABLE IF EXISTS public.debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "debts_anon_authenticated_all" ON public.debts;
CREATE POLICY "debts_anon_authenticated_all" ON public.debts
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Table: products
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_anon_authenticated_all" ON public.products;
CREATE POLICY "products_anon_authenticated_all" ON public.products
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Table: employees
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_anon_authenticated_all" ON public.employees;
CREATE POLICY "employees_anon_authenticated_all" ON public.employees
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Table: market_knowledge
ALTER TABLE IF EXISTS public.market_knowledge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "market_knowledge_anon_authenticated_all" ON public.market_knowledge;
CREATE POLICY "market_knowledge_anon_authenticated_all" ON public.market_knowledge
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Tables fournisseurs si existantes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'supplier_debts') THEN
    ALTER TABLE public.supplier_debts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "supplier_debts_policy" ON public.supplier_debts;
    CREATE POLICY "supplier_debts_policy" ON public.supplier_debts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'supplier_transactions') THEN
    ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "supplier_transactions_policy" ON public.supplier_transactions;
    CREATE POLICY "supplier_transactions_policy" ON public.supplier_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
