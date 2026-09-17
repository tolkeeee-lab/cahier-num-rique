-- 014_add_multi_tier_pricing.sql
-- Support complet de la tarification multi-paliers (Détail, Demi-carton, Quart de carton, Carton complet)

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS packages_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS package_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS wholesale_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS half_package_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quarter_package_price INTEGER DEFAULT 0;

COMMENT ON COLUMN public.products.packages_count IS 'Nombre de cartons ou colis achetés';
COMMENT ON COLUMN public.products.package_cost IS 'Prix d achat par carton ou colis';
COMMENT ON COLUMN public.products.wholesale_price IS 'Prix de revente au carton complet (gros)';
COMMENT ON COLUMN public.products.half_package_price IS 'Prix de revente au demi-carton (1/2)';
COMMENT ON COLUMN public.products.quarter_package_price IS 'Prix de revente au quart de carton (1/4)';
