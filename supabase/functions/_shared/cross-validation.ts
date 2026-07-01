// Cross-Validation Dynamique - Ajustement automatique des seuils et paramètres
import type { DrawResult, PredictionResult } from "./types.ts";
import { log } from "./utils.ts";

interface ValidationResult {
  algorithm: string;
  predictedNumbers: number[];
  actualNumbers: number[];
  matches: number;
  accuracy: number;
  precision: number;
  recall: number;
}

interface CrossValidationMetrics {
  meanAccuracy: number;
  stdDevAccuracy: number;
  meanMatches: number;
  bestFold: number;
  worstFold: number;
  algorithmRankings: Map<string, number>;
}

interface ThresholdAdjustment {
  algorithm: string;
  currentThreshold: number;
  recommendedThreshold: number;
  confidenceBoost: number;
  reason: string;
}

/**
 * Effectue une validation croisée k-fold sur les données historiques
 */
export function performKFoldValidation(
  results: DrawResult[],
  algorithmFn: (data: DrawResult[]) => PredictionResult,
  algorithmName: string,
  k: number = 5
): CrossValidationMetrics {
  if (results.length < k * 2) {
    return {
      meanAccuracy: 0,
      stdDevAccuracy: 0,
      meanMatches: 0,
      bestFold: 0,
      worstFold: 0,
      algorithmRankings: new Map([[algorithmName, 0.5]])
    };
  }
  
  const foldSize = Math.floor(results.length / k);
  const foldResults: ValidationResult[] = [];
  
  for (let fold = 0; fold < k; fold++) {
    const testStart = fold * foldSize;
    const testEnd = testStart + foldSize;
    
    // Séparer train et test
    const trainData = [
      ...results.slice(0, testStart),
      ...results.slice(testEnd)
    ];
    const testData = results.slice(testStart, testEnd);
    
    if (trainData.length < 10 || testData.length < 1) continue;
    
    try {
      // Générer la prédiction sur les données d'entraînement
      const prediction = algorithmFn(trainData);
      
      // Évaluer sur chaque tirage de test
      testData.forEach(testDraw => {
        const matches = prediction.numbers.filter(n => 
          testDraw.winning_numbers.includes(n)
        ).length;
        
        const accuracy = matches / 5;
        const precision = matches / prediction.numbers.length;
        const recall = matches / testDraw.winning_numbers.length;
        
        foldResults.push({
          algorithm: algorithmName,
          predictedNumbers: prediction.numbers,
          actualNumbers: testDraw.winning_numbers,
          matches,
          accuracy,
          precision,
          recall
        });
      });
    } catch (error) {
      log("warn", `Fold ${fold} failed for ${algorithmName}`, { error });
    }
  }
  
  if (foldResults.length === 0) {
    return {
      meanAccuracy: 0,
      stdDevAccuracy: 0,
      meanMatches: 0,
      bestFold: 0,
      worstFold: 0,
      algorithmRankings: new Map([[algorithmName, 0.5]])
    };
  }
  
  // Calculer les métriques
  const accuracies = foldResults.map(r => r.accuracy);
  const matches = foldResults.map(r => r.matches);
  
  const meanAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const variance = accuracies.reduce((sum, a) => sum + Math.pow(a - meanAccuracy, 2), 0) / accuracies.length;
  const stdDevAccuracy = Math.sqrt(variance);
  const meanMatches = matches.reduce((a, b) => a + b, 0) / matches.length;
  const bestFold = Math.max(...matches);
  const worstFold = Math.min(...matches);
  
  log("info", `Cross-validation completed for ${algorithmName}`, {
    folds: foldResults.length,
    meanAccuracy: meanAccuracy.toFixed(3),
    meanMatches: meanMatches.toFixed(2)
  });
  
  return {
    meanAccuracy,
    stdDevAccuracy,
    meanMatches,
    bestFold,
    worstFold,
    algorithmRankings: new Map([[algorithmName, meanAccuracy]])
  };
}

/**
 * Validation temporelle glissante (Time Series Split)
 * Plus appropriée pour les données séquentielles
 */
export function performTimeSeriesValidation(
  results: DrawResult[],
  algorithmFn: (data: DrawResult[]) => PredictionResult,
  algorithmName: string,
  windowSize: number = 50,
  step: number = 10
): CrossValidationMetrics {
  const validationResults: ValidationResult[] = [];
  
  // Glisser la fenêtre à travers les données
  for (let i = windowSize; i < results.length - 1; i += step) {
    const trainData = results.slice(0, i);
    const testDraw = results[i];
    
    try {
      const prediction = algorithmFn(trainData);
      const matches = prediction.numbers.filter(n => 
        testDraw.winning_numbers.includes(n)
      ).length;
      
      validationResults.push({
        algorithm: algorithmName,
        predictedNumbers: prediction.numbers,
        actualNumbers: testDraw.winning_numbers,
        matches,
        accuracy: matches / 5,
        precision: matches / 5,
        recall: matches / 5
      });
    } catch {
      // Ignorer les erreurs
    }
  }
  
  if (validationResults.length === 0) {
    return {
      meanAccuracy: 0,
      stdDevAccuracy: 0,
      meanMatches: 0,
      bestFold: 0,
      worstFold: 0,
      algorithmRankings: new Map([[algorithmName, 0.5]])
    };
  }
  
  const accuracies = validationResults.map(r => r.accuracy);
  const matches = validationResults.map(r => r.matches);
  
  const meanAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const variance = accuracies.reduce((sum, a) => sum + Math.pow(a - meanAccuracy, 2), 0) / accuracies.length;
  
  return {
    meanAccuracy,
    stdDevAccuracy: Math.sqrt(variance),
    meanMatches: matches.reduce((a, b) => a + b, 0) / matches.length,
    bestFold: Math.max(...matches),
    worstFold: Math.min(...matches),
    algorithmRankings: new Map([[algorithmName, meanAccuracy]])
  };
}

