-- Supprimer les algorithmes obsolètes de algorithm_config
DELETE FROM algorithm_config 
WHERE algorithm_name IN (
  'CatBoost-like (Pattern Sequence)',
  'Hybrid (Ensemble Model)',
  'Hybrid (LightGBM-like + CatBoost-like + Transformers-like)',
  'LightGBM-like (Weighted Frequency)',
  'Markov Chain (State Transition)',
  'Transformers-like (Gap Analysis)'
);

-- Mettre à jour les noms des algorithmes actuels pour correspondre au registre
UPDATE algorithm_config 
SET algorithm_name = 'LSTM Network' 
WHERE algorithm_name = 'LSTM';

-- S'assurer que tous les 6 algorithmes valides existent avec les bons noms
INSERT INTO algorithm_config (algorithm_name, description, weight, is_enabled)
VALUES 
  ('FrequencyPro', 'Analyse statistique des fréquences pondérées', 0.7, true),
  ('Random Forest', 'Ensemble d arbres de décision avec bootstrap', 0.8, true),
  ('LSTM Network', 'Réseau de neurones récurrent', 0.9, true),
  ('Transformer (Attention)', 'Architecture d attention avancée', 1.1, true),
  ('XGBoost', 'Extreme Gradient Boosting optimisé', 1.0, true),
  ('Stacking Ensemble', 'Fusion intelligente multi-algorithmes', 1.2, true)
ON CONFLICT (algorithm_name) 
DO UPDATE SET 
  description = EXCLUDED.description,
  is_enabled = true;