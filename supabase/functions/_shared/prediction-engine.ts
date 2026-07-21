// =====================================================
// Moteur de prédiction intelligent
// Architecture modulaire avec Data Science avancée
// =====================================================

import type { 
  DrawResult, 
  PredictionResult,
  PredictionOptions,
  DataMetrics,
} from "./types.ts";

import { algorithmRegistry, selectOptimalAlgorithm } from "./algorithm-registry.ts";
import { stackingEnsemble } from "./stacking.ts";
import { smartEnsemble } from "./smart-ensemble.ts";
import { 
  generateOptimizedPrediction,
  type EnhancedPredictionResult,
  type EnhancedScoreBreakdown
} from "./enhanced-prediction.ts";

import {
  calculateBayesianModelAverage,
  calculateConsensusMetrics,
  calculateEnhancedConfidence,
  detectPeriodicPatterns,
  identifyDueNumbers
} from "./data-science.ts";

import { log, calculateDataQuality, calculateFreshness } from "./utils.ts";
import { applyAntiBiasLayer } from "./anti-bias.ts";

export type { EnhancedPredictionResult, EnhancedScoreBreakdown };

export interface PredictionEngineResult {
  predictions: PredictionResult[];
  selectedAlgorithm: string;
  algorithmReason: string;
  optimizedPrediction: PredictionResult;
  enhancedPrediction?: EnhancedPredictionResult;
  dataMetrics: DataMetrics;
  executionTime: number;
  formulasBreakdown?: EnhancedScoreBreakdown;
  consensusMetrics?: { agreementScore: number; consensusNumbers: number[] };
  periodicPatterns?: { count: number; dueNumbers: number[] };
}

// =====================================================
// MOTEUR PRINCIPAL
// =====================================================

/**
 * Moteur de prédiction principal
 * Sélectionne et exécute intelligemment les algorithmes optimaux
 */
export async function generatePredictions(
  results: DrawResult[],
  options: PredictionOptions = {}
): Promise<PredictionEngineResult> {
  const startTime = Date.now();
  
  // Métriques de données
  const dataMetrics = calculateDataMetrics(results);
  
  // Sélection de l'algorithme optimal
  const selection = selectOptimalAlgorithm(results.length);
  
  log("info", `Algorithme sélectionné: ${selection.algorithm}`, {
    reason: selection.reason,
    historicalCount: dataMetrics.historicalCount,
  });

  // Générer les prédictions
  const { predictions, optimizedPrediction } = await executePredictions(
    results, 
    selection.algorithm, 
    options, 
    dataMetrics
  );

  // Ajuster les scores selon la qualité des données
  adjustPredictionScores(predictions, dataMetrics);

  // Analyses avancées
  const analysisResults = await performAdvancedAnalysis(
    predictions, 
    results, 
    options
  );

  // Amélioration finale de la prédiction
  const finalPrediction = enhanceFinalPrediction(
    optimizedPrediction, 
    analysisResults, 
    options
  );

  // Formules améliorées
  const enhancedResult = applyEnhancedFormulas(
    results, 
    finalPrediction, 
    predictions, 
    dataMetrics, 
    options
  );

  const rawOptimized = enhancedResult.prediction || finalPrediction;
  
  // -----------------------------------------------------
  // APPLICATION DE LA COUCHE ANTI-BIAIS
  // -----------------------------------------------------
  const antiBiasResult = applyAntiBiasLayer(rawOptimized, results);
  
  if (antiBiasResult.biasDetected.length > 0) {
    rawOptimized.numbers = antiBiasResult.adjustedNumbers;
    rawOptimized.factors.push(...antiBiasResult.biasDetected.map(b => `[Anti-Biais Corrigé] ${b}`));
    rawOptimized.confidence = rawOptimized.confidence * (1 - (antiBiasResult.biasScore * 0.1));
  }

  const executionTime = Date.now() - startTime;

  return {
    predictions: predictions.sort((a, b) => b.score - a.score),
    selectedAlgorithm: selection.algorithm,
    algorithmReason: selection.reason,
    optimizedPrediction: rawOptimized,
    enhancedPrediction: enhancedResult.enhanced,
    dataMetrics,
    executionTime,
    formulasBreakdown: enhancedResult.breakdown,
    consensusMetrics: analysisResults.consensus,
    periodicPatterns: analysisResults.periodicity,
  };
}

// =====================================================
// FONCTIONS INTERNES
// =====================================================

function calculateDataMetrics(results: DrawResult[]): DataMetrics {
  return {
    historicalCount: results.length,
    quality: calculateDataQuality(results),
    freshness: calculateFreshness(results),
  };
}

async function executePredictions(
  results: DrawResult[],
  selectedAlgorithm: string,
  options: PredictionOptions,
  dataMetrics: DataMetrics
) {
  const algorithmsToRun = options.algorithms || [selectedAlgorithm, "FrequencyPro"];
  if (!algorithmsToRun.includes(selectedAlgorithm)) {
    algorithmsToRun.push(selectedAlgorithm);
  }
  
  const predictionsMap = await algorithmRegistry.executeMultiple(results, algorithmsToRun);
  const predictions = Array.from(predictionsMap.values());
  
  let optimizedPrediction: PredictionResult;
  
  if (selectedAlgorithm === "Ensemble Hybride Stacking") {
    optimizedPrediction = stackingEnsemble(results);
  } else if (predictions.length > 1) {
    optimizedPrediction = smartEnsemble(predictions, dataMetrics.quality);
  } else {
    optimizedPrediction = predictions[0] || generateFallbackPrediction();
  }
  
  return { predictions, optimizedPrediction };
}

