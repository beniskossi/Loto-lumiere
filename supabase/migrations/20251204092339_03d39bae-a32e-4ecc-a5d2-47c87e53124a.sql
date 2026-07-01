-- Supprimer toutes les données de performance des algorithmes obsolètes
DELETE FROM algorithm_performance 
WHERE model_used NOT IN (
  'Stacking Ensemble',
  'Transformer (Attention)',
  'XGBoost',
  'LSTM',
  'LSTM Network',
  'Random Forest',
  'FrequencyPro',
  'FrequencyPro (Analyse Fréquentielle Pondérée)'
);