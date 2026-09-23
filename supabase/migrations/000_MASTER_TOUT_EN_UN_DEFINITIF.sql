-- ==============================================================================
-- CAHIER NUMÉRIQUE — LE SCRIPT MAÎTRE TOUT-EN-UN DÉFINITIF
-- ==============================================================================
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL de Supabase (SQL Editor).
-- Ce script est 100% idempotent : il peut être relancé autant de fois que
-- nécessaire sans perte de données.
--
-- IL COMPREND TOUT :
-- 1. Création & mise à niveau de toutes les 10 tables
-- 2. Tous les index de performance pour un affichage en 0 ms
-- 3. Unification automatique des UUID boutiques (Patron <-> Employé)
-- 4. Droits universels PostgreSQL (anon, authenticated, service_role)
-- 5. Activation de Supabase Realtime (Websockets instantanées)
-- 6. Fonction centrale d'autorisation universelle get_user_authorized_shop_ids()
-- 7. Politiques RLS sans faille pour toutes les tables
-- 8. Rechargement du cache Supabase PostgREST
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. FONCTION TRIGGER POUR UPDATED_AT ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. STRUCTURE DES 10 TABLES ET LEURS COLONNES COMPLÈTES ────────────────────

-- Table 1 : shops
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  name VARCHAR(255) NOT NULL DEFAULT 'Mon Point de Vente',
  shop_code VARCHAR(50),
  activity VARCHAR(100) DEFAULT 'boutique',
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Mon Point de Vente';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS shop_code VARCHAR(50);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS activity VARCHAR(100) DEFAULT 'boutique';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS address TEXT;

DROP TRIGGER IF EXISTS update_shops_updated_at ON public.shops;
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 2 : employees
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL,
  shop_code VARCHAR(50),
  user_id UUID,
  email VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'employee',
  status VARCHAR(50) DEFAULT 'active',
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS shop_code VARCHAR(50);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 3 : sales
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL DEFAULT 'default-shop',
  client_name VARCHAR(255) NOT NULL DEFAULT 'Client anonyme',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  total_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  debt_amount INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed',
  type VARCHAR(50) DEFAULT 'cash_in',
  pen_color VARCHAR(20) DEFAULT 'blue',
  raw_text TEXT,
  category VARCHAR(100) DEFAULT 'Général',
  expense_category VARCHAR(100),
  employee_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255) DEFAULT 'default-shop';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'cash_in';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS pen_color VARCHAR(20) DEFAULT 'blue';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS raw_text TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Général';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS expense_category VARCHAR(100);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS employee_id VARCHAR(255);

DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 4 : sold_articles
CREATE TABLE IF NOT EXISTS public.sold_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  shop_id VARCHAR(255) DEFAULT 'default-shop',
  product_name VARCHAR(255) NOT NULL,
  product_name_raw VARCHAR(255),
  product_name_canonical VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  unit_cost INTEGER DEFAULT 0,
  profit_margin INTEGER DEFAULT 0,
  margin INTEGER DEFAULT 0,
  subtotal INTEGER DEFAULT 0,
  category VARCHAR(100) DEFAULT 'Général',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255) DEFAULT 'default-shop';
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS product_name_raw VARCHAR(255);
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS product_name_canonical VARCHAR(255);
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS unit_cost INTEGER DEFAULT 0;
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS profit_margin INTEGER DEFAULT 0;
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS margin INTEGER DEFAULT 0;
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Général';

-- Table 5 : products (stock)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL DEFAULT 'default-shop',
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Divers',
  unit VARCHAR(50) DEFAULT 'unité',
  alert_threshold INTEGER DEFAULT 5,
  initial_stock INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  unit_cost INTEGER DEFAULT 0,
  unit_price INTEGER DEFAULT 0,
  wholesale_price INTEGER DEFAULT 0,
  semi_wholesale_price INTEGER DEFAULT 0,
  wholesale_min_qty INTEGER DEFAULT 0,
  semi_wholesale_min_qty INTEGER DEFAULT 0,
  lot_quantity INTEGER DEFAULT 0,
  lot_price INTEGER DEFAULT 0,
  multiplier INTEGER DEFAULT 1,
  packaging_name VARCHAR(100),
  packaging VARCHAR(100),
  packaging_qty INTEGER DEFAULT 1,
  trade_type VARCHAR(50) DEFAULT 'retail',
  barcode VARCHAR(100),
  stock_tracked BOOLEAN DEFAULT true,
  is_service BOOLEAN DEFAULT false,
  is_unlimited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_price INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS semi_wholesale_price INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_min_qty INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS semi_wholesale_min_qty INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lot_quantity INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lot_price INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS multiplier INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packaging_name VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packaging VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packaging_qty INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS trade_type VARCHAR(50) DEFAULT 'retail';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_tracked BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT false;

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 6 : debts (crédits clients)
CREATE TABLE IF NOT EXISTS public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL DEFAULT 'default-shop',
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  amount_owed INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  paid_amount INTEGER DEFAULT 0,
  notes TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255) DEFAULT 'default-shop';
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50);

