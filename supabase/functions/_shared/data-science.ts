// =====================================================
// Module Data Science - Analyse avancée des prédictions
// Regroupe: Bayesian, Périodicité, Cross-Validation
// =====================================================

import type { 
  DrawResult, 
  PredictionResult,
  NormalizedWeight,
  BayesianResult,
  ConsensusMetrics,
  PeriodicityPattern,
  NumberCycle,
  CrossValidationMetrics,
  ThresholdAdjustment,
  LOTTERY_CONSTANTS
} from "./types.ts";
import { log, selectBalancedNumbers } from "./utils.ts";

const EPSILON = 1e-10;

// =====================================================
// SECTION 1: ANALYSE BAYÉSIENNE
// =====================================================

/**
 * Calcule la moyenne bayésienne des prédictions multi-modèles
 * Théorème de Bayes: P(θ|D) ∝ P(D|θ) × P(θ)
 */
export function calculateBayesianModelAverage(
  predictions: Map<string, PredictionResult>,
  priorPerformance: Map<string, number>
): BayesianResult {
  const weights: NormalizedWeight[] = [];
  const numberPosteriors = new Map<number, number>();
  
  // Initialiser tous les numéros
  for (let n = 1; n <= 90; n++) {
    numberPosteriors.set(n, 0);
  }
  
  // Calculer l'évidence totale (normalisation)
  let totalEvidence = 0;
  
  predictions.forEach((prediction, algorithm) => {
    const prior = priorPerformance.get(algorithm) || 0.2;
    const likelihood = prediction.confidence * prediction.score;
    totalEvidence += likelihood * prior;
  });
  
  if (totalEvidence === 0) totalEvidence = 1;
  
  // Calculer les poids bayésiens
  predictions.forEach((prediction, algorithm) => {
    const prior = priorPerformance.get(algorithm) || 0.2;
    const likelihood = prediction.confidence * prediction.score;
    const posterior = (likelihood * prior) / totalEvidence;
    
    weights.push({
      algorithm,
      normalizedModelWeight: posterior,
      likelihood,
      prior,
      evidenceContribution: likelihood * prior
    });
    
    // Votes pondérés par position
    prediction.numbers.forEach((num, position) => {
      const positionWeight = (5 - position) / 5;
      const vote = posterior * positionWeight;
      numberPosteriors.set(num, (numberPosteriors.get(num) || 0) + vote);
    });
  });
  
  // Sélectionner les meilleurs numéros
  const sortedNumbers = Array.from(numberPosteriors.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([num]) => num);
  
  const selectedNumbers = selectBalancedBayesian(sortedNumbers.slice(0, 20));
  const confidence = calculateBayesianConfidence(weights, numberPosteriors, selectedNumbers);
  
  return {
    numbers: selectedNumbers,
    confidence,
    weights: weights.sort((a, b) => b.normalizedModelWeight - a.normalizedModelWeight)
  };
}

function selectBalancedBayesian(candidates: number[]): number[] {
  const TARGET_SUM = 219;
  let bestCombo = candidates.slice(0, 5);
  let bestScore = evaluateCombination(bestCombo, TARGET_SUM);
  
  for (let i = 0; i < Math.min(candidates.length - 4, 50); i++) {
    for (let offset = 0; offset < 3; offset++) {
      const combo = [
        candidates[i],
        candidates[i + 1 + offset] || candidates[i + 1],
        candidates[i + 2 + offset] || candidates[i + 2],
        candidates[i + 3 + offset] || candidates[i + 3],
        candidates[i + 4 + offset] || candidates[i + 4]
      ].filter((v, idx, arr) => arr.indexOf(v) === idx);
      
      if (combo.length === 5) {
        const score = evaluateCombination(combo, TARGET_SUM);
        if (score > bestScore) {
          bestScore = score;
          bestCombo = combo;
        }
      }
    }
  }
  
  return bestCombo.sort((a, b) => a - b);
}

