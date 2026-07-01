-- Créer une table pour l'historique d'entraînement des algorithmes
CREATE TABLE IF NOT EXISTS public.algorithm_training_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  algorithm_name TEXT NOT NULL,
  previous_weight NUMERIC NOT NULL,
  new_weight NUMERIC NOT NULL,
  previous_parameters JSONB,
  new_parameters JSONB,
  performance_improvement NUMERIC,
  training_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.algorithm_training_history ENABLE ROW LEVEL SECURITY;

-- Politique pour voir l'historique d'entraînement
CREATE POLICY "Anyone can view training history"
  ON public.algorithm_training_history
  FOR SELECT
  USING (true);

-- Créer un index pour améliorer les requêtes
CREATE INDEX idx_training_history_algorithm ON public.algorithm_training_history(algorithm_name);
CREATE INDEX idx_training_history_date ON public.algorithm_training_history(training_date DESC);

-- Améliorer la vue matérialisée des classements avec plus de métriques
DROP MATERIALIZED VIEW IF EXISTS public.algorithm_rankings_detailed;

CREATE MATERIALIZED VIEW public.algorithm_rankings_detailed AS
WITH performance_stats AS (
  SELECT 
    model_used,
    draw_name,
    COUNT(*) as total_predictions,
    AVG(accuracy_score) as avg_accuracy,
    STDDEV(accuracy_score) as accuracy_stddev,
    SUM(matches_count) as total_matches,
    SUM(CASE WHEN matches_count >= 3 THEN 1 ELSE 0 END) as good_predictions,
    SUM(CASE WHEN matches_count >= 4 THEN 1 ELSE 0 END) as excellent_predictions,
    SUM(CASE WHEN matches_count >= 4 THEN 1 ELSE 0 END) as outstanding_predictions,
    SUM(CASE WHEN matches_count = 5 THEN 1 ELSE 0 END) as perfect_predictions,
    MAX(matches_count) as best_match,
    MIN(matches_count) as worst_match,
    MIN(created_at) as first_prediction,
    MAX(created_at) as last_prediction
  FROM public.algorithm_performance
  GROUP BY model_used, draw_name
),
metrics AS (
  SELECT 
    *,
    -- Calcul du score de consistance (inverse de l'écart-type normalisé)
    CASE 
      WHEN accuracy_stddev IS NULL OR accuracy_stddev = 0 THEN 100
      ELSE GREATEST(0, 100 - (accuracy_stddev * 2))
    END as consistency_score,
    -- Calcul de la précision (taux de bonnes prédictions)
    CASE 
      WHEN total_predictions > 0 THEN (good_predictions::numeric / total_predictions * 100)
      ELSE 0
    END as precision_rate,
    -- Calcul du rappel (capacité à trouver les bons numéros)
    CASE 
      WHEN total_predictions > 0 THEN (total_matches::numeric / (total_predictions * 5) * 100)
      ELSE 0
    END as recall_rate
  FROM performance_stats
)
SELECT 
  *,
  -- Score F1 (moyenne harmonique de précision et rappel)
  CASE 
    WHEN (precision_rate + recall_rate) > 0 
    THEN (2 * precision_rate * recall_rate) / (precision_rate + recall_rate)
    ELSE 0
  END as f1_score,
  -- Score global amélioré avec plus de facteurs
  LEAST(100, (
    (avg_accuracy * 0.35) + 
    (CASE WHEN total_predictions > 0 THEN (excellent_predictions::numeric / total_predictions * 100) ELSE 0 END * 0.25) +
    (best_match * 15) +
    (consistency_score * 0.10) +
    (CASE WHEN (precision_rate + recall_rate) > 0 THEN ((2 * precision_rate * recall_rate) / (precision_rate + recall_rate)) * 0.15 ELSE 0 END)
  )) as overall_score
FROM metrics
ORDER BY overall_score DESC;

-- Créer des index sur la vue matérialisée
CREATE INDEX idx_rankings_detailed_score ON public.algorithm_rankings_detailed(overall_score DESC);
CREATE INDEX idx_rankings_detailed_model ON public.algorithm_rankings_detailed(model_used);