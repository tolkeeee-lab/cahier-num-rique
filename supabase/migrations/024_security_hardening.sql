-- ==============================================================================
-- Migration 024 : Durcissement Sécurité Post-Audit (RBAC RLS, Cleanup, RPC)
--
-- Corrige les failles identifiées par l'audit de sécurité (run-1) :
--   1. Isolation stricte de public.supplier_transactions (suppression USING (true)).
--   2. Suppression idempotente de toutes les anciennes politiques (011/015/019/020/022).
--   3. Correction de private.user_shop_role() (ajout de e.user_id = auth.uid()).
--   4. Séparation RBAC Patron vs Employé sur les tables métier (DELETE réservé au patron,
--      gestion catalogue/fournisseurs/courses/clôtures Z réservée au patron).
--   5. Anti-falsification sur public.audit_logs (user_id et user_email liés au JWT).
--   6. Révocation et suppression de la RPC SECURITY DEFINER public.resolve_shop_uuid().
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Corriger private.user_shop_role(TEXT) pour vérifier aussi e.user_id
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
          e.user_id = (SELECT auth.uid())
          OR e.id = (SELECT auth.uid())
          OR (
            NULLIF(LOWER(TRIM(e.email)), '') IS NOT NULL
            AND LOWER(TRIM(e.email)) = LOWER(TRIM(COALESCE((SELECT auth.jwt()->>'email'), '')))
          )
        )
      LIMIT 1
    )
  END
$$;

REVOKE ALL ON FUNCTION private.user_shop_role(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.user_shop_role(TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. Supprimer la RPC SECURITY DEFINER public.resolve_shop_uuid (énumération UUID)
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.resolve_shop_uuid(TEXT) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.resolve_shop_uuid(TEXT);

-- ------------------------------------------------------------------------------
-- 3. Nettoyage idempotent des anciennes politiques permissives (011/015/019/020/022)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "sales_strict_tenant_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_member_policy" ON public.sales;

DROP POLICY IF EXISTS "sold_articles_strict_tenant_policy" ON public.sold_articles;
DROP POLICY IF EXISTS "sold_articles_member_policy" ON public.sold_articles;

DROP POLICY IF EXISTS "products_strict_tenant_policy" ON public.products;
DROP POLICY IF EXISTS "products_member_policy" ON public.products;

DROP POLICY IF EXISTS "debts_strict_tenant_policy" ON public.debts;
DROP POLICY IF EXISTS "debts_member_policy" ON public.debts;

DROP POLICY IF EXISTS "supplier_debts_strict_tenant_policy" ON public.supplier_debts;
DROP POLICY IF EXISTS "supplier_debts_member_policy" ON public.supplier_debts;

DROP POLICY IF EXISTS "shopping_list_strict_tenant_policy" ON public.shopping_list;
DROP POLICY IF EXISTS "shopping_list_member_policy" ON public.shopping_list;

DROP POLICY IF EXISTS "cash_closings_member_policy" ON public.cash_closings;

DROP POLICY IF EXISTS "shops_read_policy" ON public.shops;
DROP POLICY IF EXISTS "shops_write_policy" ON public.shops;

DROP POLICY IF EXISTS "market_knowledge_anon_authenticated_all" ON public.market_knowledge;

-- ------------------------------------------------------------------------------
-- 4. Durcissement public.supplier_transactions (table oubliée en 023)
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.supplier_transactions') IS NOT NULL THEN
    ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "supplier_transactions_policy" ON public.supplier_transactions;
    DROP POLICY IF EXISTS "supplier_transactions_owner_policy" ON public.supplier_transactions;
    CREATE POLICY "supplier_transactions_owner_policy"
    ON public.supplier_transactions
    FOR ALL
    TO authenticated
    USING (
      shop_id IS NOT NULL
      AND shop_id IN (SELECT private.user_shop_ids())
      AND private.user_shop_role(shop_id) = 'owner'
    )
    WITH CHECK (
      shop_id IS NOT NULL
      AND shop_id IN (SELECT private.user_shop_ids())
      AND private.user_shop_role(shop_id) = 'owner'
    );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. RBAC RLS : Ventes, Articles vendus & Dettes clients
--    - Employés : SELECT, INSERT, UPDATE (Cahier, Historique, Dettes)
--    - Patron uniquement : DELETE
-- ------------------------------------------------------------------------------

CREATE POLICY "sales_member_select" ON public.sales FOR SELECT TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()));

