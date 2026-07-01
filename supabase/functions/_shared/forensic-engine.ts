// =====================================================
// FORENSIC ENGINE - Audit et auto-calibration des prédictions
// Analyse les prédictions vs résultats réels pour ajuster automatiquement
// les poids et paramètres des algorithmes
// =====================================================

import type { DrawResult, PredictionResult } from "./types.ts";
import { log } from "./utils.ts";

// ============= TYPES =============

export interface ForensicAuditResult {
  auditId: string;
  auditDate: string;
  drawName: string;
  periodStart: string;
  periodEnd: string;
  totalPredictions: number;
  totalMatches: number;
  averageAccuracy: number;
  algorithmPerformance: AlgorithmForensicMetrics[];
  calibrationAdjustments: CalibrationAdjustment[];
  insights: ForensicInsight[];
  recommendations: string[];
  confidenceCalibration: ConfidenceCalibration;
  performanceTrend: PerformanceTrend;
}

export interface AlgorithmForensicMetrics {
  algorithm: string;
  predictions: number;
  totalMatches: number;
  averageMatches: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  calibrationError: number; // Écart entre confiance annoncée et résultat réel
  overconfidence: boolean;
  trend: "improving" | "declining" | "stable";
  recentPerformance: number; // Performance sur les 10 derniers
  historicalPerformance: number; // Performance globale
  suggestedWeightAdjustment: number;
}

export interface CalibrationAdjustment {
  algorithm: string;
  previousWeight: number;
  newWeight: number;
  changePercent: number;
  reason: string;
  previousParams?: Record<string, number>;
  newParams?: Record<string, number>;
}

export interface ForensicInsight {
  type: "pattern" | "anomaly" | "correlation" | "warning" | "recommendation";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  affectedAlgorithms: string[];
  suggestedAction?: string;
}

export interface ConfidenceCalibration {
  averageConfidence: number;
  actualAccuracy: number;
  calibrationError: number;
  isOverconfident: boolean;
  suggestedConfidenceMultiplier: number;
}

export interface PerformanceTrend {
  direction: "improving" | "declining" | "stable";
  recentAverage: number;
  historicalAverage: number;
  volatility: number;
  bestPerformingPeriod: string;
  worstPerformingPeriod: string;
}

export interface PerformanceRecord {
  id: string;
  draw_name: string;
  model_used: string;
  prediction_date: string;
  draw_date: string;
  predicted_numbers: number[];
  winning_numbers: number[];
  matches_count: number;
  accuracy_score: number;
  confidence_score?: number;
  f1_score?: number;
}

// ============= FORENSIC AUDIT ENGINE =============

export class ForensicEngine {
  private readonly minSampleSize = 10;
  private readonly recentWindow = 10;
  private readonly significantCalibrationError = 0.15;
  private readonly maxWeightAdjustment = 0.3;
  private readonly minWeight = 0.1;
  private readonly maxWeight = 2.0;

  /**
   * Exécute un audit forensic complet
   */
  async runForensicAudit(
    performanceData: PerformanceRecord[],
    currentWeights: Map<string, number>,
    currentParams: Map<string, Record<string, number>>
  ): Promise<ForensicAuditResult> {
    const auditId = `forensic_${Date.now()}`;
    const auditDate = new Date().toISOString();
    
    if (performanceData.length === 0) {
      return this.createEmptyAudit(auditId, auditDate);
    }

    // Grouper par algorithme
    const byAlgorithm = this.groupByAlgorithm(performanceData);
    
    // Analyser chaque algorithme
    const algorithmMetrics: AlgorithmForensicMetrics[] = [];
    
    for (const [algorithm, records] of byAlgorithm.entries()) {
      const metrics = this.analyzeAlgorithm(algorithm, records, currentWeights.get(algorithm) || 1.0);
      algorithmMetrics.push(metrics);
    }

    // Calculer les ajustements de calibration
    const calibrationAdjustments = this.calculateCalibrationAdjustments(
      algorithmMetrics,
      currentWeights,
      currentParams
    );

    // Générer insights
    const insights = this.generateInsights(algorithmMetrics, performanceData);

    // Calcul de la calibration globale de confiance
    const confidenceCalibration = this.calculateGlobalConfidenceCalibration(performanceData);

    // Tendance de performance globale
    const performanceTrend = this.calculatePerformanceTrend(performanceData);

    // Recommandations
    const recommendations = this.generateRecommendations(
      algorithmMetrics,
      confidenceCalibration,
      performanceTrend
    );

    // Dates
    const sortedByDate = [...performanceData].sort(
      (a, b) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime()
    );

    return {
      auditId,
      auditDate,
      drawName: performanceData[0]?.draw_name || "Unknown",
      periodStart: sortedByDate[0]?.draw_date || auditDate,
      periodEnd: sortedByDate[sortedByDate.length - 1]?.draw_date || auditDate,
      totalPredictions: performanceData.length,
      totalMatches: performanceData.reduce((sum, r) => sum + r.matches_count, 0),
      averageAccuracy: this.calculateAverageAccuracy(performanceData),
      algorithmPerformance: algorithmMetrics.sort((a, b) => b.accuracy - a.accuracy),
      calibrationAdjustments,
      insights,
      recommendations,
      confidenceCalibration,
      performanceTrend,
    };
  }

