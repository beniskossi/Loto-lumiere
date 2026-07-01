-- Ajouter les nouvelles colonnes à precalculated_predictions pour les métadonnées enrichies
ALTER TABLE public.precalculated_predictions
ADD COLUMN IF NOT EXISTS selected_algorithm text,
ADD COLUMN IF NOT EXISTS algorithm_reason text,
ADD COLUMN IF NOT EXISTS historical_count integer;

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_precalculated_predictions_algorithm 
ON public.precalculated_predictions(selected_algorithm);

CREATE INDEX IF NOT EXISTS idx_precalculated_predictions_quality 
ON public.precalculated_predictions(data_quality DESC);

-- Mettre à jour les commentaires
COMMENT ON COLUMN public.precalculated_predictions.selected_algorithm IS 'Nom de l''algorithme sélectionné intelligemment';
COMMENT ON COLUMN public.precalculated_predictions.algorithm_reason IS 'Raison de la sélection de cet algorithme';
COMMENT ON COLUMN public.precalculated_predictions.historical_count IS 'Nombre de tirages historiques utilisés';