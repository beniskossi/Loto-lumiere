-- Fix missing search_path on database functions to prevent search path hijacking
-- This is especially critical for refresh_algorithm_rankings() which uses SECURITY DEFINER

-- Fix refresh_algorithm_rankings (SECURITY DEFINER - HIGH PRIORITY)
CREATE OR REPLACE FUNCTION public.refresh_algorithm_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW public.algorithm_rankings_detailed;
END;
$function$;

-- Fix get_algorithm_trends
CREATE OR REPLACE FUNCTION public.get_algorithm_trends(p_draw_name text DEFAULT NULL::text)
RETURNS TABLE(model_used text, date timestamp with time zone, accuracy_score numeric, matches_count integer)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
    SELECT 
      ap.model_used,
      ap.created_at as date,
      ap.accuracy_score,
      ap.matches_count
    FROM algorithm_performance ap
    WHERE (p_draw_name IS NULL OR ap.draw_name = p_draw_name)
    ORDER BY ap.created_at DESC
    LIMIT 100;
END;
$function$;

-- Fix get_algorithm_trends_per_model
CREATE OR REPLACE FUNCTION public.get_algorithm_trends_per_model(p_draw_name text DEFAULT NULL::text, p_limit_per_model integer DEFAULT 100)
RETURNS TABLE(model_used text, date timestamp with time zone, accuracy_score numeric, matches_count integer, confidence_score numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT model_used, date, accuracy_score, matches_count, confidence_score FROM (
    SELECT
      ap.model_used,
      ap.created_at AS date,
      ap.accuracy_score,
      ap.matches_count,
      ap.confidence_score,
      ROW_NUMBER() OVER (PARTITION BY ap.model_used ORDER BY ap.created_at DESC) AS rn
    FROM public.algorithm_performance ap
    WHERE (p_draw_name IS NULL OR ap.draw_name = p_draw_name)
  ) t
  WHERE rn <= p_limit_per_model
  ORDER BY model_used, date DESC;
$function$;