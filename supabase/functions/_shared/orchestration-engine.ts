// Orchestration Engine - Moteur d'orchestration adaptative avancé
// Gère l'ajustement intelligent des poids et paramètres des algorithmes

import type { DrawResult, PredictionResult } from "./types.ts";
import { log } from "./utils.ts";

// ============= TYPES =============

export interface AlgorithmMetrics {
  name: string;
  avgAccuracy: number;
  recentAccuracy: number;
  trend: number;
  consistency: number;
  momentum: number;
  dataPoints: number;
}

export interface WeightAdjustment {
  algorithm: string;
  previousWeight: number;
  newWeight: number;
  reason: string;
  confidence: number;
}

export interface ParameterAdjustment {
  algorithm: string;
  parameter: string;
  previousValue: number | string;
  newValue: number | string;
  reason: string;
}

export interface OrchestrationResult {
  weightAdjustments: WeightAdjustment[];
  parameterAdjustments: ParameterAdjustment[];
  metrics: AlgorithmMetrics[];
  strategy: string;
  expectedImprovement: number;
  notes: string[];
  backtestResult?: {
    currentScore: number;
    proposedScore: number;
    degradation: boolean;
    improvement: number;
  };
}

// ============= CONSTANTS =============

export interface OrchestrationParams {
  momentumWindow: number;
  trendWindowRecent: number;
  trendWindowOlder: number;
  stabilityThreshold: number;
  performanceThresholdHigh: number;
  performanceThresholdLow: number;
  minWeight: number;
  maxWeight: number;
  adjustmentRate: number;
}

export function deriveOrchestrationParams(performances: Array<{
  accuracy_score: number;
}>): OrchestrationParams {
  const n = performances.length;
  if (n === 0) {
    return {
      momentumWindow: 5,
      trendWindowRecent: 10,
      trendWindowOlder: 20,
      stabilityThreshold: 60,
      performanceThresholdHigh: 18,
      performanceThresholdLow: 8,
      minWeight: 0.2,
      maxWeight: 2.5,
      adjustmentRate: 0.15,
    };
  }

  const scores = performances.map(p => p.accuracy_score).sort((a, b) => a - b);
  const q1 = scores[Math.floor(n * 0.25)] || 8;
  const median = scores[Math.floor(n * 0.5)] || 12;
  const q3 = scores[Math.floor(n * 0.75)] || 18;
  
  // Stabilité basée sur l'écart interquartile (IQR). Moins de variance = plus de stabilité.
  const iqr = q3 - q1;
  const stabilityThreshold = Math.max(40, Math.min(80, 100 - iqr * 2));
  
  return {
    momentumWindow: Math.max(3, Math.min(10, Math.floor(n * 0.1))),
    trendWindowRecent: Math.max(5, Math.min(20, Math.floor(n * 0.2))),
    trendWindowOlder: Math.max(10, Math.min(40, Math.floor(n * 0.4))),
    stabilityThreshold,
    performanceThresholdHigh: Math.max(12, q3),
    performanceThresholdLow: Math.min(10, q1),
    minWeight: 0.2,
    maxWeight: 2.5,
    adjustmentRate: 0.15,
  };
}

// ============= ANALYSIS FUNCTIONS =============

/**
 * Calcule les métriques complètes pour un algorithme
 */
export function calculateAlgorithmMetrics(
  algorithmName: string,
  performances: Array<{
    accuracy_score: number;
    matches_count: number;
    draw_date: string;
    confidence_score?: number;
  }>,
  params: OrchestrationParams
): AlgorithmMetrics {
  if (performances.length === 0) {
    return {
      name: algorithmName,
      avgAccuracy: 0,
      recentAccuracy: 0,
      trend: 0,
      consistency: 50,
      momentum: 0,
      dataPoints: 0,
    };
  }
  
  // Trier par date (plus récent en premier)
  const sorted = [...performances].sort((a, b) => 
    new Date(b.draw_date).getTime() - new Date(a.draw_date).getTime()
  );
  
  // Moyenne générale
  const avgAccuracy = sorted.reduce((sum, p) => sum + p.accuracy_score, 0) / sorted.length;
  
  // Accuracy récente
  const recent = sorted.slice(0, params.trendWindowRecent);
  const recentAccuracy = recent.length > 0
    ? recent.reduce((sum, p) => sum + p.accuracy_score, 0) / recent.length
    : avgAccuracy;
  
  // Accuracy plus ancienne
  const older = sorted.slice(params.trendWindowRecent, params.trendWindowRecent + params.trendWindowOlder);
  const olderAccuracy = older.length > 0
    ? older.reduce((sum, p) => sum + p.accuracy_score, 0) / older.length
    : avgAccuracy;
  
  // Trend = différence récent vs ancien
  const trend = recentAccuracy - olderAccuracy;
  
  // Momentum
  const veryRecent = sorted.slice(0, params.momentumWindow);
  const momentumAccuracy = veryRecent.length > 0
    ? veryRecent.reduce((sum, p) => sum + p.accuracy_score, 0) / veryRecent.length
    : recentAccuracy;
  const momentum = momentumAccuracy - recentAccuracy;
  
  // Consistance = inverse de l'écart-type
  const variance = sorted.reduce((sum, p) => 
    sum + Math.pow(p.accuracy_score - avgAccuracy, 2), 0
  ) / sorted.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, 100 - stdDev * 2);
  
  return {
    name: algorithmName,
    avgAccuracy,
    recentAccuracy,
    trend,
    consistency,
    momentum,
    dataPoints: performances.length,
  };
}

