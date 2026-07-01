-- =============================================================
-- FIX 1: Add input validation to calculate_composite_score
-- Issue: calc_composite_score_no_validation (warn level)
-- =============================================================

CREATE OR REPLACE FUNCTION public.calculate_composite_score(p_numbers integer[], p_draw_name text)
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
  -- INPUT VALIDATION: Check array is not null and has exactly 5 elements
  IF p_numbers IS NULL OR array_length(p_numbers, 1) != 5 THEN
    RAISE EXCEPTION 'Invalid numbers array: must contain exactly 5 numbers';
  END IF;
  
  -- INPUT VALIDATION: Check all numbers are between 1 and 90
  IF EXISTS (SELECT 1 FROM unnest(p_numbers) AS num WHERE num < 1 OR num > 90) THEN
    RAISE EXCEPTION 'Invalid numbers: all values must be between 1 and 90';
  END IF;
  
  -- INPUT VALIDATION: Check for duplicates
  IF (SELECT COUNT(DISTINCT x) FROM unnest(p_numbers) AS x) != 5 THEN
    RAISE EXCEPTION 'Invalid numbers: duplicates are not allowed';
  END IF;
  
  -- INPUT VALIDATION: Check draw_name is valid
  IF p_draw_name IS NULL OR LENGTH(p_draw_name) = 0 OR LENGTH(p_draw_name) > 100 THEN
    RAISE EXCEPTION 'Invalid draw_name: must be between 1 and 100 characters';
  END IF;

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

-- =============================================================
-- FIX 2: Add admin access control to refresh_enhanced_stats
-- Issue: refresh_stats_no_authz (warn level)
-- =============================================================

CREATE OR REPLACE FUNCTION public.refresh_enhanced_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- ACCESS CONTROL: Only admins or service_role can refresh
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required for manual stats refresh';
  END IF;
  
  -- Allow service_role (for cron jobs) or authenticated admins
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_enhanced_stats;
END;
$$;