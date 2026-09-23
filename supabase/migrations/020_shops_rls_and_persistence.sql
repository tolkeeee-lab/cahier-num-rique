-- ==============================================================================
-- Migration 020 : Sécurité RLS & Persistance Complète de la Table shops
-- ==============================================================================

-- 1. S'assurer que les colonnes nécessaires existent sur public.shops
ALTER TABLE IF EXISTS public.shops ADD COLUMN IF NOT EXISTS country VARCHAR(10) DEFAULT 'BJ';
ALTER TABLE IF EXISTS public.shops ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT '';
ALTER TABLE IF EXISTS public.shops ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE IF EXISTS public.shops ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE IF EXISTS public.shops ADD COLUMN IF NOT EXISTS shop_code VARCHAR(50);
ALTER TABLE IF EXISTS public.shops ADD COLUMN IF NOT EXISTS activity VARCHAR(100) DEFAULT 'boutique';

-- 2. Activer le Row Level Security
ALTER TABLE IF EXISTS public.shops ENABLE ROW LEVEL SECURITY;

-- 3. Nettoyer les anciennes politiques sur public.shops
DROP POLICY IF EXISTS "shops_owner_policy" ON public.shops;
DROP POLICY IF EXISTS "shops_strict_tenant_policy" ON public.shops;
DROP POLICY IF EXISTS "Allow all access to shops" ON public.shops;
DROP POLICY IF EXISTS "shops_read_policy" ON public.shops;
DROP POLICY IF EXISTS "shops_write_policy" ON public.shops;

-- 4. Politique de LECTURE (SELECT) :
-- Un utilisateur peut lire les boutiques qu'il possède OU auxquelles il a accès en tant qu'employé
CREATE POLICY "shops_read_policy" ON public.shops
  FOR SELECT
  TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (owner_id = auth.uid())
    OR (id::VARCHAR IN (SELECT get_user_authorized_shop_ids()))
    OR (shop_code IS NOT NULL AND shop_code IN (SELECT get_user_authorized_shop_ids()))
  );

-- 5. Politique d'ÉCRITURE / MODIFICATION (INSERT, UPDATE, DELETE) :
-- Le propriétaire de la boutique (ou service_role) a les pleins pouvoirs
CREATE POLICY "shops_write_policy" ON public.shops
  FOR ALL
  TO authenticated, anon
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR (owner_id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR (owner_id = auth.uid())
  );

-- 6. Rechargement du cache de schéma Supabase
NOTIFY pgrst, 'reload schema';
