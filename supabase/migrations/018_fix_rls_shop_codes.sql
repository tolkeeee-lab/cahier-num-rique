-- ==============================================================================
-- Migration 018 : Correction RLS & Prise en charge universelle des codes boutiques (BTQ-, SHOP-, UUID)
-- ==============================================================================

DROP FUNCTION IF EXISTS public.get_user_authorized_shop_ids() CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_authorized_shop_ids()
RETURNS TABLE (shop_id VARCHAR) AS $
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')));
  v_role TEXT := COALESCE(auth.jwt()->>'role', '');
BEGIN
  -- Service role (backend) : accès total
  IF v_role = 'service_role' THEN
    RETURN QUERY 
      SELECT id::VARCHAR FROM public.shops
      UNION
      SELECT shop_code::VARCHAR FROM public.shops WHERE shop_code IS NOT NULL;
    RETURN;
  END IF;

  -- 1. Boutiques possédées par l'utilisateur (UUID + code court + préfixes SHOP- et BTQ-)
  IF v_uid IS NOT NULL THEN
    RETURN QUERY 
      SELECT s.id::VARCHAR FROM public.shops s WHERE s.owner_id = v_uid
      UNION
      SELECT s.shop_code::VARCHAR FROM public.shops s WHERE s.owner_id = v_uid AND s.shop_code IS NOT NULL
      UNION
      SELECT ('SHOP-' || s.shop_code)::VARCHAR FROM public.shops s WHERE s.owner_id = v_uid AND s.shop_code IS NOT NULL
      UNION
      SELECT ('BTQ-' || s.shop_code)::VARCHAR FROM public.shops s WHERE s.owner_id = v_uid AND s.shop_code IS NOT NULL
      UNION
      SELECT ('SHOP-' || s.id::VARCHAR)::VARCHAR FROM public.shops s WHERE s.owner_id = v_uid
      UNION
      SELECT ('BTQ-' || s.id::VARCHAR)::VARCHAR FROM public.shops s WHERE s.owner_id = v_uid;
  END IF;

  -- 2. Boutiques où l'utilisateur est employé (shop_id direct + alias de la boutique correspondante)
  IF v_email <> '' THEN
    RETURN QUERY 
      SELECT e.shop_id::VARCHAR FROM public.employees e WHERE LOWER(TRIM(e.email)) = v_email
      UNION
      SELECT s.id::VARCHAR FROM public.employees e 
        JOIN public.shops s ON (s.id::VARCHAR = e.shop_id OR s.shop_code = e.shop_id OR ('BTQ-' || s.shop_code) = e.shop_id OR ('SHOP-' || s.shop_code) = e.shop_id)
        WHERE LOWER(TRIM(e.email)) = v_email
      UNION
      SELECT s.shop_code::VARCHAR FROM public.employees e 
        JOIN public.shops s ON (s.id::VARCHAR = e.shop_id OR s.shop_code = e.shop_id OR ('BTQ-' || s.shop_code) = e.shop_id OR ('SHOP-' || s.shop_code) = e.shop_id)
        WHERE LOWER(TRIM(e.email)) = v_email AND s.shop_code IS NOT NULL
      UNION
      SELECT ('BTQ-' || s.shop_code)::VARCHAR FROM public.employees e 
        JOIN public.shops s ON (s.id::VARCHAR = e.shop_id OR s.shop_code = e.shop_id OR ('BTQ-' || s.shop_code) = e.shop_id OR ('SHOP-' || s.shop_code) = e.shop_id)
        WHERE LOWER(TRIM(e.email)) = v_email AND s.shop_code IS NOT NULL;
  END IF;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_authorized_shop_ids() TO authenticated, anon;
