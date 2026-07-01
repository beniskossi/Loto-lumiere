-- Fix security issues from linter

-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.algorithm_rankings;

CREATE VIEW public.algorithm_rankings 
WITH (security_invoker = true) AS
SELECT 
  model_used,
  draw_name,
  COUNT(*) as total_predictions,
  AVG(accuracy_score) as avg_accuracy,
  SUM(matches_count) as total_matches,
  COUNT(CASE WHEN matches_count >= 3 THEN 1 END) as good_predictions,
  COUNT(CASE WHEN matches_count >= 4 THEN 1 END) as excellent_predictions,
  COUNT(CASE WHEN matches_count = 5 THEN 1 END) as perfect_predictions,
  MAX(matches_count) as best_match,
  MIN(created_at) as first_prediction,
  MAX(created_at) as last_prediction
FROM public.algorithm_performance
GROUP BY model_used, draw_name
ORDER BY avg_accuracy DESC, total_matches DESC;

-- Fix the count_array_matches function to have proper search_path
DROP FUNCTION IF EXISTS public.count_array_matches(INTEGER[], INTEGER[]);

CREATE OR REPLACE FUNCTION public.count_array_matches(arr1 INTEGER[], arr2 INTEGER[])
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_count INTEGER := 0;
  element INTEGER;
BEGIN
  FOREACH element IN ARRAY arr1
  LOOP
    IF element = ANY(arr2) THEN
      match_count := match_count + 1;
    END IF;
  END LOOP;
  RETURN match_count;
END;
$$;