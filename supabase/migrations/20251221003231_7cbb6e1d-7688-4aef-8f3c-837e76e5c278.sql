-- Mettre à jour les préférences utilisateurs avec des anciens algorithmes vers le nouvel algorithme par défaut
UPDATE user_preferences 
SET preferred_algorithm = 'Stacking Ensemble' 
WHERE preferred_algorithm NOT IN (
  'FrequencyPro',
  'Random Forest',
  'LSTM Network',
  'Transformer (Attention)',
  'XGBoost',
  'Stacking Ensemble'
);

-- Modifier la valeur par défaut de la colonne preferred_algorithm
ALTER TABLE user_preferences 
ALTER COLUMN preferred_algorithm SET DEFAULT 'Stacking Ensemble';