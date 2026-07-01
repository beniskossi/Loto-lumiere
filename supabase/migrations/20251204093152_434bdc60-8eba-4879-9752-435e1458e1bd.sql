-- Harmoniser les données existantes dans algorithm_performance
UPDATE algorithm_performance
SET model_used = 'LSTM'
WHERE model_used = 'LSTM Network';