CREATE POLICY "sales_member_insert" ON public.sales FOR INSERT TO authenticated
WITH CHECK (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()));

CREATE POLICY "sales_member_update" ON public.sales FOR UPDATE TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()))
WITH CHECK (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()));

CREATE POLICY "sales_owner_delete" ON public.sales FOR DELETE TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner');

CREATE POLICY "sold_articles_member_select" ON public.sold_articles FOR SELECT TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()));

CREATE POLICY "sold_articles_member_insert" ON public.sold_articles FOR INSERT TO authenticated
WITH CHECK (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()));

CREATE POLICY "sold_articles_member_update" ON public.sold_articles FOR UPDATE TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()))
WITH CHECK (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()));

CREATE POLICY "sold_articles_owner_delete" ON public.sold_articles FOR DELETE TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner');

CREATE POLICY "debts_member_select" ON public.debts FOR SELECT TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()));

CREATE POLICY "debts_member_insert" ON public.debts FOR INSERT TO authenticated
WITH CHECK (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()));

CREATE POLICY "debts_member_update" ON public.debts FOR UPDATE TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()))
WITH CHECK (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()));

CREATE POLICY "debts_owner_delete" ON public.debts FOR DELETE TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner');

-- ------------------------------------------------------------------------------
-- 6. RBAC RLS : Catalogue Produits (Stock)
--    - Employés : SELECT uniquement (pour les raccourcis tactiles du Cahier)
--    - Patron uniquement : INSERT, UPDATE, DELETE
-- ------------------------------------------------------------------------------

CREATE POLICY "products_member_select" ON public.products FOR SELECT TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()));

CREATE POLICY "products_owner_insert" ON public.products FOR INSERT TO authenticated
WITH CHECK (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner');

CREATE POLICY "products_owner_update" ON public.products FOR UPDATE TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner')
WITH CHECK (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner');

CREATE POLICY "products_owner_delete" ON public.products FOR DELETE TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner');

-- ------------------------------------------------------------------------------
-- 7. RBAC RLS : Dettes Fournisseurs, Courses & Clôtures Z (Patron uniquement)
-- ------------------------------------------------------------------------------

CREATE POLICY "supplier_debts_owner_all" ON public.supplier_debts FOR ALL TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner')
WITH CHECK (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner');

CREATE POLICY "shopping_list_owner_all" ON public.shopping_list FOR ALL TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner')
WITH CHECK (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner');

CREATE POLICY "cash_closings_owner_all" ON public.cash_closings FOR ALL TO authenticated
USING (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner')
WITH CHECK (shop_id IS NOT NULL AND shop_id IN (SELECT private.user_shop_ids()) AND private.user_shop_role(shop_id) = 'owner');

-- ------------------------------------------------------------------------------
-- 8. Anti-falsification sur public.audit_logs
--    - SELECT réservé au patron
--    - INSERT autorisé aux membres mais user_id = auth.uid() et user_email = JWT email
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "audit_logs_member_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_member_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_owner_select"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
  AND private.user_shop_role(shop_id) = 'owner'
);

CREATE POLICY "audit_logs_member_insert"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  shop_id IS NOT NULL
  AND shop_id IN (SELECT private.user_shop_ids())
  AND user_id = (SELECT auth.uid())
  AND (
    user_email IS NULL
    OR LOWER(TRIM(user_email)) = LOWER(TRIM(COALESCE((SELECT auth.jwt()->>'email'), '')))
  )
);
