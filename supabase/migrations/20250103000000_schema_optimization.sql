-- ============================================================================
-- SCHEMA OPTIMIZATION - Correction des incohérences et optimisation
-- ============================================================================

-- Suppression des tables dupliquées/obsolètes
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_favorites CASCADE;
DROP TABLE IF EXISTS public.algorithm_config CASCADE;

-- ============================================================================
-- 1. CORRECTION DE LA TABLE USER_PROFILES
-- ============================================================================

-- Ajout des colonnes manquantes à user_profiles si elles n'existent pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'username') THEN
        ALTER TABLE public.user_profiles ADD COLUMN username text UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN full_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.user_profiles ADD COLUMN avatar_url text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'bio') THEN
        ALTER TABLE public.user_profiles ADD COLUMN bio text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'role') THEN
        ALTER TABLE public.user_profiles ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'level') THEN
        ALTER TABLE public.user_profiles ADD COLUMN level integer DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'experience_points') THEN
        ALTER TABLE public.user_profiles ADD COLUMN experience_points integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'total_predictions') THEN
        ALTER TABLE public.user_profiles ADD COLUMN total_predictions integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'successful_predictions') THEN
        ALTER TABLE public.user_profiles ADD COLUMN successful_predictions integer DEFAULT 0;
    END IF;
END $$;

-- ============================================================================
-- 2. CORRECTION DE LA TABLE USER_PREFERENCES
-- ============================================================================

-- Ajout des colonnes manquantes à user_preferences
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'notification_time') THEN
        ALTER TABLE public.user_preferences ADD COLUMN notification_time time DEFAULT '09:00:00';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'theme') THEN
        ALTER TABLE public.user_preferences ADD COLUMN theme text DEFAULT 'system';
    END IF;
END $$;

-- ============================================================================
-- 3. OPTIMISATION DES INDEX
-- ============================================================================