  /**
   * Analyse les métriques forensic d'un algorithme
   */
  private analyzeAlgorithm(
    algorithm: string,
    records: PerformanceRecord[],
    currentWeight: number
  ): AlgorithmForensicMetrics {
    const totalPredictions = records.length;
    const totalMatches = records.reduce((sum, r) => sum + r.matches_count, 0);
    const averageMatches = totalMatches / totalPredictions;
    
    // Accuracy: pourcentage de numéros corrects
    const accuracy = (averageMatches / 5) * 100;
    
    // Precision et Recall
    const precision = this.calculatePrecision(records);
    const recall = this.calculateRecall(records);
    const f1Score = precision + recall > 0 
      ? (2 * precision * recall) / (precision + recall)
      : 0;

    // Calibration error: écart entre confiance et résultat réel
    const calibrationError = this.calculateCalibrationError(records);
    const overconfidence = calibrationError > 0;

    // Trend analysis
    const recentRecords = records.slice(-this.recentWindow);
    const recentPerformance = this.calculateAverageAccuracy(recentRecords);
    const historicalPerformance = accuracy;
    
    const trend = this.determineTrend(recentPerformance, historicalPerformance);

    // Suggestion d'ajustement de poids
    const suggestedWeightAdjustment = this.calculateWeightAdjustment(
      accuracy,
      calibrationError,
      trend,
      currentWeight
    );

    return {
      algorithm,
      predictions: totalPredictions,
      totalMatches,
      averageMatches,
      accuracy,
      precision,
      recall,
      f1Score,
      calibrationError,
      overconfidence,
      trend,
      recentPerformance,
      historicalPerformance,
      suggestedWeightAdjustment,
    };
  }

  /**
   * Calcule les ajustements de calibration
   */
  private calculateCalibrationAdjustments(
    metrics: AlgorithmForensicMetrics[],
    currentWeights: Map<string, number>,
    currentParams: Map<string, Record<string, number>>
  ): CalibrationAdjustment[] {
    const adjustments: CalibrationAdjustment[] = [];

    for (const m of metrics) {
      const currentWeight = currentWeights.get(m.algorithm) || 1.0;
      const adjustment = m.suggestedWeightAdjustment;
      
      // Ne créer un ajustement que si significatif
      if (Math.abs(adjustment) > 0.05 || Math.abs(m.calibrationError) > this.significantCalibrationError) {
        const newWeight = Math.max(
          this.minWeight,
          Math.min(this.maxWeight, currentWeight + adjustment)
        );

        // Ajustement des paramètres si overconfidence significative
        let newParams: Record<string, number> | undefined;
        let previousParams: Record<string, number> | undefined;
        
        if (m.overconfidence && Math.abs(m.calibrationError) > 0.2) {
          previousParams = currentParams.get(m.algorithm);
          newParams = this.adjustParametersForOverconfidence(
            previousParams || {},
            m.calibrationError
          );
        }

        let reason = "";
        if (m.trend === "improving" && m.accuracy > 25) {
          reason = `Performance en hausse (+${(m.recentPerformance - m.historicalPerformance).toFixed(1)}%)`;
        } else if (m.trend === "declining") {
          reason = `Performance en baisse (-${(m.historicalPerformance - m.recentPerformance).toFixed(1)}%)`;
        } else if (m.overconfidence) {
          reason = `Surconfiance détectée (erreur: ${(m.calibrationError * 100).toFixed(1)}%)`;
        } else if (m.accuracy > 30) {
          reason = `Excellente précision (${m.accuracy.toFixed(1)}%)`;
        } else {
          reason = `Ajustement basé sur F1-score (${m.f1Score.toFixed(2)})`;
        }

        adjustments.push({
          algorithm: m.algorithm,
          previousWeight: currentWeight,
          newWeight,
          changePercent: ((newWeight - currentWeight) / currentWeight) * 100,
          reason,
          previousParams,
          newParams,
        });
      }
    }

    return adjustments;
  }

