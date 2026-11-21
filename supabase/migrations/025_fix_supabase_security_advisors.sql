-- ==============================================================================
-- Migration 025 : Correction des alertes Supabase Security Advisors
--   - Verrouille search_path sur les fonctions publiques (lint 0011)
--   - Révoque l'accès RPC public sur public.rls_auto_enable() (lints 0028 & 0029)
-- ==============================================================================

ALTER FUNCTION public.update_supplier_debts_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_authorized_shop_ids() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_market_knowledge(text, numeric, numeric, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_market_knowledge(text, integer, integer, text, text) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