/**
 * Détermine la stratégie d'orchestration basée sur les métriques
 */
export function determineStrategy(
  metrics: AlgorithmMetrics[],
  params: OrchestrationParams
): {
  strategy: string;
  description: string;
  aggressiveness: number;
} {
  // Analyser l'état global
  const avgConsistency = metrics.reduce((sum, m) => sum + m.consistency, 0) / metrics.length;
  const avgTrend = metrics.reduce((sum, m) => sum + m.trend, 0) / metrics.length;
  const avgPerformance = metrics.reduce((sum, m) => sum + m.avgAccuracy, 0) / metrics.length;
  
  // Déterminer la stratégie
  if (avgConsistency < params.stabilityThreshold && avgPerformance < params.performanceThresholdLow) {
    return {
      strategy: "aggressive_rebalancing",
      description: "Performance faible et instable - rééquilibrage agressif",
      aggressiveness: params.adjustmentRate * 1.5,
    };
  }
  
  if (avgTrend > 3) {
    return {
      strategy: "momentum_following",
      description: "Tendance positive - suivre le momentum",
      aggressiveness: params.adjustmentRate * 1.2,
    };
  }
  
  if (avgTrend < -3) {
    return {
      strategy: "defensive_adjustment",
      description: "Tendance négative - ajustements défensifs",
      aggressiveness: params.adjustmentRate * 0.8,
    };
  }
  
  if (avgConsistency > params.stabilityThreshold && avgPerformance > params.performanceThresholdHigh) {
    return {
      strategy: "fine_tuning",
      description: "Performance stable et bonne - ajustements fins",
      aggressiveness: params.adjustmentRate * 0.5,
    };
  }
  
  return {
    strategy: "balanced_optimization",
    description: "Optimisation équilibrée standard",
    aggressiveness: params.adjustmentRate,
  };
}

// ============= WEIGHT CALCULATION =============

/**
 * Calcule les nouveaux poids pour tous les algorithmes
 */
export function calculateWeightAdjustments(
  metrics: AlgorithmMetrics[],
  currentWeights: Map<string, number>,
  strategy: { strategy: string; aggressiveness: number },
  params: OrchestrationParams
): WeightAdjustment[] {
  const adjustments: WeightAdjustment[] = [];
  const rate = strategy.aggressiveness;
  
  for (const metric of metrics) {
    const currentWeight = currentWeights.get(metric.name) || 1.0;
    let newWeight = currentWeight;
    let reason = "";
    let confidence = 0.5;
    
    // Facteur de performance
    const performanceFactor = metric.recentAccuracy / 20; // Normaliser autour de 1
    
    // Facteur de tendance
    const trendFactor = 1 + (metric.trend / 100);
    
    // Facteur de momentum
    const momentumFactor = 1 + (metric.momentum / 50);
    
    // Facteur de consistance (bonus pour algorithmes stables)
    const consistencyFactor = metric.consistency > params.stabilityThreshold ? 1.05 : 0.95;
    
    // Calculer le multiplicateur combiné
    const combinedFactor = (
      performanceFactor * 0.4 +
      trendFactor * 0.3 +
      momentumFactor * 0.2 +
      consistencyFactor * 0.1
    );
    
    // Appliquer l'ajustement
    if (combinedFactor > 1.1) {
      // Performance supérieure - augmenter le poids
      newWeight = currentWeight * (1 + rate * (combinedFactor - 1));
      reason = `Performance supérieure: accuracy ${metric.recentAccuracy.toFixed(1)}%, trend +${metric.trend.toFixed(1)}%`;
      confidence = Math.min(0.9, metric.consistency / 100);
    } else if (combinedFactor < 0.9) {
      // Performance inférieure - réduire le poids
      newWeight = currentWeight * (1 - rate * (1 - combinedFactor));
      reason = `Performance faible: accuracy ${metric.recentAccuracy.toFixed(1)}%, trend ${metric.trend.toFixed(1)}%`;
      confidence = Math.min(0.8, metric.consistency / 100);
    } else {
      // Performance stable - ajustement minimal
      reason = `Performance stable: accuracy ${metric.recentAccuracy.toFixed(1)}%`;
      confidence = metric.consistency / 100;
    }
    
    // Contraindre le poids
    newWeight = Math.max(params.minWeight, Math.min(params.maxWeight, newWeight));
    newWeight = Math.round(newWeight * 100) / 100;
    
    // N'enregistrer que si changement significatif
    if (Math.abs(newWeight - currentWeight) > 0.03) {
      adjustments.push({
        algorithm: metric.name,
        previousWeight: currentWeight,
        newWeight,
        reason,
        confidence,
      });
    }
  }
  
  return adjustments;
}

