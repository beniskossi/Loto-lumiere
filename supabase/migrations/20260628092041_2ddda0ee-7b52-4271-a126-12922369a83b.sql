CREATE OR REPLACE FUNCTION public.calculate_composite_score(p_numbers integer[], p_draw_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_frequency_score numeric := 0;
  v_gap_score numeric := 0;
  v_equilibrium_score numeric := 0;
  v_sum integer;
  v_parity integer;
  v_equilibrium numeric;
  v_weights jsonb;
  v_w_frequency numeric;
  v_w_gap numeric;
  v_w_equilibrium numeric;
  v_w_echo numeric;
  v_w_pairs numeric;
  v_w_temporal numeric;
  v_w_momentum numeric;
  v_w_spatial numeric;
  v_composite numeric;
  v_sum_weights numeric;
  v_result jsonb;
BEGIN
  IF p_numbers IS NULL OR array_length(p_numbers, 1) != 5 THEN
    RAISE EXCEPTION 'Invalid numbers array: must contain exactly 5 numbers';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_numbers) AS num WHERE num < 1 OR num > 90) THEN
    RAISE EXCEPTION 'Invalid numbers: all values must be between 1 and 90';
  END IF;
  IF (SELECT COUNT(DISTINCT x) FROM unnest(p_numbers) AS x) != 5 THEN
    RAISE EXCEPTION 'Invalid numbers: duplicates are not allowed';
  END IF;
  IF p_draw_name IS NULL OR LENGTH(p_draw_name) = 0 OR LENGTH(p_draw_name) > 100 THEN
    RAISE EXCEPTION 'Invalid draw_name: must be between 1 and 100 characters';
  END IF;

  -- Charger les poids dynamiques depuis prediction_config
  SELECT config_value INTO v_weights
  FROM public.prediction_config
  WHERE config_key = 'weights'
  LIMIT 1;

  -- Fallback si la config est absente
  IF v_weights IS NULL THEN
    v_weights := jsonb_build_object(
      'frequency', 0.30, 'gap', 0.25, 'equilibrium', 0.10,
      'echo', 0.12, 'pairs', 0.12, 'temporal', 0.06,
      'momentum', 0.05, 'spatial', 0.00
    );
  END IF;

  v_w_frequency  := COALESCE((v_weights->>'frequency')::numeric, 0.30);
  v_w_gap        := COALESCE((v_weights->>'gap')::numeric, 0.25);
  v_w_equilibrium:= COALESCE((v_weights->>'equilibrium')::numeric, 0.10);
  v_w_echo       := COALESCE((v_weights->>'echo')::numeric, 0.12);
  v_w_pairs      := COALESCE((v_weights->>'pairs')::numeric, 0.12);
  v_w_temporal   := COALESCE((v_weights->>'temporal')::numeric, 0.06);
  v_w_momentum   := COALESCE((v_weights->>'momentum')::numeric, 0.05);
  v_w_spatial    := COALESCE((v_weights->>'spatial')::numeric, 0.00);

  -- Score de fréquence moyen
  SELECT COALESCE(AVG(
    CASE 
      WHEN frequency > 0 THEN frequency::numeric / NULLIF((SELECT MAX(frequency) FROM mv_enhanced_stats WHERE draw_name = p_draw_name), 0)
      ELSE 0
    END
  ), 0)
  INTO v_frequency_score
  FROM mv_enhanced_stats
  WHERE draw_name = p_draw_name AND number = ANY(p_numbers);

  -- Score de gap
  SELECT COALESCE(AVG(
    CASE WHEN z_score > 1.2 THEN 1 ELSE 0 END
  ), 0)
  INTO v_gap_score
  FROM mv_enhanced_stats
  WHERE draw_name = p_draw_name AND number = ANY(p_numbers);

  -- Équilibre somme-parité
  v_sum := (SELECT SUM(x) FROM unnest(p_numbers) AS x);
  v_parity := (SELECT COUNT(*) FROM unnest(p_numbers) AS x WHERE x % 2 = 0);
  v_equilibrium := 0.5 * ABS(v_sum - 219) + 0.5 * ABS(v_parity - 2);
  v_equilibrium_score := CASE WHEN v_equilibrium < 25 THEN 1 - (v_equilibrium / 25) ELSE 0 END;

  -- Score composite : applique les poids dynamiques sur les 3 dimensions calculées en SQL.
  -- Les dimensions echo/pairs/temporal/momentum/spatial sont calculées côté edge functions
  -- et leurs poids sont également exposés dans le résultat pour cohérence.
  -- Pour que le score composite SQL reste cohérent (compris entre 0 et 1), on le normalise
  -- en divisant la somme pondérée par la somme des poids de ces 3 dimensions.
  v_sum_weights := v_w_frequency + v_w_gap + v_w_equilibrium;
  IF v_sum_weights > 0 THEN
    v_composite := (
      v_frequency_score   * v_w_frequency +
      v_gap_score         * v_w_gap +
      v_equilibrium_score * v_w_equilibrium
    ) / v_sum_weights;
  ELSE
    v_composite := (v_frequency_score + v_gap_score + v_equilibrium_score) / 3.0;
  END IF;

  v_result := jsonb_build_object(
    'frequency', ROUND(v_frequency_score, 3),
    'gap', ROUND(v_gap_score, 3),
    'equilibrium', ROUND(v_equilibrium_score, 3),
    'sum', v_sum,
    'parity', v_parity,
    'composite', ROUND(v_composite, 3),
    'weights_used', jsonb_build_object(
      'frequency', v_w_frequency,
      'gap', v_w_gap,
      'equilibrium', v_w_equilibrium,
      'echo', v_w_echo,
      'pairs', v_w_pairs,
      'temporal', v_w_temporal,
      'momentum', v_w_momentum,
      'spatial', v_w_spatial
    )
  );

  RETURN v_result;
END;
$function$;