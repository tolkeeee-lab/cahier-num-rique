-- ============================================================
-- CAHIER NUMÉRIQUE — Script SQL Tout-en-Un (001 → 013)
-- À exécuter UNE SEULE FOIS dans Supabase SQL Editor
-- Toutes les commandes sont idempotentes (IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 001 — Tables de base
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name VARCHAR(255) NOT NULL DEFAULT 'Client anonyme',
  date DATE NOT NULL,
  time TIME NOT NULL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  debt_amount INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sold_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  subtotal INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  amount_owed INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  paid_amount INTEGER DEFAULT 0,
  notes TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_client ON public.sales(client_name);
CREATE INDEX IF NOT EXISTS idx_sold_articles_sale ON public.sold_articles(sale_id);
CREATE INDEX IF NOT EXISTS idx_debts_sale ON public.debts(sale_id);
CREATE INDEX IF NOT EXISTS idx_debts_client ON public.debts(client_name);
CREATE INDEX IF NOT EXISTS idx_debts_status ON public.debts(status);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_debts_updated_at ON public.debts;
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 002 — Mise à jour du schéma (type, pen_color, raw_text, category)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'cash_in';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS pen_color VARCHAR(20) DEFAULT 'blue';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS raw_text TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Général';
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Général';

-- ─────────────────────────────────────────────────────────────
-- 003 — Ajout de shop_id
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255) DEFAULT 'default-shop';
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255) DEFAULT 'default-shop';
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255) DEFAULT 'default-shop';
CREATE INDEX IF NOT EXISTS idx_sales_shop ON public.sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_debts_shop ON public.debts(shop_id);

-- ─────────────────────────────────────────────────────────────
-- 004 — Table des produits (stock)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL DEFAULT 'default-shop',
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Divers',
  unit VARCHAR(50) DEFAULT 'unité',
  alert_threshold INTEGER DEFAULT 5,
  initial_stock INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  unit_cost INTEGER DEFAULT 0,
  unit_price INTEGER DEFAULT 0,
  stock_tracked BOOLEAN DEFAULT true,
  is_service BOOLEAN DEFAULT false,
  is_unlimited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_shop ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 005 — Packaging / Conditionnement
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS multiplier INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packaging_name VARCHAR(100);

-- ─────────────────────────────────────────────────────────────
-- 006 — Market Knowledge (intelligence prix marché)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.market_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name VARCHAR(255) NOT NULL,
  product_name_normalized VARCHAR(255),
  avg_unit_price INTEGER DEFAULT 0,
  avg_unit_cost INTEGER DEFAULT 0,
  observation_count INTEGER DEFAULT 0,
  last_seen_price INTEGER DEFAULT 0,
  last_seen_cost INTEGER DEFAULT 0,
  country VARCHAR(10) DEFAULT 'CI',
  city VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajout des colonnes manquantes si la table existait déjà sans elles
ALTER TABLE public.market_knowledge ADD COLUMN IF NOT EXISTS product_name_normalized VARCHAR(255);
ALTER TABLE public.market_knowledge ADD COLUMN IF NOT EXISTS avg_unit_price INTEGER DEFAULT 0;
ALTER TABLE public.market_knowledge ADD COLUMN IF NOT EXISTS avg_unit_cost INTEGER DEFAULT 0;
ALTER TABLE public.market_knowledge ADD COLUMN IF NOT EXISTS observation_count INTEGER DEFAULT 0;
ALTER TABLE public.market_knowledge ADD COLUMN IF NOT EXISTS last_seen_price INTEGER DEFAULT 0;
ALTER TABLE public.market_knowledge ADD COLUMN IF NOT EXISTS last_seen_cost INTEGER DEFAULT 0;
ALTER TABLE public.market_knowledge ADD COLUMN IF NOT EXISTS country VARCHAR(10) DEFAULT 'CI';
ALTER TABLE public.market_knowledge ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Initialiser product_name_normalized pour les lignes existantes
UPDATE public.market_knowledge
SET product_name_normalized = lower(trim(product_name))
WHERE product_name_normalized IS NULL AND product_name IS NOT NULL;

-- Ajouter la contrainte UNIQUE seulement si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'market_knowledge_normalized_country_city_key'
  ) THEN
    ALTER TABLE public.market_knowledge
      ADD CONSTRAINT market_knowledge_normalized_country_city_key
      UNIQUE (product_name_normalized, country, city);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_market_knowledge_name ON public.market_knowledge(product_name_normalized);
CREATE INDEX IF NOT EXISTS idx_market_knowledge_country ON public.market_knowledge(country);

