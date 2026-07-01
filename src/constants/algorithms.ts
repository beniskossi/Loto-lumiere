// Noms unifiés des 6 algorithmes optimaux
export const ALGORITHM_NAMES = {
  FREQUENCY_PRO: "FrequencyPro",
  RANDOM_FOREST: "Random Forest",
  LSTM: "LSTM Network",
  TRANSFORMER: "Transformer (Attention)",
  XGBOOST: "XGBoost",
  STACKING: "Stacking Ensemble",
} as const;

// Catégories correspondant aux 6 algorithmes valides
export const ALGORITHM_CATEGORIES = {
  [ALGORITHM_NAMES.FREQUENCY_PRO]: "statistical",
  [ALGORITHM_NAMES.RANDOM_FOREST]: "forest",
  [ALGORITHM_NAMES.LSTM]: "transformer",
  [ALGORITHM_NAMES.TRANSFORMER]: "transformer",
  [ALGORITHM_NAMES.XGBOOST]: "xgboost",
  [ALGORITHM_NAMES.STACKING]: "ensemble",
} as const;

export const ALL_ALGORITHMS = Object.values(ALGORITHM_NAMES);
