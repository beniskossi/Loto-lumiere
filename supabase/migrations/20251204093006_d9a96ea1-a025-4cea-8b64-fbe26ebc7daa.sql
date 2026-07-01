-- Harmoniser le nom LSTM Network en LSTM
UPDATE algorithm_config
SET algorithm_name = 'LSTM'
WHERE algorithm_name = 'LSTM Network';