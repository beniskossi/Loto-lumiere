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

  const executionTime = Date.now() - startTime;

  return {
    predictions: predictions.sort((a, b) => b.score - a.score),
    selectedAlgorithm: selection.algorithm,
    algorithmReason: selection.reason,
    optimizedPrediction: enhancedResult.prediction || finalPrediction,
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
    quality: calculateDataQuality(results),
    freshness: calculateFreshness(results),
    completeness: results.length > 0 ? 1 : 0,
    consistency: calculateConsistency(results),
    historicalCount: results.length,
  };
}

function calculateConsistency(results: DrawResult[]): number {
  if (results.length < 2) return 1;
  
  let consistentCount = 0;
  results.forEach(r => {
    if (r.winning_numbers?.length === 5 && 
        r.winning_numbers.every(n => n >= 1 && n <= 90)) {
      consistentCount++;
    }
  });
  
  return consistentCount / results.length;
}

async function executePredictions(
  results: DrawResult[],
  selectedAlgorithm: string,
  options: PredictionOptions,
  dataMetrics: DataMetrics
): Promise<{ predictions: PredictionResult[]; optimizedPrediction: PredictionResult }> {
  let predictions: PredictionResult[] = [];
  let optimizedPrediction: PredictionResult;

  // Mode Smart Ensemble
  if (options.useSmartEnsemble) {
    log("info", `Utilisation du Smart Ensemble (mode adaptatif, AI Orchestration: ${options.useAIOrchestration})`);
    optimizedPrediction = await smartEnsemble.generateEnsemblePrediction(results, options.useAIOrchestration);
    
    if (options.multiAlgorithm) {
      const multiPredictions = await algorithmRegistry.executeMultiple(results);
      predictions = Array.from(multiPredictions.values());
      predictions.push(optimizedPrediction);
    } else {
      predictions = [optimizedPrediction];
    }
  }
  // Mode Stacking Ensemble
  else if (selectedAlgorithm === "Stacking Ensemble" || options.useStackingEnsemble) {
    optimizedPrediction = stackingEnsemble(results);
    
    if (options.multiAlgorithm) {
      const multiPredictions = await algorithmRegistry.executeMultiple(results);
      predictions = Array.from(multiPredictions.values());
    } else {
      predictions = [optimizedPrediction];
    }
  }
  // Mode Multi-algorithmes
  else if (options.multiAlgorithm) {
    const multiPredictions = await algorithmRegistry.executeMultiple(results);
    predictions = Array.from(multiPredictions.values());
    optimizedPrediction = predictions[0] || algorithmRegistry.execute("FrequencyPro", results);
  }
  // Mode Single algorithme
  else {
    optimizedPrediction = algorithmRegistry.execute(selectedAlgorithm, results);
    predictions = [optimizedPrediction];
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

  // Analyse Bayésienne
  if (predictions.length >= 2 && options.useBayesian !== false) {
    const predictionsMap = new Map(predictions.map(p => [p.algorithm, p]));
    const consensus = calculateConsensusMetrics(predictionsMap);
    
    analysisResults.consensus = {
      agreementScore: consensus.agreementScore,
      consensusNumbers: consensus.consensusNumbers
    };

    // Moyenne bayésienne si bon consensus
    if (consensus.agreementScore > 0.3) {
      const priorPerformance = new Map([
        ["Transformer (Attention)", 0.25],
        ["XGBoost", 0.22],
        ["LSTM Network", 0.18],
        ["Random Forest", 0.18],
        ["FrequencyPro", 0.17]
      ]);
      
      const bayesianResult = calculateBayesianModelAverage(predictionsMap, priorPerformance);
      
      analysisResults.bayesianPrediction = {
        numbers: bayesianResult.numbers,
        confidence: bayesianResult.confidence,
        algorithm: `Bayesian Ensemble (${predictions.length} modèles)`,
        factors: [
          `Consensus: ${(consensus.agreementScore * 100).toFixed(0)}%`,
          `Numéros consensuels: ${consensus.consensusNumbers.slice(0, 3).join(', ')}`,
          ...bayesianResult.weights.slice(0, 3).map(w => 
            `${w.algorithm}: ${(w.posteriorProbability * 100).toFixed(0)}%`
          )
        ],
        score: bayesianResult.confidence * 0.95,
        category: "ensemble"
      };
      
      log("info", "Moyenne bayésienne appliquée", {
        confidence: bayesianResult.confidence,
        topWeight: bayesianResult.weights[0]?.algorithm
      });
    }
  }

  // Détection de périodicité
  if (results.length >= 50 && options.usePeriodicity !== false) {
    try {
      const patterns = detectPeriodicPatterns(results);
      const dueNumbers = identifyDueNumbers(results);
      
      analysisResults.periodicity = {
        count: patterns.length,
        dueNumbers: dueNumbers.slice(0, 5)
      };
      
      log("info", "Analyse de périodicité effectuée", {
        patterns: patterns.length,
        dueNumbers: dueNumbers.slice(0, 5)
      });
    } catch (error) {
      log("warn", "Analyse de périodicité échouée", { error });
    }
  }

  return analysisResults;
}

function enhanceFinalPrediction(
  basePrediction: PredictionResult,
  analysis: AdvancedAnalysisResults,
  options: PredictionOptions
): PredictionResult {
  let prediction = { ...basePrediction };

  // Utiliser la prédiction bayésienne si meilleure
  if (analysis.bayesianPrediction && 
      analysis.bayesianPrediction.confidence > prediction.confidence) {
    prediction = analysis.bayesianPrediction;
  }

  // Boost avec les numéros "dus"
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
        `Numéros dus: ${dueNumbers.slice(0, 3).join(', ')}`
      ]
    };
  }

  return prediction;
}

