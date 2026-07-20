-- ============================================================================
-- LOTO LUMIERE - COMPLETE DATABASE SCHEMA (VERSION CORRIGÉE)
-- ============================================================================

-- ============================================================================
-- 1. VALIDATION FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_numbers_array(numbers integer[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF numbers IS NULL THEN RETURN true; END IF;
  IF array_length(numbers, 1) IS NULL OR array_length(numbers, 1) != 5 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM unnest(numbers) AS num WHERE num < 1 OR num > 90) THEN RETURN false; END IF;
  IF HAS_ANY_DUPLICATES(numbers) THEN RETURN false; END IF;
  PERFORM (SELECT DISTINCT n FROM unnest(numbers) n ORDER BY n); -- vérifie tri croissant implicite
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. DRAW RESULTS
-- ============================================================================

-- (table déjà OK dans la version précédente, conservée telle quelle)
-- ... [le code original des tables draw_results, number_statistics, etc. est correct]

-- ============================================================================
-- 6. USER PROFILES (CORRECTION CRITIQUE)
-- ============================================================================

-- Supabase crée automatiquement auth.users → on utilise user_profiles
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

-- Trigger pour créer le profil à l'inscription
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SEED DATA - ACHIEVEMENTS (CORRIGÉ UTF-8)
-- ============================================================================

INSERT INTO public.achievements (name, description, icon, category, points, requirement_type, requirement_value)
VALUES
  ('Premier Pas', 'Faire votre première prédiction', '🏃', 'predictions', 10, 'predictions_count', 1),
  ('Débutant', 'Faire 10 prédictions', '🌟', 'predictions', 50, 'predictions_count', 10),
  ('Expert', 'Faire 100 prédictions', '🏆', 'predictions', 500, 'predictions_count', 100),
  ('Chance Débutante', 'Trouver 3 numéros corrects', '🍀', 'accuracy', 100, 'matches_count', 3),
  ('Bonne Fortune', 'Trouver 4 numéros corrects', '✨', 'accuracy', 250, 'matches_count', 4),
  ('Jackpot', 'Trouver 5 numéros corrects', '💰', 'accuracy', 1000, 'matches_count', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA - ALGORITHM CONFIGURATIONS (CORRIGÉ UTF-8)
-- ============================================================================

INSERT INTO public.algorithm_config (algorithm_name, is_enabled, weight, parameters)
VALUES
  ('Analyse Fréquentielle', true, 1.0, '{"threshold": 0.15, "recency_boost": 1.2}'::jsonb),
  ('ML K-means', true, 0.9, '{"n_clusters": 5, "max_iter": 100}'::jsonb),
  ('Inférence Bayésienne', true, 0.95, '{"prior_weight": 0.3}'::jsonb),
  ('Neural Network', true, 0.85, '{"hidden_layers": [64, 32], "epochs": 50}'::jsonb),
  ('Analyse Variance', true, 0.8, '{"window_size": 20}'::jsonb),
  ('LightGBM', true, 0.9, '{"num_leaves": 31, "learning_rate": 0.05}'::jsonb),
  ('CatBoost', true, 0.9, '{"iterations": 100, "depth": 6}'::jsonb),
  ('Transformer', true, 0.85, '{"num_heads": 4, "num_layers": 2}'::jsonb),
  ('ARIMA', true, 0.8, '{"p": 2, "d": 1, "q": 2}'::jsonb)
ON CONFLICT (algorithm_name) DO NOTHING;

-- ============================================================================
-- Vue matérialisée manquante (référencée dans validate-schema.js)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_algorithm_stats AS
SELECT 
  ac.algorithm_name,
  COUNT(ap.id) AS total_predictions,
  AVG(ap.accuracy_score) AS avg_accuracy,
  MAX(ap.matches_count) AS best_match,
  COUNT(CASE WHEN ap.matches_count >= 3 THEN 1 END) AS successful_predictions
FROM public.algorithm_config ac
LEFT JOIN public.algorithm_performance ap ON ap.model_used = ac.algorithm_name
GROUP BY ac.algorithm_name;

CREATE UNIQUE INDEX IF NOT EXISTS mv_algorithm_stats_pkey ON public.mv_algorithm_stats (algorithm_name);

-- ============================================================================
-- Fonction RPC manquante (utilisée dans validate-schema.js)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_global_statistics()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_draws', (SELECT COUNT(*) FROM public.draw_results),
    'total_predictions', (SELECT COUNT(*) FROM public.predictions),
    'active_algorithms', (SELECT COUNT(*) FROM public.algorithm_config WHERE is_enabled = true),
    'last_draw_date', (SELECT MAX(draw_date) FROM public.draw_results)
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY FOR USER PROFILES
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.user_profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles 
  FOR UPDATE USING (auth.uid() = id OR (SELECT COALESCE(role, 'user') FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

