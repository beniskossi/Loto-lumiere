// Détection de Périodicité - Analyse des patterns temporels récurrents
import type { DrawResult } from "./types.ts";
import { log } from "./utils.ts";

interface PeriodicityPattern {
  period: number;           // Période en nombre de tirages
  strength: number;         // Force du pattern (0-1)
  confidence: number;       // Confiance dans la détection
  affectedNumbers: number[]; // Numéros affectés par ce pattern
  description: string;
}

interface SeasonalAnalysis {
  dayOfWeekEffect: Map<string, number[]>;  // Jour -> numéros fréquents
  monthlyTrend: Map<number, number[]>;     // Mois -> numéros fréquents
  weeklyPattern: PeriodicityPattern | null;
  biweeklyPattern: PeriodicityPattern | null;
  monthlyPattern: PeriodicityPattern | null;
}

interface NumberCycle {
  number: number;
  avgCycleLength: number;    // Longueur moyenne du cycle
  cycleVariance: number;     // Variance du cycle
  nextExpectedDraw: number;  // Prochaine apparition estimée
  reliability: number;       // Fiabilité de la prédiction (0-1)
}

/**
 * Analyse la périodicité des tirages avec autocorrélation
 * ACF(k) = Σ((x_t - μ)(x_{t+k} - μ)) / Σ(x_t - μ)²
 */
