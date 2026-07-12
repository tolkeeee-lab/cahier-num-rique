-- 005_stock_packaging.sql
-- Ajout des champs de conditionnement pour la conversion d'unités de stock

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS multiplier INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packaging_name VARCHAR(100) DEFAULT '';
