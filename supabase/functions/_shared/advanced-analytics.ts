// Advanced Analytics - Analyses statistiques avancées
import type { DrawResult } from "./types.ts";

export interface AdvancedAnalytics {
  trendAnalysis: TrendAnalysis;
  cyclicalPatterns: CyclicalPattern[];
  anomalyDetection: AnomalyResult[];
  correlationMatrix: CorrelationMatrix;
  seasonalDecomposition: SeasonalDecomposition;
  volatilityAnalysis: VolatilityAnalysis;
}

export interface TrendAnalysis {
  overallTrend: "increasing" | "decreasing" | "stable";
  trendStrength: number;
  changePoints: number[];
  momentum: number;
}

export interface CyclicalPattern {
  period: number;
  strength: number;
  phase: number;
  confidence: number;
  numbers: number[];
}

export interface AnomalyResult {
  drawIndex: number;
  anomalyScore: number;
  type: "frequency" | "pattern" | "temporal";
  description: string;
}

export interface CorrelationMatrix {
  numberCorrelations: Record<string, number>;
  temporalCorrelations: number[];
  strongPairs: Array<{ num1: number; num2: number; correlation: number }>;
}

export interface SeasonalDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
  seasonalStrength: number;
}

export interface VolatilityAnalysis {
  overallVolatility: number;
  volatilityClusters: Array<{ start: number; end: number; intensity: number }>;
  garchParameters: { alpha: number; beta: number };
}

export class AdvancedAnalyticsEngine {
  
  analyzeDrawResults(results: DrawResult[]): AdvancedAnalytics {
    if (results.length < 10) {
      throw new Error("Insufficient data for advanced analytics");
    }

    return {
      trendAnalysis: this.analyzeTrends(results),
      cyclicalPatterns: this.detectCyclicalPatterns(results),
      anomalyDetection: this.detectAnomalies(results),
      correlationMatrix: this.buildCorrelationMatrix(results),
      seasonalDecomposition: this.decomposeSeasonality(results),
      volatilityAnalysis: this.analyzeVolatility(results)
    };
  }

  private analyzeTrends(results: DrawResult[]): TrendAnalysis {
    // Analyser les tendances des numéros dans le temps
    const timeSeriesData = this.buildTimeSeries(results);
    
    // Calculer la tendance générale avec régression linéaire
    const trend = this.calculateLinearTrend(timeSeriesData);
    
    // Détecter les points de changement
    const changePoints = this.detectChangePoints(timeSeriesData);
    
    // Calculer le momentum (dérivée de la tendance)
    const momentum = this.calculateMomentum(timeSeriesData);

    return {
      overallTrend: trend > 0.1 ? "increasing" : trend < -0.1 ? "decreasing" : "stable",
      trendStrength: Math.abs(trend),
      changePoints,
      momentum
    };
  }

  private detectCyclicalPatterns(results: DrawResult[]): CyclicalPattern[] {
    const patterns: CyclicalPattern[] = [];
    
    // Analyser différentes périodes cycliques
    const periodsToTest = [7, 14, 21, 28, 30, 60, 90];
    
    for (const period of periodsToTest) {
      if (results.length < period * 2) continue;
      
      const cyclicalStrength = this.calculateCyclicalStrength(results, period);
      
      if (cyclicalStrength > 0.3) {
        const phase = this.calculatePhase(results, period);
        const confidence = this.calculateCyclicalConfidence(results, period);
        const numbers = this.getNumbersInCycle(results, period);
        
        patterns.push({
          period,
          strength: cyclicalStrength,
          phase,
          confidence,
          numbers
        });
      }
    }
    
    return patterns.sort((a, b) => b.strength - a.strength);
  }

