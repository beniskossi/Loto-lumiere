-- Add customization fields to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS preferred_algorithm text DEFAULT 'LightGBM-like (Gradient Boosting)',
ADD COLUMN IF NOT EXISTS theme_primary_color text DEFAULT '#1e3a5f',
ADD COLUMN IF NOT EXISTS theme_accent_color text DEFAULT '#d4af37',
ADD COLUMN IF NOT EXISTS custom_layout jsonb DEFAULT '{"home": "default", "stats": "default"}'::jsonb;

-- Create algorithm_config table for admin management
CREATE TABLE IF NOT EXISTS public.algorithm_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm_name text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT true,
  weight numeric NOT NULL DEFAULT 1.0,
  description text,
  parameters jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.algorithm_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for algorithm_config
CREATE POLICY "Anyone can view algorithm configs"
  ON public.algorithm_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage algorithm configs"
  ON public.algorithm_config
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default algorithm configurations
INSERT INTO public.algorithm_config (algorithm_name, description, weight) VALUES
  ('LightGBM-like (Gradient Boosting)', 'Analyse de fréquence avec décroissance temporelle', 1.0),
  ('CatBoost-like (Categorical Boost)', 'Analyse des associations entre numéros', 1.0),
  ('Transformers-like (Attention)', 'Analyse temporelle des écarts', 1.0),
  ('XGBoost-like (eXtreme Gradient Boosting)', 'Optimisation par gradient extrême', 0.9),
  ('RandomForest-like (Bagging)', 'Combinaison d''arbres de décision', 0.9),
  ('SVM-like (Support Vector)', 'Séparation par vecteurs de support', 0.8),
  ('LSTM-like (Long Short-Term)', 'Mémoire à court et long terme', 0.8),
  ('Ensemble Bayésien', 'Combinaison bayésienne des modèles', 1.2)
ON CONFLICT (algorithm_name) DO NOTHING;

-- Update trigger for algorithm_config
CREATE TRIGGER update_algorithm_config_updated_at
  BEFORE UPDATE ON public.algorithm_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create shares table for social sharing
CREATE TABLE IF NOT EXISTS public.prediction_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prediction_id uuid REFERENCES public.predictions(id) ON DELETE CASCADE NOT NULL,
  share_platform text NOT NULL,
  shared_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prediction_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prediction_shares
CREATE POLICY "Users can view their own shares"
  ON public.prediction_shares
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shares"
  ON public.prediction_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.algorithm_config IS 'Configuration and management of prediction algorithms';
COMMENT ON TABLE public.prediction_shares IS 'Track when users share predictions on social media';