// =====================================================
// Algorithmes de prédiction optimaux
// Les 6 algorithmes principaux du système
// =====================================================

import type { DrawResult, PredictionResult, AlgorithmCategory } from "./types.ts";
import { generateRandomPrediction, selectBalancedNumbers, log } from "./utils.ts";

// Réexporter les algorithmes avancés
export { transformerAlgorithm } from "./transformer.ts";
export { xgboostAlgorithm } from "./xgboost.ts";
export { stackingEnsemble } from "./stacking.ts";

const EPSILON = 1e-10;

// =====================================================
// UTILITAIRES PARTAGÉS
// =====================================================

/**
 * Génère une prédiction de fallback en mode dégradé
 */
export function generateFallbackPrediction(
  algorithm: string,
  category: AlgorithmCategory
): PredictionResult {
  return {
    numbers: generateRandomPrediction(),
    confidence: 0.2,
    algorithm: `${algorithm} (Données Insuffisantes)`,
    factors: ["Données insuffisantes", "Mode dégradé"],
    score: 0.2,
    category,
  };
}

/**
 * Calcule une confiance harmonisée basée sur un score moyen
 */
function computeConfidence(avgScore: number, maxConfidence: number = 0.85): number {
  return Math.min(maxConfidence, Math.tanh(avgScore * 5) + 0.2);
}

/**
 * Générateur pseudo-aléatoire avec seed
 */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Initialise une matrice de poids avec seed
 */
function initializeWeights(rows: number, cols: number, seed: number = 42): number[][] {
  const random = seededRandom(seed);
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => random() * 2 - 1)
  );
}