  private detectAnomalies(results: DrawResult[]): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];
    
    // Détecter les anomalies de fréquence
    const frequencyAnomalies = this.detectFrequencyAnomalies(results);
    anomalies.push(...frequencyAnomalies);
    
    // Détecter les anomalies de pattern
    const patternAnomalies = this.detectPatternAnomalies(results);
    anomalies.push(...patternAnomalies);
    
    // Détecter les anomalies temporelles
    const temporalAnomalies = this.detectTemporalAnomalies(results);
    anomalies.push(...temporalAnomalies);
    
    return anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);
  }

  private buildCorrelationMatrix(results: DrawResult[]): CorrelationMatrix {
    const numberCorrelations: Record<string, number> = {};
    const strongPairs: Array<{ num1: number; num2: number; correlation: number }> = [];
    
    // Calculer les corrélations entre tous les pairs de numéros
    for (let i = 1; i <= 90; i++) {
      for (let j = i + 1; j <= 90; j++) {
        const correlation = this.calculatePairCorrelation(results, i, j);
        const key = `${i}-${j}`;
        numberCorrelations[key] = correlation;
        
        if (Math.abs(correlation) > 0.3) {
          strongPairs.push({ num1: i, num2: j, correlation });
        }
      }
    }
    
    // Calculer les corrélations temporelles
    const temporalCorrelations = this.calculateTemporalCorrelations(results);
    
    return {
      numberCorrelations,
      temporalCorrelations,
      strongPairs: strongPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    };
  }

  private decomposeSeasonality(results: DrawResult[]): SeasonalDecomposition {
    const timeSeries = this.buildTimeSeries(results);
    
    // Décomposition saisonnière simple (STL-like)
    const trend = this.extractTrend(timeSeries);
    const seasonal = this.extractSeasonal(timeSeries, trend);
    const residual = timeSeries.map((val, i) => val - trend[i] - seasonal[i]);
    
    // Calculer la force saisonnière
    const seasonalVariance = this.calculateVariance(seasonal);
    const residualVariance = this.calculateVariance(residual);
    const seasonalStrength = seasonalVariance / (seasonalVariance + residualVariance);
    
    return {
      trend,
      seasonal,
      residual,
      seasonalStrength
    };
  }

  private analyzeVolatility(results: DrawResult[]): VolatilityAnalysis {
    const returns = this.calculateReturns(results);
    
    // Calculer la volatilité globale
    const overallVolatility = this.calculateVariance(returns);
    
    // Détecter les clusters de volatilité
    const volatilityClusters = this.detectVolatilityClusters(returns);
    
    // Estimer les paramètres GARCH
    const garchParameters = this.estimateGARCH(returns);
    
    return {
      overallVolatility,
      volatilityClusters,
      garchParameters
    };
  }

  // Méthodes utilitaires
  private buildTimeSeries(results: DrawResult[]): number[] {
    return results.map(result => {
      // Utiliser la somme des numéros comme proxy de la série temporelle
      return result.winning_numbers.reduce((sum, num) => sum + num, 0) / 5;
    });
  }

  private calculateLinearTrend(data: number[]): number {
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private detectChangePoints(data: number[]): number[] {
    const changePoints: number[] = [];
    const windowSize = Math.min(10, Math.floor(data.length / 4));
    
    for (let i = windowSize; i < data.length - windowSize; i++) {
      const before = data.slice(i - windowSize, i);
      const after = data.slice(i, i + windowSize);
      
      const meanBefore = before.reduce((a, b) => a + b, 0) / before.length;
      const meanAfter = after.reduce((a, b) => a + b, 0) / after.length;
      
      const change = Math.abs(meanAfter - meanBefore);
      const threshold = this.calculateVariance(data.slice(Math.max(0, i - windowSize * 2), i + windowSize * 2));
      
      if (change > threshold * 2) {
        changePoints.push(i);
      }
    }
    
    return changePoints;
  }

  private calculateMomentum(data: number[]): number {
    if (data.length < 3) return 0;
    
    const recent = data.slice(-5);
    const previous = data.slice(-10, -5);
    
    const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousMean = previous.reduce((a, b) => a + b, 0) / previous.length;
    
    return (recentMean - previousMean) / previousMean;
  }

  private calculateCyclicalStrength(results: DrawResult[], period: number): number {
    const cycles = Math.floor(results.length / period);
    if (cycles < 2) return 0;
    
    let totalCorrelation = 0;
    let comparisons = 0;
    
    for (let cycle1 = 0; cycle1 < cycles - 1; cycle1++) {
      for (let cycle2 = cycle1 + 1; cycle2 < cycles; cycle2++) {
        const start1 = cycle1 * period;
        const start2 = cycle2 * period;
        
        const cycle1Data = results.slice(start1, start1 + period);
        const cycle2Data = results.slice(start2, start2 + period);
        
        const correlation = this.calculateCycleCorrelation(cycle1Data, cycle2Data);
        totalCorrelation += correlation;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalCorrelation / comparisons : 0;
  }

  private calculatePhase(results: DrawResult[], period: number): number {
    // Calculer la phase du cycle (où nous sommes dans le cycle)
    const currentPosition = results.length % period;
    return currentPosition / period;
  }

  private calculateCyclicalConfidence(results: DrawResult[], period: number): number {
    const strength = this.calculateCyclicalStrength(results, period);
    const cycles = Math.floor(results.length / period);
    
    // Plus de cycles = plus de confiance
    const cycleConfidence = Math.min(1, cycles / 5);
    
    return strength * cycleConfidence;
  }

  private getNumbersInCycle(results: DrawResult[], period: number): number[] {
    const numberFreq: Record<number, number> = {};
    for (let i = 1; i <= 90; i++) numberFreq[i] = 0;
    
    const cycles = Math.floor(results.length / period);
    
    for (let cycle = 0; cycle < cycles; cycle++) {
      const start = cycle * period;
      const cycleResults = results.slice(start, start + period);
      
      cycleResults.forEach(result => {
        result.winning_numbers.forEach(num => {
          numberFreq[num]++;
        });
      });
    }
    
    return Object.entries(numberFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([num]) => parseInt(num));
  }

  private detectFrequencyAnomalies(results: DrawResult[]): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];
    const expectedFreq = results.length * 5 / 90; // Fréquence attendue par numéro
    
    for (let num = 1; num <= 90; num++) {
      const actualFreq = results.filter(r => r.winning_numbers.includes(num)).length;
      const zScore = Math.abs(actualFreq - expectedFreq) / Math.sqrt(expectedFreq);
      
      if (zScore > 2.5) { // Seuil d'anomalie
        anomalies.push({
          drawIndex: -1, // Anomalie globale
          anomalyScore: zScore,
          type: "frequency",
          description: `Numéro ${num}: fréquence anormale (${actualFreq} vs ${expectedFreq.toFixed(1)} attendu)`
        });
      }
    }
    
    return anomalies;
  }

  private detectPatternAnomalies(results: DrawResult[]): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];
    
    results.forEach((result, index) => {
      // Détecter les patterns inhabituels
      const numbers = result.winning_numbers;
      
      // Séquences consécutives
      const consecutiveCount = this.countConsecutive(numbers);
      if (consecutiveCount >= 3) {
        anomalies.push({
          drawIndex: index,
          anomalyScore: consecutiveCount / 5,
          type: "pattern",
          description: `${consecutiveCount} numéros consécutifs détectés`
        });
      }
      
      // Tous pairs ou tous impairs
      const evenCount = numbers.filter(n => n % 2 === 0).length;
      if (evenCount === 0 || evenCount === 5) {
        anomalies.push({
          drawIndex: index,
          anomalyScore: 0.8,
          type: "pattern",
          description: evenCount === 0 ? "Tous numéros impairs" : "Tous numéros pairs"
        });
      }
    });
    
    return anomalies;
  }

  private detectTemporalAnomalies(results: DrawResult[]): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];
    const timeSeries = this.buildTimeSeries(results);
    
    // Utiliser une fenêtre glissante pour détecter les valeurs aberrantes
    const windowSize = 10;
    
    for (let i = windowSize; i < timeSeries.length - windowSize; i++) {
      const window = timeSeries.slice(i - windowSize, i + windowSize);
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const std = Math.sqrt(this.calculateVariance(window));
      
      const zScore = Math.abs(timeSeries[i] - mean) / std;
      
      if (zScore > 3) {
        anomalies.push({
          drawIndex: i,
          anomalyScore: zScore / 3,
          type: "temporal",
          description: `Valeur temporelle aberrante (z-score: ${zScore.toFixed(2)})`
        });
      }
    }
    
    return anomalies;
  }

  private calculatePairCorrelation(results: DrawResult[], num1: number, num2: number): number {
    let both = 0, only1 = 0, only2 = 0, none = 0;
    
    results.forEach(r => {
      const has1 = r.winning_numbers.includes(num1);
      const has2 = r.winning_numbers.includes(num2);
      
      if (has1 && has2) both++;
      else if (has1) only1++;
      else if (has2) only2++;
      else none++;
    });
    
    const n = results.length;
    const numerator = (both * none - only1 * only2);
    const denominator = Math.sqrt((both + only1) * (only2 + none) * (both + only2) * (only1 + none));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateTemporalCorrelations(results: DrawResult[]): number[] {
    const correlations: number[] = [];
    
    for (let lag = 1; lag <= 5; lag++) {
      let correlation = 0;
      let count = 0;
      
      for (let i = 0; i < results.length - lag; i++) {
        const current = results[i].winning_numbers;
        const lagged = results[i + lag].winning_numbers;
        
        const overlap = current.filter(n => lagged.includes(n)).length;
        correlation += overlap / 5;
        count++;
      }
      
      correlations.push(count > 0 ? correlation / count : 0);
    }
    
    return correlations;
  }

  private extractTrend(data: number[]): number[] {
    // Moyenne mobile pour extraire la tendance
    const windowSize = Math.min(7, Math.floor(data.length / 4));
    const trend: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1);
      const window = data.slice(start, end);
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      trend.push(mean);
    }
    
    return trend;
  }

  private extractSeasonal(data: number[], trend: number[]): number[] {
    // Extraire la composante saisonnière
    const detrended = data.map((val, i) => val - trend[i]);
    const period = 7; // Période hebdomadaire
    const seasonal: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const seasonalIndex = i % period;
      const seasonalValues = detrended.filter((_, idx) => idx % period === seasonalIndex);
      const seasonalMean = seasonalValues.reduce((a, b) => a + b, 0) / seasonalValues.length;
      seasonal.push(seasonalMean);
    }
    
    return seasonal;
  }

  private calculateReturns(results: DrawResult[]): number[] {
    const timeSeries = this.buildTimeSeries(results);
    const returns: number[] = [];
    
    for (let i = 1; i < timeSeries.length; i++) {
      const returnValue = (timeSeries[i] - timeSeries[i - 1]) / timeSeries[i - 1];
      returns.push(returnValue);
    }
    
    return returns;
  }

  private detectVolatilityClusters(returns: number[]): Array<{ start: number; end: number; intensity: number }> {
    const clusters: Array<{ start: number; end: number; intensity: number }> = [];
    const threshold = this.calculateVariance(returns) * 1.5;
    
    let clusterStart = -1;
    
    for (let i = 0; i < returns.length; i++) {
      const volatility = Math.abs(returns[i]);
      
      if (volatility > threshold) {
        if (clusterStart === -1) {
          clusterStart = i;
        }
      } else {
        if (clusterStart !== -1) {
          const clusterReturns = returns.slice(clusterStart, i);
          const intensity = this.calculateVariance(clusterReturns);
          
          clusters.push({
            start: clusterStart,
            end: i - 1,
            intensity
          });
          
          clusterStart = -1;
        }
      }
    }
    
    return clusters;
  }

  private estimateGARCH(returns: number[]): { alpha: number; beta: number } {
    // Estimation simplifiée des paramètres GARCH(1,1)
    const squaredReturns = returns.map(r => r * r);
    const mean = squaredReturns.reduce((a, b) => a + b, 0) / squaredReturns.length;
    
    // Estimation par méthode des moments (simplifiée)
    let alpha = 0.1;
    let beta = 0.8;
    
    // Optimisation simple par grid search
    let bestError = Infinity;
    
    for (let a = 0.05; a <= 0.3; a += 0.05) {
      for (let b = 0.5; b <= 0.9; b += 0.1) {
        if (a + b < 1) {
          const error = this.calculateGARCHError(returns, a, b);
          if (error < bestError) {
            bestError = error;
            alpha = a;
            beta = b;
          }
        }
      }
    }
    
    return { alpha, beta };
  }

  private calculateGARCHError(returns: number[], alpha: number, beta: number): number {
    const squaredReturns = returns.map(r => r * r);
    let variance = squaredReturns[0];
    let error = 0;
    
    for (let i = 1; i < squaredReturns.length; i++) {
      const predictedVariance = alpha * squaredReturns[i - 1] + beta * variance;
      error += Math.pow(squaredReturns[i] - predictedVariance, 2);
      variance = predictedVariance;
    }
    
    return error / (squaredReturns.length - 1);
  }

  private calculateVariance(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return variance;
  }

  private countConsecutive(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }
    
    return maxConsecutive;
  }

  private calculateCycleCorrelation(cycle1: DrawResult[], cycle2: DrawResult[]): number {
    if (cycle1.length !== cycle2.length) return 0;
    
    let correlation = 0;
    
    for (let i = 0; i < cycle1.length; i++) {
      const overlap = cycle1[i].winning_numbers.filter(n => 
        cycle2[i].winning_numbers.includes(n)
      ).length;
      correlation += overlap / 5;
    }
    
    return correlation / cycle1.length;
  }
}

// Instance globale
export const advancedAnalytics = new AdvancedAnalyticsEngine();