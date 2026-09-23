-- ==============================================================================
-- Migration 021 : Unification Totale des shop_id vers l'UUID Unique de Boutique
-- ==============================================================================

-- 1. S'assurer que chaque boutique a un shop_code propre et standardisé (ex: BTQ-58C54)
UPDATE public.shops
SET shop_code = 'BTQ-' || UPPER(SUBSTRING(REPLACE(id::TEXT, '-', ''), 1, 5))
WHERE shop_code IS NULL OR shop_code = '' OR shop_code NOT LIKE 'BTQ-%';

-- 2. Fonction utilitaire d'unification pour convertir tout code textuel en UUID
CREATE OR REPLACE FUNCTION public.resolve_shop_uuid(input_id TEXT)
RETURNS UUID AS $$
DECLARE
  v_uuid UUID;
  v_clean TEXT;
BEGIN
  IF input_id IS NULL OR input_id = '' THEN
    RETURN NULL;
  END IF;

  -- A. Si c'est déjà un UUID valide
  BEGIN
    v_uuid := input_id::UUID;
    IF EXISTS (SELECT 1 FROM public.shops WHERE id = v_uuid) THEN
      RETURN v_uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_uuid := NULL;
  END;

  v_clean := UPPER(TRIM(REGEXP_REPLACE(input_id, '^(BTQ-|SHOP-)', '', 'i')));

  -- B. Chercher dans shops par shop_code
  SELECT id INTO v_uuid
  FROM public.shops
  WHERE shop_code = ('BTQ-' || v_clean)
     OR shop_code = v_clean
     OR id::TEXT ILIKE (v_clean || '%')
  LIMIT 1;

  IF v_uuid IS NOT NULL THEN
    RETURN v_uuid;
  END IF;

  -- C. Chercher dans employees si un patron possède ce code
  SELECT shop_id::UUID INTO v_uuid
  FROM public.employees
  WHERE role = 'owner'
    AND (shop_id ILIKE ('%' || v_clean || '%') OR id::TEXT ILIKE (v_clean || '%'))
    AND shop_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  LIMIT 1;

  RETURN v_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Migration rétroactive des employés vers le vrai UUID de boutique
UPDATE public.employees e
SET shop_id = s.id::TEXT
FROM public.shops s
WHERE e.shop_id IS NOT NULL
  AND e.shop_id NOT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    s.shop_code = e.shop_id
    OR s.shop_code = ('BTQ-' || UPPER(TRIM(REGEXP_REPLACE(e.shop_id, '^(BTQ-|SHOP-)', '', 'i'))))
    OR s.id::TEXT ILIKE (UPPER(TRIM(REGEXP_REPLACE(e.shop_id, '^(BTQ-|SHOP-)', '', 'i'))) || '%')
  );

-- 4. Migration rétroactive des ventes vers le vrai UUID de boutique
UPDATE public.sales sl
SET shop_id = s.id::TEXT
FROM public.shops s
WHERE sl.shop_id IS NOT NULL
  AND sl.shop_id NOT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    s.shop_code = sl.shop_id
    OR s.shop_code = ('BTQ-' || UPPER(TRIM(REGEXP_REPLACE(sl.shop_id, '^(BTQ-|SHOP-)', '', 'i'))))
    OR s.id::TEXT ILIKE (UPPER(TRIM(REGEXP_REPLACE(sl.shop_id, '^(BTQ-|SHOP-)', '', 'i'))) || '%')
  );

-- 5. Migration rétroactive des articles vendus
UPDATE public.sold_articles sa
SET shop_id = s.id::TEXT
FROM public.shops s
WHERE sa.shop_id IS NOT NULL
  AND sa.shop_id NOT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    s.shop_code = sa.shop_id
    OR s.shop_code = ('BTQ-' || UPPER(TRIM(REGEXP_REPLACE(sa.shop_id, '^(BTQ-|SHOP-)', '', 'i'))))
    OR s.id::TEXT ILIKE (UPPER(TRIM(REGEXP_REPLACE(sa.shop_id, '^(BTQ-|SHOP-)', '', 'i'))) || '%')
  );

-- 6. Migration rétroactive des produits de stock
UPDATE public.products p
SET shop_id = s.id::TEXT
FROM public.shops s
WHERE p.shop_id IS NOT NULL
  AND p.shop_id NOT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    s.shop_code = p.shop_id
    OR s.shop_code = ('BTQ-' || UPPER(TRIM(REGEXP_REPLACE(p.shop_id, '^(BTQ-|SHOP-)', '', 'i'))))
    OR s.id::TEXT ILIKE (UPPER(TRIM(REGEXP_REPLACE(p.shop_id, '^(BTQ-|SHOP-)', '', 'i'))) || '%')
  );

-- 7. Migration rétroactive des dettes clients & fournisseurs
UPDATE public.debts d
SET shop_id = s.id::TEXT
FROM public.shops s
WHERE d.shop_id IS NOT NULL
  AND d.shop_id NOT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    s.shop_code = d.shop_id
    OR s.shop_code = ('BTQ-' || UPPER(TRIM(REGEXP_REPLACE(d.shop_id, '^(BTQ-|SHOP-)', '', 'i'))))
    OR s.id::TEXT ILIKE (UPPER(TRIM(REGEXP_REPLACE(d.shop_id, '^(BTQ-|SHOP-)', '', 'i'))) || '%')
  );

UPDATE public.supplier_debts sd
SET shop_id = s.id::TEXT
FROM public.shops s
WHERE sd.shop_id IS NOT NULL
  AND sd.shop_id NOT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    s.shop_code = sd.shop_id
    OR s.shop_code = ('BTQ-' || UPPER(TRIM(REGEXP_REPLACE(sd.shop_id, '^(BTQ-|SHOP-)', '', 'i'))))
    OR s.id::TEXT ILIKE (UPPER(TRIM(REGEXP_REPLACE(sd.shop_id, '^(BTQ-|SHOP-)', '', 'i'))) || '%')
  );

-- 8. Migration rétroactive des clôtures de caisse
UPDATE public.cash_closings cc
SET shop_id = s.id::TEXT
FROM public.shops s
WHERE cc.shop_id IS NOT NULL
  AND cc.shop_id NOT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    s.shop_code = cc.shop_id
    OR s.shop_code = ('BTQ-' || UPPER(TRIM(REGEXP_REPLACE(cc.shop_id, '^(BTQ-|SHOP-)', '', 'i'))))
    OR s.id::TEXT ILIKE (UPPER(TRIM(REGEXP_REPLACE(cc.shop_id, '^(BTQ-|SHOP-)', '', 'i'))) || '%')
  );

-- 9. Notification schema reload
NOTIFY pgrst, 'reload schema';
