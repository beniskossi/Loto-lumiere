// Ensemble Hybride Stacking - Meta-learning avec les meilleurs algorithmes de base
import type { DrawResult, PredictionResult } from "./types.ts";
import { transformerAlgorithm } from "./transformer.ts";
import { lstmAlgorithm, randomForestAlgorithm, frequencyProAlgorithm } from "./algorithms.ts";
import { doubleGapSequenceAlgorithm, gapCadenceAlgorithm } from "./new-algorithms.ts";
import { selectBalancedNumbers } from "./utils.ts";

const EPSILON = 1e-10;

export function stackingEnsemble(results: DrawResult[]): PredictionResult {
  if (results.length < 10) {
    return {
      numbers: [1, 2, 3, 4, 5],
      confidence: 0.2,
      algorithm: "Stacking (Données Insuffisantes)",
      factors: ["Données insuffisantes"],
      score: 0.2,
      category: "ensemble",
    };
  }

  try {
    // Level 1: Les meilleurs algorithmes de base
    const level1Models = [
      transformerAlgorithm(results),
      lstmAlgorithm(results),
      randomForestAlgorithm(results),
      frequencyProAlgorithm(results),
      doubleGapSequenceAlgorithm(results),
      gapCadenceAlgorithm(results),
    ];

    // Level 2: Meta-learner
    const metaScores = trainMetaLearner(results);

    // Combine predictions
    const finalScores: Record<number, number> = {};
    for (let i = 1; i <= 90; i++) finalScores[i] = 0;

    level1Models.forEach((model, idx) => {
      const weight = metaScores[idx];
      model.numbers.forEach(num => {
        finalScores[num] += weight * model.confidence;
      });
    });

    const sortedNumbers = Object.entries(finalScores)
      .sort(([, a], [, b]) => b - a)
      .map(([num]) => parseInt(num));

    const prediction = selectBalancedNumbers(sortedNumbers.slice(0, 15), 5);

    const avgConfidence = level1Models.reduce((sum, m) => sum + m.confidence, 0) / level1Models.length;

    return {
      numbers: prediction,
      confidence: Math.min(0.95, avgConfidence * 1.15),
      algorithm: "Ensemble Hybride Stacking",
      factors: ["6 modèles L1", "Meta-learner", "Poids optimisés"],
      score: avgConfidence * avgConfidence,
      category: "ensemble",
    };
  } catch (error) {
    return {
      numbers: [1, 2, 3, 4, 5],
      confidence: 0.2,
      algorithm: "Stacking (Erreur)",
      factors: ["Erreur"],
      score: 0.2,
      category: "ensemble",
    };
  }
}


function trainMetaLearner(
  results: DrawResult[]
): number[] {
  // Out-of-sample walk-forward for each model
  // We will do a 5-step walk-forward
  const walkForwardSteps = Math.min(5, results.length - 15);
  if (walkForwardSteps <= 0) {
    return [1/6, 1/6, 1/6, 1/6, 1/6, 1/6];
  }

  const hits = [0, 0, 0, 0, 0, 0];

  for (let i = 0; i < walkForwardSteps; i++) {
    // For step i, the "future" result is results[i].
    // The "past" training data is results.slice(i + 1).
    const trainData = results.slice(i + 1);
    const targetResult = results[i];

    const modelsOOS = [
      transformerAlgorithm(trainData),
      lstmAlgorithm(trainData),
      randomForestAlgorithm(trainData),
      frequencyProAlgorithm(trainData),
      doubleGapSequenceAlgorithm(trainData),
      gapCadenceAlgorithm(trainData),
    ];

    modelsOOS.forEach((model, idx) => {
      const matches = model.numbers.filter(n =>
        targetResult.winning_numbers.includes(n)
      ).length;
      hits[idx] += matches;
    });
  }

  const performances = hits.map(h => h / (walkForwardSteps * 5));
  const total = performances.reduce((a, b) => a + b, 0);
  if (total === 0) {
    return [1/6, 1/6, 1/6, 1/6, 1/6, 1/6];
  }
  return performances.map(p => p / total);
}
