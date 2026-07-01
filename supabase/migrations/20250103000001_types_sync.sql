-- ============================================================================
-- SYNCHRONISATION DES TYPES TYPESCRIPT
-- ============================================================================

-- Création de l'enum app_role s'il n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('user', 'admin');
    END IF;
END $$;

-- ============================================================================
-- CORRECTION DE LA TABLE USER_ROLES
-- ============================================================================

-- Création de la table user_roles si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'user',
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

-- Index pour user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- RLS pour user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles 
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- CORRECTION DE LA TABLE PREDICTION_SHARES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prediction_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    prediction_id uuid REFERENCES public.predictions(id) ON DELETE CASCADE,
    share_platform text NOT NULL,
    shared_at timestamptz DEFAULT now()
);

-- Index pour prediction_shares
CREATE INDEX IF NOT EXISTS idx_prediction_shares_user_id ON public.prediction_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_shares_prediction_id ON public.prediction_shares(prediction_id);

-- RLS pour prediction_shares
ALTER TABLE public.prediction_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shares" ON public.prediction_shares;
CREATE POLICY "Users can view own shares" ON public.prediction_shares 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own shares" ON public.prediction_shares;
CREATE POLICY "Users can create own shares" ON public.prediction_shares 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- CORRECTION DE LA TABLE USER_PREDICTION_TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_prediction_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    prediction_id uuid REFERENCES public.predictions(id) ON DELETE CASCADE,
    marked_at timestamptz DEFAULT now(),
    notes text,
    UNIQUE(user_id, prediction_id)
);

-- Index pour user_prediction_tracking
CREATE INDEX IF NOT EXISTS idx_user_prediction_tracking_user_id ON public.user_prediction_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prediction_tracking_prediction_id ON public.user_prediction_tracking(prediction_id);

-- RLS pour user_prediction_tracking
ALTER TABLE public.user_prediction_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tracking" ON public.user_prediction_tracking;
CREATE POLICY "Users can manage own tracking" ON public.user_prediction_tracking 
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- MISE À JOUR DES COLONNES MANQUANTES
-- ============================================================================

-- Ajout des colonnes manquantes dans algorithm_performance
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_performance' AND column_name = 'prediction_date') THEN
        ALTER TABLE public.algorithm_performance ADD COLUMN prediction_date date;
        UPDATE public.algorithm_performance SET prediction_date = draw_date WHERE prediction_date IS NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_performance' AND column_name = 'confidence_score') THEN
        ALTER TABLE public.algorithm_performance ADD COLUMN confidence_score numeric(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_performance' AND column_name = 'precision_score') THEN
        ALTER TABLE public.algorithm_performance ADD COLUMN precision_score numeric(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_performance' AND column_name = 'recall_score') THEN
        ALTER TABLE public.algorithm_performance ADD COLUMN recall_score numeric(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_performance' AND column_name = 'f1_score') THEN
        ALTER TABLE public.algorithm_performance ADD COLUMN f1_score numeric(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_performance' AND column_name = 'prediction_score') THEN
        ALTER TABLE public.algorithm_performance ADD COLUMN prediction_score numeric(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_performance' AND column_name = 'execution_time') THEN
        ALTER TABLE public.algorithm_performance ADD COLUMN execution_time numeric(10,3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_performance' AND column_name = 'data_points_used') THEN
        ALTER TABLE public.algorithm_performance ADD COLUMN data_points_used integer;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'algorithm_performance' AND column_name = 'factors') THEN
        ALTER TABLE public.algorithm_performance ADD COLUMN factors text[];
    END IF;
END $$;

-- ============================================================================
-- CRÉATION DE LA TABLE ALGORITHM_TRAINING_HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.algorithm_training_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    algorithm_name text NOT NULL,
    training_date date DEFAULT CURRENT_DATE,
    previous_weight numeric(3,2) NOT NULL,
    new_weight numeric(3,2) NOT NULL,
    previous_parameters jsonb,
    new_parameters jsonb,
    performance_improvement numeric(5,2),
    training_metrics jsonb,
    created_at timestamptz DEFAULT now()
);

-- Index pour algorithm_training_history
CREATE INDEX IF NOT EXISTS idx_algorithm_training_history_algorithm ON public.algorithm_training_history(algorithm_name, training_date DESC);

-- RLS pour algorithm_training_history
ALTER TABLE public.algorithm_training_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view training history" ON public.algorithm_training_history;
CREATE POLICY "Anyone can view training history" ON public.algorithm_training_history 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage training history" ON public.algorithm_training_history;
CREATE POLICY "Admins can manage training history" ON public.algorithm_training_history 
    FOR INSERT WITH CHECK (public.is_admin());

-- ============================================================================
-- FONCTIONS UTILITAIRES POUR LES RÔLES
-- ============================================================================

-- Fonction pour vérifier les rôles
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role = _role
    );
END;
$$;

-- Fonction pour vérifier si l'utilisateur actuel est admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.has_role('admin'::public.app_role) OR 
           EXISTS (
               SELECT 1 FROM public.user_profiles 
               WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
           );
END;
$$;

-- ============================================================================
-- TRIGGER POUR CRÉER AUTOMATIQUEMENT LES PROFILS UTILISATEUR
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Créer le profil utilisateur
    INSERT INTO public.user_profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    -- Créer les préférences utilisateur
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    -- Assigner le rôle par défaut
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

-- Trigger pour les nouveaux utilisateurs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FINALISATION
-- ============================================================================

-- Mise à jour des statistiques
ANALYZE public.user_roles;
ANALYZE public.prediction_shares;
ANALYZE public.user_prediction_tracking;
ANALYZE public.algorithm_training_history;

-- Log de fin
DO $$
BEGIN
    RAISE NOTICE 'Types synchronization completed successfully at %', now();
END $$;