  /**
   * Ajuste les paramètres pour réduire la surconfiance
   */
  private adjustParametersForOverconfidence(
    currentParams: Record<string, number>,
    calibrationError: number
  ): Record<string, number> {
    const adjusted = { ...currentParams };
    const reduction = Math.min(0.2, calibrationError);

    // Réduire le learning rate si présent
    if (adjusted.learningRate) {
      adjusted.learningRate = Math.max(0.001, adjusted.learningRate * (1 - reduction));
    }

    // Augmenter la régularisation
    if (adjusted.regularization !== undefined) {
      adjusted.regularization = Math.min(0.5, (adjusted.regularization || 0.01) * (1 + reduction));
    }

    // Réduire la température (plus conservateur)
    if (adjusted.temperature) {
      adjusted.temperature = Math.max(0.3, adjusted.temperature * (1 - reduction * 0.5));
    }

    return adjusted;
  }

  /**
   * Génère des insights basés sur l'analyse forensic
   */
  private generateInsights(
    metrics: AlgorithmForensicMetrics[],
    allRecords: PerformanceRecord[]
  ): ForensicInsight[] {
    const insights: ForensicInsight[] = [];

    // Insight: Algorithme dominant
    const bestAlgo = metrics[0];
    if (bestAlgo && bestAlgo.accuracy > 25) {
      insights.push({
        type: "pattern",
        severity: "low",
        title: "Algorithme performant identifié",
        description: `${bestAlgo.algorithm} affiche la meilleure performance avec ${bestAlgo.accuracy.toFixed(1)}% de précision.`,
        affectedAlgorithms: [bestAlgo.algorithm],
        suggestedAction: "Augmenter le poids de cet algorithme dans l'ensemble"
      });
    }

    // Insight: Algorithmes sous-performants
    const underperformers = metrics.filter(m => m.accuracy < 15 && m.predictions >= this.minSampleSize);
    if (underperformers.length > 0) {
      insights.push({
        type: "warning",
        severity: "medium",
        title: "Algorithmes sous-performants",
        description: `${underperformers.length} algorithme(s) avec une précision < 15%: ${underperformers.map(u => u.algorithm).join(', ')}`,
        affectedAlgorithms: underperformers.map(u => u.algorithm),
        suggestedAction: "Réduire le poids ou désactiver ces algorithmes"
      });
    }

    // Insight: Surconfiance systémique
    const overconfidentAlgos = metrics.filter(m => m.overconfidence && m.calibrationError > 0.15);
    if (overconfidentAlgos.length >= 2) {
      insights.push({
        type: "anomaly",
        severity: "high",
        title: "Surconfiance systémique détectée",
        description: `${overconfidentAlgos.length} algorithmes annoncent une confiance supérieure à leurs résultats réels.`,
        affectedAlgorithms: overconfidentAlgos.map(a => a.algorithm),
        suggestedAction: "Appliquer un multiplicateur de confiance global < 1.0"
      });
    }

    // Insight: Tendance à la baisse
    const decliningAlgos = metrics.filter(m => m.trend === "declining" && m.predictions >= this.minSampleSize);
    if (decliningAlgos.length > metrics.length / 2) {
      insights.push({
        type: "warning",
        severity: "high",
        title: "Tendance générale à la baisse",
        description: "Plus de la moitié des algorithmes montrent une baisse de performance récente.",
        affectedAlgorithms: decliningAlgos.map(a => a.algorithm),
        suggestedAction: "Envisager un ré-entraînement ou une révision des données"
      });
    }

    // Insight: Corrélation entre algorithmes
    const correlationAnalysis = this.analyzeAlgorithmCorrelation(allRecords);
    if (correlationAnalysis.highCorrelation.length > 0) {
      insights.push({
        type: "correlation",
        severity: "low",
        title: "Algorithmes corrélés",
        description: `Forte corrélation entre: ${correlationAnalysis.highCorrelation.join(', ')}. Diversification limitée.`,
        affectedAlgorithms: correlationAnalysis.highCorrelation,
        suggestedAction: "Considérer des algorithmes plus diversifiés"
      });
    }

    // Insight: Volatilité élevée
    const volatileAlgos = metrics.filter(m => {
      const variance = Math.abs(m.recentPerformance - m.historicalPerformance);
      return variance > 10;
    });
    if (volatileAlgos.length > 0) {
      insights.push({
        type: "anomaly",
        severity: "medium",
        title: "Volatilité élevée détectée",
        description: `${volatileAlgos.length} algorithme(s) avec une variation de performance > 10%.`,
        affectedAlgorithms: volatileAlgos.map(a => a.algorithm),
        suggestedAction: "Surveiller ces algorithmes pour stabilisation"
      });
    }

    return insights;
  }

