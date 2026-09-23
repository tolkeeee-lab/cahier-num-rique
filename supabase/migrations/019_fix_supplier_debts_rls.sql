-- ==============================================================================
-- Migration 019 : Sécurité RLS & Isolation Multi-Tenant Stricte sur supplier_debts
-- ==============================================================================

-- 1. S'assurer que le Row Level Security est activé sur supplier_debts
ALTER TABLE IF EXISTS public.supplier_debts ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques ouvertes ou permissives
DROP POLICY IF EXISTS "supplier_debts_policy" ON public.supplier_debts;
DROP POLICY IF EXISTS "Allow all access to supplier_debts" ON public.supplier_debts;
DROP POLICY IF EXISTS "supplier_debts_shop_isolation_policy" ON public.supplier_debts;
DROP POLICY IF EXISTS "supplier_debts_strict_tenant_policy" ON public.supplier_debts;

-- 3. Politique d'isolation stricte par boutique pour les dettes fournisseurs
CREATE POLICY "supplier_debts_strict_tenant_policy" ON public.supplier_debts
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
