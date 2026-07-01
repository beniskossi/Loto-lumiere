-- Révoquer l'accès direct aux vues matérialisées depuis l'API
-- Cela empêche l'accès via les rôles anon et authenticated

-- Révoquer l'accès à algorithm_rankings_detailed
REVOKE SELECT ON public.algorithm_rankings_detailed FROM anon, authenticated;

-- Révoquer l'accès à mv_enhanced_stats  
REVOKE SELECT ON public.mv_enhanced_stats FROM anon, authenticated;

-- Créer une fonction sécurisée pour accéder à algorithm_rankings_detailed
CREATE OR REPLACE FUNCTION public.get_algorithm_rankings_detailed(p_draw_name text DEFAULT NULL)
RETURNS TABLE (
  model_used text,
  draw_name text,
  total_predictions bigint,
  avg_accuracy numeric,
  best_match integer,
  worst_match integer,
  total_matches bigint,
  perfect_predictions bigint,
  excellent_predictions bigint,
  good_predictions bigint,
  outstanding_predictions bigint,
  first_prediction timestamptz,
  last_prediction timestamptz,
  accuracy_stddev numeric,
  precision_rate numeric,
  recall_rate numeric,
  f1_score numeric,
  consistency_score numeric,
  overall_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    model_used,
    draw_name,
    total_predictions,
    avg_accuracy,
    best_match,
    worst_match,
    total_matches,
    perfect_predictions,
    excellent_predictions,
    good_predictions,
    outstanding_predictions,
    first_prediction,
    last_prediction,
    accuracy_stddev,
    precision_rate,
    recall_rate,
    f1_score,
    consistency_score,
    overall_score
  FROM public.algorithm_rankings_detailed
  WHERE (p_draw_name IS NULL OR algorithm_rankings_detailed.draw_name = p_draw_name)
  ORDER BY overall_score DESC NULLS LAST;
$$;

-- Créer une fonction sécurisée pour accéder à mv_enhanced_stats
CREATE OR REPLACE FUNCTION public.get_enhanced_stats(p_draw_name text DEFAULT NULL, p_limit integer DEFAULT 90)
RETURNS TABLE (
  number integer,
  draw_name text,
  frequency bigint,
  last_seen date,
  current_gap integer,
  avg_gap numeric,
  stddev_gap numeric,
  z_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    number,
    draw_name,
    frequency,
    last_seen,
    current_gap,
    avg_gap,
    stddev_gap,
    z_score
  FROM public.mv_enhanced_stats
  WHERE (p_draw_name IS NULL OR mv_enhanced_stats.draw_name = p_draw_name)
  ORDER BY frequency DESC NULLS LAST
  LIMIT p_limit;
$$;

-- Accorder l'exécution des fonctions aux rôles authentifiés
GRANT EXECUTE ON FUNCTION public.get_algorithm_rankings_detailed(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_enhanced_stats(text, integer) TO authenticated, anon;