-- Migration 009 : Ajout de la colonne category à la table sold_articles pour l'analyse des ventes par catégorie de produits
-- Permet aux propriétaires de voir quelle catégorie de produit se vend le plus et génère le plus de bénéfice/CA.

ALTER TABLE public.sold_articles ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Divers';
