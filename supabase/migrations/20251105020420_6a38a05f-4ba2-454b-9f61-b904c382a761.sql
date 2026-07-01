-- Add trigger to automatically evaluate predictions when a new draw result is added
CREATE OR REPLACE FUNCTION public.auto_evaluate_predictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Find all predictions for this draw that were made before the draw date
  INSERT INTO public.algorithm_performance (
    draw_name,
    model_used,
    prediction_date,
    draw_date,
    predicted_numbers,
    winning_numbers,
    matches_count,
    accuracy_score
  )
  SELECT 
    p.draw_name,
    p.model_used,
    p.prediction_date,
    NEW.draw_date,
    p.predicted_numbers,
    NEW.winning_numbers,
    count_array_matches(p.predicted_numbers, NEW.winning_numbers) as matches_count,
    (count_array_matches(p.predicted_numbers, NEW.winning_numbers)::numeric / 5.0 * 100) as accuracy_score
  FROM public.predictions p
  WHERE p.draw_name = NEW.draw_name
    AND p.prediction_date::date <= NEW.draw_date
    AND NOT EXISTS (
      SELECT 1 FROM public.algorithm_performance ap
      WHERE ap.prediction_date = p.prediction_date
        AND ap.draw_date = NEW.draw_date
        AND ap.model_used = p.model_used
        AND ap.draw_name = p.draw_name
    )
  ORDER BY p.prediction_date DESC
  LIMIT 10;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on draw_results insert
DROP TRIGGER IF EXISTS trigger_auto_evaluate_predictions ON public.draw_results;
CREATE TRIGGER trigger_auto_evaluate_predictions
  AFTER INSERT ON public.draw_results
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_evaluate_predictions();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_algorithm_performance_draw_model 
  ON public.algorithm_performance(draw_name, model_used, draw_date DESC);

CREATE INDEX IF NOT EXISTS idx_algorithm_performance_accuracy 
  ON public.algorithm_performance(accuracy_score DESC, matches_count DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_draw_date 
  ON public.predictions(draw_name, prediction_date DESC);

-- Create a materialized view for detailed rankings
DROP MATERIALIZED VIEW IF EXISTS public.algorithm_rankings_detailed;
CREATE MATERIALIZED VIEW public.algorithm_rankings_detailed AS
SELECT 
  ap.model_used,
  ap.draw_name,
  COUNT(*) as total_predictions,
  ROUND(AVG(ap.accuracy_score), 2) as avg_accuracy,
  ROUND(STDDEV(ap.accuracy_score), 2) as accuracy_stddev,
  SUM(ap.matches_count) as total_matches,
  COUNT(CASE WHEN ap.matches_count >= 2 THEN 1 END) as good_predictions,
  COUNT(CASE WHEN ap.matches_count >= 3 THEN 1 END) as excellent_predictions,
  COUNT(CASE WHEN ap.matches_count >= 4 THEN 1 END) as outstanding_predictions,
  COUNT(CASE WHEN ap.matches_count = 5 THEN 1 END) as perfect_predictions,
  MAX(ap.matches_count) as best_match,
  MIN(ap.matches_count) as worst_match,
  MIN(ap.draw_date) as first_prediction,
  MAX(ap.draw_date) as last_prediction,
  CASE 
    WHEN STDDEV(ap.accuracy_score) IS NULL THEN 0
    ELSE ROUND(100 - (STDDEV(ap.accuracy_score) * 2), 2)
  END as consistency_score,
  ROUND(
    (AVG(ap.accuracy_score) * 0.4) + 
    (CAST(COUNT(CASE WHEN ap.matches_count >= 3 THEN 1 END) AS NUMERIC) / NULLIF(COUNT(*), 0) * 100 * 0.3) +
    (MAX(ap.matches_count) * 20 * 0.2) +
    (CASE WHEN STDDEV(ap.accuracy_score) IS NULL THEN 0 ELSE (100 - STDDEV(ap.accuracy_score) * 2) END * 0.1)
  , 2) as overall_score
FROM public.algorithm_performance ap
GROUP BY ap.model_used, ap.draw_name;

-- Grant permissions on materialized view
GRANT SELECT ON public.algorithm_rankings_detailed TO authenticated;
GRANT SELECT ON public.algorithm_rankings_detailed TO anon;

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_algorithm_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW public.algorithm_rankings_detailed;
END;
$function$;