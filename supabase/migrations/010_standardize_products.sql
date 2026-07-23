-- Migration 010 : Standardisation des produits et liaison analytique des ventes

-- 1. Ajouter is_service à la table products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT FALSE;

-- 2. Ajouter les colonnes de standardisation à la table sold_articles
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS product_name_raw VARCHAR(255);
ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS product_name_canonical VARCHAR(255);

-- 3. Initialiser les données existantes pour ne rien perdre
UPDATE public.sold_articles 
SET 
  product_name_raw = COALESCE(product_name_raw, product_name),
  product_name_canonical = COALESCE(product_name_canonical, product_name)
WHERE product_name_raw IS NULL OR product_name_canonical IS NULL;
