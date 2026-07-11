-- 004_stock.sql
-- Catalogue de produits pour le Gestionnaire de Stock Cahier Numérique

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL DEFAULT 'default-shop',
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Général',
  unit VARCHAR(50) DEFAULT 'unité',
  alert_threshold INTEGER DEFAULT 5,
  initial_stock INTEGER DEFAULT 0,
  unit_cost INTEGER DEFAULT 0,
  unit_price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_shop_id ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- Trigger updated_at (réutilise la fonction déjà créée dans 001_init.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_products_updated_at'
  ) THEN
    CREATE TRIGGER update_products_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
