-- ==============================================================================
-- Migration 017 : Journal d'Audit Anti-Fraude & Support Retours Marchandises
-- ==============================================================================

-- 1. Table audit_logs pour tracer chaque action sensible (suppression, biffage, retour, clôture)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  target_id VARCHAR(255),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour requêtes performantes par boutique, date et type d'action
CREATE INDEX IF NOT EXISTS idx_audit_logs_shop_created ON public.audit_logs(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 2. Activation de la sécurité RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_audit_logs_select" ON public.audit_logs;
CREATE POLICY "tenant_isolation_audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    shop_id IN (SELECT shop_id FROM public.get_user_authorized_shop_ids())
  );

DROP POLICY IF EXISTS "tenant_isolation_audit_logs_insert" ON public.audit_logs;
CREATE POLICY "tenant_isolation_audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT shop_id FROM public.get_user_authorized_shop_ids())
  );

-- Les entrées d'audit sont immuables : pas d'UPDATE ni de DELETE autorisés par les utilisateurs
DROP POLICY IF EXISTS "tenant_isolation_audit_logs_update" ON public.audit_logs;
DROP POLICY IF EXISTS "tenant_isolation_audit_logs_delete" ON public.audit_logs;
