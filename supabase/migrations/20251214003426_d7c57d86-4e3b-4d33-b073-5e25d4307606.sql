-- Mise à jour des pondérations d'algorithmes OPTIMISÉES
UPDATE public.algorithm_config SET weight = 1.2 WHERE algorithm_name = 'Stacking Ensemble';
UPDATE public.algorithm_config SET weight = 1.1 WHERE algorithm_name = 'Transformer (Attention)';
UPDATE public.algorithm_config SET weight = 1.0 WHERE algorithm_name = 'XGBoost';
UPDATE public.algorithm_config SET weight = 0.9 WHERE algorithm_name = 'LSTM';
UPDATE public.algorithm_config SET weight = 0.8 WHERE algorithm_name = 'Random Forest';
UPDATE public.algorithm_config SET weight = 0.7 WHERE algorithm_name = 'FrequencyPro';

-- Désactiver les algorithmes obsolètes
UPDATE public.algorithm_config SET is_enabled = false WHERE algorithm_name IN (
  'CatBoost-like (Pattern Sequence)',
  'Hybrid (Ensemble Model)',
  'Hybrid (LightGBM-like + CatBoost-like + Transformers-like)',
  'LightGBM-like (Weighted Frequency)',
  'Markov Chain (State Transition)',
  'Transformers-like (Gap Analysis)'
);

-- Insérer ou mettre à jour la configuration des poids
INSERT INTO public.prediction_config (config_key, config_value, description)
VALUES (
  'weights',
  '{"frequency": 0.25, "gap": 0.30, "echo": 0.12, "pairs": 0.12, "equilibrium": 0.06, "temporal": 0.06, "momentum": 0.05, "spatial": 0.04}'::jsonb,
  'Pondérations optimisées pour le score composite (gap augmenté à 30%)'
)
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = now();

-- Insérer ou mettre à jour la configuration du gap optimal
INSERT INTO public.prediction_config (config_key, config_value, description)
VALUES (
  'optimal_gap',
  '{"min": 10, "max": 22, "boost": 0.40}'::jsonb,
  'Intervalle de gap optimal élargi (μ ± σ) avec boost augmenté'
)
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = now();

-- Insérer ou mettre à jour le seuil de gap
INSERT INTO public.prediction_config (config_key, config_value, description)
VALUES (
  'gap_threshold',
  '{"zscore": 1.0}'::jsonb,
  'Seuil Z-score réduit pour capturer plus de candidats potentiels'
)
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = now();

-- Fonction pour calculer dynamiquement le gap optimal basé sur les données historiques
CREATE OR REPLACE FUNCTION public.calculate_dynamic_optimal_gap(p_draw_name text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_gap numeric;
  v_stddev_gap numeric;
  v_min_gap integer;
  v_max_gap integer;
  v_result jsonb;
BEGIN
  -- Calculer la moyenne et l'écart-type des gaps depuis mv_enhanced_stats
  SELECT 
    COALESCE(AVG(avg_gap), 14),
    COALESCE(STDDEV(avg_gap), 5)
  INTO v_avg_gap, v_stddev_gap
  FROM mv_enhanced_stats
  WHERE draw_name = p_draw_name
    AND avg_gap IS NOT NULL
    AND avg_gap > 0;
  
  -- Calculer l'intervalle optimal: μ ± σ
  v_min_gap := GREATEST(5, FLOOR(v_avg_gap - v_stddev_gap)::integer);
  v_max_gap := LEAST(35, CEIL(v_avg_gap + v_stddev_gap)::integer);
  
  v_result := jsonb_build_object(
    'min', v_min_gap,
    'max', v_max_gap,
    'avg', ROUND(v_avg_gap, 2),
    'stddev', ROUND(v_stddev_gap, 2),
    'method', 'dynamic_μ±σ'
  );
  
  RETURN v_result;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.calculate_dynamic_optimal_gap(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_dynamic_optimal_gap(text) TO service_role;