function adjustPredictionScores(predictions: PredictionResult[], dataMetrics: DataMetrics): void {
  const qualityFactor = 0.5 + dataMetrics.quality * 0.3 + dataMetrics.freshness * 0.2;
  
  predictions.forEach(pred => {
    pred.confidence = Math.min(0.95, pred.confidence * qualityFactor);
    pred.score = Math.min(0.95, pred.score * qualityFactor);
  });
}

interface AdvancedAnalysisResults {
  consensus?: { agreementScore: number; consensusNumbers: number[] };
  periodicity?: { count: number; dueNumbers: number[] };
  bayesianPrediction?: PredictionResult;
}

async function performAdvancedAnalysis(
  predictions: PredictionResult[],
  results: DrawResult[],
  options: PredictionOptions
): Promise<AdvancedAnalysisResults> {
  const analysisResults: AdvancedAnalysisResults = {};
  
  try {
    const predictionsMap = new Map(predictions.map(p => [p.algorithm, p]));
    const priorPerformance = new Map<string, number>();
    predictions.forEach(p => priorPerformance.set(p.algorithm, p.confidence));
    
    const bayesianResult = calculateBayesianModelAverage(predictionsMap, priorPerformance);
    
    if (bayesianResult && bayesianResult.topNumbers.length >= 5) {
      analysisResults.bayesianPrediction = {
        numbers: bayesianResult.topNumbers.slice(0, 5).sort((a, b) => a - b),
        confidence: Math.min(0.95, bayesianResult.overallConfidence * 1.1),
        score: bayesianResult.overallConfidence,
        algorithm: "Bayesian Ensemble",
        factors: ["Moyenne Bayésienne Multi-Modèles", "Inférence Probabiliste"],
      };
    }
    
    analysisResults.consensus = calculateConsensusMetrics(predictions);
    analysisResults.periodicity = detectPeriodicPatterns(results);
    
  } catch (error) {
    log("warn", "Erreur lors de l'analyse avancée", { error });
  }
  
  return analysisResults;
}

function enhanceFinalPrediction(
  basePrediction: PredictionResult,
  analysis: AdvancedAnalysisResults,
  options: PredictionOptions
): PredictionResult {
  let prediction = { ...basePrediction };

  if (analysis.bayesianPrediction && 
      analysis.bayesianPrediction.confidence > prediction.confidence) {
    prediction = analysis.bayesianPrediction;
  }

  if (analysis.periodicity?.dueNumbers.length) {
    const boostedNumbers = [...prediction.numbers];
    const dueNumbers = analysis.periodicity.dueNumbers;

    for (let i = 0; i < Math.min(2, dueNumbers.length); i++) {
      const dueNum = dueNumbers[i];
      if (!boostedNumbers.includes(dueNum)) {
        boostedNumbers[4] = dueNum;
        break;
      }
    }

    prediction = {
      ...prediction,
      numbers: boostedNumbers.sort((a, b) => a - b),
      factors: [
        ...prediction.factors,
        "Boost Périodique (Numéros Dus)"
      ],
      confidence: Math.min(0.95, prediction.confidence * 1.05)
    };
  }

  return prediction;
}

function applyEnhancedFormulas(
  results: DrawResult[], 
  finalPrediction: PredictionResult, 
  predictions: PredictionResult[], 
  dataMetrics: DataMetrics, 
  options: PredictionOptions
): { prediction: PredictionResult; enhanced?: EnhancedPredictionResult; breakdown?: EnhancedScoreBreakdown } {
  try {
    const enhanced = generateOptimizedPrediction(results, finalPrediction.numbers);
    
    if (enhanced && enhanced.recommendedNumbers && enhanced.recommendedNumbers.length === 5) {
      const mergedPrediction = {
        ...finalPrediction,
        numbers: enhanced.recommendedNumbers.sort((a, b) => a - b),
        confidence: Math.min(0.95, finalPrediction.confidence * (1 + (enhanced.compositeScore / 200))),
        factors: [
          ...finalPrediction.factors,
          ...enhanced.narratives.slice(0, 3)
        ]
      };
      
      return { 
        prediction: mergedPrediction, 
        enhanced: enhanced,
        breakdown: enhanced.breakdown 
      };
    }
  } catch (error) {
    log("warn", "Erreur lors de l'application des formules améliorées", { error });
  }
  
  return { prediction: finalPrediction };
}

export function generateExplanations(
  predictions: PredictionResult[],
  results: DrawResult[],
  options: any
): any[] {
  return predictions.map(p => ({
    algorithm: p.algorithm,
    explanation: p.factors.join(", ")
  }));
}

function generateFallbackPrediction(): PredictionResult {
  const fallbackNumbers = [];
  while(fallbackNumbers.length < 5) {
    const n = Math.floor(Math.random() * 90) + 1;
    if(!fallbackNumbers.includes(n)) fallbackNumbers.push(n);
  }
  return {
    algorithm: "Fallback",
    numbers: fallbackNumbers.sort((a, b) => a - b),
    confidence: 0.5,
    score: 0.5,
    factors: ["Fallback Mode"]
  };
}