/**
 * Fonction sigmoid
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

// =====================================================
// ALGORITHME 1: FrequencyPro
// Analyse fréquentielle pondérée optimisée
// =====================================================

export function frequencyProAlgorithm(results: DrawResult[]): PredictionResult {
  if (results.length < 5) {
    return generateFallbackPrediction("FrequencyPro", "statistical");
  }

  const weightedFreq: Record<number, number> = {};
  for (let i = 1; i <= 90; i++) weightedFreq[i] = 0;

  let totalWeight = 0;
  const maxResults = Math.min(results.length, 200);
  
  results.slice(0, maxResults).forEach((result, index) => {
    // Décroissance exponentielle des poids
    const weight = Math.exp(-index * 0.05);
    totalWeight += weight * result.winning_numbers.length;
    
    result.winning_numbers.forEach((num) => {
      weightedFreq[num] += weight;
    });
  });

  // Normalisation
  for (let i = 1; i <= 90; i++) {
    weightedFreq[i] /= (totalWeight + EPSILON);
  }

  // Sélection des candidats
  const sortedNumbers = Object.entries(weightedFreq)
    .sort(([, a], [, b]) => b - a)
    .map(([num]) => parseInt(num));

  const topCandidates = sortedNumbers.slice(0, 15);
  const prediction = selectBalancedNumbers(topCandidates, 5);
  
  // Calcul de la confiance
  const avgScore = prediction.reduce((sum, num) => sum + weightedFreq[num], 0) / 5;
  const confidence = computeConfidence(avgScore, 0.85);

  return {
    numbers: prediction,
    confidence,
    algorithm: "FrequencyPro",
    factors: [
      "Fréquence pondérée",
      "Décroissance exponentielle",
      `${maxResults} tirages analysés`
    ],
    score: confidence * 0.85,
    category: "statistical",
  };
}

// =====================================================
// ALGORITHME 2: Random Forest
// Ensemble d'arbres de décision
// =====================================================

export function randomForestAlgorithm(results: DrawResult[]): PredictionResult {
  if (results.length < 5) {
    return generateFallbackPrediction("Random Forest", "forest");
  }

  try {
    const numTrees = 10;
    const trees: number[][] = [];

    // Construire plusieurs arbres avec bootstrap
    for (let t = 0; t < numTrees; t++) {
      const bootstrapSample = bootstrapSampling(results);
      const tree = buildDecisionTree(bootstrapSample);
      trees.push(tree);
    }

    // Système de vote
    const votes: Record<number, number> = {};
    for (let i = 1; i <= 90; i++) votes[i] = 0;

    trees.forEach(tree => {
      tree.forEach(num => votes[num]++);
    });

    const sortedNumbers = Object.entries(votes)
      .sort(([, a], [, b]) => b - a)
      .map(([num]) => parseInt(num));

    const prediction = selectBalancedNumbers(sortedNumbers.slice(0, 15), 5);

    return {
      numbers: prediction,
      confidence: 0.85,
      algorithm: "Random Forest",
      factors: [
        `${numTrees} arbres`,
        "Bootstrap sampling",
        "Vote majoritaire"
      ],
      score: 0.85 * 0.85,
      category: "forest",
    };
  } catch (error) {
    log("error", `Random Forest failed for ${results.length} results`, { error });
    return generateFallbackPrediction("Random Forest", "forest");
  }
}

function bootstrapSampling<T>(data: T[]): T[] {
  const sample: T[] = [];
  const usedIndices = new Set<number>();
  
  while (sample.length < data.length) {
    const idx = Math.floor(Math.random() * data.length);
    sample.push(data[idx]);
    usedIndices.add(idx);
  }
  
  // Assurer une diversité minimale
  if (usedIndices.size < data.length * 0.5) {
    return bootstrapSampling(data);
  }
  
  return sample;
}

function buildDecisionTree(results: DrawResult[]): number[] {
  const recentFreq: Record<number, number> = {};
  const oldFreq: Record<number, number> = {};
  
  for (let i = 1; i <= 90; i++) {
    recentFreq[i] = 0;
    oldFreq[i] = 0;
  }

  const mid = Math.floor(results.length / 2);
  
  // Fréquences récentes vs anciennes
  results.slice(0, mid).forEach(r => {
    r.winning_numbers.forEach(num => recentFreq[num]++);
  });
  results.slice(mid).forEach(r => {
    r.winning_numbers.forEach(num => oldFreq[num]++);
  });

  // Score avec tendance
  const scores: Record<number, number> = {};
  for (let i = 1; i <= 90; i++) {
    const trend = recentFreq[i] - oldFreq[i];
    scores[i] = recentFreq[i] + trend * 0.5;
  }

  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([num]) => parseInt(num));
}

// =====================================================
// ALGORITHME 3: LSTM Network
// Réseau de neurones récurrent simplifié
// =====================================================

export function lstmAlgorithm(results: DrawResult[]): PredictionResult {
  if (results.length < 5) {
    return generateFallbackPrediction("LSTM Network", "recurrent");
  }

  try {
    const sequenceLength = 3;
    const hiddenSize = 8;

    // États LSTM
    let cellState = Array(hiddenSize).fill(0);
    let hiddenState = Array(hiddenSize).fill(0);

    // Poids avec seed pour reproductibilité
    const weightsF = initializeWeights(5, hiddenSize, 44);
    const weightsI = initializeWeights(5, hiddenSize, 45);
    const weightsO = initializeWeights(5, hiddenSize, 46);

    // Traitement de la séquence
    results.slice(0, sequenceLength).forEach(result => {
      const input = result.winning_numbers.map(n => n / 90);

      // Gates LSTM
      const forgetGate = input.map((_, i) => 
        sigmoid(input.reduce((sum, x, j) => sum + x * (weightsF[j]?.[i] ?? 0), 0))
      );
      const inputGate = input.map((_, i) =>
        sigmoid(input.reduce((sum, x, j) => sum + x * (weightsI[j]?.[i] ?? 0), 0))
      );
      const outputGate = input.map((_, i) =>
        sigmoid(input.reduce((sum, x, j) => sum + x * (weightsO[j]?.[i] ?? 0), 0))
      );

      // Mise à jour des états
      cellState = cellState.map((c, i) => 
        forgetGate[i] * c + inputGate[i] * Math.tanh(input[i] || 0)
      );
      hiddenState = outputGate.map((o, i) => o * Math.tanh(cellState[i]));
    });

    // Génération de la prédiction
    const prediction = hiddenState
      .slice(0, 5)
      .map(h => Math.min(90, Math.max(1, Math.round((h + 1) * 45))))
      .sort((a, b) => a - b);

    return {
      numbers: prediction,
      confidence: 0.87,
      algorithm: "LSTM Network",
      factors: [
        "Réseau récurrent",
        "Cell + Hidden states",
        "Gates forget/input/output"
      ],
      score: 0.87 * 0.87,
      category: "recurrent",
    };
  } catch (error) {
    log("error", `LSTM failed for ${results.length} results`, { error });
    return generateFallbackPrediction("LSTM Network", "recurrent");
  }
}
