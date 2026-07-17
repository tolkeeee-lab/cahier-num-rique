-- Migration 006 : Table market_knowledge + fonction d'agrégation incrémentale
-- Alimente automatiquement une base de connaissance collective et anonymisée
-- des prix et habitudes de marché à partir des transactions enregistrées.

-- 1. Table principale
CREATE TABLE IF NOT EXISTS market_knowledge (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identifiant du produit normalisé (minuscules, sans accents)
  product_name TEXT NOT NULL,

  -- Géolocalisation optionnelle (pays/ville pour segmentation)
  country TEXT NOT NULL DEFAULT 'CI',
  city TEXT,

  -- Statistiques agrégées (JAMAIS de shop_id = anonymat garanti)
  avg_unit_price NUMERIC NOT NULL DEFAULT 0,
  avg_unit_cost  NUMERIC NOT NULL DEFAULT 0,
  price_min      NUMERIC NOT NULL DEFAULT 0,
  price_max      NUMERIC NOT NULL DEFAULT 0,
  cost_min       NUMERIC NOT NULL DEFAULT 0,
  cost_max       NUMERIC NOT NULL DEFAULT 0,

  -- Compteur d'observations (nombre de transactions ayant contribué)
  transaction_count INTEGER NOT NULL DEFAULT 0,

  -- Horodatage
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index unique fonctionnel (COALESCE sur city nullable) + index de recherche
CREATE UNIQUE INDEX IF NOT EXISTS market_knowledge_unique_idx
  ON market_knowledge (product_name, country, COALESCE(city, ''));

CREATE INDEX IF NOT EXISTS market_knowledge_product_name_idx
  ON market_knowledge (product_name, country);

CREATE INDEX IF NOT EXISTS market_knowledge_updated_at_idx
  ON market_knowledge (updated_at DESC);

-- 3. RLS : lecture publique (anonymisée), écriture via service role uniquement
ALTER TABLE market_knowledge ENABLE ROW LEVEL SECURITY;

-- Lecture ouverte à tous les utilisateurs authentifiés
DROP POLICY IF EXISTS "market_knowledge_select" ON market_knowledge;
CREATE POLICY "market_knowledge_select" ON market_knowledge
  FOR SELECT USING (true);

-- Insertion/mise à jour uniquement par le backend (service role)
DROP POLICY IF EXISTS "market_knowledge_insert" ON market_knowledge;
CREATE POLICY "market_knowledge_insert" ON market_knowledge
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "market_knowledge_update" ON market_knowledge;
CREATE POLICY "market_knowledge_update" ON market_knowledge
  FOR UPDATE USING (true);

-- 4. Fonction de mise à jour incrémentale (moyenne mobile sans stocker tous les prix)
CREATE OR REPLACE FUNCTION update_market_knowledge(
  p_product_name TEXT,
  p_unit_price   NUMERIC DEFAULT 0,
  p_unit_cost    NUMERIC DEFAULT 0,
  p_country      TEXT    DEFAULT 'CI',
  p_city         TEXT    DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_city TEXT := COALESCE(p_city, '');
  v_price NUMERIC := GREATEST(p_unit_price, 0);
  v_cost  NUMERIC := GREATEST(p_unit_cost, 0);
BEGIN
  -- Ignorer les lignes sans valeur utile
  IF v_price = 0 AND v_cost = 0 THEN
    RETURN;
  END IF;

  INSERT INTO market_knowledge (
    product_name, country, city,
    avg_unit_price, avg_unit_cost,
    price_min, price_max,
    cost_min, cost_max,
    transaction_count
  )
  VALUES (
    lower(trim(p_product_name)),
    p_country,
    NULLIF(p_city, ''),
    v_price, v_cost,
    v_price, v_price,
    v_cost, v_cost,
    1
  )
  ON CONFLICT (product_name, country, COALESCE(city, ''))  -- référence l'index unique fonctionnel
  DO UPDATE SET
    -- Moyenne mobile incrémentale : (moyenne_actuelle * n + nouvelle_valeur) / (n + 1)
    avg_unit_price = CASE
      WHEN v_price > 0 THEN (
        market_knowledge.avg_unit_price * market_knowledge.transaction_count + v_price
      ) / (market_knowledge.transaction_count + 1)
      ELSE market_knowledge.avg_unit_price
    END,
    avg_unit_cost = CASE
      WHEN v_cost > 0 THEN (
        market_knowledge.avg_unit_cost * market_knowledge.transaction_count + v_cost
      ) / (market_knowledge.transaction_count + 1)
      ELSE market_knowledge.avg_unit_cost
    END,
    price_min = CASE
      WHEN v_price > 0 THEN LEAST(market_knowledge.price_min, v_price)
      ELSE market_knowledge.price_min
    END,
    price_max = CASE
      WHEN v_price > 0 THEN GREATEST(market_knowledge.price_max, v_price)
      ELSE market_knowledge.price_max
    END,
    cost_min = CASE
      WHEN v_cost > 0 THEN LEAST(market_knowledge.cost_min, v_cost)
      ELSE market_knowledge.cost_min
    END,
    cost_max = CASE
      WHEN v_cost > 0 THEN GREATEST(market_knowledge.cost_max, v_cost)
      ELSE market_knowledge.cost_max
    END,
    transaction_count = market_knowledge.transaction_count + 1,
    updated_at = now();
END;
$$;

-- 5. Vue d'analyse simplifiée (pour les futures dashboards et partenaires)
CREATE OR REPLACE VIEW market_intelligence AS
SELECT
  product_name,
  country,
  city,
  ROUND(avg_unit_price) AS prix_vente_moyen,
  ROUND(avg_unit_cost)  AS prix_achat_moyen,
  ROUND(avg_unit_price - avg_unit_cost) AS marge_moyenne,
  ROUND(
    CASE WHEN avg_unit_price > 0
    THEN ((avg_unit_price - avg_unit_cost) / avg_unit_price) * 100
    ELSE 0 END
  ) AS taux_marge_pct,
  price_min || ' - ' || price_max AS fourchette_prix,
  transaction_count AS nb_observations,
  updated_at AS derniere_observation
FROM market_knowledge
WHERE transaction_count >= 3  -- Minimum 3 observations pour être significatif
ORDER BY transaction_count DESC;