function applyEnhancedFormulas(
  results: DrawResult[],
  optimizedPrediction: PredictionResult,
  predictions: PredictionResult[],
  dataMetrics: DataMetrics,
  options: PredictionOptions
): { prediction?: EnhancedPredictionResult; enhanced?: EnhancedPredictionResult; breakdown?: EnhancedScoreBreakdown } {
  if (options.useEnhancedFormulas === false || results.length < 20) {
    return {};
  }

  try {
    const enhancedPredictionResult = generateOptimizedPrediction(results, optimizedPrediction);
    const breakdown = enhancedPredictionResult.breakdown;

    // Confiance améliorée
    if (predictions.length >= 2) {
      const predictionsMap = new Map(predictions.map(p => [p.algorithm, p]));
      const historicalAccuracy = new Map<string, number>();
      
      const enhancedConfidence = calculateEnhancedConfidence(
        predictionsMap,
        historicalAccuracy,
        dataMetrics.quality,
        dataMetrics.freshness
      );
      
      enhancedPredictionResult.confidence = Math.max(
        enhancedPredictionResult.confidence,
        enhancedConfidence
      );
    }

    log("info", "Formules améliorées appliquées", {
      composite: breakdown.composite,
      narratives: enhancedPredictionResult.narratives.length,
    });

    return {
      prediction: enhancedPredictionResult,
      enhanced: enhancedPredictionResult,
      breakdown
    };
  } catch (error) {
    log("warn", "Formules améliorées échouées", { error });
    return {};
  }
}

// =====================================================
// GÉNÉRATION D'EXPLICATIONS
// =====================================================

/**
 * Génère des explications détaillées pour les prédictions
 */
export function generateExplanations(
  result: PredictionEngineResult,
  historicalData: DrawResult[]
): {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  advancedInsights?: string[];
  algorithmInfo: {
    name: string;
    description: string;
    dataPointsUsed: number;
    confidence: number;
  };
} {
  const { dataMetrics, selectedAlgorithm, predictions, consensusMetrics, periodicPatterns } = result;

  const strengths: string[] = [`Algorithme ${selectedAlgorithm} sélectionné`];
  const weaknesses: string[] = [];

  // Analyse des forces
  if (dataMetrics.quality > 0.7) {
    strengths.push("Excellente qualité des données");
  }
  if (dataMetrics.freshness > 0.7) {
    strengths.push("Données récentes et actualisées");
  }
  if (dataMetrics.historicalCount >= 100) {
    strengths.push(`Volume solide de ${dataMetrics.historicalCount} tirages`);
  }
  if (consensusMetrics && consensusMetrics.agreementScore > 0.4) {
    strengths.push(`Fort consensus inter-algorithmes (${(consensusMetrics.agreementScore * 100).toFixed(0)}%)`);
  }

  // Analyse des faiblesses
  if (dataMetrics.quality < 0.5) {
    weaknesses.push(`Qualité des données limitée (${(dataMetrics.quality * 100).toFixed(0)}%)`);
  }
  if (dataMetrics.freshness < 0.5) {
    weaknesses.push("Données peu récentes");
  }
  if (dataMetrics.historicalCount < 50) {
    weaknesses.push(`Historique limité (${dataMetrics.historicalCount} tirages)`);
  }
  if (consensusMetrics && consensusMetrics.agreementScore < 0.2) {
    weaknesses.push("Faible accord entre les modèles");
  }

  // Confiance moyenne
  const avgConfidence = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    : 0;

  const summary = `${predictions.length} prédiction(s) générée(s) avec ${selectedAlgorithm}`;
  
  const recommendation = avgConfidence > 0.7
    ? `Confiance élevée (${(avgConfidence * 100).toFixed(0)}%) - Prédictions fiables`
    : avgConfidence > 0.5
    ? `Confiance modérée (${(avgConfidence * 100).toFixed(0)}%) - Prudence recommandée`
    : `Confiance faible (${(avgConfidence * 100).toFixed(0)}%) - Données insuffisantes`;

  // Insights avancés
  const advancedInsights: string[] = [];
  
  if (consensusMetrics?.consensusNumbers.length) {
    advancedInsights.push(`Numéros avec fort consensus: ${consensusMetrics.consensusNumbers.slice(0, 5).join(', ')}`);
  }
  
  if (periodicPatterns) {
    if (periodicPatterns.count > 0) {
      advancedInsights.push(`${periodicPatterns.count} pattern(s) périodique(s) détecté(s)`);
    }
    if (periodicPatterns.dueNumbers.length > 0) {
      advancedInsights.push(`Numéros "dus": ${periodicPatterns.dueNumbers.join(', ')}`);
    }
  }

  // Descriptions des algorithmes
  const algorithmDescriptions: Record<string, string> = {
    "Stacking Ensemble": "Méta-algorithme combinant 5 modèles pour une prédiction optimisée",
    "Transformer (Attention)": "Réseau d'attention pour capturer les dépendances longue distance",
    "XGBoost": "Gradient boosting performant pour patterns complexes",
    "LSTM Network": "Réseau récurrent spécialisé dans les séquences temporelles",
    "Random Forest": "Ensemble d'arbres de décision pour robustesse",
    "FrequencyPro": "Analyse fréquentielle pondérée avec détection de tendances"
  };

  const algorithmInfo = {
    name: selectedAlgorithm,
    description: algorithmDescriptions[selectedAlgorithm] || "Algorithme de prédiction avancé",
    dataPointsUsed: dataMetrics.historicalCount,
    confidence: avgConfidence
  };

  return {
    summary,
    strengths,
    weaknesses,
    recommendation,
    advancedInsights: advancedInsights.length > 0 ? advancedInsights : undefined,
    algorithmInfo,
  };
}