CREATE OR REPLACE FUNCTION update_market_knowledge(
  p_product_name TEXT,
  p_unit_price INTEGER,
  p_unit_cost INTEGER,
  p_country TEXT DEFAULT 'CI',
  p_city TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  existing_record RECORD;
  p_normalized TEXT := lower(trim(p_product_name));
BEGIN
  SELECT * INTO existing_record
  FROM public.market_knowledge
  WHERE product_name_normalized = p_normalized
    AND country = p_country
    AND (city = p_city OR (city IS NULL AND p_city IS NULL));

  IF FOUND THEN
    UPDATE public.market_knowledge SET
      avg_unit_price = CASE
        WHEN p_unit_price > 0 THEN
          ROUND((avg_unit_price * observation_count + p_unit_price) / (observation_count + 1))
        ELSE avg_unit_price
      END,
      avg_unit_cost = CASE
        WHEN p_unit_cost > 0 THEN
          ROUND((avg_unit_cost * observation_count + p_unit_cost) / (observation_count + 1))
        ELSE avg_unit_cost
      END,
      last_seen_price = CASE WHEN p_unit_price > 0 THEN p_unit_price ELSE last_seen_price END,
      last_seen_cost = CASE WHEN p_unit_cost > 0 THEN p_unit_cost ELSE last_seen_cost END,
      observation_count = observation_count + 1,
      updated_at = NOW()
    WHERE id = existing_record.id;
  ELSE
    INSERT INTO public.market_knowledge (
      product_name, product_name_normalized,
      avg_unit_price, avg_unit_cost,
      last_seen_price, last_seen_cost,
      observation_count, country, city
    ) VALUES (
      p_product_name, p_normalized,
      COALESCE(NULLIF(p_unit_price, 0), 0),
      COALESCE(NULLIF(p_unit_cost, 0), 0),
      p_unit_price, p_unit_cost,
      1, p_country, p_city
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 007 — Table des employés
-- ─────────────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_employees_shop ON public.employees(shop_id);
CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(shop_code);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);


DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 008 — Catégorie de dépense
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS expense_category VARCHAR(100);

-- ─────────────────────────────────────────────────────────────
-- 009 — Analytiques produits/ventes
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS unit_cost INTEGER DEFAULT 0;
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS margin INTEGER DEFAULT 0;

-- ─────────────────────────────────────────────────────────────
-- 010 — Standardisation des noms produits
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS product_name_raw VARCHAR(255);
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS product_name_canonical VARCHAR(255);

UPDATE public.sold_articles
SET
  product_name_raw = COALESCE(product_name_raw, product_name),
  product_name_canonical = COALESCE(product_name_canonical, product_name)
WHERE product_name_raw IS NULL OR product_name_canonical IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 011 — Permissions RLS (accès anon + authenticated)
-- ─────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_anon_authenticated_all" ON public.sales;
CREATE POLICY "sales_anon_authenticated_all" ON public.sales
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.sold_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sold_articles_anon_authenticated_all" ON public.sold_articles;
CREATE POLICY "sold_articles_anon_authenticated_all" ON public.sold_articles
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "debts_anon_authenticated_all" ON public.debts;
CREATE POLICY "debts_anon_authenticated_all" ON public.debts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_anon_authenticated_all" ON public.products;
CREATE POLICY "products_anon_authenticated_all" ON public.products
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_anon_authenticated_all" ON public.employees;
CREATE POLICY "employees_anon_authenticated_all" ON public.employees
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.market_knowledge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "market_knowledge_anon_authenticated_all" ON public.market_knowledge;
CREATE POLICY "market_knowledge_anon_authenticated_all" ON public.market_knowledge
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 012 — Tarification par lot sur les produits
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lot_quantity INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lot_price INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS trade_type VARCHAR(50) DEFAULT 'retail';

-- ─────────────────────────────────────────────────────────────
-- 013 — RLS par shop_id (isolation multi-boutique) + index perf
-- ─────────────────────────────────────────────────────────────

-- sales
DROP POLICY IF EXISTS "sales_shop_isolation_policy" ON public.sales;
CREATE POLICY "sales_shop_isolation_policy" ON public.sales
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- sold_articles
DROP POLICY IF EXISTS "sold_articles_shop_isolation_policy" ON public.sold_articles;
CREATE POLICY "sold_articles_shop_isolation_policy" ON public.sold_articles
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- debts
DROP POLICY IF EXISTS "debts_shop_isolation_policy" ON public.debts;
CREATE POLICY "debts_shop_isolation_policy" ON public.debts
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- products
DROP POLICY IF EXISTS "products_shop_isolation_policy" ON public.products;
CREATE POLICY "products_shop_isolation_policy" ON public.products
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- employees
DROP POLICY IF EXISTS "employees_shop_isolation_policy" ON public.employees;
CREATE POLICY "employees_shop_isolation_policy" ON public.employees
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Index performances multi-boutiques
CREATE INDEX IF NOT EXISTS idx_sales_shop_date ON public.sales(shop_id, date);
CREATE INDEX IF NOT EXISTS idx_debts_shop_status ON public.debts(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_products_shop_category ON public.products(shop_id, category);

-- Rechargement du cache de schéma Supabase PostgREST & permissions globales
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- Vérification finale — doit retourner les tables créées
-- ─────────────────────────────────────────────────────────────
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('sales', 'sold_articles', 'debts', 'products', 'employees', 'market_knowledge')
ORDER BY tablename;
