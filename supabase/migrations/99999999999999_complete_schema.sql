-- ============================================================================
-- LOTO LUMIERE - UNIFIED MASTER DATABASE SCHEMA
-- Compatible, Idempotent, Production-Ready
-- ============================================================================

-- ============================================================================
-- 1. HELPER & VALIDATION FUNCTIONS
-- ============================================================================

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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

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

-- ============================================================================
-- 2. CORE DOMAIN TABLES
-- ============================================================================

-- Tirages officiels
CREATE TABLE IF NOT EXISTS public.draw_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  draw_date date NOT NULL,
  winning_numbers integer[] NOT NULL CONSTRAINT check_winning_numbers CHECK (public.validate_numbers_array(winning_numbers)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_draw_result UNIQUE (draw_name, draw_date)
);

-- Statistiques par numéro
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

-- Pre-calculated predictions
CREATE TABLE IF NOT EXISTS public.precalculated_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  draw_date date NOT NULL,
  algorithm_name text NOT NULL,
  predicted_numbers integer[] NOT NULL CONSTRAINT check_pred_numbers CHECK (public.validate_numbers_array(predicted_numbers)),
  confidence numeric DEFAULT 0.5,
  algorithm_reason text,
  score numeric DEFAULT 0.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_precalc_pred UNIQUE (draw_name, draw_date, algorithm_name)
);

-- Historique d'orchestration
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

-- Prédictions collaboratives communautaires
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

-- Configurations des algorithmes
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

-- Performances historiques des modèles
CREATE TABLE IF NOT EXISTS public.algorithm_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_name text NOT NULL,
  draw_date date NOT NULL,
  model_used text NOT NULL,
  predicted_numbers integer[] NOT NULL,
  actual_numbers integer[] NOT NULL,
  matches_count integer NOT NULL DEFAULT 0,
  accuracy_score numeric DEFAULT 0,
  composite_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Historique d'entraînement
CREATE TABLE IF NOT EXISTS public.algorithm_training_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm_name text NOT NULL,
  accuracy numeric DEFAULT 0,
  loss numeric DEFAULT 0,
  training_date timestamptz DEFAULT now()
);

-- Prédictions utilisateurs / système
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

-- Feedback utilisateur
CREATE TABLE IF NOT EXISTS public.user_prediction_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_id uuid REFERENCES public.predictions(id) ON DELETE CASCADE,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  feedback_text text,
  created_at timestamptz DEFAULT now()
);

-- Ledger immuable (journal de preuve)
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

-- Profils utilisateurs
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

-- Préférences utilisateurs
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

-- Succès (Achievements)
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

-- Votes communautaires
CREATE TABLE IF NOT EXISTS public.community_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  prediction_id uuid REFERENCES public.predictions(id) ON DELETE CASCADE,
  vote_type text CHECK (vote_type IN ('upvote', 'downvote')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_vote UNIQUE (user_id, prediction_id)
);

-- ============================================================================
-- 3. TRIGGERS & AUTOMATIONS
-- ============================================================================

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

-- ============================================================================
-- 4. VIEWS & MATERIALIZED VIEWS
-- ============================================================================

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

-- Fonction pour rafraîchir les vues matérialisées
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_algorithm_stats;
  REFRESH MATERIALIZED VIEW public.mv_enhanced_stats;
END;
$$;

-- RPC Global Statistics
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
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

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
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;

-- Public READ policies
CREATE POLICY "Public read draw_results" ON public.draw_results FOR SELECT USING (true);
CREATE POLICY "Public read number_statistics" ON public.number_statistics FOR SELECT USING (true);
CREATE POLICY "Public read precalculated_predictions" ON public.precalculated_predictions FOR SELECT USING (true);
CREATE POLICY "Public read collaborative_predictions" ON public.collaborative_predictions FOR SELECT USING (true);
CREATE POLICY "Public read algorithm_config" ON public.algorithm_config FOR SELECT USING (true);
CREATE POLICY "Public read algorithm_performance" ON public.algorithm_performance FOR SELECT USING (true);
CREATE POLICY "Public read achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Public read user_profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Public read ledger_entries" ON public.ledger_entries FOR SELECT USING (true);

-- User-specific policies
CREATE POLICY "Users read own predictions" ON public.predictions FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users create own predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users manage own profiles" ON public.user_profiles FOR ALL USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage feedback" ON public.user_prediction_feedback FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage community votes" ON public.community_votes FOR ALL USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admin full access algorithm_config" ON public.algorithm_config FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access draw_results" ON public.draw_results FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access training_history" ON public.algorithm_training_history FOR ALL USING (public.is_admin());

-- ============================================================================
-- 6. SEED DATA - LES 6 ALGORITHMES OFFICIELS ET SUCCÈS
-- ============================================================================

INSERT INTO public.algorithm_config (algorithm_name, description, category, weight, is_enabled, parameters)
VALUES
  ('FrequencyPro', 'Analyse fréquentielle avancée et lissage bayésien', 'statistical', 1.0, true, '{"threshold": 0.15, "recency_boost": 1.2}'::jsonb),
  ('Random Forest', 'Ensemble d''arbres de décision sur caractéristiques temporelles', 'forest', 0.9, true, '{"n_estimators": 100, "max_depth": 10}'::jsonb),
  ('LSTM Network', 'Réseau de neurones récurrent pour capture de séquences', 'recurrent', 0.9, true, '{"units": 64, "lookback": 20}'::jsonb),
  ('Transformer (Attention)', 'Mécanisme d''attention spatio-temporelle sur tirages', 'transformer', 1.1, true, '{"num_heads": 4, "num_layers": 2}'::jsonb),
  ('XGBoost', 'Gradient Boosting sur gradients d''écarts et vélocité', 'statistical', 1.0, true, '{"learning_rate": 0.1, "max_depth": 6}'::jsonb),
  ('Ensemble Hybride Stacking', 'Méta-modèle combinant l''ensemble des prédictions', 'ensemble', 1.2, true, '{"voting_strategy": "soft", "min_estimators": 3}'::jsonb)
ON CONFLICT (algorithm_name) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  weight = EXCLUDED.weight,
  is_enabled = EXCLUDED.is_enabled,
  parameters = EXCLUDED.parameters,
  updated_at = now();

INSERT INTO public.achievements (name, description, icon, category, points, requirement_type, requirement_value)
VALUES
  ('Premier Pas', 'Faire votre première prédiction', '🏃', 'predictions', 10, 'predictions_count', 1),
  ('Débutant', 'Faire 10 prédictions', '🌟', 'predictions', 50, 'predictions_count', 10),
  ('Expert', 'Faire 100 prédictions', '🏆', 'predictions', 500, 'predictions_count', 100),
  ('Chance Débutante', 'Trouver 3 numéros corrects', '🍀', 'accuracy', 100, 'matches_count', 3),
  ('Bonne Fortune', 'Trouver 4 numéros corrects', '✨', 'accuracy', 250, 'matches_count', 4),
  ('Jackpot', 'Trouver 5 numéros corrects', '💰', 'accuracy', 1000, 'matches_count', 5)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  points = EXCLUDED.points;
