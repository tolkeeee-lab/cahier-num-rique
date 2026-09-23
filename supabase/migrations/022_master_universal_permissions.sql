-- ==============================================================================
-- Migration 022 : Standardisation Universelle des Permissions RLS & Supabase Realtime
-- Nettoie toutes les politiques disparates et unifie l'accès Patron <-> Employé
-- ==============================================================================

-- 1. Attribuer les privilèges de base PostgreSQL sur le schéma public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Activer Supabase Realtime sur les tables clés pour la synchronisation instantanée
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sales') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'products') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'shopping_list') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'cash_closings') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_closings;
    END IF;
  END IF;
END $$;

-- 3. Fonction centrale de calcul des boutiques autorisées (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_authorized_shop_ids()
RETURNS TABLE (shop_id VARCHAR) AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')));
  v_role TEXT := COALESCE(auth.jwt()->>'role', '');
BEGIN
  -- Service role : accès complet
  IF v_role = 'service_role' THEN
    RETURN QUERY 
      SELECT id::VARCHAR FROM public.shops
      UNION
      SELECT shop_code::VARCHAR FROM public.shops WHERE shop_code IS NOT NULL;
    RETURN;
  END IF;

  -- A. Boutiques possédées par l'utilisateur connecté (par UUID ou code court)
  IF v_uid IS NOT NULL THEN
    RETURN QUERY 
      SELECT s.id::VARCHAR FROM public.shops s WHERE s.owner_id = v_uid
      UNION
      SELECT s.shop_code::VARCHAR FROM public.shops s WHERE s.owner_id = v_uid AND s.shop_code IS NOT NULL;
  END IF;

  -- B. Boutiques où l'utilisateur est enregistré comme employé
  IF v_email <> '' THEN
    RETURN QUERY 
      SELECT e.shop_id::VARCHAR FROM public.employees e WHERE LOWER(TRIM(e.email)) = v_email
      UNION
      SELECT s.id::VARCHAR FROM public.employees e 
        JOIN public.shops s ON (s.id::VARCHAR = e.shop_id OR s.shop_code = e.shop_id)
        WHERE LOWER(TRIM(e.email)) = v_email;
  END IF;

  IF v_uid IS NOT NULL THEN
    RETURN QUERY 
      SELECT e.shop_id::VARCHAR FROM public.employees e WHERE e.id = v_uid
      UNION
      SELECT s.id::VARCHAR FROM public.employees e 
        JOIN public.shops s ON (s.id::VARCHAR = e.shop_id OR s.shop_code = e.shop_id)
        WHERE e.id = v_uid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_authorized_shop_ids() TO authenticated, anon, service_role;

-- 4. Nettoyage et Harmonisation des Politiques RLS sur TOUTES les tables

-- ── TABLE : shops ─────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shops_owner_policy" ON public.shops;
DROP POLICY IF EXISTS "shops_strict_tenant_policy" ON public.shops;
DROP POLICY IF EXISTS "Allow all access to shops" ON public.shops;
DROP POLICY IF EXISTS "shops_read_policy" ON public.shops;
DROP POLICY IF EXISTS "shops_write_policy" ON public.shops;

CREATE POLICY "shops_unified_select" ON public.shops
  FOR SELECT TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (owner_id = auth.uid())
    OR (id::VARCHAR IN (SELECT get_user_authorized_shop_ids()))
    OR (shop_code IS NOT NULL AND shop_code IN (SELECT get_user_authorized_shop_ids()))
  );

CREATE POLICY "shops_unified_write" ON public.shops
  FOR ALL TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (owner_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (owner_id = auth.uid())
  );

-- ── TABLE : employees ─────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_anon_authenticated_all" ON public.employees;
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_write_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_shop_isolation_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_unified_policy" ON public.employees;

CREATE POLICY "employees_unified_policy" ON public.employees
  FOR ALL TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (id = auth.uid())
    OR (LOWER(TRIM(email)) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
    OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id::VARCHAR = employees.shop_id AND s.owner_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (id = auth.uid())
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
    OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id::VARCHAR = employees.shop_id AND s.owner_id = auth.uid())
  );

-- ── TABLE : sales ─────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_shop_isolation_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_strict_tenant_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_anon_authenticated_all" ON public.sales;

CREATE POLICY "sales_unified_policy" ON public.sales
  FOR ALL TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  );

-- ── TABLE : sold_articles ─────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.sold_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sold_articles_shop_isolation_policy" ON public.sold_articles;
DROP POLICY IF EXISTS "sold_articles_strict_tenant_policy" ON public.sold_articles;
DROP POLICY IF EXISTS "sold_articles_anon_authenticated_all" ON public.sold_articles;

CREATE POLICY "sold_articles_unified_policy" ON public.sold_articles
  FOR ALL TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
    OR EXISTS (
      SELECT 1 FROM public.sales s 
      WHERE s.id = sold_articles.sale_id 
        AND s.shop_id IN (SELECT get_user_authorized_shop_ids())
    )
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
    OR EXISTS (
      SELECT 1 FROM public.sales s 
      WHERE s.id = sold_articles.sale_id 
        AND s.shop_id IN (SELECT get_user_authorized_shop_ids())
    )
  );

-- ── TABLE : products ──────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_shop_isolation_policy" ON public.products;
DROP POLICY IF EXISTS "products_strict_tenant_policy" ON public.products;
DROP POLICY IF EXISTS "products_anon_authenticated_all" ON public.products;

CREATE POLICY "products_unified_policy" ON public.products
  FOR ALL TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  );

-- ── TABLE : debts ─────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "debts_shop_isolation_policy" ON public.debts;
DROP POLICY IF EXISTS "debts_strict_tenant_policy" ON public.debts;
DROP POLICY IF EXISTS "debts_anon_authenticated_all" ON public.debts;

CREATE POLICY "debts_unified_policy" ON public.debts
  FOR ALL TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  );

-- ── TABLE : supplier_debts ────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.supplier_debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_debts_policy" ON public.supplier_debts;
DROP POLICY IF EXISTS "supplier_debts_shop_isolation_policy" ON public.supplier_debts;
DROP POLICY IF EXISTS "supplier_debts_strict_tenant_policy" ON public.supplier_debts;

CREATE POLICY "supplier_debts_unified_policy" ON public.supplier_debts
  FOR ALL TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  );

-- ── TABLE : shopping_list ─────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.shopping_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shopping_list_strict_tenant_policy" ON public.shopping_list;

CREATE POLICY "shopping_list_unified_policy" ON public.shopping_list
  FOR ALL TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  );

-- ── TABLE : cash_closings ─────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.cash_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_cash_closings_select" ON public.cash_closings;
DROP POLICY IF EXISTS "tenant_isolation_cash_closings_insert" ON public.cash_closings;
DROP POLICY IF EXISTS "tenant_isolation_cash_closings_update" ON public.cash_closings;
DROP POLICY IF EXISTS "tenant_isolation_cash_closings_delete" ON public.cash_closings;

CREATE POLICY "cash_closings_unified_policy" ON public.cash_closings
  FOR ALL TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (shop_id IS NOT NULL AND shop_id IN (SELECT get_user_authorized_shop_ids()))
  );

-- 5. Rechargement du cache de schéma Supabase
NOTIFY pgrst, 'reload schema';
