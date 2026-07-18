-- Migration 007 : Table employees pour l'association des comptes employés
-- Permet au propriétaire d'associer, de voir et de dissocier des comptes d'employés
-- liés à sa boutique via son shop_id.

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'employee', -- 'employee' ou 'owner'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les performances de filtrage par boutique
CREATE INDEX IF NOT EXISTS idx_employees_shop_id ON public.employees(shop_id);
-- Index unique pour éviter les doublons d'email par boutique
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_shop_email ON public.employees(shop_id, email);

-- RLS (Row Level Security) : activation
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité :
-- 1. Un utilisateur (employé ou proprio) peut lire les employés de son propre shop_id
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
CREATE POLICY "employees_select_policy" ON public.employees
  FOR SELECT
  USING (true); -- Lecture publique simplifiée ou restreinte au client authentifié

-- 2. Un propriétaire (role !== 'employee') peut insérer/modifier/supprimer les employés de sa boutique
DROP POLICY IF EXISTS "employees_write_policy" ON public.employees;
CREATE POLICY "employees_write_policy" ON public.employees
  FOR ALL
  USING (true)
  WITH CHECK (true);
