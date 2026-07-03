-- Extension du schéma pour le Cahier de Caisse Digital

-- 1. Ajouter type et pen_color à la table sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'sale';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS pen_color VARCHAR(50) DEFAULT 'blue';

-- 2. Création de la table supplier_debts (Suivi synthétique des fournisseurs)
CREATE TABLE IF NOT EXISTS public.supplier_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name VARCHAR(255) UNIQUE NOT NULL,
  amount_owed INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, partially_paid
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Création de la table supplier_transactions (Historique détaillé des engagements grossistes)
CREATE TABLE IF NOT EXISTS public.supplier_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL, -- Positif pour les achats à crédit, négatif pour les remboursements
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Index pour les nouvelles tables
CREATE INDEX IF NOT EXISTS idx_supplier_debts_name ON public.supplier_debts(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_name ON public.supplier_transactions(supplier_name);
CREATE INDEX IF NOT EXISTS idx_sales_type ON public.sales(type);

-- 5. Trigger pour mettre à jour automatiquement le updated_at sur supplier_debts
CREATE OR REPLACE FUNCTION update_supplier_debts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_supplier_debts_updated_at_trigger
  BEFORE UPDATE ON public.supplier_debts
  FOR EACH ROW EXECUTE FUNCTION update_supplier_debts_updated_at();