/**
 * Recommande des ajustements de seuils basés sur la validation
 */
export function recommendThresholdAdjustments(
  validationMetrics: Map<string, CrossValidationMetrics>,
  currentThresholds: Map<string, number>
): ThresholdAdjustment[] {
  const adjustments: ThresholdAdjustment[] = [];
  
  // Calculer la performance moyenne globale
  const allAccuracies = Array.from(validationMetrics.values()).map(m => m.meanAccuracy);
  const globalMeanAccuracy = allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length;
  
  validationMetrics.forEach((metrics, algorithm) => {
    const currentThreshold = currentThresholds.get(algorithm) || 50;
    const performanceRatio = metrics.meanAccuracy / globalMeanAccuracy;
    
    let recommendedThreshold = currentThreshold;
    let confidenceBoost = 0;
    let reason = "";
    
    if (performanceRatio > 1.2) {
      // Algorithme performant - abaisser le seuil (utiliser plus souvent)
      recommendedThreshold = Math.max(20, currentThreshold - 20);
      confidenceBoost = 0.1;
      reason = `Performance supérieure (+${((performanceRatio - 1) * 100).toFixed(0)}%) - Recommandé plus souvent`;
    } else if (performanceRatio < 0.8) {
      // Algorithme sous-performant - augmenter le seuil
      recommendedThreshold = Math.min(currentThreshold + 30, 500);
      confidenceBoost = -0.1;
      reason = `Performance inférieure (${((performanceRatio - 1) * 100).toFixed(0)}%) - Exiger plus de données`;
    } else if (metrics.stdDevAccuracy > 0.15) {
      // Algorithme instable - augmenter légèrement le seuil
      recommendedThreshold = Math.min(currentThreshold + 10, 300);
      confidenceBoost = -0.05;
      reason = `Résultats instables (σ=${metrics.stdDevAccuracy.toFixed(2)}) - Prudence recommandée`;
    } else {
      reason = "Performance stable - Aucun ajustement nécessaire";
    }
    
    adjustments.push({
      algorithm,
      currentThreshold,
      recommendedThreshold,
      confidenceBoost,
      reason
    });
  });
  
  return adjustments;
}

/**
 * Calcule un score de fiabilité basé sur la validation croisée
 */
export function calculateReliabilityScore(
  metrics: CrossValidationMetrics
): number {
  // Composantes du score de fiabilité
  const accuracyScore = Math.min(1, metrics.meanAccuracy * 2); // 50% accuracy = 1.0
  const stabilityScore = 1 / (1 + metrics.stdDevAccuracy * 5);
  const consistencyScore = 1 - ((metrics.bestFold - metrics.worstFold) / 5);
  
  return accuracyScore * 0.4 + stabilityScore * 0.3 + Math.max(0, consistencyScore) * 0.3;
}

/**
 * Évalue la performance récente vs historique
 */
export function evaluateRecentPerformance(
  results: DrawResult[],
  algorithmFn: (data: DrawResult[]) => PredictionResult,
  recentWindow: number = 20
): {
  recentAccuracy: number;
  historicalAccuracy: number;
  trend: "improving" | "stable" | "declining";
  trendStrength: number;
} {
  const recentResults = results.slice(0, recentWindow);
  const historicalResults = results.slice(recentWindow);
  
  let recentMatches = 0;
  let historicalMatches = 0;
  let recentCount = 0;
  let historicalCount = 0;
  
  // Évaluer sur les données récentes
  if (recentResults.length > 5) {
    const trainData = historicalResults.slice(0, 100);
    try {
      const prediction = algorithmFn(trainData);
      recentResults.slice(0, 5).forEach(draw => {
        recentMatches += prediction.numbers.filter(n => draw.winning_numbers.includes(n)).length;
        recentCount += 5;
      });
    } catch {
      // Ignorer
    }
  }
  
  // Évaluer sur les données historiques (échantillon)
  if (historicalResults.length > 50) {
    const sampleIndices = [20, 40, 60, 80, 100].filter(i => i < historicalResults.length);
    sampleIndices.forEach(i => {
      const trainData = historicalResults.slice(i + 1);
      if (trainData.length < 20) return;
      
      try {
        const prediction = algorithmFn(trainData);
        historicalMatches += prediction.numbers.filter(n => 
          historicalResults[i].winning_numbers.includes(n)
        ).length;
        historicalCount += 5;
      } catch {
        // Ignorer
      }
    });
  }
  
  const recentAccuracy = recentCount > 0 ? recentMatches / recentCount : 0;
  const historicalAccuracy = historicalCount > 0 ? historicalMatches / historicalCount : 0;
  
  const diff = recentAccuracy - historicalAccuracy;
  let trend: "improving" | "stable" | "declining";
  
  if (diff > 0.05) trend = "improving";
  else if (diff < -0.05) trend = "declining";
  else trend = "stable";
  
  return {
    recentAccuracy,
    historicalAccuracy,
    trend,
    trendStrength: Math.abs(diff)
  };
}