-- Index optimisés pour les performances
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_draw_results_performance ON public.draw_results(draw_name, draw_date DESC, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_predictions_performance ON public.predictions(draw_name, prediction_date DESC, model_used);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_algorithm_performance_model_date ON public.algorithm_performance(model_used, draw_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_number_statistics_draw_frequency ON public.number_statistics(draw_name, frequency DESC, days_since_last);

-- ============================================================================
-- 4. FONCTIONS UTILITAIRES OPTIMISÉES
-- ============================================================================

-- Fonction pour calculer les statistiques globales
CREATE OR REPLACE FUNCTION public.get_global_statistics(p_draw_name text DEFAULT NULL)
RETURNS TABLE (
    total_draws bigint,
    most_frequent_number integer,
    least_frequent_number integer,
    avg_frequency numeric,
    last_draw_date date
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_draws,
        (SELECT number FROM public.number_statistics 
         WHERE (p_draw_name IS NULL OR draw_name = p_draw_name)
         ORDER BY frequency DESC LIMIT 1) as most_frequent_number,
        (SELECT number FROM public.number_statistics 
         WHERE (p_draw_name IS NULL OR draw_name = p_draw_name)
         ORDER BY frequency ASC LIMIT 1) as least_frequent_number,
        AVG(frequency) as avg_frequency,
        MAX(draw_date) as last_draw_date
    FROM public.draw_results
    WHERE (p_draw_name IS NULL OR draw_name = p_draw_name);
END;
$$;

-- Fonction pour obtenir les tendances des algorithmes
CREATE OR REPLACE FUNCTION public.get_algorithm_performance_summary(p_days integer DEFAULT 30)
RETURNS TABLE (
    model_used text,
    total_predictions bigint,
    avg_accuracy numeric,
    best_accuracy numeric,
    total_matches bigint,
    perfect_predictions bigint
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.model_used,
        COUNT(*)::bigint as total_predictions,
        ROUND(AVG(ap.accuracy_score), 2) as avg_accuracy,
        MAX(ap.accuracy_score) as best_accuracy,
        SUM(ap.matches_count)::bigint as total_matches,
        COUNT(*) FILTER (WHERE ap.matches_count = 5)::bigint as perfect_predictions
    FROM public.algorithm_performance ap
    WHERE ap.created_at >= CURRENT_DATE - INTERVAL '%s days' % p_days
    GROUP BY ap.model_used
    ORDER BY avg_accuracy DESC;
END;
$$;

-- ============================================================================
-- 5. TRIGGERS OPTIMISÉS
-- ============================================================================

-- Trigger pour mettre à jour les profils utilisateur
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Mise à jour des statistiques utilisateur lors d'une nouvelle prédiction
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'prediction_tracking' THEN
        UPDATE public.user_profiles 
        SET 
            total_predictions = total_predictions + 1,
            successful_predictions = CASE 
                WHEN NEW.matches >= 3 THEN successful_predictions + 1 
                ELSE successful_predictions 
            END,
            experience_points = experience_points + (NEW.matches * 10),
            level = GREATEST(1, (experience_points + (NEW.matches * 10)) / 100),
            updated_at = now()
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Application du trigger
DROP TRIGGER IF EXISTS update_user_stats_trigger ON public.prediction_tracking;
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE ON public.prediction_tracking
    FOR EACH ROW EXECUTE FUNCTION public.update_user_stats();

-- ============================================================================
-- 6. VUES MATÉRIALISÉES POUR LES PERFORMANCES
-- ============================================================================

-- Vue matérialisée pour les statistiques des algorithmes
DROP MATERIALIZED VIEW IF EXISTS public.mv_algorithm_stats;
CREATE MATERIALIZED VIEW public.mv_algorithm_stats AS
SELECT 
    model_used,
    draw_name,
    COUNT(*) as total_predictions,
    ROUND(AVG(accuracy_score), 2) as avg_accuracy,
    MAX(accuracy_score) as best_accuracy,
    MIN(accuracy_score) as worst_accuracy,
    SUM(matches_count) as total_matches,
    COUNT(*) FILTER (WHERE matches_count >= 3) as good_predictions,
    COUNT(*) FILTER (WHERE matches_count = 5) as perfect_predictions,
    MAX(created_at) as last_prediction
FROM public.algorithm_performance
GROUP BY model_used, draw_name;

CREATE UNIQUE INDEX ON public.mv_algorithm_stats (model_used, draw_name);

-- Fonction pour rafraîchir les vues matérialisées
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_algorithm_stats;
END;
$$;

-- ============================================================================
-- 7. POLITIQUES DE SÉCURITÉ OPTIMISÉES
-- ============================================================================

-- Politique pour les administrateurs
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

-- Politiques pour les tables sensibles
DROP POLICY IF EXISTS "Admins can manage algorithm configs" ON public.algorithm_configurations;
CREATE POLICY "Admins can manage algorithm configs" ON public.algorithm_configurations
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage scraping jobs" ON public.scraping_jobs;
CREATE POLICY "Admins can manage scraping jobs" ON public.scraping_jobs
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- 8. DONNÉES DE RÉFÉRENCE OPTIMISÉES
-- ============================================================================

-- Mise à jour des configurations d'algorithmes avec de meilleurs paramètres
INSERT INTO public.algorithm_configurations (algorithm_name, is_enabled, weight, parameters)
VALUES
    ('Ensemble Voting', true, 1.0, '{"voting_strategy": "soft", "min_estimators": 3}'::jsonb),
    ('XGBoost Optimized', true, 0.95, '{"n_estimators": 200, "max_depth": 6, "learning_rate": 0.1}'::jsonb),
    ('Random Forest', true, 0.9, '{"n_estimators": 100, "max_depth": 10, "min_samples_split": 5}'::jsonb),
    ('Deep Learning', true, 0.85, '{"layers": [128, 64, 32], "dropout": 0.3, "epochs": 100}'::jsonb)
ON CONFLICT (algorithm_name) DO UPDATE SET
    parameters = EXCLUDED.parameters,
    updated_at = now();

-- ============================================================================
-- FINALISATION
-- ============================================================================

-- Mise à jour des statistiques PostgreSQL
ANALYZE public.draw_results;
ANALYZE public.predictions;
ANALYZE public.algorithm_performance;
ANALYZE public.number_statistics;

-- Rafraîchissement des vues matérialisées
SELECT public.refresh_materialized_views();

-- Log de fin
DO $$
BEGIN
    RAISE NOTICE 'Schema optimization completed successfully at %', now();
END $$;