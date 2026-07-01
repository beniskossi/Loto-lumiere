-- Add optimized indexes for Loto Lumiere queries

-- For orchestration_history
CREATE INDEX IF NOT EXISTS idx_orchestration_history_draw_adj_date 
  ON public.orchestration_history(draw_name, adjustment_date DESC);

-- For algorithm_performance
CREATE INDEX IF NOT EXISTS idx_algorithm_perf_draw_pred_date
  ON public.algorithm_performance(draw_name, prediction_date DESC);
  
CREATE INDEX IF NOT EXISTS idx_algorithm_perf_model_draw_date
  ON public.algorithm_performance(model_used, draw_name, draw_date DESC);
  
CREATE INDEX IF NOT EXISTS idx_algorithm_perf_created_at
  ON public.algorithm_performance(created_at DESC);

-- For precalculated_predictions
CREATE INDEX IF NOT EXISTS idx_precalculated_preds_draw_score
  ON public.precalculated_predictions(draw_name, composite_score DESC);

-- For predictions
CREATE INDEX IF NOT EXISTS idx_predictions_draw_pred_date
  ON public.predictions(draw_name, prediction_date DESC);
  
CREATE INDEX IF NOT EXISTS idx_predictions_draw_created_at
  ON public.predictions(draw_name, created_at DESC);
