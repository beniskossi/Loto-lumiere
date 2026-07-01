-- Extension des tables pour les formules algorithmiques améliorées

-- Ajouter les colonnes de breakdown des formules à precalculated_predictions
ALTER TABLE public.precalculated_predictions
ADD COLUMN IF NOT EXISTS formulas_breakdown jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS enhanced_narratives text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS top_pairs jsonb DEFAULT NULL;

-- Ajouter les configurations pour les nouvelles formules dans algorithm_config
INSERT INTO public.algorithm_config (algorithm_name, description, is_enabled, weight, parameters)
VALUES 
  ('WeightedFrequency', 'Fréquence pondérée par récence (λ=0.05)', true, 0.30, '{"lambda": 0.05, "hot_boost": 1.20}'::jsonb),
  ('RecurrentPairs', 'Détection de paires récurrentes (G_max=30)', true, 0.15, '{"max_gap": 30, "echo_range": [7, 21]}'::jsonb),
  ('AdaptiveGap', 'Prédicteur de gap adaptatif (seuil Z>1.2)', true, 0.25, '{"z_threshold": 1.2, "target_sum": 219}'::jsonb),
  ('SumParityBalance', 'Équilibre somme-parité (E<25)', true, 0.10, '{"target_sum": 219, "target_parity": 2, "threshold": 25}'::jsonb),
  ('InterDrawEcho', 'Échos inter-tirages (δ=0.1)', true, 0.20, '{"decay": 0.1, "lookback": 3, "boost_threshold": 0.3}'::jsonb)
ON CONFLICT (algorithm_name) DO UPDATE SET
  description = EXCLUDED.description,
  parameters = EXCLUDED.parameters,
  updated_at = now();

-- Vue matérialisée pour les statistiques améliorées (gaps et paires pré-calculés)
DROP MATERIALIZED VIEW IF EXISTS mv_enhanced_stats;

CREATE MATERIALIZED VIEW mv_enhanced_stats AS
WITH number_gaps AS (
  SELECT 
    dr.draw_name,
    num.number,
    dr.draw_date,
    LAG(dr.draw_date) OVER (PARTITION BY dr.draw_name, num.number ORDER BY dr.draw_date) as prev_date,
    dr.draw_date - LAG(dr.draw_date) OVER (PARTITION BY dr.draw_name, num.number ORDER BY dr.draw_date) as gap_days
  FROM draw_results dr
  CROSS JOIN LATERAL unnest(dr.winning_numbers) AS num(number)
),
gap_stats AS (
  SELECT 
    draw_name,
    number,
    AVG(gap_days) as avg_gap,
    STDDEV(gap_days) as stddev_gap,
    MAX(draw_date) as last_seen,
    COUNT(*) as frequency
  FROM number_gaps
  WHERE gap_days IS NOT NULL
  GROUP BY draw_name, number
),
pair_counts AS (
  SELECT 
    dr.draw_name,
    LEAST(n1.number, n2.number) as num1,
    GREATEST(n1.number, n2.number) as num2,
    COUNT(*) as pair_count,
    MAX(dr.draw_date) as last_seen
  FROM draw_results dr
  CROSS JOIN LATERAL unnest(dr.winning_numbers) AS n1(number)
  CROSS JOIN LATERAL unnest(dr.winning_numbers) AS n2(number)
  WHERE n1.number < n2.number
  GROUP BY dr.draw_name, LEAST(n1.number, n2.number), GREATEST(n1.number, n2.number)
  HAVING COUNT(*) >= 2
)
SELECT 
  gs.draw_name,
  gs.number,
  gs.avg_gap,
  gs.stddev_gap,
  gs.last_seen,
  gs.frequency,
  CURRENT_DATE - gs.last_seen as current_gap,
  CASE 
    WHEN gs.stddev_gap > 0 THEN ((CURRENT_DATE - gs.last_seen) - gs.avg_gap) / gs.stddev_gap
    ELSE 0
  END as z_score
FROM gap_stats gs;

-- Index pour la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_enhanced_stats_pk 
ON mv_enhanced_stats (draw_name, number);

CREATE INDEX IF NOT EXISTS idx_mv_enhanced_stats_zscore 
ON mv_enhanced_stats (draw_name, z_score DESC);

-- Fonction pour calculer le score composite côté serveur
CREATE OR REPLACE FUNCTION public.calculate_composite_score(
  p_numbers integer[],
  p_draw_name text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_frequency_score numeric := 0;
  v_gap_score numeric := 0;
  v_equilibrium_score numeric := 0;
  v_sum integer;
  v_parity integer;
  v_equilibrium numeric;
  v_result jsonb;
BEGIN
  -- Calculer le score de fréquence moyen
  SELECT COALESCE(AVG(
    CASE 
      WHEN frequency > 0 THEN frequency::numeric / (SELECT MAX(frequency) FROM mv_enhanced_stats WHERE draw_name = p_draw_name)
      ELSE 0
    END
  ), 0)
  INTO v_frequency_score
  FROM mv_enhanced_stats
  WHERE draw_name = p_draw_name AND number = ANY(p_numbers);
  
  -- Calculer le score de gap (numéros avec z_score > 1.2)
  SELECT COALESCE(AVG(
    CASE WHEN z_score > 1.2 THEN 1 ELSE 0 END
  ), 0)
  INTO v_gap_score
  FROM mv_enhanced_stats
  WHERE draw_name = p_draw_name AND number = ANY(p_numbers);
  
  -- Calculer l'équilibre somme-parité
  v_sum := (SELECT SUM(x) FROM unnest(p_numbers) AS x);
  v_parity := (SELECT COUNT(*) FROM unnest(p_numbers) AS x WHERE x % 2 = 0);
  v_equilibrium := 0.5 * ABS(v_sum - 219) + 0.5 * ABS(v_parity - 2);
  v_equilibrium_score := CASE WHEN v_equilibrium < 25 THEN 1 - (v_equilibrium / 25) ELSE 0 END;
  
  -- Construire le résultat
  v_result := jsonb_build_object(
    'frequency', ROUND(v_frequency_score, 3),
    'gap', ROUND(v_gap_score, 3),
    'equilibrium', ROUND(v_equilibrium_score, 3),
    'sum', v_sum,
    'parity', v_parity,
    'composite', ROUND((v_frequency_score * 0.30 + v_gap_score * 0.25 + v_equilibrium_score * 0.10), 3)
  );
  
  RETURN v_result;
END;
$$;

-- Fonction pour rafraîchir la vue matérialisée
CREATE OR REPLACE FUNCTION public.refresh_enhanced_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_enhanced_stats;
END;
$$;

-- Trigger pour rafraîchir après insertion de nouveaux résultats
CREATE OR REPLACE FUNCTION public.trigger_refresh_enhanced_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Rafraîchir de manière asynchrone (via pg_cron ou manuellement)
  -- Pour l'instant, on log juste l'événement
  RAISE NOTICE 'Enhanced stats should be refreshed for draw: %', NEW.draw_name;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enhanced_stats_refresh ON draw_results;
CREATE TRIGGER trigger_enhanced_stats_refresh
AFTER INSERT ON draw_results
FOR EACH ROW
EXECUTE FUNCTION trigger_refresh_enhanced_stats();

-- Rafraîchir la vue une première fois
REFRESH MATERIALIZED VIEW mv_enhanced_stats;