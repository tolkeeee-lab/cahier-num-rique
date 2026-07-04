-- 1. Ajouter shop_id aux tables principales pour l'isolation multi-tenant (SaaS)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255) DEFAULT 'default-shop';
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255) DEFAULT 'default-shop';
ALTER TABLE public.supplier_debts ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255) DEFAULT 'default-shop';
ALTER TABLE public.supplier_transactions ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255) DEFAULT 'default-shop';

-- 2. Création d'index pour optimiser le filtrage par boutique (shop_id)
CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON public.sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_debts_shop_id ON public.debts(shop_id);
CREATE INDEX IF NOT EXISTS idx_supplier_debts_shop_id ON public.supplier_debts(shop_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_shop_id ON public.supplier_transactions(shop_id);
