-- ==============================================================================
-- Migration 023 : Durcissement de l'isolation multi-boutiques
--
-- Objectif :
--   1. Une identité Supabase authentifiée est la seule source d'identité.
--   2. Une boutique est autorisée uniquement si l'utilisateur en est propriétaire
--      ou possède une ligne employees liée à son auth.uid().
--   3. Le rôle/email envoyé par le navigateur ne sert jamais de preuve.
--   4. Les données privées ne sont plus accessibles au rôle anon.
--   5. Les fonctions SECURITY DEFINER sont isolées dans un schéma privé.
--
-- Les shop_id restent VARCHAR pour compatibilité avec le schéma actuel.
-- La migration 021 a déjà normalisé les valeurs vers les UUID des boutiques.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ------------------------------------------------------------------------------
-- 1. Calcul central des boutiques de l'utilisateur connecté
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.user_shop_ids()
RETURNS SETOF TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id::text
  FROM public.shops AS s
  WHERE s.owner_id = (SELECT auth.uid())

  UNION

  SELECT e.shop_id::text
  FROM public.employees AS e
  WHERE e.shop_id IS NOT NULL
    AND (
      e.id = (SELECT auth.uid())
      OR (
        NULLIF(LOWER(TRIM(e.email)), '') IS NOT NULL
        AND LOWER(TRIM(e.email)) = LOWER(TRIM(COALESCE((SELECT auth.jwt()->>'email'), '')))
      )
    )
$$;

REVOKE ALL ON FUNCTION private.user_shop_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.user_shop_ids() TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. Rôle applicatif dans une boutique
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.user_shop_role(p_shop_id TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.shops AS s
      WHERE s.id::text = p_shop_id
        AND s.owner_id = (SELECT auth.uid())
    ) THEN 'owner'
    ELSE (
      SELECT LOWER(COALESCE(e.role, 'employee'))
      FROM public.employees AS e
      WHERE e.shop_id = p_shop_id
        AND (
          e.id = (SELECT auth.uid())
          OR (
            NULLIF(LOWER(TRIM(e.email)), '') IS NOT NULL
            AND LOWER(TRIM(e.email)) = LOWER(TRIM(COALESCE((SELECT auth.jwt()->>'email'), '')))
          )
        )
      LIMIT 1
    )
  END
$$;

REVOKE ALL ON FUNCTION private.user_shop_role(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.user_shop_role(TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. Retirer l'ancien mécanisme trop permissif
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.get_user_authorized_shop_ids() FROM anon;
REVOKE ALL ON FUNCTION public.get_user_authorized_shop_ids() FROM authenticated;

-- ------------------------------------------------------------------------------
-- 4. Les tables privées ne doivent plus être accessibles à anon.
-- Le service_role reste destiné au backend et contourne RLS par conception.
-- ------------------------------------------------------------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- ------------------------------------------------------------------------------
-- 5. Shops
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shops_unified_select" ON public.shops;
DROP POLICY IF EXISTS "shops_unified_write" ON public.shops;

CREATE POLICY "shops_member_select"
ON public.shops
FOR SELECT
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
  OR id::text IN (SELECT private.user_shop_ids())
);

CREATE POLICY "shops_owner_insert"
ON public.shops
FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = (SELECT auth.uid())
);

CREATE POLICY "shops_owner_update"
ON public.shops
FOR UPDATE
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
)
WITH CHECK (
  owner_id = (SELECT auth.uid())
);

CREATE POLICY "shops_owner_delete"
ON public.shops
FOR DELETE
TO authenticated
USING (
  owner_id = (SELECT auth.uid())
);

-- ------------------------------------------------------------------------------
-- 6. Employees
--
-- Un employé peut consulter son propre enregistrement.
-- Un propriétaire peut gérer les employés de sa boutique.
-- Un employé ne peut plus changer lui-même son shop_id ou son rôle via RLS.
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_unified_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_write_policy" ON public.employees;

CREATE POLICY "employees_member_select"
ON public.employees
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR (
    NULLIF(LOWER(TRIM(email)), '') IS NOT NULL
    AND LOWER(TRIM(email)) = LOWER(TRIM(COALESCE((SELECT auth.jwt()->>'email'), '')))
  )
  OR shop_id IN (SELECT private.user_shop_ids())
);

CREATE POLICY "employees_owner_insert"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  shop_id IN (SELECT private.user_shop_ids())
  AND EXISTS (
    SELECT 1
    FROM public.shops AS s
    WHERE s.id::text = employees.shop_id
      AND s.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "employees_owner_update"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.shops AS s
    WHERE s.id::text = employees.shop_id
      AND s.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.shops AS s
    WHERE s.id::text = employees.shop_id
      AND s.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "employees_owner_delete"
ON public.employees
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.shops AS s
    WHERE s.id::text = employees.shop_id
      AND s.owner_id = (SELECT auth.uid())
  )
);

-- ------------------------------------------------------------------------------
-- 7. Isolation standard des tables métier
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sold_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplier_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cash_closings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_unified_policy" ON public.sales;
CREATE POLICY "sales_member_policy"
ON public.sales
FOR ALL TO authenticated
USING (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
)
WITH CHECK (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
);

DROP POLICY IF EXISTS "sold_articles_unified_policy" ON public.sold_articles;
CREATE POLICY "sold_articles_member_policy"
ON public.sold_articles
FOR ALL TO authenticated
USING (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
)
WITH CHECK (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
);

DROP POLICY IF EXISTS "products_unified_policy" ON public.products;
CREATE POLICY "products_member_policy"
ON public.products
FOR ALL TO authenticated
USING (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
)
WITH CHECK (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
);

DROP POLICY IF EXISTS "debts_unified_policy" ON public.debts;
CREATE POLICY "debts_member_policy"
ON public.debts
FOR ALL TO authenticated
USING (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
)
WITH CHECK (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
);

DROP POLICY IF EXISTS "supplier_debts_unified_policy" ON public.supplier_debts;
CREATE POLICY "supplier_debts_member_policy"
ON public.supplier_debts
FOR ALL TO authenticated
USING (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
)
WITH CHECK (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
);

DROP POLICY IF EXISTS "shopping_list_unified_policy" ON public.shopping_list;
CREATE POLICY "shopping_list_member_policy"
ON public.shopping_list
FOR ALL TO authenticated
USING (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
)
WITH CHECK (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
);

DROP POLICY IF EXISTS "cash_closings_unified_policy" ON public.cash_closings;
CREATE POLICY "cash_closings_member_policy"
ON public.cash_closings
FOR ALL TO authenticated
USING (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
)
WITH CHECK (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
);

NOTIFY pgrst, 'reload schema';
