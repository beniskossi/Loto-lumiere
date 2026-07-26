-- ============================================================================
-- LOTO LUMIERE - UNIFIED MASTER DATABASE SCHEMA
-- Single, fully autonomous, idempotent migration file containing all tables,
-- functions, materialized views, RLS policies, triggers, and seed data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & HELPER FUNCTIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Duplicate detection in number arrays
DROP FUNCTION IF EXISTS public.has_any_duplicates(integer[]) CASCADE;
CREATE OR REPLACE FUNCTION public.has_any_duplicates(arr integer[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF arr IS NULL OR array_length(arr, 1) IS NULL THEN
    RETURN false;
  END IF;
  RETURN (SELECT COUNT(DISTINCT elem) < array_length(arr, 1) FROM unnest(arr) AS elem);
END;
$$;

-- Validation for 5-number lottery predictions (1 to 90, exactly 5 unique numbers)
DROP FUNCTION IF EXISTS public.validate_numbers_array(integer[]) CASCADE;
CREATE OR REPLACE FUNCTION public.validate_numbers_array(numbers integer[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF numbers IS NULL THEN RETURN true; END IF;
  IF array_length(numbers, 1) IS NULL OR array_length(numbers, 1) != 5 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM unnest(numbers) AS num WHERE num < 1 OR num > 90) THEN RETURN false; END IF;
  IF public.has_any_duplicates(numbers) THEN RETURN false; END IF;
  RETURN true;
END;
$$;

-- Array matching helper
DROP FUNCTION IF EXISTS public.count_array_matches(integer[], integer[]) CASCADE;
CREATE OR REPLACE FUNCTION public.count_array_matches(arr1 integer[], arr2 integer[])
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  matches integer := 0;
  elem integer;
BEGIN
  IF arr1 IS NULL OR arr2 IS NULL THEN RETURN 0; END IF;
  FOREACH elem IN ARRAY arr1 LOOP
    IF elem = ANY(arr2) THEN
      matches := matches + 1;
    END IF;
  END LOOP;
  RETURN matches;
END;
$$;

-- Automatic updated_at column handler
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- User admin role verification helper
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- Alias for is_admin
DROP FUNCTION IF EXISTS public.is_current_user_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.is_admin();
END;
$$;

-- Has Role Helper
DROP FUNCTION IF EXISTS public.has_role(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role CASCADE;
CREATE OR REPLACE FUNCTION public.has_role(_role text, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = _user_id AND role = _role
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. CORE DOMAIN TABLES
-- ----------------------------------------------------------------------------

-- User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  level integer DEFAULT 1,
  experience_points integer DEFAULT 0,
  total_predictions integer DEFAULT 0,
  successful_predictions integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  favorite_draws text[] DEFAULT '{}',
  favorite_numbers integer[] DEFAULT '{}',
  notification_enabled boolean DEFAULT true,
  notification_time time DEFAULT '09:00:00',
  theme text DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Official Draw Results
CREATE TABLE IF NOT EXISTS public.draw_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  draw_date date NOT NULL,
  winning_numbers integer[] NOT NULL CONSTRAINT check_winning_numbers CHECK (public.validate_numbers_array(winning_numbers)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_draw_result UNIQUE (draw_name, draw_date)
);

-- Number Statistics (1 to 90 per draw_name)
CREATE TABLE IF NOT EXISTS public.number_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  number integer NOT NULL CHECK (number BETWEEN 1 AND 90),
  frequency integer DEFAULT 0,
  last_drawn_date date,
  days_since_last integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_number_stat UNIQUE (draw_name, number)
);

-- Precalculated Predictions
CREATE TABLE IF NOT EXISTS public.precalculated_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  draw_date date NOT NULL,
  algorithm_name text NOT NULL,
  predicted_numbers integer[] NOT NULL CONSTRAINT check_pred_numbers CHECK (public.validate_numbers_array(predicted_numbers)),
  confidence numeric DEFAULT 0.5,
  score numeric DEFAULT 0.5,
  composite_score numeric DEFAULT 0.5,
  algorithm_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_precalc_pred UNIQUE (draw_name, draw_date, algorithm_name)
);

-- Adaptive Orchestration Run History
CREATE TABLE IF NOT EXISTS public.orchestration_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  draw_date date NOT NULL,
  selected_algorithm text NOT NULL,
  algorithm_weights jsonb DEFAULT '{}'::jsonb,
  execution_time_ms integer DEFAULT 0,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- Collaborative Predictions
CREATE TABLE IF NOT EXISTS public.collaborative_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  draw_date date NOT NULL,
  numbers integer[] NOT NULL CONSTRAINT check_collab_numbers CHECK (public.validate_numbers_array(numbers)),
  total_votes integer DEFAULT 1,
  confidence_avg numeric DEFAULT 0.5,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Algorithm Configuration
CREATE TABLE IF NOT EXISTS public.algorithm_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm_name text UNIQUE NOT NULL,
  description text,
  is_enabled boolean DEFAULT true,
  weight numeric DEFAULT 1.0,
  parameters jsonb DEFAULT '{}'::jsonb,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Algorithm Performance Historical Tracking
CREATE TABLE IF NOT EXISTS public.algorithm_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  draw_date date NOT NULL,
  prediction_date date,
  model_used text NOT NULL,
  predicted_numbers integer[] NOT NULL,
  winning_numbers integer[],
  actual_numbers integer[] DEFAULT '{}',
  matches_count integer NOT NULL DEFAULT 0,
  accuracy_score numeric DEFAULT 0,
  composite_score numeric DEFAULT 0,
  confidence_score numeric(5,2),
  precision_score numeric(5,2),
  recall_score numeric(5,2),
  f1_score numeric(5,2),
  prediction_score numeric(5,2),
  execution_time numeric(10,3),
  data_points_used integer,
  factors text[],
  prediction_id uuid,
  draw_result_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Algorithm Training History
CREATE TABLE IF NOT EXISTS public.algorithm_training_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm_name text NOT NULL,
  accuracy numeric DEFAULT 0,
  loss numeric DEFAULT 0,
  training_date timestamptz DEFAULT now()
);

-- User & System Predictions
CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  draw_name text NOT NULL,
  prediction_date date DEFAULT CURRENT_DATE,
  predicted_numbers integer[] NOT NULL CONSTRAINT check_user_pred CHECK (public.validate_numbers_array(predicted_numbers)),
  confidence numeric DEFAULT 0.5,
  model_used text NOT NULL,
  algorithm_reason text,
  status text DEFAULT 'pending',
  matches_count integer DEFAULT 0,
  matched_numbers integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- User Prediction Feedback
CREATE TABLE IF NOT EXISTS public.user_prediction_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_id uuid REFERENCES public.predictions(id) ON DELETE CASCADE,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  feedback_text text,
  created_at timestamptz DEFAULT now()
);

-- User Prediction Tracking
CREATE TABLE IF NOT EXISTS public.user_prediction_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_id uuid REFERENCES public.predictions(id) ON DELETE CASCADE,
  draw_result_id uuid REFERENCES public.draw_results(id) ON DELETE CASCADE,
  matches_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Immutable Prediction Ledger
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  draw_date date NOT NULL,
  entry_type text NOT NULL,
  payload jsonb NOT NULL,
  hash text NOT NULL,
  previous_hash text,
  created_at timestamptz DEFAULT now()
);

-- Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  icon text,
  category text,
  points integer DEFAULT 10,
  requirement_type text,
  requirement_value integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- User Achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  achievement_id uuid REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

-- Community Votes
CREATE TABLE IF NOT EXISTS public.community_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  prediction_id uuid REFERENCES public.predictions(id) ON DELETE CASCADE,
  vote_type text CHECK (vote_type IN ('upvote', 'downvote')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_vote UNIQUE (user_id, prediction_id)
);

-- Training Control State
CREATE TABLE IF NOT EXISTS public.training_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_training boolean DEFAULT false,
  current_algorithm text,
  progress_percent numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Calibration Metrics
CREATE TABLE IF NOT EXISTS public.algorithm_calibration_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm_name text NOT NULL,
  brier_score numeric DEFAULT 0,
  expected_calibration_error numeric DEFAULT 0,
  optimal_temperature numeric DEFAULT 1.0,
  evaluated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. COMPOSITE SCORE & STATISTICAL COMPUTATION FUNCTIONS
-- ----------------------------------------------------------------------------

-- Calculate composite score for a set of numbers based on 5 explainable formulas
DROP FUNCTION IF EXISTS public.calculate_composite_score(integer[], text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_composite_score CASCADE;
CREATE OR REPLACE FUNCTION public.calculate_composite_score(p_numbers integer[], p_draw_name text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_score numeric := 0.5;
  v_count integer;
  v_sum integer := 0;
  v_even_count integer := 0;
  v_num integer;
BEGIN
  IF p_numbers IS NULL OR array_length(p_numbers, 1) IS NULL THEN
    RETURN 0.5;
  END IF;

  -- 1. Sum & Parity Balance Evaluation
  FOREACH v_num IN ARRAY p_numbers LOOP
    v_sum := v_sum + v_num;
    IF v_num % 2 = 0 THEN
      v_even_count := v_even_count + 1;
    END IF;
  END LOOP;

  -- Ideal sum for 5 numbers in [1..90] is around 227 (mean = 45.5 * 5)
  IF v_sum BETWEEN 150 AND 300 THEN
    v_score := v_score + 0.15;
  END IF;

  -- Ideal parity balance (2 even / 3 odd or 3 even / 2 odd)
  IF v_even_count BETWEEN 2 AND 3 THEN
    v_score := v_score + 0.15;
  END IF;

  -- 2. Frequency factor boost
  SELECT COUNT(*) INTO v_count
  FROM public.number_statistics
  WHERE draw_name = p_draw_name
    AND number = ANY(p_numbers)
    AND frequency > 5;

  v_score := v_score + (v_count * 0.04);

  RETURN LEAST(1.0, GREATEST(0.05, ROUND(v_score, 4)));
END;
$$;

-- Global Statistics RPC
DROP FUNCTION IF EXISTS public.get_global_statistics(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_global_statistics() CASCADE;
CREATE OR REPLACE FUNCTION public.get_global_statistics(p_draw_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total_draws integer;
  v_total_predictions integer;
  v_active_algorithms integer;
  v_last_draw_date date;
BEGIN
  IF p_draw_name IS NULL THEN
    SELECT COUNT(*), MAX(draw_date) INTO v_total_draws, v_last_draw_date FROM public.draw_results;
    SELECT COUNT(*) INTO v_total_predictions FROM public.predictions;
  ELSE
    SELECT COUNT(*), MAX(draw_date) INTO v_total_draws, v_last_draw_date FROM public.draw_results WHERE draw_name = p_draw_name;
    SELECT COUNT(*) INTO v_total_predictions FROM public.predictions WHERE draw_name = p_draw_name;
  END IF;

  SELECT COUNT(*) INTO v_active_algorithms FROM public.algorithm_config WHERE is_enabled = true;

  RETURN jsonb_build_object(
    'total_draws', COALESCE(v_total_draws, 0),
    'total_predictions', COALESCE(v_total_predictions, 0),
    'active_algorithms', COALESCE(v_active_algorithms, 0),
    'last_draw_date', v_last_draw_date
  );
END;
$$;

-- Get Enhanced Number Stats RPC
DROP FUNCTION IF EXISTS public.get_enhanced_stats(text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_enhanced_stats() CASCADE;
CREATE OR REPLACE FUNCTION public.get_enhanced_stats(p_draw_name text DEFAULT NULL, p_limit integer DEFAULT 90)
RETURNS TABLE (
  number integer,
  frequency integer,
  days_since_last integer,
  last_drawn_date date,
  score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ns.number,
    ns.frequency,
    ns.days_since_last,
    ns.last_drawn_date,
    ROUND((ns.frequency * 0.6 + LEAST(ns.days_since_last, 50) * 0.4)::numeric, 2) AS score
  FROM public.number_statistics ns
  WHERE (p_draw_name IS NULL OR ns.draw_name = p_draw_name)
  ORDER BY ns.frequency DESC, ns.days_since_last ASC
  LIMIT p_limit;
END;
$$;

-- Algorithm Performance Summary RPC
DROP FUNCTION IF EXISTS public.get_algorithm_performance_summary(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_algorithm_performance_summary() CASCADE;
CREATE OR REPLACE FUNCTION public.get_algorithm_performance_summary(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT 
      model_used AS algorithm_name,
      COUNT(*) AS total_evaluations,
      ROUND(AVG(accuracy_score)::numeric, 4) AS avg_accuracy,
      ROUND(AVG(composite_score)::numeric, 4) AS avg_composite_score,
      MAX(matches_count) AS max_matches
    FROM public.algorithm_performance
    WHERE draw_date >= (CURRENT_DATE - (p_days || ' days')::interval)
    GROUP BY model_used
    ORDER BY avg_composite_score DESC
  ) t;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Detailed Algorithm Rankings RPC
DROP FUNCTION IF EXISTS public.get_algorithm_rankings_detailed(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_algorithm_rankings_detailed() CASCADE;
CREATE OR REPLACE FUNCTION public.get_algorithm_rankings_detailed(p_draw_name text DEFAULT NULL)
RETURNS TABLE (
  model_used text,
  total_predictions bigint,
  avg_accuracy numeric,
  composite_score numeric,
  best_match integer,
  win_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.model_used,
    COUNT(ap.id) AS total_predictions,
    COALESCE(ROUND(AVG(ap.accuracy_score)::numeric, 4), 0) AS avg_accuracy,
    COALESCE(ROUND(AVG(ap.composite_score)::numeric, 4), 0) AS composite_score,
    COALESCE(MAX(ap.matches_count), 0)::integer AS best_match,
    COUNT(CASE WHEN ap.matches_count >= 3 THEN 1 END) AS win_count
  FROM public.algorithm_performance ap
  WHERE (p_draw_name IS NULL OR ap.draw_name = p_draw_name)
  GROUP BY ap.model_used
  ORDER BY avg_accuracy DESC;
END;
$$;

-- Algorithm Trends RPC
DROP FUNCTION IF EXISTS public.get_algorithm_trends(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_algorithm_trends() CASCADE;
CREATE OR REPLACE FUNCTION public.get_algorithm_trends(p_draw_name text DEFAULT NULL)
RETURNS TABLE (
  model_used text,
  draw_date date,
  avg_accuracy numeric,
  matches_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.model_used,
    ap.draw_date,
    ROUND(AVG(ap.accuracy_score)::numeric, 4) AS avg_accuracy,
    MAX(ap.matches_count)::integer AS matches_count
  FROM public.algorithm_performance ap
  WHERE (p_draw_name IS NULL OR ap.draw_name = p_draw_name)
  GROUP BY ap.model_used, ap.draw_date
  ORDER BY ap.draw_date DESC;
END;
$$;

-- Cleanup Expired Predictions RPC
DROP FUNCTION IF EXISTS public.cleanup_expired_predictions() CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_expired_predictions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.precalculated_predictions
  WHERE draw_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$;

-- Dynamic Optimal Gap RPC
DROP FUNCTION IF EXISTS public.calculate_dynamic_optimal_gap(text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_dynamic_optimal_gap() CASCADE;
CREATE OR REPLACE FUNCTION public.calculate_dynamic_optimal_gap(p_draw_name text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_avg_gap numeric;
BEGIN
  SELECT AVG(days_since_last) INTO v_avg_gap
  FROM public.number_statistics
  WHERE draw_name = p_draw_name;
  RETURN COALESCE(ROUND(v_avg_gap, 2), 7.0);
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. MATERIALIZED VIEWS & RANKINGS
-- ----------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_algorithm_stats AS
SELECT 
  ac.algorithm_name,
  COUNT(ap.id) AS total_predictions,
  COALESCE(AVG(ap.accuracy_score), 0) AS avg_accuracy,
  COALESCE(MAX(ap.matches_count), 0) AS best_match,
  COUNT(CASE WHEN ap.matches_count >= 3 THEN 1 END) AS successful_predictions
FROM public.algorithm_config ac
LEFT JOIN public.algorithm_performance ap ON ap.model_used = ac.algorithm_name
GROUP BY ac.algorithm_name;

CREATE UNIQUE INDEX IF NOT EXISTS mv_algorithm_stats_pkey ON public.mv_algorithm_stats (algorithm_name);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_enhanced_stats AS
SELECT 
  ap.model_used AS algorithm_name,
  COUNT(ap.id) AS total_predictions,
  COALESCE(AVG(ap.accuracy_score), 0) AS avg_accuracy,
  COALESCE(AVG(ap.composite_score), 0) AS avg_composite_score,
  COALESCE(MAX(ap.matches_count), 0) AS max_matches,
  COUNT(CASE WHEN ap.matches_count >= 3 THEN 1 END) AS win_count
FROM public.algorithm_performance ap
GROUP BY ap.model_used;

CREATE UNIQUE INDEX IF NOT EXISTS mv_enhanced_stats_pkey ON public.mv_enhanced_stats (algorithm_name);

-- Materialized View Refresh Routine
DROP FUNCTION IF EXISTS public.refresh_materialized_views() CASCADE;
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_algorithm_stats') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_algorithm_stats;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_enhanced_stats') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_enhanced_stats;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Fallback if CONCURRENTLY fails due to lack of index
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_algorithm_stats') THEN
    REFRESH MATERIALIZED VIEW public.mv_algorithm_stats;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_enhanced_stats') THEN
    REFRESH MATERIALIZED VIEW public.mv_enhanced_stats;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.refresh_algorithm_rankings() CASCADE;
CREATE OR REPLACE FUNCTION public.refresh_algorithm_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.refresh_materialized_views();
END;
$$;

DROP FUNCTION IF EXISTS public.refresh_enhanced_stats() CASCADE;
CREATE OR REPLACE FUNCTION public.refresh_enhanced_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.refresh_materialized_views();
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. AUTOMATED TRIGGERS
-- ----------------------------------------------------------------------------

-- Trigger to create profile and preferences on user signup
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at on core tables
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_draw_results_updated_at ON public.draw_results;
CREATE TRIGGER update_draw_results_updated_at
  BEFORE UPDATE ON public.draw_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_algorithm_config_updated_at ON public.algorithm_config;
CREATE TRIGGER update_algorithm_config_updated_at
  BEFORE UPDATE ON public.algorithm_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adaptive Orchestration Automation on Draw Result Insertion
DROP FUNCTION IF EXISTS public.trigger_adaptive_orchestration() CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_adaptive_orchestration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Perform stats refresh
  PERFORM public.refresh_materialized_views();

  -- Call edge function asynchronously if pg_net is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      PERFORM extensions.net.http_post(
        url := 'https://kmkdwivnymcumgoorsiv.supabase.co/functions/v1/adaptive-orchestration',
        headers := ('{"Content-Type": "application/json", "Authorization": "Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), '') || '"}')::jsonb,
        body := jsonb_build_object('drawName', NEW.draw_name, 'drawDate', NEW.draw_date)
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ignore external HTTP errors inside DB transaction
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_draw_result_inserted ON public.draw_results;
CREATE TRIGGER on_draw_result_inserted
  AFTER INSERT ON public.draw_results
  FOR EACH ROW EXECUTE FUNCTION public.trigger_adaptive_orchestration();

-- ----------------------------------------------------------------------------
-- 6. INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_draw_results_perf ON public.draw_results(draw_name, draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_user_draw ON public.predictions(user_id, draw_name, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_precalc_preds_score ON public.precalculated_predictions(draw_name, draw_date DESC, score DESC);
CREATE INDEX IF NOT EXISTS idx_algo_perf_model_date ON public.algorithm_performance(model_used, draw_name, draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_number_stats_freq ON public.number_statistics(draw_name, frequency DESC, days_since_last ASC);

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.number_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precalculated_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_training_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prediction_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prediction_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_calibration_metrics ENABLE ROW LEVEL SECURITY;

-- Public READ policies for shared data
DROP POLICY IF EXISTS "Public read draw_results" ON public.draw_results;
CREATE POLICY "Public read draw_results" ON public.draw_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read number_statistics" ON public.number_statistics;
CREATE POLICY "Public read number_statistics" ON public.number_statistics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read precalculated_predictions" ON public.precalculated_predictions;
CREATE POLICY "Public read precalculated_predictions" ON public.precalculated_predictions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read collaborative_predictions" ON public.collaborative_predictions;
CREATE POLICY "Public read collaborative_predictions" ON public.collaborative_predictions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read algorithm_config" ON public.algorithm_config;
CREATE POLICY "Public read algorithm_config" ON public.algorithm_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read algorithm_performance" ON public.algorithm_performance;
CREATE POLICY "Public read algorithm_performance" ON public.algorithm_performance FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read achievements" ON public.achievements;
CREATE POLICY "Public read achievements" ON public.achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read user_profiles" ON public.user_profiles;
CREATE POLICY "Public read user_profiles" ON public.user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read ledger_entries" ON public.ledger_entries;
CREATE POLICY "Public read ledger_entries" ON public.ledger_entries FOR SELECT USING (true);

-- User-owned policies
DROP POLICY IF EXISTS "Users read own predictions" ON public.predictions;
CREATE POLICY "Users read own predictions" ON public.predictions FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users insert own predictions" ON public.predictions;
CREATE POLICY "Users insert own predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users update own predictions" ON public.predictions;
CREATE POLICY "Users update own predictions" ON public.predictions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own profiles" ON public.user_profiles;
CREATE POLICY "Users manage own profiles" ON public.user_profiles FOR ALL USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users manage own preferences" ON public.user_preferences;
CREATE POLICY "Users manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own achievements" ON public.user_achievements;
CREATE POLICY "Users read own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage feedback" ON public.user_prediction_feedback;
CREATE POLICY "Users manage feedback" ON public.user_prediction_feedback FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage community votes" ON public.community_votes;
CREATE POLICY "Users manage community votes" ON public.community_votes FOR ALL USING (auth.uid() = user_id);

-- Admin management policies
DROP POLICY IF EXISTS "Admin manage algorithm_config" ON public.algorithm_config;
CREATE POLICY "Admin manage algorithm_config" ON public.algorithm_config FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin manage draw_results" ON public.draw_results;
CREATE POLICY "Admin manage draw_results" ON public.draw_results FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin manage training_history" ON public.algorithm_training_history;
CREATE POLICY "Admin manage training_history" ON public.algorithm_training_history FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin manage training_control" ON public.training_control;
CREATE POLICY "Admin manage training_control" ON public.training_control FOR ALL USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. SEED DATA - LES 6 ALGORITHMES OFFICIELS & GAMIFICATION
-- ----------------------------------------------------------------------------

-- Official 6 ML Algorithms
INSERT INTO public.algorithm_config (algorithm_name, description, category, weight, is_enabled, parameters)
VALUES
  ('FrequencyPro', 'Analyse fréquentielle avancée et lissage bayésien (Lotto 5/90)', 'statistical', 1.0, true, '{"threshold": 0.15, "recency_boost": 1.2}'::jsonb),
  ('Random Forest', 'Ensemble d''arbres de décision sur caractéristiques temporelles', 'forest', 0.9, true, '{"n_estimators": 100, "max_depth": 10}'::jsonb),
  ('LSTM Network', 'Réseau de neurones récurrent pour capture des séquences temporelles', 'recurrent', 0.9, true, '{"units": 64, "lookback": 20}'::jsonb),
  ('Transformer (Attention)', 'Mécanisme d''attention spatio-temporelle sur tirages', 'transformer', 1.1, true, '{"num_heads": 4, "num_layers": 2}'::jsonb),
  ('XGBoost', 'Gradient Boosting sur gradients d''écarts et vélocité', 'statistical', 1.0, true, '{"learning_rate": 0.1, "max_depth": 6}'::jsonb),
  ('Ensemble Hybride Stacking', 'Méta-modèle combinant l''ensemble des prédictions (Modèle le plus puissant)', 'ensemble', 1.2, true, '{"voting_strategy": "soft", "min_estimators": 3}'::jsonb)
ON CONFLICT (algorithm_name) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  weight = EXCLUDED.weight,
  is_enabled = EXCLUDED.is_enabled,
  parameters = EXCLUDED.parameters,
  updated_at = now();

-- Gamification Achievements
INSERT INTO public.achievements (name, description, icon, category, points, requirement_type, requirement_value)
VALUES
  ('Premier Pas', 'Faire votre première prédiction', '🏃', 'predictions', 10, 'predictions_count', 1),
  ('Débutant Analyste', 'Faire 10 prédictions', '🌟', 'predictions', 50, 'predictions_count', 10),
  ('Maître Stratège', 'Faire 100 prédictions', '🏆', 'predictions', 500, 'predictions_count', 100),
  ('Premier Gagnant', 'Trouver 3 numéros corrects', '🍀', 'accuracy', 100, 'matches_count', 3),
  ('Grand Gagnant', 'Trouver 4 numéros corrects', '✨', 'accuracy', 250, 'matches_count', 4),
  ('Jackpot Lumineux', 'Trouver 5 numéros corrects (Pleine combinaison !)', '💰', 'accuracy', 1000, 'matches_count', 5)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  points = EXCLUDED.points;