function evaluateCombination(numbers: number[], targetSum: number): number {
  const sum = numbers.reduce((a, b) => a + b, 0);
  const sumScore = 1 - Math.min(1, Math.abs(sum - targetSum) / 100);
  
  const evenCount = numbers.filter(n => n % 2 === 0).length;
  const parityScore = 1 - Math.abs(evenCount - 2.5) / 2.5;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  let minGap = 90;
  for (let i = 1; i < sorted.length; i++) {
    minGap = Math.min(minGap, sorted[i] - sorted[i-1]);
  }
  const diversityScore = Math.min(1, minGap / 10);
  
  return sumScore * 0.4 + parityScore * 0.3 + diversityScore * 0.3;
}

function calculateBayesianConfidence(
  weights: NormalizedWeight[],
  posteriors: Map<number, number>,
  selected: number[]
): number {
  const topWeightSum = weights.slice(0, 2).reduce((sum, w) => sum + w.normalizedModelWeight, 0);
  const concentrationScore = Math.min(1, topWeightSum / 0.6);
  
  const selectedPosteriors = selected.map(n => posteriors.get(n) || 0);
  const avgPosterior = selectedPosteriors.reduce((a, b) => a + b, 0) / selected.length;
  const posteriorScore = Math.min(1, avgPosterior * 5);
  
  const posteriorValues = Array.from(posteriors.values()).filter(v => v > 0);
  const meanPosterior = posteriorValues.reduce((a, b) => a + b, 0) / posteriorValues.length;
  const variance = posteriorValues.reduce((sum, v) => sum + Math.pow(v - meanPosterior, 2), 0) / posteriorValues.length;
  const agreementScore = 1 / (1 + variance * 10);
  
  return Math.min(0.95, concentrationScore * 0.3 + posteriorScore * 0.4 + agreementScore * 0.3);
}

/**
 * Calcule les métriques de consensus inter-algorithmes
 */
