/**
 * Module de Backtesting Professionnel
 * Validation croisée K-Fold et métriques avancées
 */
import type { DrawResult, PredictionResult } from "./types.ts";

export interface BacktestResult {
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgMatches: number;
  bestMatch: number;
  worstMatch: number;
  consistency: number;
  totalTests: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  matchDistribution: Record<number, number>;
}

export interface CrossValidationResult {
  folds: BacktestResult[];
  aggregated: BacktestResult;
  standardError: number;
  confidenceInterval: { lower: number; upper: number };
}

/**
 * Backtesting avec validation croisée K-Fold
 */
export async function backtestWithCrossValidation(
  algorithm: (results: DrawResult[]) => PredictionResult,
  algorithmName: string,
  historicalData: DrawResult[],
  kFolds: number = 5
): Promise<CrossValidationResult> {
  const foldSize = Math.floor(historicalData.length / kFolds);
  const folds: BacktestResult[] = [];

  for (let k = 0; k < kFolds; k++) {
    const testStart = k * foldSize;
    const testEnd = testStart + foldSize;
    
    // Split data into training and testing
    const testData = historicalData.slice(testStart, testEnd);
    const trainData = [
      ...historicalData.slice(0, testStart),
      ...historicalData.slice(testEnd)
    ];

    const foldResult = await backtestAlgorithm(
      algorithm,
      algorithmName,
      trainData,
      testData,
      50,
      4 // Cap to 4 tests per fold for cross-validation to stay ultra-lightweight
    );
    folds.push(foldResult);
  }

  // Aggregate results across all folds
  const aggregated = aggregateFoldResults(folds, algorithmName);
  
  // Calculate standard error and confidence interval
  const accuracies = folds.map(f => f.accuracy);
  const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
  const standardError = Math.sqrt(variance / kFolds);
  
  const zScore95 = 1.96;
  const confidenceInterval = {
    lower: mean - zScore95 * standardError,
    upper: mean + zScore95 * standardError
  };

  return {
    folds,
    aggregated,
    standardError,
    confidenceInterval
  };
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
  maxTests: number = 8
): Promise<BacktestResult> {
  const scores: number[] = [];
  const returns: number[] = [];
  const precisions: number[] = [];
  const recalls: number[] = [];
  const matchDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  // If no test data provided, use walk-forward validation
  const data = testData || trainingData;
  const startIdx = testData ? 0 : windowSize;
  
  // Cap the end index based on maxTests to prevent worker resource limit starvation
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
      
      // Calculate return (simplified: +1 for each match above 1, -1 otherwise)
      const gain = matches >= 2 ? matches - 1 : -1;
      returns.push(gain);
    } catch {
      scores.push(0);
      precisions.push(0);
      recalls.push(0);
      matchDistribution[0]++;
      returns.push(-1);
    }
  }

  if (scores.length === 0) {
    return createEmptyResult(algorithmName);
  }

  // Calculate metrics
  const avgMatches = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgMatches, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  const avgPrecision = precisions.reduce((a, b) => a + b, 0) / precisions.length;
  const avgRecall = recalls.reduce((a, b) => a + b, 0) / recalls.length;
  const f1Score = (avgPrecision + avgRecall) > 0 
    ? 2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall) 
    : 0;
  
  // Win rate (2+ matches is a "win")
  const winRate = scores.filter(s => s >= 2).length / scores.length;
  
  // Sharpe ratio (risk-adjusted return)
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const returnStdDev = Math.sqrt(returnVariance);
  const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
  
  // Max drawdown
  let maxDrawdown = 0;
  let peak = 0;
  let cumulative = 0;
  for (const r of returns) {
    cumulative += r;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  // Profit factor (gross gains / gross losses)
  const gains = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
  const losses = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
  const profitFactor = losses > 0 ? gains / losses : gains;

  return {
    algorithm: algorithmName,
    accuracy: (avgMatches / 5) * 100,
    precision: avgPrecision * 100,
    recall: avgRecall * 100,
    f1Score: f1Score * 100,
    avgMatches,
    bestMatch: Math.max(...scores),
    worstMatch: Math.min(...scores),
    consistency: stdDev,
    totalTests: scores.length,
    sharpeRatio,
    maxDrawdown,
    winRate,
    profitFactor,
    matchDistribution
  };
}

/**
 * Walk-forward optimization
 */
export async function walkForwardOptimization(
  algorithm: (results: DrawResult[]) => PredictionResult,
  algorithmName: string,
  historicalData: DrawResult[],
  trainingWindow: number = 100,
  testWindow: number = 20,
  stepSize: number = 10
): Promise<BacktestResult[]> {
  const results: BacktestResult[] = [];
  
  for (let i = trainingWindow; i < historicalData.length - testWindow; i += stepSize) {
    const trainData = historicalData.slice(i - trainingWindow, i);
    const testData = historicalData.slice(i, i + testWindow);
    
    const result = await backtestAlgorithm(
      algorithm,
      algorithmName,
      trainData,
      testData,
      100,
      4 // Cap to 4 tests per step for walk-forward optimization
    );
    
    results.push(result);
  }
  
  return results;
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
  const avgSharpe = folds.reduce((sum, f) => sum + f.sharpeRatio, 0) / n;
  const avgWinRate = folds.reduce((sum, f) => sum + f.winRate, 0) / n;
  const avgProfitFactor = folds.reduce((sum, f) => sum + f.profitFactor, 0) / n;
  const totalTests = folds.reduce((sum, f) => sum + f.totalTests, 0);
  
  // Aggregate match distribution
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
    sharpeRatio: avgSharpe,
    maxDrawdown: Math.max(...folds.map(f => f.maxDrawdown)),
    winRate: avgWinRate,
    profitFactor: avgProfitFactor,
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
    sharpeRatio: 0,
    maxDrawdown: 0,
    winRate: 0,
    profitFactor: 0,
    matchDistribution: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
}

/**
 * Monte Carlo simulation for prediction confidence
 */
export function monteCarloSimulation(
  algorithm: (results: DrawResult[]) => PredictionResult,
  historicalData: DrawResult[],
  iterations: number = 1000
): { meanAccuracy: number; stdDev: number; percentiles: Record<number, number> } {
  const accuracies: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    // Bootstrap sample
    const sample = bootstrapSample(historicalData);
    const prediction = algorithm(sample);
    
    // Test against random historical result
    const testIdx = Math.floor(Math.random() * historicalData.length);
    const matches = prediction.numbers.filter(n =>
      historicalData[testIdx].winning_numbers.includes(n)
    ).length;
    
    accuracies.push((matches / 5) * 100);
  }
  
  // Calculate statistics
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

function bootstrapSample<T>(data: T[]): T[] {
  const sample: T[] = [];
  for (let i = 0; i < data.length; i++) {
    const idx = Math.floor(Math.random() * data.length);
    sample.push(data[idx]);
  }
  return sample;
}
