-- Migration 008 : Ajout de la colonne category à la table sales pour classer les dépenses
-- Permet aux propriétaires de filtrer et visualiser la répartition de leurs charges courantes.

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Divers';
