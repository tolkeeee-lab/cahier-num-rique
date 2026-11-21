-- ==============================================================================
-- Migration 026 : Suppression des anciennes politiques permissives *_tenant_policy
--   PostgreSQL combine les politiques RLS permissives en OU (OR) : la présence
--   des anciennes politiques *_tenant_policy (FOR ALL) contournait le RBAC 024.
-- ==============================================================================

DROP POLICY IF EXISTS "audit_logs_authenticated_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_authenticated_select" ON public.audit_logs;
DROP POLICY IF EXISTS "cash_closings_tenant_policy" ON public.cash_closings;
DROP POLICY IF EXISTS "debts_tenant_policy" ON public.debts;
DROP POLICY IF EXISTS "products_tenant_policy" ON public.products;
DROP POLICY IF EXISTS "sales_tenant_policy" ON public.sales;
DROP POLICY IF EXISTS "shopping_list_tenant_policy" ON public.shopping_list;
DROP POLICY IF EXISTS "sold_articles_tenant_policy" ON public.sold_articles;
DROP POLICY IF EXISTS "supplier_debts_tenant_policy" ON public.supplier_debts;
DROP POLICY IF EXISTS "supplier_transactions_tenant_policy" ON public.supplier_transactions;
