-- ==============================================================================
-- Migration 015 : Isolation Multi-Tenant Stricte, Table ShoppingList et Sécurité RLS
-- ==============================================================================

-- 1. Table des courses partagées (shopping_list)
CREATE TABLE IF NOT EXISTS public.shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  is_wholesale BOOLEAN DEFAULT false,
  wholesale_qty NUMERIC DEFAULT 0,
  wholesale_price NUMERIC DEFAULT 0,
  items_per_wholesale NUMERIC DEFAULT 1,
  is_checked BOOLEAN DEFAULT false,
  category VARCHAR(100) DEFAULT 'Général',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_shop ON public.shopping_list(shop_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_checked ON public.shopping_list(is_checked);

-- 2. Fonction de résolution des boutiques autorisées pour l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_user_authorized_shop_ids()
RETURNS TABLE (shop_id VARCHAR) AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')));
  v_role TEXT := COALESCE(auth.jwt()->>'role', '');
BEGIN
  -- Si c'est le compte de service (backend Next.js avec SERVICE_ROLE_KEY)
  IF v_role = 'service_role' THEN
    RETURN QUERY SELECT id::VARCHAR FROM public.shops;
    RETURN;
  END IF;

  -- 1. Boutiques possédées par l'utilisateur
  IF v_uid IS NOT NULL THEN
    RETURN QUERY 
      SELECT s.id::VARCHAR 
      FROM public.shops s 
      WHERE s.owner_id = v_uid;
  END IF;

  -- 2. Boutiques où l'utilisateur est enregistré comme employé
  IF v_email <> '' THEN
    RETURN QUERY 
      SELECT e.shop_id::VARCHAR 
      FROM public.employees e 
      WHERE LOWER(TRIM(e.email)) = v_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Activation et renforcement RLS hermétique sur les tables métiers

-- Table: sales
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_shop_isolation_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_strict_tenant_policy" ON public.sales;

CREATE POLICY "sales_strict_tenant_policy" ON public.sales
  FOR ALL
  TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (
      shop_id IS NOT NULL 
      AND (
        shop_id IN (SELECT get_user_authorized_shop_ids())
        OR shop_id = COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-shop-id', ''), 'NO_HEADER_MATCH')
      )
    )
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (
      shop_id IS NOT NULL 
      AND (
        shop_id IN (SELECT get_user_authorized_shop_ids())
        OR shop_id = COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-shop-id', ''), 'NO_HEADER_MATCH')
      )
    )
  );

-- Table: sold_articles
ALTER TABLE IF EXISTS public.sold_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sold_articles_shop_isolation_policy" ON public.sold_articles;
DROP POLICY IF EXISTS "sold_articles_strict_tenant_policy" ON public.sold_articles;

CREATE POLICY "sold_articles_strict_tenant_policy" ON public.sold_articles
  FOR ALL
  TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sold_articles.sale_id
      AND (
        s.shop_id IN (SELECT get_user_authorized_shop_ids())
        OR s.shop_id = COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-shop-id', ''), 'NO_HEADER_MATCH')
      )
    )
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sold_articles.sale_id
      AND (
        s.shop_id IN (SELECT get_user_authorized_shop_ids())
        OR s.shop_id = COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-shop-id', ''), 'NO_HEADER_MATCH')
      )
    )
  );

-- Table: products
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_shop_isolation_policy" ON public.products;
DROP POLICY IF EXISTS "products_strict_tenant_policy" ON public.products;

CREATE POLICY "products_strict_tenant_policy" ON public.products
  FOR ALL
  TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (
      shop_id IS NOT NULL 
      AND (
        shop_id IN (SELECT get_user_authorized_shop_ids())
        OR shop_id = COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-shop-id', ''), 'NO_HEADER_MATCH')
      )
    )
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (
      shop_id IS NOT NULL 
      AND (
        shop_id IN (SELECT get_user_authorized_shop_ids())
        OR shop_id = COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-shop-id', ''), 'NO_HEADER_MATCH')
      )
    )
  );

-- Table: debts
ALTER TABLE IF EXISTS public.debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "debts_shop_isolation_policy" ON public.debts;
DROP POLICY IF EXISTS "debts_strict_tenant_policy" ON public.debts;

CREATE POLICY "debts_strict_tenant_policy" ON public.debts
  FOR ALL
  TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (
      shop_id IS NOT NULL 
      AND (
        shop_id IN (SELECT get_user_authorized_shop_ids())
        OR shop_id = COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-shop-id', ''), 'NO_HEADER_MATCH')
      )
    )
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (
      shop_id IS NOT NULL 
      AND (
        shop_id IN (SELECT get_user_authorized_shop_ids())
        OR shop_id = COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-shop-id', ''), 'NO_HEADER_MATCH')
      )
    )
  );

-- Table: shopping_list
ALTER TABLE IF EXISTS public.shopping_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shopping_list_strict_tenant_policy" ON public.shopping_list;

CREATE POLICY "shopping_list_strict_tenant_policy" ON public.shopping_list
  FOR ALL
  TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (
      shop_id IS NOT NULL 
      AND (
        shop_id IN (SELECT get_user_authorized_shop_ids())
        OR shop_id = COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-shop-id', ''), 'NO_HEADER_MATCH')
      )
    )
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (
      shop_id IS NOT NULL 
      AND (
        shop_id IN (SELECT get_user_authorized_shop_ids())
        OR shop_id = COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-shop-id', ''), 'NO_HEADER_MATCH')
      )
    )
  );

-- 4. Déclencheur automatique pour synchroniser updated_at sur shopping_list
DROP TRIGGER IF EXISTS update_shopping_list_updated_at ON public.shopping_list;
CREATE TRIGGER update_shopping_list_updated_at BEFORE UPDATE ON public.shopping_list
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
