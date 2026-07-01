-- Nettoyer la table algorithm_configurations pour ne garder que les 6 algorithmes optimaux

-- Supprimer tous les anciens algorithmes
DELETE FROM algorithm_configurations 
WHERE algorithm_name NOT IN (
  'FrequencyPro',
  'Random Forest',
  'LSTM Network',
  'Transformer (Attention)',
  'XGBoost',
  'Stacking Ensemble'
);

-- Mettre à jour ou insérer les 6 algorithmes optimaux avec leurs poids par défaut
INSERT INTO algorithm_configurations (algorithm_name, is_enabled, weight, parameters)
VALUES 
  ('FrequencyPro', true, 1.0, '{"decay_rate": 0.05, "top_candidates": 15}'::jsonb),
  ('Random Forest', true, 1.0, '{"num_trees": 10, "max_depth": 5}'::jsonb),
  ('LSTM Network', true, 1.0, '{"hidden_size": 64, "num_layers": 2, "sequence_length": 20}'::jsonb),
  ('Transformer (Attention)', true, 1.0, '{"num_heads": 4, "embed_dim": 32, "num_layers": 2}'::jsonb),
  ('XGBoost', true, 1.0, '{"max_iterations": 50, "learning_rate": 0.1, "lambda": 1.0, "gamma": 0.1}'::jsonb),
  ('Stacking Ensemble', true, 1.5, '{"meta_learner": "weighted_average", "level1_models": 5}'::jsonb)
ON CONFLICT (algorithm_name) 
DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  weight = EXCLUDED.weight,
  parameters = EXCLUDED.parameters,
  updated_at = now();

-- Faire pareil pour algorithm_config (au cas où)
DELETE FROM algorithm_config 
WHERE algorithm_name NOT IN (
  'FrequencyPro',
  'Random Forest',
  'LSTM Network',
  'Transformer (Attention)',
  'XGBoost',
  'Stacking Ensemble'
);

INSERT INTO algorithm_config (algorithm_name, is_enabled, weight, parameters, description)
VALUES 
  ('FrequencyPro', true, 1.0, '{"decay_rate": 0.05, "top_candidates": 15}'::jsonb, 'Analyse fréquentielle pondérée avec décroissance exponentielle'),
  ('Random Forest', true, 1.0, '{"num_trees": 10, "max_depth": 5}'::jsonb, 'Ensemble d''arbres de décision avec bootstrap'),
  ('LSTM Network', true, 1.0, '{"hidden_size": 64, "num_layers": 2, "sequence_length": 20}'::jsonb, 'Réseau de neurones récurrent avec mémoire'),
  ('Transformer (Attention)', true, 1.0, '{"num_heads": 4, "embed_dim": 32, "num_layers": 2}'::jsonb, 'Architecture d''attention multi-têtes'),
  ('XGBoost', true, 1.0, '{"max_iterations": 50, "learning_rate": 0.1, "lambda": 1.0, "gamma": 0.1}'::jsonb, 'Gradient boosting avec régularisation'),
  ('Stacking Ensemble', true, 1.5, '{"meta_learner": "weighted_average", "level1_models": 5}'::jsonb, 'Meta-learner combinant les 5 autres algorithmes')
ON CONFLICT (algorithm_name) 
DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  weight = EXCLUDED.weight,
  parameters = EXCLUDED.parameters,
  description = EXCLUDED.description,
  updated_at = now();