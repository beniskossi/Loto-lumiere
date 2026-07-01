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
}

// ============= CONSTANTS =============

const MOMENTUM_WINDOW = 5;          // Tirages pour momentum
const TREND_WINDOW_RECENT = 10;     // Tirages récents
const TREND_WINDOW_OLDER = 20;      // Tirages plus anciens
const MIN_WEIGHT = 0.2;             // Poids minimum
const MAX_WEIGHT = 2.5;             // Poids maximum
const ADJUSTMENT_RATE = 0.15;       // Taux d'ajustement par défaut
const STABILITY_THRESHOLD = 60;     // Seuil de consistance
const PERFORMANCE_THRESHOLD_HIGH = 18; // % accuracy considéré bon
const PERFORMANCE_THRESHOLD_LOW = 8;   // % accuracy considéré faible

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
  }>
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
  
  // Accuracy récente (10 derniers)
  const recent = sorted.slice(0, TREND_WINDOW_RECENT);
  const recentAccuracy = recent.length > 0
    ? recent.reduce((sum, p) => sum + p.accuracy_score, 0) / recent.length
    : avgAccuracy;
  
  // Accuracy plus ancienne (10-20)
  const older = sorted.slice(TREND_WINDOW_RECENT, TREND_WINDOW_RECENT + TREND_WINDOW_OLDER);
  const olderAccuracy = older.length > 0
    ? older.reduce((sum, p) => sum + p.accuracy_score, 0) / older.length
    : avgAccuracy;
  
  // Trend = différence récent vs ancien
  const trend = recentAccuracy - olderAccuracy;
  
  // Momentum = variation sur les 5 derniers tirages
  const veryRecent = sorted.slice(0, MOMENTUM_WINDOW);
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
export function determineStrategy(metrics: AlgorithmMetrics[]): {
  strategy: string;
  description: string;
  aggressiveness: number;
} {
  // Analyser l'état global
  const avgConsistency = metrics.reduce((sum, m) => sum + m.consistency, 0) / metrics.length;
  const avgTrend = metrics.reduce((sum, m) => sum + m.trend, 0) / metrics.length;
  const avgPerformance = metrics.reduce((sum, m) => sum + m.avgAccuracy, 0) / metrics.length;
  
  // Déterminer la stratégie
  if (avgConsistency < 50 && avgPerformance < PERFORMANCE_THRESHOLD_LOW) {
    return {
      strategy: "aggressive_rebalancing",
      description: "Performance faible et instable - rééquilibrage agressif",
      aggressiveness: 0.25,
    };
  }
  
  if (avgTrend > 3) {
    return {
      strategy: "momentum_following",
      description: "Tendance positive - suivre le momentum",
      aggressiveness: 0.18,
    };
  }
  
  if (avgTrend < -3) {
    return {
      strategy: "defensive_adjustment",
      description: "Tendance négative - ajustements défensifs",
      aggressiveness: 0.12,
    };
  }
  
  if (avgConsistency > 70 && avgPerformance > PERFORMANCE_THRESHOLD_HIGH) {
    return {
      strategy: "fine_tuning",
      description: "Performance stable et bonne - ajustements fins",
      aggressiveness: 0.08,
    };
  }
  
  return {
    strategy: "balanced_optimization",
    description: "Optimisation équilibrée standard",
    aggressiveness: ADJUSTMENT_RATE,
  };
}

// ============= WEIGHT CALCULATION =============

/**
 * Calcule les nouveaux poids pour tous les algorithmes
 */
export function calculateWeightAdjustments(
  metrics: AlgorithmMetrics[],
  currentWeights: Map<string, number>,
  strategy: { strategy: string; aggressiveness: number }
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
    const consistencyFactor = metric.consistency > STABILITY_THRESHOLD ? 1.05 : 0.95;
    
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
    newWeight = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, newWeight));
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
  currentParams: Map<string, Record<string, number | string>>
): ParameterAdjustment[] {
  const adjustments: ParameterAdjustment[] = [];
  
  for (const metric of metrics) {
    const params = currentParams.get(metric.name);
    if (!params) continue;
    
    // Ajuster learning rate si performance faible et instable
    if ('learningRate' in params && metric.consistency < 50 && metric.avgAccuracy < PERFORMANCE_THRESHOLD_LOW) {
      const currentLR = Number(params.learningRate) || 0.01;
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
    if ('regularization' in params && metric.trend < -5 && metric.avgAccuracy > metric.recentAccuracy + 5) {
      const currentReg = Number(params.regularization) || 0.01;
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
    if ('windowSize' in params && metric.dataPoints > 100 && metric.avgAccuracy < 15) {
      const currentWindow = Number(params.windowSize) || 30;
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
 * Exécute l'orchestration complète
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
  const minDataPoints = options.minDataPoints || 10;
  const notes: string[] = [];
  
  // Calculer les métriques pour chaque algorithme
  const metrics: AlgorithmMetrics[] = [];
  
  for (const [algoName, performances] of performanceData) {
    if (performances.length < minDataPoints && !options.forceAdjustment) {
      notes.push(`${algoName}: données insuffisantes (${performances.length}/${minDataPoints})`);
      continue;
    }
    
    const metric = calculateAlgorithmMetrics(algoName, performances);
    metrics.push(metric);
    
    log("info", `Metrics calculated for ${algoName}`, {
      avgAccuracy: metric.avgAccuracy.toFixed(2),
      trend: metric.trend.toFixed(2),
      consistency: metric.consistency.toFixed(1),
    });
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
  
  // Déterminer la stratégie
  const strategy = determineStrategy(metrics);
  notes.push(`Stratégie: ${strategy.strategy} (${strategy.description})`);
  
  log("info", "Orchestration strategy determined", {
    strategy: strategy.strategy,
    aggressiveness: strategy.aggressiveness,
  });
  
  // Calculer les ajustements de poids
  const weightAdjustments = calculateWeightAdjustments(metrics, currentWeights, strategy);
  
  // Calculer les ajustements de paramètres
  const parameterAdjustments = suggestParameterAdjustments(metrics, currentParams);
  
  // Estimer l'amélioration attendue
  const avgTrend = metrics.reduce((sum, m) => sum + m.trend, 0) / metrics.length;
  const adjustmentImpact = weightAdjustments.reduce((sum, a) => 
    sum + Math.abs(a.newWeight - a.previousWeight) * a.confidence, 0
  );
  const expectedImprovement = Math.max(0, avgTrend + adjustmentImpact * 2);
  
  return {
    weightAdjustments,
    parameterAdjustments,
    metrics,
    strategy: strategy.strategy,
    expectedImprovement,
    notes,
  };
}

/**
 * Valide et nettoie les résultats d'orchestration
 */
export function validateOrchestrationResult(result: OrchestrationResult): OrchestrationResult {
  // Filtrer les ajustements invalides
  const validWeightAdjustments = result.weightAdjustments.filter(adj => 
    adj.newWeight >= MIN_WEIGHT && 
    adj.newWeight <= MAX_WEIGHT &&
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
