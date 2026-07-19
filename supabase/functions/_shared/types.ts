// =====================================================
// Types principaux du système de prédiction
// Architecture: Data Science & Machine Learning
// =====================================================

// ====================== TYPES DE BASE ======================

export interface DrawResult {
  draw_name: string;
  draw_date: string;
  winning_numbers: number[];
  machine_numbers?: number[];
}

// Les catégories d'algorithmes (XGBoost / Gradient boosting retiré)
export type AlgorithmCategory = 
  | "statistical"   // FrequencyPro - Analyse statistique
  | "forest"        // Arbres Heuristiques - Ensemble d'arbres
  | "recurrent"     // LSTM - Réseaux récurrents
  | "transformer"   // Transformer - Attention mechanism
  | "ensemble";     // Stacking/Smart Ensemble

// ====================== PRÉDICTIONS ======================

export interface PredictionResult {
  numbers: number[];
  confidence: number;
  probabilities?: Record<number, number>;
  algorithm: string;
  factors: string[];
  score: number;
  category: AlgorithmCategory;
  metadata?: PredictionMetadata;
}

export interface PredictionMetadata {
  executionTime?: number;
  dataPointsUsed?: number;
  modelVersion?: string;
  warnings?: string[];
}

// ====================== ALGORITHMES ======================

export interface AlgorithmConfig {
  name: string;
  category: AlgorithmCategory;
  minDataRequired: number;
  maxDataUsed: number;
  resourceIntensity: "low" | "medium" | "high";
  weight: number;
  enabled: boolean;
}

export interface AlgorithmPerformance {
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgMatches: number;
  totalPredictions: number;
  lastUpdated: string;
}

export type AlgorithmFunction = (results: DrawResult[]) => PredictionResult;

export interface AlgorithmRegistry {
  config: AlgorithmConfig;
  execute: AlgorithmFunction;
}

// ====================== MÉTRIQUES ======================

export interface DataMetrics {
  quality: number;        // 0-1: Qualité globale des données
  freshness: number;      // 0-1: Fraîcheur des données
  completeness: number;   // 0-1: Complétude des champs
  consistency: number;    // 0-1: Cohérence des données
  historicalCount: number;
}

export interface AlgorithmMetrics {
  totalRecords: number;
  dateRange: { start: string; end: string };
  avgConfidence: number;
  dataQuality: number;
  freshness: number;
  completeness: number;
}

// ====================== ANALYSE BAYÉSIENNE ======================

export interface NormalizedWeight {
  algorithm: string;
  normalizedModelWeight: number;
  likelihood: number;
  prior: number;
  evidenceContribution: number;
}

export interface ConsensusMetrics {
  agreementScore: number;
  divergenceIndex: number;
  confidenceInterval: [number, number];
  consensusNumbers: number[];
  uncertainNumbers: number[];
}

export interface BayesianResult {
  numbers: number[];
  confidence: number;
  weights: NormalizedWeight[];
}

// ====================== PÉRIODICITÉ ======================

export interface PeriodicityPattern {
  period: number;
  strength: number;
  confidence: number;
  affectedNumbers: number[];
  description: string;
}

export interface NumberCycle {
  number: number;
  avgCycleLength: number;
  cycleVariance: number;
  nextExpectedDraw: number;
  reliability: number;
}

export interface SeasonalAnalysis {
  dayOfWeekEffect: Map<string, number[]>;
  monthlyTrend: Map<number, number[]>;
  weeklyPattern: PeriodicityPattern | null;
  biweeklyPattern: PeriodicityPattern | null;
  monthlyPattern: PeriodicityPattern | null;
}

// ====================== VALIDATION CROISÉE ======================

export interface ValidationResult {
  algorithm: string;
  predictedNumbers: number[];
  actualNumbers: number[];
  matches: number;
  accuracy: number;
  precision: number;
  recall: number;
}

export interface CrossValidationMetrics {
  meanAccuracy: number;
  stdDevAccuracy: number;
  meanMatches: number;
  bestFold: number;
  worstFold: number;
  algorithmRankings: Map<string, number>;
}

export interface ThresholdAdjustment {
  algorithm: string;
  currentThreshold: number;
  recommendedThreshold: number;
  confidenceBoost: number;
  reason: string;
}

// ====================== MOTEUR DE PRÉDICTION ======================

export interface PredictionOptions {
  drawName?: string;
  useStackingEnsemble?: boolean;
  useSmartEnsemble?: boolean;
  useAIOrchestration?: boolean;
  multiAlgorithm?: boolean;
  useEnhancedFormulas?: boolean;
  useBayesian?: boolean;
  usePeriodicity?: boolean;
}

export interface PredictionEngineResult {
  predictions: PredictionResult[];
  selectedAlgorithm: string;
  algorithmReason: string;
  optimizedPrediction: PredictionResult;
  enhancedPrediction?: EnhancedPredictionResult;
  dataMetrics: DataMetrics;
  executionTime: number;
  formulasBreakdown?: EnhancedScoreBreakdown;
  consensusMetrics?: {
    agreementScore: number;
    consensusNumbers: number[];
  };
  periodicPatterns?: {
    count: number;
    dueNumbers: number[];
  };
}

// ====================== PRÉDICTIONS AMÉLIORÉES ======================

export interface EnhancedPredictionResult extends PredictionResult {
  breakdown: EnhancedScoreBreakdown;
  narratives: string[];
  topPairs?: [number, number][];
}

export interface EnhancedScoreBreakdown {
  frequency: number;
  gap: number;
  pairs: number;
  equilibrium: number;
  echo: number;
  temporal?: number;
  momentum?: number;
  spatial?: number;
  composite: number;
}

// ====================== CACHE ======================

export interface CachedData<T> {
  data: T;
  timestamp: number;
  quality: number;
  expiresAt?: number;
}

// ====================== CONSTANTES ======================

export const LOTTERY_CONSTANTS = {
  MIN_NUMBER: 1,
  MAX_NUMBER: 90,
  NUMBERS_PER_DRAW: 5,
  TARGET_SUM: 219,
  SUM_TOLERANCE: 30,
  OPTIMAL_GAP_MIN: 11,
  OPTIMAL_GAP_MAX: 20,
} as const;

export const ALGORITHM_NAMES = {
  FREQUENCY_PRO: "FrequencyPro",
  RANDOM_FOREST: "Arbres Heuristiques",
  LSTM: "Séquences Récurrentes",
  TRANSFORMER: "Attention Spatiale",
  DOUBLE_GAP_SEQUENCE: "Double Gap Sequence",
  GAP_CADENCE: "Gap Cadence",
  STACKING: "Ensemble Hybride Stacking",
  SMART_ENSEMBLE: "Smart Ensemble",
  BAYESIAN: "Bayesian Ensemble",
} as const;

// Compatibilité legacy
export type Database = Record<string, unknown>;
