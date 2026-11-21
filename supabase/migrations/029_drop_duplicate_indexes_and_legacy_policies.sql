-- ==============================================================================
-- Migration 029 : Nettoyage des 4 politiques redondantes + 5 index dupliqués
-- ==============================================================================

-- 1. Supprimer les anciennes politiques permissives redondantes sur shops & employees
DROP POLICY IF EXISTS "shops_authenticated_select" ON public.shops;
DROP POLICY IF EXISTS "shops_owner_write" ON public.shops;
DROP POLICY IF EXISTS "employees_authenticated_select" ON public.employees;
DROP POLICY IF EXISTS "employees_owner_write" ON public.employees;

-- 2. Supprimer les 5 index dupliqués (on conserve les index canoniques idx_*_shop_id)
DROP INDEX IF EXISTS public.idx_debts_shop;
DROP INDEX IF EXISTS public.idx_employees_shop;
DROP INDEX IF EXISTS public.idx_products_shop;
DROP INDEX IF EXISTS public.idx_sales_shop;
DROP INDEX IF EXISTS public.idx_supplier_debts_shop;
