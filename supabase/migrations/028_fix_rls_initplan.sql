-- ==============================================================================
-- Migration 028 : Optimisation auth_rls_initplan (évaluer auth.jwt() 1 fois/requête)
-- ==============================================================================

CREATE OR REPLACE FUNCTION private.current_user_email()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT LOWER(TRIM(COALESCE((SELECT auth.jwt()) ->> 'email', '')))
$$;

REVOKE ALL ON FUNCTION private.current_user_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_user_email() TO authenticated;

ALTER POLICY "employees_member_select"
ON public.employees
USING (
  id = (SELECT auth.uid())
  OR user_id = (SELECT auth.uid())
  OR (
    NULLIF(LOWER(TRIM(email)), '') IS NOT NULL
    AND LOWER(TRIM(email)) = (SELECT private.current_user_email())
  )
  OR shop_id::text IN (SELECT private.user_shop_ids())
);

ALTER POLICY "audit_logs_member_insert"
ON public.audit_logs
WITH CHECK (
  shop_id IS NOT NULL
  AND shop_id::text IN (SELECT private.user_shop_ids())
  AND user_id = (SELECT auth.uid())
  AND (
    user_email IS NULL
    OR LOWER(TRIM(user_email)) = (SELECT private.current_user_email())
  )
);