// ============= PARAMETER TUNING =============

/**
 * Suggère des ajustements de paramètres basés sur la performance
 */
export function suggestParameterAdjustments(
  metrics: AlgorithmMetrics[],
  currentParams: Map<string, Record<string, number | string>>,
  params: OrchestrationParams
): ParameterAdjustment[] {
  const adjustments: ParameterAdjustment[] = [];
  
  for (const metric of metrics) {
    const algParams = currentParams.get(metric.name);
    if (!algParams) continue;
    
    // Ajuster learning rate si performance faible et instable
    if ('learningRate' in algParams && metric.consistency < params.stabilityThreshold * 0.8 && metric.avgAccuracy < params.performanceThresholdLow) {
      const currentLR = Number(algParams.learningRate) || 0.01;
      const newLR = currentLR * 0.8; // Réduire le learning rate
      
      adjustments.push({
        algorithm: metric.name,
        parameter: 'learningRate',
        previousValue: currentLR,
        newValue: Math.max(0.001, newLR),
        reason: `Réduire LR pour stabiliser (consistance: ${metric.consistency.toFixed(0)}%)`,
      });
    }
    
    // Augmenter regularization si overfitting suspecté
    if ('regularization' in algParams && metric.trend < -5 && metric.avgAccuracy > metric.recentAccuracy + 5) {
      const currentReg = Number(algParams.regularization) || 0.01;
      const newReg = currentReg * 1.3;
      
      adjustments.push({
        algorithm: metric.name,
        parameter: 'regularization',
        previousValue: currentReg,
        newValue: Math.min(0.5, newReg),
        reason: `Augmenter régularisation (overfitting suspecté, trend: ${metric.trend.toFixed(1)}%)`,
      });
    }
    
    // Ajuster window size si données historiques abondantes mais performance moyenne
    if ('windowSize' in algParams && metric.dataPoints > 100 && metric.avgAccuracy < 15) {
      const currentWindow = Number(algParams.windowSize) || 30;
      const newWindow = Math.min(50, currentWindow + 5);
      
      if (newWindow !== currentWindow) {
        adjustments.push({
          algorithm: metric.name,
          parameter: 'windowSize',
          previousValue: currentWindow,
          newValue: newWindow,
          reason: `Augmenter fenêtre historique (${metric.dataPoints} points disponibles)`,
        });
      }
    }
  }
  
  return adjustments;
}

// ============= MAIN ORCHESTRATION =============

/**
 * Exécute l'orchestration complète avec filtrage statistique du bruit et backtest Walk-Forward
 */
