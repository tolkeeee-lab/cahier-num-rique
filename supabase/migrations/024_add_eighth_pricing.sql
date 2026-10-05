-- Migration 024 : Ajout de la colonne eighth_package_price aux produits et sales

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS eighth_package_price NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS eighth_package_price NUMERIC DEFAULT 0;