export function analyzeAutocorrelation(
  results: DrawResult[],
  maxLag: number = 30
): Map<number, number> {
  const acf = new Map<number, number>();
  
  // Créer une série temporelle binaire pour chaque numéro
  const numberSeries: Map<number, number[]> = new Map();
  
  for (let n = 1; n <= 90; n++) {
    const series = results.map(r => r.winning_numbers.includes(n) ? 1 : 0);
    numberSeries.set(n, series);
  }
  
  // Calculer l'ACF agrégée
  for (let lag = 1; lag <= maxLag; lag++) {
    let totalCorrelation = 0;
    let validNumbers = 0;
    
    numberSeries.forEach((series) => {
      if (series.length > lag + 10) {
        const correlation = calculateCorrelation(series, lag);
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

function calculateCorrelation(series: number[], lag: number): number {
  const n = series.length - lag;
  if (n < 5) return 0;
  
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let t = 0; t < n; t++) {
    const diff1 = series[t] - mean;
    const diff2 = series[t + lag] - mean;
    numerator += diff1 * diff2;
    denominator += diff1 * diff1;
  }
  
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Détecte les patterns périodiques significatifs
 */
export function detectPeriodicPatterns(results: DrawResult[]): PeriodicityPattern[] {
  const patterns: PeriodicityPattern[] = [];
  const acf = analyzeAutocorrelation(results, 30);
  
  // Seuil de significativité (approximation)
  const significanceThreshold = 2 / Math.sqrt(results.length);
  
  // Chercher les pics significatifs dans l'ACF
  const peaks: { lag: number; value: number }[] = [];
  
  acf.forEach((value, lag) => {
    const prevValue = acf.get(lag - 1) || 0;
    const nextValue = acf.get(lag + 1) || 0;
    
    // Pic local significatif
    if (value > prevValue && value > nextValue && Math.abs(value) > significanceThreshold) {
      peaks.push({ lag, value });
    }
  });
  
  // Analyser les périodes courantes
  const commonPeriods = [7, 14, 21, 28, 30]; // Hebdo, bi-hebdo, mensuel
  
  commonPeriods.forEach(period => {
    const correlation = acf.get(period) || 0;
    
    if (Math.abs(correlation) > significanceThreshold * 0.8) {
      const affectedNumbers = findPeriodicNumbers(results, period);
      
      patterns.push({
        period,
        strength: Math.abs(correlation),
        confidence: calculatePeriodConfidence(results, period),
        affectedNumbers,
        description: getPatternDescription(period)
      });
    }
  });
  
  // Ajouter les pics détectés qui ne sont pas dans les périodes courantes
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
  
  log("info", "Periodic patterns detected", {
    count: patterns.length,
    patterns: patterns.map(p => ({ period: p.period, strength: p.strength.toFixed(3) }))
  });
  
  return patterns.sort((a, b) => b.strength - a.strength);
}

function findPeriodicNumbers(results: DrawResult[], period: number): number[] {
  const numberPeriodicity: Map<number, number> = new Map();
  
  for (let n = 1; n <= 90; n++) {
    let periodicCount = 0;
    let totalOccurrences = 0;
    
    results.forEach((result, index) => {
      if (result.winning_numbers.includes(n)) {
        totalOccurrences++;
        
        // Vérifier si ce numéro apparaît aussi au même décalage périodique
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

function calculatePeriodConfidence(results: DrawResult[], period: number): number {
  // Plus de données = plus de confiance
  const dataFactor = Math.min(1, results.length / (period * 5));
  
  // Vérifier la régularité du pattern
  const regularityFactor = 0.7; // Simplifié
  
  return dataFactor * 0.6 + regularityFactor * 0.4;
}

function getPatternDescription(period: number): string {
  if (period === 7) return "Pattern hebdomadaire détecté";
  if (period === 14) return "Pattern bi-hebdomadaire détecté";
  if (period === 21) return "Pattern tri-hebdomadaire détecté";
  if (period === 28 || period === 30) return "Pattern mensuel détecté";
  return `Pattern de période ${period} tirages`;
}

/**
 * Analyse saisonnière - effets jour de semaine et mois
 */
export function analyzeSeasonalEffects(results: DrawResult[]): SeasonalAnalysis {
  const dayOfWeekEffect: Map<string, number[]> = new Map();
  const monthlyTrend: Map<number, number[]> = new Map();
  
  const dayFrequency: Map<string, Map<number, number>> = new Map();
  const monthFrequency: Map<number, Map<number, number>> = new Map();
  
  // Initialiser
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  days.forEach(day => dayFrequency.set(day, new Map()));
  for (let m = 1; m <= 12; m++) monthFrequency.set(m, new Map());
  
  // Compter les fréquences par jour/mois
  results.forEach(result => {
    const date = new Date(result.draw_date);
    const dayName = days[date.getDay()];
    const month = date.getMonth() + 1;
    
    result.winning_numbers.forEach(num => {
      // Par jour
      const dayMap = dayFrequency.get(dayName);
      if (dayMap) {
        dayMap.set(num, (dayMap.get(num) || 0) + 1);
      }
      
      // Par mois
      const monthMap = monthFrequency.get(month);
      if (monthMap) {
        monthMap.set(num, (monthMap.get(num) || 0) + 1);
      }
    });
  });
  
  // Extraire les top numéros par jour
  dayFrequency.forEach((freqMap, day) => {
    const topNumbers = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([num]) => num);
    dayOfWeekEffect.set(day, topNumbers);
  });
  
  // Extraire les top numéros par mois
  monthFrequency.forEach((freqMap, month) => {
    const topNumbers = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([num]) => num);
    monthlyTrend.set(month, topNumbers);
  });
  
  const patterns = detectPeriodicPatterns(results);
  
  return {
    dayOfWeekEffect,
    monthlyTrend,
    weeklyPattern: patterns.find(p => p.period === 7) || null,
    biweeklyPattern: patterns.find(p => p.period === 14) || null,
    monthlyPattern: patterns.find(p => p.period >= 28 && p.period <= 31) || null
  };
}

/**
 * Analyse des cycles individuels de chaque numéro
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
    
    // Calculer les écarts entre apparitions
    const gaps: number[] = [];
    for (let i = 1; i < appearances.length; i++) {
      gaps.push(appearances[i] - appearances[i - 1]);
    }
    
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    
    // Estimer la prochaine apparition
    const lastAppearance = appearances[appearances.length - 1];
    const currentGap = results.length - 1 - lastAppearance;
    const nextExpected = lastAppearance + Math.round(avgGap);
    
    // Fiabilité basée sur la variance (faible variance = plus fiable)
    const reliability = 1 / (1 + stdDev / avgGap);
    
    cycles.push({
      number: n,
      avgCycleLength: avgGap,
      cycleVariance: variance,
      nextExpectedDraw: nextExpected,
      reliability
    });
  }
  
  return cycles.sort((a, b) => b.reliability - a.reliability);
}

/**
 * Identifie les numéros "prêts" à sortir basé sur leur cycle
 */
export function identifyDueNumbers(
  results: DrawResult[],
  tolerance: number = 0.5
): number[] {
  const cycles = analyzeNumberCycles(results);
  const currentDraw = results.length;
  
  const dueNumbers: { number: number; score: number }[] = [];
  
  cycles.forEach(cycle => {
    if (cycle.reliability < 0.3) return; // Ignorer les cycles peu fiables
    
    const drawsSinceExpected = currentDraw - cycle.nextExpectedDraw;
    
    // Le numéro est "dû" s'il est proche ou dépasse son cycle attendu
    if (drawsSinceExpected >= -cycle.avgCycleLength * tolerance) {
      const overdueScore = Math.max(0, drawsSinceExpected) / cycle.avgCycleLength;
      const score = (1 + overdueScore) * cycle.reliability;
      dueNumbers.push({ number: cycle.number, score });
    }
  });
  
  log("info", "Due numbers identified", {
    count: dueNumbers.length,
    top5: dueNumbers.sort((a, b) => b.score - a.score).slice(0, 5)
  });
  
  return dueNumbers
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(d => d.number);
}

/**
 * Applique les patterns périodiques pour booster les prédictions
 */
export function applyPeriodicityBoost(
  candidates: Map<number, number>,
  results: DrawResult[],
  drawDate?: Date
): Map<number, number> {
  const boostedScores = new Map(candidates);
  const seasonal = analyzeSeasonalEffects(results);
  const dueNumbers = identifyDueNumbers(results);
  
  const date = drawDate || new Date();
  const dayName = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][date.getDay()];
  const month = date.getMonth() + 1;
  
  // Boost pour les numéros fréquents ce jour de la semaine
  const dayNumbers = seasonal.dayOfWeekEffect.get(dayName) || [];
  dayNumbers.forEach((num, index) => {
    const boost = (10 - index) / 100; // Max 10% boost
    const currentScore = boostedScores.get(num) || 0;
    boostedScores.set(num, currentScore * (1 + boost));
  });
  
  // Boost pour les numéros fréquents ce mois
  const monthNumbers = seasonal.monthlyTrend.get(month) || [];
  monthNumbers.slice(0, 5).forEach((num, index) => {
    const boost = (5 - index) / 100; // Max 5% boost
    const currentScore = boostedScores.get(num) || 0;
    boostedScores.set(num, currentScore * (1 + boost));
  });
  
  // Boost pour les numéros "dus" (overdue)
  dueNumbers.forEach((num, index) => {
    const boost = (15 - index) / 100; // Max 15% boost
    const currentScore = boostedScores.get(num) || 0;
    boostedScores.set(num, currentScore * (1 + boost));
  });
  
  return boostedScores;
}
