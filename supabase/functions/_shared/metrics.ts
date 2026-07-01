// Advanced Metrics for model evaluation
import type { DrawResult, PredictionResult } from "./types.ts";

export interface AdvancedMetrics {
  positionAccuracy: number[];
  f1Score: number;
  precision: number;
  recall: number;
  aucRoc: number;
  calibrationScore: number;
  sharpeRatio: number;
  algorithmHitRate: Record<string, number>;
  predictionStability: number;
}

export function calculateAdvancedMetrics(
  predictions: PredictionResult[],
  actualResults: DrawResult[]
): AdvancedMetrics {
  return {
    positionAccuracy: calculatePositionAccuracy(predictions, actualResults),
    f1Score: calculateF1Score(predictions, actualResults),
    precision: calculatePrecision(predictions, actualResults),
    recall: calculateRecall(predictions, actualResults),
    aucRoc: calculateAUCROC(predictions, actualResults),
    calibrationScore: calculateCalibration(predictions, actualResults),
    sharpeRatio: calculateSharpeRatio(predictions, actualResults),
    algorithmHitRate: calculateAlgorithmHitRate(predictions, actualResults),
    predictionStability: calculateStability(predictions),
  };
}

function calculatePositionAccuracy(
  predictions: PredictionResult[],
  actualResults: DrawResult[]
): number[] {
  const positionAcc = [0, 0, 0, 0, 0];
  let count = 0;

  predictions.forEach((pred, idx) => {
    if (idx < actualResults.length) {
      const actual = actualResults[idx].winning_numbers;
      pred.numbers.forEach((num, pos) => {
        if (actual.includes(num)) {
          positionAcc[pos]++;
        }
      });
      count++;
    }
  });

  return positionAcc.map(acc => count > 0 ? acc / count : 0);
}

function calculateF1Score(
  predictions: PredictionResult[],
  actualResults: DrawResult[]
): number {
  const precision = calculatePrecision(predictions, actualResults);
  const recall = calculateRecall(predictions, actualResults);

  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

function calculatePrecision(
  predictions: PredictionResult[],
  actualResults: DrawResult[]
): number {
  let truePositives = 0;
  let falsePositives = 0;

  predictions.forEach((pred, idx) => {
    if (idx < actualResults.length) {
      const actual = actualResults[idx].winning_numbers;
      pred.numbers.forEach(num => {
        if (actual.includes(num)) {
          truePositives++;
        } else {
          falsePositives++;
        }
      });
    }
  });

  const total = truePositives + falsePositives;
  return total > 0 ? truePositives / total : 0;
}

function calculateRecall(
  predictions: PredictionResult[],
  actualResults: DrawResult[]
): number {
  let truePositives = 0;
  let falseNegatives = 0;

  predictions.forEach((pred, idx) => {
    if (idx < actualResults.length) {
      const actual = actualResults[idx].winning_numbers;
      actual.forEach(num => {
        if (pred.numbers.includes(num)) {
          truePositives++;
        } else {
          falseNegatives++;
        }
      });
    }
  });

  const total = truePositives + falseNegatives;
  return total > 0 ? truePositives / total : 0;
}

function calculateAUCROC(
  predictions: PredictionResult[],
  actualResults: DrawResult[]
): number {
  // Simplified AUC calculation
  let auc = 0;
  let count = 0;

  predictions.forEach((pred, idx) => {
    if (idx < actualResults.length) {
      const actual = actualResults[idx].winning_numbers;
      const hits = pred.numbers.filter(n => actual.includes(n)).length;
      auc += hits / 5;
      count++;
    }
  });

  return count > 0 ? auc / count : 0;
}

function calculateCalibration(
  predictions: PredictionResult[],
  actualResults: DrawResult[]
): number {
  // Measure how well confidence matches actual accuracy
  let calibrationError = 0;
  let count = 0;

  predictions.forEach((pred, idx) => {
    if (idx < actualResults.length) {
      const actual = actualResults[idx].winning_numbers;
      const hits = pred.numbers.filter(n => actual.includes(n)).length;
      const actualAccuracy = hits / 5;
      calibrationError += Math.abs(pred.confidence - actualAccuracy);
      count++;
    }
  });

  return count > 0 ? 1 - (calibrationError / count) : 0;
}

function calculateSharpeRatio(
  predictions: PredictionResult[],
  actualResults: DrawResult[]
): number {
  const returns: number[] = [];

  predictions.forEach((pred, idx) => {
    if (idx < actualResults.length) {
      const actual = actualResults[idx].winning_numbers;
      const hits = pred.numbers.filter(n => actual.includes(n)).length;
      returns.push(hits / 5);
    }
  });

  if (returns.length === 0) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const std = Math.sqrt(variance);

  return std > 0 ? mean / std : 0;
}

function calculateAlgorithmHitRate(
  predictions: PredictionResult[],
  actualResults: DrawResult[]
): Record<string, number> {
  const hitRates: Record<string, { hits: number; total: number }> = {};

  predictions.forEach((pred, idx) => {
    if (idx < actualResults.length) {
      const actual = actualResults[idx].winning_numbers;
      const hits = pred.numbers.filter(n => actual.includes(n)).length;

      if (!hitRates[pred.algorithm]) {
        hitRates[pred.algorithm] = { hits: 0, total: 0 };
      }

      hitRates[pred.algorithm].hits += hits;
      hitRates[pred.algorithm].total += 5;
    }
  });

  const result: Record<string, number> = {};
  Object.entries(hitRates).forEach(([algo, data]) => {
    result[algo] = data.total > 0 ? data.hits / data.total : 0;
  });

  return result;
}

function calculateStability(predictions: PredictionResult[]): number {
  if (predictions.length < 2) return 1;

  let totalDiff = 0;
  for (let i = 1; i < predictions.length; i++) {
    const prev = predictions[i - 1].numbers;
    const curr = predictions[i].numbers;
    const overlap = prev.filter(n => curr.includes(n)).length;
    totalDiff += (5 - overlap) / 5;
  }

  return 1 - (totalDiff / (predictions.length - 1));
}
