-- ==============================================================================
-- Migration 027 : Ajout des index manquants sur clés étrangères (Performance)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_sold_articles_product_id ON public.sold_articles (product_id);
