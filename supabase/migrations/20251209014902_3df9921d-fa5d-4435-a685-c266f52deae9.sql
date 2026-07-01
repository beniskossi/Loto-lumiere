-- Table pour stocker les paramètres de prédiction configurables
CREATE TABLE public.prediction_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Activer RLS
ALTER TABLE public.prediction_config ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique
CREATE POLICY "Anyone can view prediction config"
ON public.prediction_config
FOR SELECT
USING (true);

-- Politique d'écriture admin uniquement
CREATE POLICY "Only admins can manage prediction config"
ON public.prediction_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_prediction_config_updated_at
BEFORE UPDATE ON public.prediction_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les valeurs par défaut pour l'intervalle optimal
INSERT INTO public.prediction_config (config_key, config_value, description)
VALUES 
  ('optimal_gap', '{"min": 11, "max": 20, "boost": 0.35}', 'Intervalle optimal de réapparition des numéros (en tirages) et boost appliqué'),
  ('gap_threshold', '{"zscore": 1.2}', 'Seuil Z-score pour considérer un gap comme élevé'),
  ('weights', '{"frequency": 0.25, "gap": 0.20, "echo": 0.15, "pairs": 0.12, "equilibrium": 0.08, "temporal": 0.08, "momentum": 0.07, "spatial": 0.05}', 'Poids des formules dans le score composite');