  /**
   * Analyse la corrélation entre algorithmes
   */
  private analyzeAlgorithmCorrelation(records: PerformanceRecord[]): { highCorrelation: string[] } {
    const byDate = new Map<string, Map<string, number>>();
    
    records.forEach(r => {
      if (!byDate.has(r.draw_date)) {
        byDate.set(r.draw_date, new Map());
      }
      byDate.get(r.draw_date)!.set(r.model_used, r.matches_count);
    });

    // Simplified correlation detection
    const algorithms = [...new Set(records.map(r => r.model_used))];
    const highCorrelation: string[] = [];

    // Detect if multiple algorithms consistently have similar results
    const dates = [...byDate.keys()].slice(-20);
    if (dates.length >= 10) {
      for (let i = 0; i < algorithms.length; i++) {
        for (let j = i + 1; j < algorithms.length; j++) {
          let sameCount = 0;
          dates.forEach(date => {
            const dateData = byDate.get(date);
            if (dateData) {
              const a = dateData.get(algorithms[i]) || 0;
              const b = dateData.get(algorithms[j]) || 0;
              if (a === b) sameCount++;
            }
          });
          if (sameCount / dates.length > 0.7) {
            highCorrelation.push(`${algorithms[i]} ↔ ${algorithms[j]}`);
          }
        }
      }
    }

    return { highCorrelation };
  }

  /**
   * Calcule la calibration globale de confiance
   */
  private calculateGlobalConfidenceCalibration(records: PerformanceRecord[]): ConfidenceCalibration {
    const recordsWithConfidence = records.filter(r => r.confidence_score !== undefined && r.confidence_score !== null);
    
    if (recordsWithConfidence.length === 0) {
      return {
        averageConfidence: 0,
        actualAccuracy: 0,
        calibrationError: 0,
        isOverconfident: false,
        suggestedConfidenceMultiplier: 1.0,
      };
    }

    const averageConfidence = recordsWithConfidence.reduce(
      (sum, r) => sum + (r.confidence_score || 0), 0
    ) / recordsWithConfidence.length;

    const actualAccuracy = this.calculateAverageAccuracy(recordsWithConfidence) / 100;
    const calibrationError = averageConfidence - actualAccuracy;
    const isOverconfident = calibrationError > 0.1;

    // Calculer le multiplicateur pour corriger la calibration
    let suggestedConfidenceMultiplier = 1.0;
    if (averageConfidence > 0) {
      suggestedConfidenceMultiplier = Math.max(0.5, Math.min(1.5, actualAccuracy / averageConfidence));
    }

    return {
      averageConfidence,
      actualAccuracy,
      calibrationError,
      isOverconfident,
      suggestedConfidenceMultiplier,
    };
  }

