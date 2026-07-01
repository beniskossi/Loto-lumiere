-- Supprimer les configurations d'algorithmes obsolètes
DELETE FROM algorithm_config
WHERE algorithm_name NOT IN (
  'Stacking Ensemble',
  'Transformer (Attention)',
  'XGBoost',
  'LSTM',
  'LSTM Network',
  'Random Forest',
  'FrequencyPro'
);