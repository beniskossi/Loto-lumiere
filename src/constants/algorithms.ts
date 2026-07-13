// Noms unifiés des 6 algorithmes optimaux
export const ALGORITHM_NAMES = {
  FREQUENCY_PRO: "FrequencyPro",
  RANDOM_FOREST: "Random Forest",
  LSTM: "LSTM Network",
  TRANSFORMER: "Transformer (Attention)",
  DOUBLE_GAP_SEQUENCE: "Double Gap Sequence",
  GAP_CADENCE: "Gap Cadence",
  STACKING: "Stacking Ensemble",
} as const;

// Catégories correspondant aux 6 algorithmes valides
export const ALGORITHM_CATEGORIES = {
  [ALGORITHM_NAMES.FREQUENCY_PRO]: "statistical",
  [ALGORITHM_NAMES.RANDOM_FOREST]: "forest",
  [ALGORITHM_NAMES.LSTM]: "transformer",
  [ALGORITHM_NAMES.TRANSFORMER]: "transformer",
  [ALGORITHM_NAMES.DOUBLE_GAP_SEQUENCE]: "statistical",
  [ALGORITHM_NAMES.GAP_CADENCE]: "statistical",
  [ALGORITHM_NAMES.STACKING]: "ensemble",
} as const;

export const ALL_ALGORITHMS = Object.values(ALGORITHM_NAMES);