  /**
   * Calcule la tendance de performance globale
   */
  private calculatePerformanceTrend(records: PerformanceRecord[]): PerformanceTrend {
    if (records.length < 10) {
      return {
        direction: "stable",
        recentAverage: 0,
        historicalAverage: 0,
        volatility: 0,
        bestPerformingPeriod: "N/A",
        worstPerformingPeriod: "N/A",
      };
    }

    const sorted = [...records].sort(
      (a, b) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime()
    );

    const recentRecords = sorted.slice(-this.recentWindow);
    const recentAverage = this.calculateAverageAccuracy(recentRecords);
    const historicalAverage = this.calculateAverageAccuracy(sorted);

    // Volatilité
    const accuracies = sorted.map(r => (r.matches_count / 5) * 100);
    const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / accuracies.length;
    const volatility = Math.sqrt(variance);

    // Direction
    const direction = this.determineTrend(recentAverage, historicalAverage);

    // Meilleure/pire période (par semaine)
    const byWeek = new Map<string, number[]>();
    sorted.forEach(r => {
      const date = new Date(r.draw_date);
      const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)}`;
      if (!byWeek.has(weekKey)) byWeek.set(weekKey, []);
      byWeek.get(weekKey)!.push(r.matches_count);
    });

    let bestWeek = { key: "", avg: 0 };
    let worstWeek = { key: "", avg: Infinity };
    
    byWeek.forEach((matches, week) => {
      if (matches.length >= 3) {
        const avg = matches.reduce((a, b) => a + b, 0) / matches.length;
        if (avg > bestWeek.avg) bestWeek = { key: week, avg };
        if (avg < worstWeek.avg) worstWeek = { key: week, avg };
      }
    });

    return {
      direction,
      recentAverage,
      historicalAverage,
      volatility,
      bestPerformingPeriod: bestWeek.key || "N/A",
      worstPerformingPeriod: worstWeek.key !== "" && worstWeek.avg !== Infinity ? worstWeek.key : "N/A",
    };
  }

  /**
   * Génère des recommandations basées sur l'audit
   */
  private generateRecommendations(
    metrics: AlgorithmForensicMetrics[],
    confidenceCalibration: ConfidenceCalibration,
    trend: PerformanceTrend
  ): string[] {
    const recommendations: string[] = [];

    // Recommandation sur la calibration de confiance
    if (confidenceCalibration.isOverconfident) {
      recommendations.push(
        `Appliquer un multiplicateur de confiance de ${confidenceCalibration.suggestedConfidenceMultiplier.toFixed(2)} pour réduire la surconfiance`
      );
    }

    // Recommandation sur les algorithmes performants
    const topPerformers = metrics.filter(m => m.accuracy > 25 && m.trend !== "declining");
    if (topPerformers.length > 0) {
      recommendations.push(
        `Privilégier les algorithmes performants: ${topPerformers.map(t => t.algorithm).join(', ')}`
      );
    }

    // Recommandation sur la tendance
    if (trend.direction === "declining") {
      recommendations.push(
        "Tendance baissière détectée - Envisager une révision des paramètres d'ensemble"
      );
    }

    // Recommandation sur la volatilité
    if (trend.volatility > 15) {
      recommendations.push(
        "Volatilité élevée - Considérer plus de diversification ou de lissage"
      );
    }

    // Recommandation sur le volume de données
    const totalPredictions = metrics.reduce((sum, m) => sum + m.predictions, 0);
    if (totalPredictions < 50) {
      recommendations.push(
        `Données insuffisantes (${totalPredictions} prédictions) - Accumuler plus de données avant d'ajuster massivement`
      );
    }

    // Si aucune recommandation particulière
    if (recommendations.length === 0) {
      recommendations.push("Configuration actuelle satisfaisante - Continuer la surveillance");
    }

    return recommendations;
  }

  // ============= HELPER METHODS =============

  private groupByAlgorithm(records: PerformanceRecord[]): Map<string, PerformanceRecord[]> {
    const grouped = new Map<string, PerformanceRecord[]>();
    records.forEach(r => {
      if (!grouped.has(r.model_used)) {
        grouped.set(r.model_used, []);
      }
      grouped.get(r.model_used)!.push(r);
    });
    return grouped;
  }

  private calculateAverageAccuracy(records: PerformanceRecord[]): number {
    if (records.length === 0) return 0;
    const totalMatches = records.reduce((sum, r) => sum + r.matches_count, 0);
    return (totalMatches / (records.length * 5)) * 100;
  }

  private calculatePrecision(records: PerformanceRecord[]): number {
    let truePositives = 0;
    let totalPredicted = 0;
    
    records.forEach(r => {
      truePositives += r.matches_count;
      totalPredicted += 5;
    });
    
    return totalPredicted > 0 ? truePositives / totalPredicted : 0;
  }

  private calculateRecall(records: PerformanceRecord[]): number {
    let truePositives = 0;
    let totalActual = 0;
    
    records.forEach(r => {
      truePositives += r.matches_count;
      totalActual += r.winning_numbers?.length || 5;
    });
    
    return totalActual > 0 ? truePositives / totalActual : 0;
  }

  private calculateCalibrationError(records: PerformanceRecord[]): number {
    const recordsWithConfidence = records.filter(
      r => r.confidence_score !== undefined && r.confidence_score !== null
    );
    
    if (recordsWithConfidence.length === 0) return 0;
    
    let totalError = 0;
    recordsWithConfidence.forEach(r => {
      const predictedConfidence = r.confidence_score || 0;
      const actualAccuracy = r.matches_count / 5;
      totalError += predictedConfidence - actualAccuracy;
    });
    
    return totalError / recordsWithConfidence.length;
  }

  private determineTrend(
    recentPerformance: number,
    historicalPerformance: number
  ): "improving" | "declining" | "stable" {
    const diff = recentPerformance - historicalPerformance;
    if (diff > 3) return "improving";
    if (diff < -3) return "declining";
    return "stable";
  }

  private calculateWeightAdjustment(
    accuracy: number,
    calibrationError: number,
    trend: "improving" | "declining" | "stable",
    currentWeight: number
  ): number {
    let adjustment = 0;

    // Base adjustment from accuracy (target ~20%)
    if (accuracy > 25) {
      adjustment += 0.1;
    } else if (accuracy < 15) {
      adjustment -= 0.1;
    }

    // Adjust for trend
    if (trend === "improving") {
      adjustment += 0.05;
    } else if (trend === "declining") {
      adjustment -= 0.05;
    }

    // Penalize overconfidence
    if (Math.abs(calibrationError) > 0.2) {
      adjustment -= Math.sign(calibrationError) * 0.1;
    }

    // Limit adjustment magnitude
    adjustment = Math.max(-this.maxWeightAdjustment, Math.min(this.maxWeightAdjustment, adjustment));

    // Ensure weight stays in bounds
    const newWeight = currentWeight + adjustment;
    if (newWeight < this.minWeight) adjustment = this.minWeight - currentWeight;
    if (newWeight > this.maxWeight) adjustment = this.maxWeight - currentWeight;

    return adjustment;
  }

  private createEmptyAudit(auditId: string, auditDate: string): ForensicAuditResult {
    return {
      auditId,
      auditDate,
      drawName: "Unknown",
      periodStart: auditDate,
      periodEnd: auditDate,
      totalPredictions: 0,
      totalMatches: 0,
      averageAccuracy: 0,
      algorithmPerformance: [],
      calibrationAdjustments: [],
      insights: [{
        type: "warning",
        severity: "high",
        title: "Aucune donnée disponible",
        description: "Impossible d'effectuer l'audit forensic sans données de performance.",
        affectedAlgorithms: [],
        suggestedAction: "Exécuter des prédictions et attendre les résultats réels"
      }],
      recommendations: ["Accumuler des données de performance avant d'effectuer un audit"],
      confidenceCalibration: {
        averageConfidence: 0,
        actualAccuracy: 0,
        calibrationError: 0,
        isOverconfident: false,
        suggestedConfidenceMultiplier: 1.0,
      },
      performanceTrend: {
        direction: "stable",
        recentAverage: 0,
        historicalAverage: 0,
        volatility: 0,
        bestPerformingPeriod: "N/A",
        worstPerformingPeriod: "N/A",
      },
    };
  }
}

// Singleton instance
export const forensicEngine = new ForensicEngine();
