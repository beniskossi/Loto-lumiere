
import type { DrawResult, PredictionResult } from "./types.ts";
import { DeterministicLCG, deriveSeedFromDraws } from "./utils.ts";

export interface BacktestResult {
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  brierScore?: number;
  avgMatches: number;
  bestMatch: number;
  worstMatch: number;
  consistency: number;
  totalTests: number;
  matchDistribution: Record<number, number>;
}

export interface CrossValidationResult {
  folds: BacktestResult[];
  aggregated: BacktestResult;
  standardError: number;
  confidenceInterval: { lower: number; upper: number };
}

/**
 * Backtesting using Expanding Window
 */
export async function backtestWithExpandingWindow(
  algorithm: (results: DrawResult[]) => PredictionResult,
  algorithmName: string,
  historicalData: DrawResult[],
  initialTrainSize: number = 50,
  stepSize: number = 5
): Promise<CrossValidationResult> {
  const folds: BacktestResult[] = [];
  
  // We need enough data
  if (historicalData.length <= initialTrainSize) {
    throw new Error("Pas assez de données pour l'expanding window");
  }

  for (let i = initialTrainSize; i < historicalData.length; i += stepSize) {
    const testEnd = Math.min(i + stepSize, historicalData.length);
    const trainData = historicalData.slice(0, i);
    const testData = historicalData.slice(i, testEnd);

    const foldResult = await backtestAlgorithm(
      algorithm,
      algorithmName,
      trainData,
      testData
    );
    folds.push(foldResult);
  }

  const aggregated = aggregateFoldResults(folds, algorithmName);
  const accuracies = folds.map(f => f.accuracy);
  const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
  const standardError = Math.sqrt(variance / folds.length);
  const zScore95 = 1.96;
  const confidenceInterval = {
    lower: mean - zScore95 * standardError,
    upper: mean + zScore95 * standardError
  };

  return { folds, aggregated, standardError, confidenceInterval };
}

/**
 * Backtesting using Rolling Window
 */
export async function backtestWithRollingWindow(
  algorithm: (results: DrawResult[]) => PredictionResult,
  algorithmName: string,
  historicalData: DrawResult[],
  windowSize: number = 100,
  stepSize: number = 5
): Promise<CrossValidationResult> {
  const folds: BacktestResult[] = [];

  if (historicalData.length <= windowSize) {
    throw new Error("Pas assez de données pour le rolling window");
  }

  for (let i = windowSize; i < historicalData.length; i += stepSize) {
    const testEnd = Math.min(i + stepSize, historicalData.length);
    const trainData = historicalData.slice(i - windowSize, i);
    const testData = historicalData.slice(i, testEnd);

    const foldResult = await backtestAlgorithm(
      algorithm,
      algorithmName,
      trainData,
      testData
    );
    folds.push(foldResult);
  }

  const aggregated = aggregateFoldResults(folds, algorithmName);
  const accuracies = folds.map(f => f.accuracy);
  const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
  const standardError = Math.sqrt(variance / folds.length);
  const zScore95 = 1.96;
  const confidenceInterval = {
    lower: mean - zScore95 * standardError,
    upper: mean + zScore95 * standardError
  };

  return { folds, aggregated, standardError, confidenceInterval };
}

/**
 * Backtesting standard avec métriques avancées
 */
export async function backtestAlgorithm(
  algorithm: (results: DrawResult[]) => PredictionResult,
  algorithmName: string,
  trainingData: DrawResult[],
  testData?: DrawResult[],
  windowSize: number = 50,
  maxTests: number = 200
): Promise<BacktestResult> {
  const scores: number[] = [];
  const precisions: number[] = [];
  const recalls: number[] = [];
  const matchDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  const data = testData || trainingData;
  const startIdx = testData ? 0 : windowSize;
  
  let endIdx = testData ? data.length : Math.min(trainingData.length, windowSize + 50);
  if (endIdx - startIdx > maxTests) {
    endIdx = startIdx + maxTests;
  }

  for (let i = startIdx; i < endIdx; i++) {
    const trainSlice = testData 
      ? trainingData 
      : trainingData.slice(Math.max(0, i - windowSize), i);
      
    if (trainSlice.length < 10) continue;
    
    const testPoint = data[i];
    
    try {
      const prediction = await algorithm(trainSlice);
      if (prediction.numbers && prediction.numbers.join(',') === '1,2,3,4,5') {
        continue; // isoler [1, 2, 3, 4, 5]
      }
      const predictedCount = prediction.numbers.length;
      const actualCount = testPoint.winning_numbers.length;
      
      const matches = prediction.numbers.filter(n => 
        testPoint.winning_numbers.includes(n)
      ).length;
      
      scores.push(matches);
      matchDistribution[matches]++;
      
      const precision = predictedCount > 0 ? matches / predictedCount : 0;
      const recall = actualCount > 0 ? matches / actualCount : 0;
      precisions.push(precision);
      recalls.push(recall);
    } catch {
      scores.push(0);
      precisions.push(0);
      recalls.push(0);
      matchDistribution[0]++;
    }
  }

  if (scores.length === 0) {
    return createEmptyResult(algorithmName);
  }

  const avgMatches = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgMatches, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  const avgPrecision = precisions.reduce((a, b) => a + b, 0) / precisions.length;
  const avgRecall = recalls.reduce((a, b) => a + b, 0) / recalls.length;
  const f1Score = (avgPrecision + avgRecall) > 0 
    ? 2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall) 
    : 0;

  return {
    algorithm: algorithmName,
    accuracy: (avgMatches / 5),
    precision: avgPrecision,
    recall: avgRecall,
    f1Score: f1Score,
    avgMatches,
    bestMatch: Math.max(...scores),
    worstMatch: Math.min(...scores),
    consistency: stdDev,
    totalTests: scores.length,
    matchDistribution
  };
}