export function calculateConsensusMetrics(
  predictions: Map<string, PredictionResult>
): ConsensusMetrics {
  const numberVotes = new Map<number, number>();
  const algorithmCount = predictions.size;
  
  predictions.forEach(prediction => {
    prediction.numbers.forEach(num => {
      numberVotes.set(num, (numberVotes.get(num) || 0) + 1);
    });
  });
  
  // Score d'accord Jaccard
  let totalJaccard = 0;
  let pairCount = 0;
  
  const predictionArrays = Array.from(predictions.values()).map(p => new Set(p.numbers));
  
  for (let i = 0; i < predictionArrays.length; i++) {
    for (let j = i + 1; j < predictionArrays.length; j++) {
      const setA = predictionArrays[i];
      const setB = predictionArrays[j];
      const intersection = new Set([...setA].filter(x => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      totalJaccard += intersection.size / union.size;
      pairCount++;
    }
  }
  
  const agreementScore = pairCount > 0 ? totalJaccard / pairCount : 0;
  
  // Numéros consensus (>= 60% des algos)
  const consensusThreshold = Math.ceil(algorithmCount * 0.6);
  const consensusNumbers = Array.from(numberVotes.entries())
    .filter(([, votes]) => votes >= consensusThreshold)
    .map(([num]) => num)
    .sort((a, b) => a - b);
  
  // Numéros incertains
  const uncertainNumbers = Array.from(numberVotes.entries())
    .filter(([, votes]) => votes > 0 && votes < Math.ceil(algorithmCount * 0.3))
    .map(([num]) => num)
    .sort((a, b) => a - b);
  
  // Indice de divergence (entropie)
  const voteValues = Array.from(numberVotes.values());
  const totalVotes = voteValues.reduce((a, b) => a + b, 0);
  let entropy = 0;
  
  if (totalVotes > 0) {
    voteValues.forEach(votes => {
      if (votes > 0) {
        const p = votes / totalVotes;
        entropy -= p * Math.log2(p);
      }
    });
  }
  
  const maxEntropy = Math.log2(90);
  const divergenceIndex = entropy / maxEntropy;
  
  // Intervalle de confiance
  const confidences = Array.from(predictions.values()).map(p => p.confidence);
  const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const variance = confidences.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / confidences.length;
  const stdDev = Math.sqrt(variance);
  const margin = 1.96 * (stdDev / Math.sqrt(confidences.length));
  
  return {
    agreementScore,
    divergenceIndex,
    confidenceInterval: [Math.max(0, mean - margin), Math.min(1, mean + margin)],
    consensusNumbers,
    uncertainNumbers
  };
}

/**
 * Calcule la confiance améliorée multi-facteurs
 */
export function calculateEnhancedConfidence(
  predictions: Map<string, PredictionResult>,
  historicalAccuracy: Map<string, number>,
  dataQuality: number,
  freshness: number
): number {
  const consensus = calculateConsensusMetrics(predictions);
  
  let weightedConfidence = 0;
  let totalWeight = 0;
  
  predictions.forEach((prediction, algorithm) => {
    const accuracy = historicalAccuracy.get(algorithm) || 0.3;
    const weight = accuracy * accuracy;
    weightedConfidence += prediction.confidence * weight;
    totalWeight += weight;
  });
  
  const avgWeightedConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0.5;
  
  const components = {
    agreement: consensus.agreementScore * 0.30,
    weightedConfidence: avgWeightedConfidence * 0.25,
    dataScore: (dataQuality * 0.6 + freshness * 0.4) * 0.20,
    consensusStrength: Math.min(1, consensus.consensusNumbers.length / 3) * 0.15,
    coherence: (1 - consensus.divergenceIndex) * 0.10
  };
  
  return Math.min(0.95, Object.values(components).reduce((a, b) => a + b, 0));
}

// =====================================================
// SECTION 2: DÉTECTION DE PÉRIODICITÉ
// =====================================================

/**
 * Analyse l'autocorrélation des tirages
 */
export function analyzeAutocorrelation(
  results: DrawResult[],
  maxLag: number = 30
): Map<number, number> {
  const acf = new Map<number, number>();
  const numberSeries = new Map<number, number[]>();
  
  for (let n = 1; n <= 90; n++) {
    const series = results.map(r => r.winning_numbers.includes(n) ? 1 : 0);
    numberSeries.set(n, series);
  }
  
  for (let lag = 1; lag <= maxLag; lag++) {
    let totalCorrelation = 0;
    let validNumbers = 0;
    
    numberSeries.forEach((series) => {
      if (series.length > lag + 10) {
        const n = series.length - lag;
        const mean = series.reduce((a, b) => a + b, 0) / series.length;
        
        let numerator = 0;
        let denominator = 0;
        
        for (let t = 0; t < n; t++) {
          const diff1 = series[t] - mean;
          const diff2 = series[t + lag] - mean;
          numerator += diff1 * diff2;
          denominator += diff1 * diff1;
        }
        
        const correlation = denominator > 0 ? numerator / denominator : 0;
        if (!isNaN(correlation)) {
          totalCorrelation += correlation;
          validNumbers++;
        }
      }
    });
    
    acf.set(lag, validNumbers > 0 ? totalCorrelation / validNumbers : 0);
  }
  
  return acf;
}

/**
 * Détecte les patterns périodiques significatifs
 */
export function detectPeriodicPatterns(results: DrawResult[]): PeriodicityPattern[] {
  const patterns: PeriodicityPattern[] = [];
  const acf = analyzeAutocorrelation(results, 30);
  const significanceThreshold = 2 / Math.sqrt(results.length);
  
  // Chercher les pics significatifs
  const peaks: { lag: number; value: number }[] = [];
  
  acf.forEach((value, lag) => {
    const prevValue = acf.get(lag - 1) || 0;
    const nextValue = acf.get(lag + 1) || 0;
    
    if (value > prevValue && value > nextValue && Math.abs(value) > significanceThreshold) {
      peaks.push({ lag, value });
    }
  });
  
  // Périodes courantes
  const commonPeriods = [7, 14, 21, 28, 30];
  
  commonPeriods.forEach(period => {
    const correlation = acf.get(period) || 0;
    
    if (Math.abs(correlation) > significanceThreshold * 0.8) {
      patterns.push({
        period,
        strength: Math.abs(correlation),
        confidence: Math.min(1, results.length / (period * 5)) * 0.6 + 0.28,
        affectedNumbers: findPeriodicNumbers(results, period),
        description: getPatternDescription(period)
      });
    }
  });
  
  // Ajouter les pics détectés non-standards
  peaks.forEach(peak => {
    if (!commonPeriods.includes(peak.lag)) {
      patterns.push({
        period: peak.lag,
        strength: Math.abs(peak.value),
        confidence: 0.6,
        affectedNumbers: findPeriodicNumbers(results, peak.lag).slice(0, 5),
        description: `Pattern détecté tous les ${peak.lag} tirages`
      });
    }
  });
  
  return patterns.sort((a, b) => b.strength - a.strength);
}

function findPeriodicNumbers(results: DrawResult[], period: number): number[] {
  const numberPeriodicity = new Map<number, number>();
  
  for (let n = 1; n <= 90; n++) {
    let periodicCount = 0;
    let totalOccurrences = 0;
    
    results.forEach((result, index) => {
      if (result.winning_numbers.includes(n)) {
        totalOccurrences++;
        const nextPeriodIndex = index + period;
        if (nextPeriodIndex < results.length && 
            results[nextPeriodIndex].winning_numbers.includes(n)) {
          periodicCount++;
        }
      }
    });
    
    if (totalOccurrences > 0) {
      numberPeriodicity.set(n, periodicCount / totalOccurrences);
    }
  }
  
  return Array.from(numberPeriodicity.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([num]) => num);
}

function getPatternDescription(period: number): string {
  const descriptions: Record<number, string> = {
    7: "Pattern hebdomadaire détecté",
    14: "Pattern bi-hebdomadaire détecté",
    21: "Pattern tri-hebdomadaire détecté",
    28: "Pattern mensuel détecté",
    30: "Pattern mensuel détecté"
  };
  return descriptions[period] || `Pattern de période ${period} tirages`;
}

/**
 * Analyse les cycles individuels de chaque numéro
 */
export function analyzeNumberCycles(results: DrawResult[]): NumberCycle[] {
  const cycles: NumberCycle[] = [];
  
  for (let n = 1; n <= 90; n++) {
    const appearances: number[] = [];
    
    results.forEach((result, index) => {
      if (result.winning_numbers.includes(n)) {
        appearances.push(index);
      }
    });
    
    if (appearances.length < 3) continue;
    
    const gaps: number[] = [];
    for (let i = 1; i < appearances.length; i++) {
      gaps.push(appearances[i] - appearances[i - 1]);
    }
    
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    const lastAppearance = appearances[appearances.length - 1];
    const reliability = 1 / (1 + stdDev / avgGap);
    
    cycles.push({
      number: n,
      avgCycleLength: avgGap,
      cycleVariance: variance,
      nextExpectedDraw: lastAppearance + Math.round(avgGap),
      reliability
    });
  }
  
  return cycles.sort((a, b) => b.reliability - a.reliability);
}

/**
 * Identifie les numéros "dus" (overdue)
 */
export function identifyDueNumbers(
  results: DrawResult[],
  tolerance: number = 0.5
): number[] {
  const cycles = analyzeNumberCycles(results);
  const currentDraw = results.length;
  const dueNumbers: { number: number; score: number }[] = [];
  
  cycles.forEach(cycle => {
    if (cycle.reliability < 0.3) return;
    
    const drawsSinceExpected = currentDraw - cycle.nextExpectedDraw;
    
    if (drawsSinceExpected >= -cycle.avgCycleLength * tolerance) {
      const overdueScore = Math.max(0, drawsSinceExpected) / cycle.avgCycleLength;
      const score = (1 + overdueScore) * cycle.reliability;
      dueNumbers.push({ number: cycle.number, score });
    }
  });
  
  return dueNumbers
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(d => d.number);
}

/**
 * Applique les boosts de périodicité aux candidats
 */
export function applyPeriodicityBoost(
  candidates: Map<number, number>,
  results: DrawResult[],
  drawDate?: Date
): Map<number, number> {
  const boostedScores = new Map(candidates);
  const dueNumbers = identifyDueNumbers(results);
  
  // Boost pour les numéros "dus"
  dueNumbers.forEach((num, index) => {
    const boost = (15 - index) / 100;
    const currentScore = boostedScores.get(num) || 0;
    boostedScores.set(num, currentScore * (1 + boost));
  });
  
  return boostedScores;
}

// =====================================================
// SECTION 3: VALIDATION CROISÉE
// =====================================================

/**
 * Validation croisée k-fold
 */
export function performKFoldValidation(
  results: DrawResult[],
  algorithmFn: (data: DrawResult[]) => PredictionResult,
  algorithmName: string,
  k: number = 5
): CrossValidationMetrics {
  if (results.length < k * 2) {
    return createEmptyValidationMetrics(algorithmName);
  }
  
  const foldSize = Math.floor(results.length / k);
  const foldResults: { matches: number; accuracy: number }[] = [];
  
  for (let fold = 0; fold < k; fold++) {
    const testStart = fold * foldSize;
    const testEnd = testStart + foldSize;
    
    const trainData = [
      ...results.slice(0, testStart),
      ...results.slice(testEnd)
    ];
    const testData = results.slice(testStart, testEnd);
    
    if (trainData.length < 10 || testData.length < 1) continue;
    
    try {
      const prediction = algorithmFn(trainData);
      
      testData.forEach(testDraw => {
        const matches = prediction.numbers.filter(n => 
          testDraw.winning_numbers.includes(n)
        ).length;
        
        foldResults.push({
          matches,
          accuracy: matches / 5
        });
      });
    } catch {
      // Ignorer les erreurs de fold
    }
  }
  
  if (foldResults.length === 0) {
    return createEmptyValidationMetrics(algorithmName);
  }
  
  const accuracies = foldResults.map(r => r.accuracy);
  const matches = foldResults.map(r => r.matches);
  
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

function createEmptyValidationMetrics(algorithmName: string): CrossValidationMetrics {
  return {
    meanAccuracy: 0,
    stdDevAccuracy: 0,
    meanMatches: 0,
    bestFold: 0,
    worstFold: 0,
    algorithmRankings: new Map([[algorithmName, 0.5]])
  };
}

/**
 * Validation temporelle glissante (Time Series Split)
 */
export function performTimeSeriesValidation(
  results: DrawResult[],
  algorithmFn: (data: DrawResult[]) => PredictionResult,
  algorithmName: string,
  windowSize: number = 50,
  step: number = 10
): CrossValidationMetrics {
  const validationResults: { matches: number; accuracy: number }[] = [];
  
  for (let i = windowSize; i < results.length - 1; i += step) {
    const trainData = results.slice(0, i);
    const testDraw = results[i];
    
    try {
      const prediction = algorithmFn(trainData);
      const matches = prediction.numbers.filter(n => 
        testDraw.winning_numbers.includes(n)
      ).length;
      
      validationResults.push({
        matches,
        accuracy: matches / 5
      });
    } catch {
      // Ignorer
    }
  }
  
  if (validationResults.length === 0) {
    return createEmptyValidationMetrics(algorithmName);
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
 * Recommande des ajustements de seuils
 */
export function recommendThresholdAdjustments(
  validationMetrics: Map<string, CrossValidationMetrics>,
  currentThresholds: Map<string, number>
): ThresholdAdjustment[] {
  const adjustments: ThresholdAdjustment[] = [];
  
  const allAccuracies = Array.from(validationMetrics.values()).map(m => m.meanAccuracy);
  const globalMeanAccuracy = allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length;
  
  validationMetrics.forEach((metrics, algorithm) => {
    const currentThreshold = currentThresholds.get(algorithm) || 50;
    const performanceRatio = metrics.meanAccuracy / (globalMeanAccuracy || 0.1);
    
    let recommendedThreshold = currentThreshold;
    let confidenceBoost = 0;
    let reason = "";
    
    if (performanceRatio > 1.2) {
      recommendedThreshold = Math.max(20, currentThreshold - 20);
      confidenceBoost = 0.1;
      reason = `Performance supérieure - Recommandé plus souvent`;
    } else if (performanceRatio < 0.8) {
      recommendedThreshold = Math.min(currentThreshold + 30, 500);
      confidenceBoost = -0.1;
      reason = `Performance inférieure - Exiger plus de données`;
    } else if (metrics.stdDevAccuracy > 0.15) {
      recommendedThreshold = Math.min(currentThreshold + 10, 300);
      confidenceBoost = -0.05;
      reason = `Résultats instables - Prudence recommandée`;
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
 * Calcule un score de fiabilité
 */
export function calculateReliabilityScore(metrics: CrossValidationMetrics): number {
  const accuracyScore = Math.min(1, metrics.meanAccuracy * 2);
  const stabilityScore = 1 / (1 + metrics.stdDevAccuracy * 5);
  const consistencyScore = 1 - ((metrics.bestFold - metrics.worstFold) / 5);
  
  return accuracyScore * 0.4 + stabilityScore * 0.3 + Math.max(0, consistencyScore) * 0.3;
}

// =====================================================
// SECTION 4: LES 4 AXES DE PRÉDICTION AVANCÉE
// =====================================================

export interface MarkovAnalysisResult {
  transitionMatrix: number[][]; // Matrice de transition 90x90
  nextStateProbabilities: Map<number, number>; // Probabilités de transition pour le tirage T+1
}

/**
 * AXE 1 : Modélisation des Micro-Biais Physiques par Chaînes de Markov
 * Établit les probabilités de transition pour capter les imperfections de brassage physique.
 */
export function analyzeMarkovBiases(results: DrawResult[], lastDrawNumbers: number[]): MarkovAnalysisResult {
  const size = 90;
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const rowSums = Array(size).fill(0);
  const alpha = 0.01; // Lissage de Laplace pour éviter les probabilités à zéro
  const decayRate = 0.05; // Facteur d'amortissement exponentiel temporel

  // Trier les tirages par ordre chronologique
  const sortedDraws = [...results].sort((a, b) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime());
  const totalDraws = sortedDraws.length;

  // Remplir la matrice de transition d'état à état entre tirages successifs
  for (let t = 0; t < totalDraws - 1; t++) {
    const currentDraw = sortedDraws[t].winning_numbers;
    const nextDraw = sortedDraws[t + 1].winning_numbers;
    
    // Poids décroissant : les transitions récentes ont plus d'impact
    const distanceToPresent = totalDraws - 2 - t; // t=totalDraws-2 est la transition la plus récente (distance 0)
    const weight = Math.exp(-decayRate * distanceToPresent);

    for (const i of currentDraw) {
      if (i >= 1 && i <= size) {
        for (const j of nextDraw) {
          if (j >= 1 && j <= size) {
            matrix[i - 1][j - 1] += weight;
            rowSums[i - 1] += weight;
          }
        }
      }
    }
  }

  // Normaliser la matrice de transition
  const normalizedMatrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  for (let i = 0; i < size; i++) {
    const total = rowSums[i] + size * alpha;
    for (let j = 0; j < size; j++) {
      normalizedMatrix[i][j] = (matrix[i][j] + alpha) / total;
    }
  }

  // Calculer le vecteur des probabilités pour le tirage T+1
  const nextStateProbabilities = new Map<number, number>();
  for (let j = 1; j <= size; j++) {
    nextStateProbabilities.set(j, 0);
  }

  if (lastDrawNumbers.length > 0) {
    const weightPerLastNum = 1 / lastDrawNumbers.length;
    for (const i of lastDrawNumbers) {
      if (i >= 1 && i <= size) {
        for (let j = 1; j <= size; j++) {
          const p = normalizedMatrix[i - 1][j - 1];
          nextStateProbabilities.set(j, (nextStateProbabilities.get(j) || 0) + p * weightPerLastNum);
        }
      }
    }
  } else {
    // Distribution par défaut si aucun historique récent disponible
    for (let j = 1; j <= size; j++) {
      nextStateProbabilities.set(j, 1 / size);
    }
  }

  return {
    transitionMatrix: normalizedMatrix,
    nextStateProbabilities
  };
}

/**
 * AXE 2 : Calibration Dynamique de l'Espérance Sommatologique par Filtre EMA
 * Calcule l'espérance sommatologique dynamique filtrée pour suivre la dérive de la machine.
 */
export function calibrateSomatologicalExpectation(
  results: DrawResult[],
  windowSize: number = 15,
  dynamicWeight: number = 0.4
): { calibratedSum: number; emaSeries: number[] } {
  const theoreticalExpectation = 227.5; // 5 * (1 + 90) / 2 = 227.5
  
  if (results.length === 0) {
    return { calibratedSum: theoreticalExpectation, emaSeries: [] };
  }

  // Trier les tirages par ordre chronologique
  const sortedDraws = [...results].sort((a, b) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime());
  const sums = sortedDraws.map(d => d.winning_numbers.reduce((acc, n) => acc + n, 0));
  
  // Calculer l'EMA (Exponential Moving Average)
  const alpha = 2 / (windowSize + 1);
  const emaSeries: number[] = [];
  let currentEma = sums[0];
  emaSeries.push(currentEma);
  
  for (let i = 1; i < sums.length; i++) {
    currentEma = alpha * sums[i] + (1 - alpha) * currentEma;
    emaSeries.push(currentEma);
  }
  
  const finalEma = emaSeries[emaSeries.length - 1];
  const calibratedSum = dynamicWeight * finalEma + (1 - dynamicWeight) * theoreticalExpectation;
  
  return {
    calibratedSum,
    emaSeries
  };
}

/**
 * AXE 3 : Information Mutuelle de Shannon
 * Calcule la matrice d'information mutuelle entre tous les numéros de 1 à 90
 */
export function calculateMutualInformationMatrix(results: DrawResult[]): number[][] {
  const size = 90;
  const totalDraws = results.length;
  if (totalDraws === 0) {
    return Array.from({ length: size }, () => Array(size).fill(0));
  }

  // Calculer les probabilités marginales P(X_i = 1)
  const p1 = Array(size).fill(0);
  results.forEach(r => {
    r.winning_numbers.forEach(n => {
      if (n >= 1 && n <= 90) {
        p1[n - 1]++;
      }
    });
  });
  
  for (let i = 0; i < size; i++) {
    p1[i] = p1[i] / totalDraws;
  }

  // Calculer les probabilités conjointes P(X_i = 1, X_j = 1)
  const jointP11: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  results.forEach(r => {
    const nums = r.winning_numbers;
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const ni = nums[i];
        const nj = nums[j];
        if (ni >= 1 && ni <= 90 && nj >= 1 && nj <= 90) {
          jointP11[ni - 1][nj - 1]++;
          jointP11[nj - 1][ni - 1]++;
        }
      }
    }
  });

  const miMatrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (i === j) {
        const px1 = p1[i];
        const px0 = 1 - px1;
        let h = 0;
        if (px1 > 0) h -= px1 * Math.log2(px1);
        if (px0 > 0) h -= px0 * Math.log2(px0);
        miMatrix[i][j] = h;
        continue;
      }

      const p_11 = jointP11[i][j] / totalDraws;
      const p_10 = Math.max(0, p1[i] - p_11);
      const p_01 = Math.max(0, p1[j] - p_11);
      const p_00 = Math.max(0, 1 - p_11 - p_10 - p_01);

      const marginal_i = [1 - p1[i], p1[i]];
      const marginal_j = [1 - p1[j], p1[j]];
      const joint = [
        [p_00, p_01],
        [p_10, p_11]
      ];

      let mi = 0;
      for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
          const p_xy = joint[x][y];
          const px = marginal_i[x];
          const py = marginal_j[y];
          if (p_xy > 0 && px > 0 && py > 0) {
            mi += p_xy * Math.log2(p_xy / (px * py));
          }
        }
      }
      miMatrix[i][j] = mi;
    }
  }

  return miMatrix;
}

/**
 * AXE 3 : Régulation d'Ensemble par Entropie de Shannon et Information Mutuelle
 * Sélectionne la grille en éliminant la redondance stochastique par algorithme mRMR simplifié.
 */
export function regulateEnsembleEntropy(
  candidates: number[],
  miMatrix: number[][],
  targetCount: number = 5
): number[] {
  if (candidates.length <= targetCount) return candidates;

  const selected: number[] = [candidates[0]];
  const remaining = candidates.slice(1);

  while (selected.length < targetCount && remaining.length > 0) {
    let bestNextNum = remaining[0];
    let maxCriteria = -Infinity;
    let bestIdx = 0;

    for (let idx = 0; idx < remaining.length; idx++) {
      const num = remaining[idx];
      let sumMI = 0;
      let maxRedundancy = 0;
      
      for (const sel of selected) {
        const mi = miMatrix[num - 1][sel - 1];
        sumMI += mi;
        maxRedundancy = Math.max(maxRedundancy, mi);
      }
      const avgMI = sumMI / selected.length;
      
      // mRMR simplifié : pertinence maximale moins redondance maximale directe
      const criteria = avgMI - 1.5 * maxRedundancy; 

      if (criteria > maxCriteria) {
        maxCriteria = criteria;
        bestNextNum = num;
        bestIdx = idx;
      }
    }

    selected.push(bestNextNum);
    remaining.splice(bestIdx, 1);
  }

  return selected.sort((a, b) => a - b);
}

/**
 * AXE 4 : Analyse Harmonique Spatiale et Temporelle par Transformée de Fourier Discrète (DFT)
 * Isole les harmoniques et forces périodiques pour estimer l'état oscillatoire au pas T+1.
 */
export function calculateDFTHarmonicScores(results: DrawResult[]): Map<number, number> {
  const size = 90;
  const N = results.length;
  const scores = new Map<number, number>();

  if (N < 10) {
    for (let n = 1; n <= size; n++) {
      scores.set(n, 0.5);
    }
    return scores;
  }

  // Trier chronologiquement
  const sortedDraws = [...results].sort((a, b) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime());

  for (let n = 1; n <= size; n++) {
    const signal: number[] = sortedDraws.map(d => d.winning_numbers.includes(n) ? 1 : 0);
    const mean = signal.reduce((acc, v) => acc + v, 0) / N;
    const zeroMeanSignal = signal.map(v => v - mean);

    const halfN = Math.floor(N / 2);
    const amplitudes: number[] = [];
    const phases: number[] = [];

    for (let k = 1; k <= halfN; k++) {
      let re = 0;
      let im = 0;
      for (let t = 0; t < N; t++) {
        const angle = (2 * Math.PI * k * t) / N;
        re += zeroMeanSignal[t] * Math.cos(angle);
        im -= zeroMeanSignal[t] * Math.sin(angle);
      }
      
      const amp = Math.sqrt(re * re + im * im) / N;
      const phase = Math.atan2(im, re);
      
      amplitudes.push(amp);
      phases.push(phase);
    }

    // Trouver les 3 harmoniques majeures
    const harmonicIndices = Array.from({ length: halfN }, (_, i) => i)
      .sort((a, b) => amplitudes[b] - amplitudes[a])
      .slice(0, 3);

    let predictedSignalValue = mean;
    for (const idx of harmonicIndices) {
      const k = idx + 1;
      const amp = amplitudes[idx];
      const phase = phases[idx];
      const nextAngle = (2 * Math.PI * k * N) / N;
      predictedSignalValue += 2 * amp * Math.cos(nextAngle + phase);
    }

    scores.set(n, Math.max(0, predictedSignalValue));
  }

  let maxScore = 0;
  for (const score of scores.values()) {
    maxScore = Math.max(maxScore, score);
  }

  if (maxScore > 0) {
    for (const [num, score] of scores) {
      scores.set(num, score / maxScore);
    }
  }

  return scores;
}

