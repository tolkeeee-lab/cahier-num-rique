-- ==============================================================================
-- Migration 030 : Ajout de la colonne tracking_started_at sur public.products
--   Utilisée par GET/POST/PATCH /api/stock pour démarrer le suivi de stock
--   à la date d'ajout/inventaire sans déduire d'anciennes ventes antérieures.
-- ==============================================================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS tracking_started_at TIMESTAMPTZ;