/**
 * Aggregate results from multiple folds
 */
function aggregateFoldResults(folds: BacktestResult[], algorithmName: string): BacktestResult {
  const n = folds.length;
  
  const avgAccuracy = folds.reduce((sum, f) => sum + f.accuracy, 0) / n;
  const avgPrecision = folds.reduce((sum, f) => sum + (f.precision || 0), 0) / n;
  const avgRecall = folds.reduce((sum, f) => sum + (f.recall || 0), 0) / n;
  const avgF1Score = folds.reduce((sum, f) => sum + (f.f1Score || 0), 0) / n;
  const avgMatches = folds.reduce((sum, f) => sum + f.avgMatches, 0) / n;
  const avgConsistency = folds.reduce((sum, f) => sum + f.consistency, 0) / n;
  const totalTests = folds.reduce((sum, f) => sum + f.totalTests, 0);
  
  const matchDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  folds.forEach(f => {
    for (let i = 0; i <= 5; i++) {
      matchDistribution[i] += f.matchDistribution[i] || 0;
    }
  });
  
  return {
    algorithm: algorithmName,
    accuracy: avgAccuracy,
    precision: avgPrecision,
    recall: avgRecall,
    f1Score: avgF1Score,
    avgMatches,
    bestMatch: Math.max(...folds.map(f => f.bestMatch)),
    worstMatch: Math.min(...folds.map(f => f.worstMatch)),
    consistency: avgConsistency,
    totalTests,
    matchDistribution
  };
}

function createEmptyResult(algorithmName: string): BacktestResult {
  return {
    algorithm: algorithmName,
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
    avgMatches: 0,
    bestMatch: 0,
    worstMatch: 0,
    consistency: 0,
    totalTests: 0,
    matchDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
}

export function monteCarloSimulation(
  algorithm: (results: DrawResult[]) => PredictionResult,
  historicalData: DrawResult[],
  iterations: number = 1000
): { meanAccuracy: number; stdDev: number; percentiles: Record<number, number> } {
  const accuracies: number[] = [];
  const baseSeed = deriveSeedFromDraws(historicalData);
  const lcg = new DeterministicLCG(baseSeed);
  
  for (let i = 0; i < iterations; i++) {
    const sample = bootstrapSample(historicalData, lcg);
    const prediction = algorithm(sample);
    if (prediction.numbers && prediction.numbers.join(',') === '1,2,3,4,5') {
      continue; // isoler [1, 2, 3, 4, 5]
    }
    
    const testIdx = Math.floor(lcg.next() * historicalData.length);
    const matches = prediction.numbers.filter(n =>
      historicalData[testIdx].winning_numbers.includes(n)
    ).length;
    
    accuracies.push(matches / 5);
  }
  
  const sorted = [...accuracies].sort((a, b) => a - b);
  const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
  
  return {
    meanAccuracy: mean,
    stdDev: Math.sqrt(variance),
    percentiles: {
      5: sorted[Math.floor(iterations * 0.05)],
      25: sorted[Math.floor(iterations * 0.25)],
      50: sorted[Math.floor(iterations * 0.50)],
      75: sorted[Math.floor(iterations * 0.75)],
      95: sorted[Math.floor(iterations * 0.95)]
    }
  };
}

function bootstrapSample<T>(data: T[], lcg?: DeterministicLCG): T[] {
  const sample: T[] = [];
  const activeLcg = lcg || new DeterministicLCG(data.length * 42);
  for (let i = 0; i < data.length; i++) {
    const idx = Math.floor(activeLcg.next() * data.length);
    sample.push(data[idx]);
  }
  return sample;
}
