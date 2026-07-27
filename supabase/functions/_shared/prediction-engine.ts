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
import { calibrateProbability } from "./calibration.ts";
import { getHistoricalPerformanceMap } from "./ledger.ts";

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

  // Couche de calibration unique basée sur le ledger (historique)
  // TODO: Récupérer le vrai historicalPerformance depuis la BD (ledger)
  // Récupération de la performance historique réelle depuis le Ledger
  const historicalLedger = await getHistoricalPerformanceMap();
  const calibratedPredictions = calibrateProbability(predictions, historicalLedger);
  
  // Remplacer les prédictions par leurs versions calibrées
  predictions.length = 0;
  predictions.push(...calibratedPredictions);

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
    // La confiance mathématique ne doit pas être altérée par un multiplicateur opaque ici.
    // La couche Anti-Biais corrige la combinaison elle-même. La calibration de la probabilité
    // est réservée au module Platt Scaling / Ledger.
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
    completeness: 1.0,
    consistency: 1.0,
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
    optimizedPrediction = await smartEnsemble.generateEnsemblePrediction(results, options.useAIOrchestration);
  } else {
    optimizedPrediction = predictions[0] || generateFallbackPrediction();
  }
  
  return { predictions, optimizedPrediction };
}

function adjustPredictionScores(predictions: PredictionResult[], dataMetrics: DataMetrics): void {
  // Remplacé par: Calibration probabiliste sans multiplicateurs arbitraires
  // En attendant le Platt Scaling complet sur le ledger:
  // on préserve la probabilité d'origine calculée mathématiquement.
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
    
    if (bayesianResult && bayesianResult.numbers.length >= 5) {
      analysisResults.bayesianPrediction = {
        category: "ensemble",
        algorithm: "Bayesian Ensemble",
        factors: ["Moyenne Bayésienne Multi-Modèles", "Inférence Probabiliste"],
        score: bayesianResult.confidence,
        numbers: bayesianResult.numbers.slice(0, 5).sort((a, b) => a - b),
        confidence: Math.min(0.95, bayesianResult.confidence * 1.1),
      };
    }
    
    analysisResults.consensus = calculateConsensusMetrics(predictionsMap);
    
    const periodicPatterns = detectPeriodicPatterns(results);
    analysisResults.periodicity = {
      count: periodicPatterns.length,
      dueNumbers: Array.from(new Set(periodicPatterns.flatMap(p => p.affectedNumbers)))
    };
    
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
    const enhanced = generateOptimizedPrediction(results, finalPrediction);
    
    if (enhanced && enhanced.numbers && enhanced.numbers.length === 5) {
      const mergedPrediction = {
        ...finalPrediction,
        numbers: enhanced.numbers.sort((a, b) => a - b),
        confidence: Math.min(0.95, finalPrediction.confidence * (1 + (enhanced.breakdown.composite / 200))),
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
  input: any,
  results: DrawResult[],
  options?: any
): {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  algorithmInfo: {
    name: string;
    description: string;
    strengths: string[];
    optimalRange: string;
  };
} {
  const isEngineResult = input && typeof input === "object" && !Array.isArray(input);
  const selectedAlgo = isEngineResult && input.selectedAlgorithm ? input.selectedAlgorithm : (Array.isArray(input) && input[0]?.algorithm) || "FrequencyPro";
  const algoReason = isEngineResult && input.algorithmReason ? input.algorithmReason : "Analyse statistique et apprentissage automatique";
  const predictions: PredictionResult[] = isEngineResult ? (input.predictions || []) : (Array.isArray(input) ? input : []);
  const topPrediction: PredictionResult | undefined = isEngineResult ? (input.optimizedPrediction || predictions[0]) : predictions[0];
  const metrics = isEngineResult && input.dataMetrics ? input.dataMetrics : { quality: 0.8, freshness: 0.9, historicalCount: results?.length || 0 };

  const confidencePct = Math.round(((topPrediction?.confidence || 0.5) * 100));
  const historicalCount = metrics?.historicalCount ?? results?.length ?? 0;

  const summary = `Prédiction générée via le modèle ${selectedAlgo} avec une confiance estimée de ${confidencePct}% basée sur ${historicalCount} tirages historiques.`;

  const strengths: string[] = [];
  if (historicalCount >= 50) {
    strengths.push(`Volume de données historiques élevé (${historicalCount} tirages analysés)`);
  }
  if ((metrics?.quality ?? 1) >= 0.7) {
    strengths.push("Haute régularité statistique et qualité d'échantillon");
  }
  if (topPrediction?.factors && topPrediction.factors.length > 0) {
    strengths.push(...topPrediction.factors.slice(0, 3));
  } else {
    strengths.push("Convergence des fréquences et des gaps de récurrence");
  }

  const weaknesses: string[] = [];
  if (historicalCount < 30) {
    weaknesses.push("Échantillon historique réduit pouvant limiter la précision");
  }
  if ((metrics?.freshness ?? 1) < 0.6) {
    weaknesses.push("Périodicité des données récentes nécessitant une mise à jour");
  }
  if (weaknesses.length === 0) {
    weaknesses.push("Fluctuation aléatoire inhérente aux tirages indépendants");
  }

  const recNumbers = topPrediction?.numbers && topPrediction.numbers.length === 5
    ? topPrediction.numbers.slice().sort((a: number, b: number) => a - b).join(", ")
    : "1, 2, 3, 4, 5";

  const recommendation = `Combinaison recommandée [${recNumbers}] basée sur l'optimisation ${selectedAlgo}.`;

  const algorithmInfo = {
    name: selectedAlgo,
    description: algoReason || `Modèle de prédiction avancée ${selectedAlgo}`,
    strengths: strengths.slice(0, 3),
    optimalRange: "10 à 500 tirages historiques",
  };

  return {
    summary,
    strengths,
    weaknesses,
    recommendation,
    algorithmInfo,
  };
}

function generateFallbackPrediction(): PredictionResult {
  return {
    algorithm: "Baseline Uniforme (Théorique)",
    numbers: [1, 2, 3, 4, 5],
    confidence: 0.0556,
    score: 0.0556,
    category: "statistical",
    factors: ["Distribution uniforme de référence (5/90)"]
  };
}