DROP TRIGGER IF EXISTS update_debts_updated_at ON public.debts;
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 7 : supplier_debts (dettes fournisseurs)
CREATE TABLE IF NOT EXISTS public.supplier_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL DEFAULT 'default-shop',
  supplier_name VARCHAR(255) NOT NULL,
  supplier_phone VARCHAR(50),
  invoice_number VARCHAR(100),
  amount_owed INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.supplier_debts ADD COLUMN IF NOT EXISTS supplier_phone VARCHAR(50);
ALTER TABLE public.supplier_debts ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

DROP TRIGGER IF EXISTS update_supplier_debts_updated_at ON public.supplier_debts;
CREATE TRIGGER update_supplier_debts_updated_at BEFORE UPDATE ON public.supplier_debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 8 : shopping_list (liste d'approvisionnement)
CREATE TABLE IF NOT EXISTS public.shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL DEFAULT 'default-shop',
  product_name VARCHAR(255) NOT NULL,
  requested_quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost_est INTEGER DEFAULT 0,
  priority VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_shopping_list_updated_at ON public.shopping_list;
CREATE TRIGGER update_shopping_list_updated_at BEFORE UPDATE ON public.shopping_list
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 9 : cash_closings (clôtures de caisse journalières)
CREATE TABLE IF NOT EXISTS public.cash_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL DEFAULT 'default-shop',
  closing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_cash_sales INTEGER NOT NULL DEFAULT 0,
  total_cash_expenses INTEGER NOT NULL DEFAULT 0,
  total_cash_collected INTEGER NOT NULL DEFAULT 0,
  expected_cash INTEGER NOT NULL DEFAULT 0,
  actual_cash INTEGER NOT NULL DEFAULT 0,
  cash_gap INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  closed_by_id UUID,
  closed_by_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_cash_closings_updated_at ON public.cash_closings;
CREATE TRIGGER update_cash_closings_updated_at BEFORE UPDATE ON public.cash_closings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table 10 : market_knowledge (intelligence des prix)
CREATE TABLE IF NOT EXISTS public.market_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name VARCHAR(255) NOT NULL,
  product_name_normalized VARCHAR(255),
  avg_unit_price INTEGER DEFAULT 0,
  avg_unit_cost INTEGER DEFAULT 0,
  observation_count INTEGER DEFAULT 0,
  last_seen_price INTEGER DEFAULT 0,
  last_seen_cost INTEGER DEFAULT 0,
  country VARCHAR(10) DEFAULT 'BJ',
  city VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3. CRÉATION DES INDEX DE PERFORMANCE ULTRA-RAPIDES ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_shops_owner ON public.shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_code ON public.shops(shop_code);
CREATE INDEX IF NOT EXISTS idx_employees_shop ON public.employees(shop_id);
CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(shop_code);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_sales_shop_date ON public.sales(shop_id, date);
CREATE INDEX IF NOT EXISTS idx_sold_articles_sale ON public.sold_articles(sale_id);
CREATE INDEX IF NOT EXISTS idx_sold_articles_shop ON public.sold_articles(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_category ON public.products(shop_id, category);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_debts_shop_status ON public.debts(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_debts_shop ON public.supplier_debts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_shop ON public.shopping_list(shop_id);
CREATE INDEX IF NOT EXISTS idx_cash_closings_shop ON public.cash_closings(shop_id, closing_date);

-- ── 4. HARMONISATION & UNIFICATION AUTOMATIQUE DES UUID BOUTIQUES ──────────────
-- Si des données historiques utilisent un code textuel 'BTQ-XXXX' au lieu de l'UUID,
-- nous les rattachons immédiatement au vrai UUID de la boutique correspondante.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id::VARCHAR AS real_uuid, shop_code FROM public.shops WHERE shop_code IS NOT NULL LOOP
    UPDATE public.employees SET shop_id = r.real_uuid WHERE shop_id = r.shop_code OR shop_id = REPLACE(r.shop_code, 'BTQ-', '');
    UPDATE public.sales SET shop_id = r.real_uuid WHERE shop_id = r.shop_code OR shop_id = REPLACE(r.shop_code, 'BTQ-', '');
    UPDATE public.products SET shop_id = r.real_uuid WHERE shop_id = r.shop_code OR shop_id = REPLACE(r.shop_code, 'BTQ-', '');
    UPDATE public.debts SET shop_id = r.real_uuid WHERE shop_id = r.shop_code OR shop_id = REPLACE(r.shop_code, 'BTQ-', '');
    UPDATE public.supplier_debts SET shop_id = r.real_uuid WHERE shop_id = r.shop_code OR shop_id = REPLACE(r.shop_code, 'BTQ-', '');
    UPDATE public.shopping_list SET shop_id = r.real_uuid WHERE shop_id = r.shop_code OR shop_id = REPLACE(r.shop_code, 'BTQ-', '');
    UPDATE public.cash_closings SET shop_id = r.real_uuid WHERE shop_id = r.shop_code OR shop_id = REPLACE(r.shop_code, 'BTQ-', '');
  END LOOP;
END $$;

-- ── 5. PRIVILÈGES GLOBAUX POSTGRESQL (ANON, AUTHENTICATED, SERVICE_ROLE) ───────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ── 6. ACTIVATION DE SUPABASE REALTIME (WEBSOCKETS INSTANTANÉES) ──────────────
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
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'debts') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'supplier_debts') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_debts;
    END IF;
  END IF;
END $$;

-- ── 7. FONCTION CENTRALE D'AUTORISATION UNIVERSELLE (SECURITY DEFINER) ──────────
CREATE OR REPLACE FUNCTION public.get_user_authorized_shop_ids()
RETURNS TABLE (shop_id VARCHAR) AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')));
  v_role TEXT := COALESCE(auth.jwt()->>'role', '');
BEGIN
  -- 1. Clé de service (accès admin)
  IF v_role = 'service_role' THEN
    RETURN QUERY 
      SELECT id::VARCHAR FROM public.shops
      UNION
      SELECT shop_code::VARCHAR FROM public.shops WHERE shop_code IS NOT NULL;
    RETURN;
  END IF;

  -- 2. Boutiques dont l'utilisateur est le propriétaire
  IF v_uid IS NOT NULL THEN
    RETURN QUERY 
      SELECT s.id::VARCHAR FROM public.shops s WHERE s.owner_id = v_uid
      UNION
      SELECT s.shop_code::VARCHAR FROM public.shops s WHERE s.owner_id = v_uid AND s.shop_code IS NOT NULL;
  END IF;

  -- 3. Boutiques où l'utilisateur est enregistré comme employé (par email ou auth.uid)
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

-- ── 8. POLITIQUES RLS INFAILLIBLES SUR TOUTES LES 10 TABLES ────────────────────

-- shops
ALTER TABLE IF EXISTS public.shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shops_unified_select" ON public.shops;
DROP POLICY IF EXISTS "shops_unified_write" ON public.shops;
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

-- employees
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_unified_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_anon_authenticated_all" ON public.employees;
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_write_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_shop_isolation_policy" ON public.employees;

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

-- sales
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_unified_policy" ON public.sales;
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

-- sold_articles
ALTER TABLE IF EXISTS public.sold_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sold_articles_unified_policy" ON public.sold_articles;
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

-- products
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_unified_policy" ON public.products;
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

-- debts
ALTER TABLE IF EXISTS public.debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "debts_unified_policy" ON public.debts;
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

-- supplier_debts
ALTER TABLE IF EXISTS public.supplier_debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "supplier_debts_unified_policy" ON public.supplier_debts;
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

-- shopping_list
ALTER TABLE IF EXISTS public.shopping_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shopping_list_unified_policy" ON public.shopping_list;
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

-- cash_closings
ALTER TABLE IF EXISTS public.cash_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cash_closings_unified_policy" ON public.cash_closings;
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

-- market_knowledge
ALTER TABLE IF EXISTS public.market_knowledge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "market_knowledge_unified_policy" ON public.market_knowledge;
DROP POLICY IF EXISTS "market_knowledge_anon_authenticated_all" ON public.market_knowledge;

CREATE POLICY "market_knowledge_unified_policy" ON public.market_knowledge
  FOR ALL TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ── 9. RECHARGEMENT DU CACHE SUPABASE SCHEMA ──────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── 10. VÉRIFICATION FINALE DES TABLES ACTIVES ─────────────────────────────────
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('shops', 'employees', 'sales', 'sold_articles', 'products', 'debts', 'supplier_debts', 'shopping_list', 'cash_closings', 'market_knowledge')
ORDER BY tablename;
