-- 012_add_lot_pricing_to_products.sql
-- Ajout de la tarification dégressive par lot optionnelle sur chaque produit du stock

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lot_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lot_price INTEGER DEFAULT 0;

COMMENT ON COLUMN public.products.lot_quantity IS 'Quantité du lot dégressif (ex: 3 pour 3 œufs)';
COMMENT ON COLUMN public.products.lot_price IS 'Prix global du lot dégressif (ex: 275 FCFA les 3 œufs)';