export function runOrchestration(
  performanceData: Map<string, Array<{
    accuracy_score: number;
    matches_count: number;
    draw_date: string;
    confidence_score?: number;
  }>>,
  currentWeights: Map<string, number>,
  currentParams: Map<string, Record<string, number | string>>,
  options: {
    forceAdjustment?: boolean;
    minDataPoints?: number;
  } = {}
): OrchestrationResult {
  const notes: string[] = [];
  
  // 1. Déterminer la taille de la fenêtre de Backtest (Out-of-Sample)
  let maxDraws = 0;
  for (const [_, perfs] of performanceData) {
    if (perfs.length > maxDraws) {
      maxDraws = perfs.length;
    }
  }
  
  // Déterminer la taille du backtest N (généralement 10 si on a >= 40 tirages de dispo)
  const N = Math.max(5, Math.min(10, Math.floor(maxDraws * 0.25)));
  notes.push(`[SPLIT] Historique max détecté : ${maxDraws} tirages. Fenêtre de validation Walk-Forward : ${N} tirages.`);

  // Extraire toutes les performances In-Sample pour dériver les hyperparamètres globaux
  const allInSamplePerformances: Array<{ accuracy_score: number }> = [];
  for (const [_, perfs] of performanceData) {
    const inSample = perfs.slice(N);
    allInSamplePerformances.push(...inSample);
  }
  
  const orchestrationParams = deriveOrchestrationParams(allInSamplePerformances);
  
  // 2. Calculer les métriques avec test de significativité binomiale (Z-Score) sur la fenêtre In-Sample élargie
  const metrics: AlgorithmMetrics[] = [];
  const p0 = 5 / 90; // probabilité de base aléatoire (~5.556%)
  
  for (const [algoName, performances] of performanceData) {
    // Fenêtre In-Sample de minimum 30 tirages (si dispo)
    const inSample = performances.slice(N);
    
    if (inSample.length < 5 && !options.forceAdjustment) {
      notes.push(`${algoName}: données in-sample insuffisantes (${inSample.length}/5)`);
      continue;
    }
    
    // Calcul de base des métriques
    const metric = calculateAlgorithmMetrics(algoName, inSample, orchestrationParams);
    
    // Test de significativité (Z-Score vs Hasard Pur ~5.56%)
    const D = inSample.length;
    const totalPredicted = 5 * D;
    const totalMatches = inSample.reduce((sum, p) => sum + p.matches_count, 0);
    const expectedMatches = totalPredicted * p0;
    const variance = totalPredicted * p0 * (1 - p0);
    const stdDev = Math.sqrt(variance);
    const zScore = stdDev > 0 ? (totalMatches - expectedMatches) / stdDev : 0;
    const isSignificant = zScore > 1.645; // Seuil unilatéral à 95% de confiance
    
    log("info", `Significance test for ${algoName}`, {
      zScore: zScore.toFixed(3),
      isSignificant,
      matches: totalMatches,
      draws: D
    });
    
    // Si l'écart de performance n'est pas statistiquement significatif (Z-Score <= 1.645),
    // on traite cela comme du bruit blanc / hasard. On force la tendance et le momentum à 0.
    if (!isSignificant) {
      metric.trend = 0;
      metric.momentum = 0;
      notes.push(`[IA] ${algoName} : Écart non significatif (Z-Score: ${zScore.toFixed(2)}). Tendance forcée à neutre (filtre de bruit).`);
    } else {
      notes.push(`[IA] ${algoName} : Performance statistiquement valide (Z-Score: ${zScore.toFixed(2)}).`);
    }
    
    metrics.push(metric);
  }
  
  if (metrics.length === 0) {
    return {
      weightAdjustments: [],
      parameterAdjustments: [],
      metrics: [],
      strategy: "no_action",
      expectedImprovement: 0,
      notes: ["Pas assez de données pour l'orchestration"],
    };
  }
  
  // 3. Déterminer la stratégie globale basée sur les métriques filtrées du bruit
  const strategy = determineStrategy(metrics, orchestrationParams);
  notes.push(`Stratégie choisie : ${strategy.strategy} (${strategy.description})`);
  
  // 4. Calculer les propositions d'ajustements de poids (In-Sample)
  const proposedAdjustments = calculateWeightAdjustments(metrics, currentWeights, strategy, orchestrationParams);
  
  // 5. Calculer les propositions d'ajustements de paramètres (In-Sample)
  const parameterAdjustments = suggestParameterAdjustments(metrics, currentParams, orchestrationParams);
  
  // 6. Nouveau : Validation Walk-Forward (Out-of-Sample)
  // Construire la map des poids proposés
  const proposedWeights = new Map<string, number>(currentWeights);
  for (const adj of proposedAdjustments) {
    proposedWeights.set(adj.algorithm, adj.newWeight);
  }
  
  // Identifier toutes les dates de tirage présentes dans la fenêtre de backtest (les N tirages les plus récents)
  const backtestDrawDatesSet = new Set<string>();
  for (const [_, perfs] of performanceData) {
    const backtestPerfs = perfs.slice(0, N);
    for (const p of backtestPerfs) {
      backtestDrawDatesSet.add(p.draw_date);
    }
  }
  const backtestDrawDates = Array.from(backtestDrawDatesSet).sort();
  
  let totalCurrentAcc = 0;
  let totalProposedAcc = 0;
  let validDrawsCount = 0;
  
  for (const date of backtestDrawDates) {
    let currentWeightedSum = 0;
    let proposedWeightedSum = 0;
    let currentWeightsSum = 0;
    let proposedWeightsSum = 0;
    
    for (const [algoName, perfs] of performanceData) {
      const drawPerf = perfs.find(p => p.draw_date === date);
      if (drawPerf) {
        const currW = currentWeights.get(algoName) ?? 1.0;
        const propW = proposedWeights.get(algoName) ?? 1.0;
        const acc = drawPerf.accuracy_score;
        
        currentWeightedSum += currW * acc;
        currentWeightsSum += currW;
        
        proposedWeightedSum += propW * acc;
        proposedWeightsSum += propW;
      }
    }
    
    if (currentWeightsSum > 0 && proposedWeightsSum > 0) {
      totalCurrentAcc += currentWeightedSum / currentWeightsSum;
      totalProposedAcc += proposedWeightedSum / proposedWeightsSum;
      validDrawsCount++;
    }
  }
  
  const avgCurrentBacktestAcc = validDrawsCount > 0 ? totalCurrentAcc / validDrawsCount : 0;
  const avgProposedBacktestAcc = validDrawsCount > 0 ? totalProposedAcc / validDrawsCount : 0;
  
  const backtestResult = {
    currentScore: parseFloat(avgCurrentBacktestAcc.toFixed(3)),
    proposedScore: parseFloat(avgProposedBacktestAcc.toFixed(3)),
    degradation: avgProposedBacktestAcc < avgCurrentBacktestAcc,
    improvement: parseFloat((avgProposedBacktestAcc - avgCurrentBacktestAcc).toFixed(3)),
  };
  
  log("info", "Walk-forward backtest completed", backtestResult);
  
  // 7. Application conditionnelle des ajustements de poids
  let finalWeightAdjustments = proposedAdjustments;
  if (backtestResult.degradation && proposedAdjustments.length > 0) {
    finalWeightAdjustments = [];
    notes.push(`[BACKTEST] Rejet des ajustements : Dégradation de l'ensemble détectée en Walk-Forward (Proposé : ${backtestResult.proposedScore.toFixed(2)}% vs Actuel : ${backtestResult.currentScore.toFixed(2)}%).`);
  } else if (proposedAdjustments.length > 0) {
    notes.push(`[BACKTEST] Validation réussie : Gain de performance en Walk-Forward (Proposé : ${backtestResult.proposedScore.toFixed(2)}% vs Actuel : ${backtestResult.currentScore.toFixed(2)}%).`);
  } else {
    notes.push(`[BACKTEST] Pas d'ajustement de poids proposé à valider.`);
  }
  
  // Estimer l'amélioration attendue finale
  const avgTrend = metrics.reduce((sum, m) => sum + m.trend, 0) / metrics.length;
  const adjustmentImpact = finalWeightAdjustments.reduce((sum, a) => 
    sum + Math.abs(a.newWeight - a.previousWeight) * a.confidence, 0
  );
  const expectedImprovement = Math.max(0, avgTrend + adjustmentImpact * 2);
  
  return validateOrchestrationResult({
    weightAdjustments: finalWeightAdjustments,
    parameterAdjustments,
    metrics,
    strategy: strategy.strategy,
    expectedImprovement,
    notes,
    backtestResult,
  }, orchestrationParams);
}

/**
 * Valide et nettoie les résultats d'orchestration
 */
export function validateOrchestrationResult(result: OrchestrationResult, params: OrchestrationParams): OrchestrationResult {
  // Filtrer les ajustements invalides
  const validWeightAdjustments = result.weightAdjustments.filter(adj => 
    adj.newWeight >= params.minWeight && 
    adj.newWeight <= params.maxWeight &&
    adj.confidence > 0.2
  );
  
  const validParamAdjustments = result.parameterAdjustments.filter(adj =>
    adj.newValue !== adj.previousValue
  );
  
  return {
    ...result,
    weightAdjustments: validWeightAdjustments,
    parameterAdjustments: validParamAdjustments,
  };
}
