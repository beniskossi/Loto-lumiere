import type { DrawResult, PredictionResult } from "./types.ts";
import { selectBalancedNumbers, generateDeterministicFallback } from "./utils.ts";

/**
 * Calcule les scores de tendance basés sur l'accélération et le momentum des écarts
 * (Double Gap Sequence - second ordre des écarts).
 */
export function calculateDoubleGapSequence(results: DrawResult[]): Map<number, number> {
  const scores = new Map<number, number>();
  for (let n = 1; n <= 90; n++) {
    const indices = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].winning_numbers.includes(n)) indices.push(i);
    }
    
    let score = 0;
    if (indices.length >= 4) {
      const currentGap = indices[0];
      const gaps = [];
      for (let j = 0; j < indices.length - 1; j++) {
        gaps.push(indices[j+1] - indices[j] - 1);
      }
      
      // Calculate first and second order differences (écarts des écarts)
      const d1 = gaps[0] - gaps[1]; // Velocity of gap change
      const d2 = (gaps[1] - gaps[2]) || 0; 
      const acceleration = d1 - d2;
      
      // Project next gap using sequence momentum
      // G_next = G_0 + v * t + 0.5 * a * t^2 (discretized)
      let projectedGap = gaps[0] + d1 * 0.5 + acceleration * 0.25;
      projectedGap = Math.max(0, projectedGap);
      
      // Score based on Gaussian distance to projection
      const diff = Math.abs(currentGap - projectedGap);
      score = Math.exp(-(diff * diff) / (2 * 1.5 * 1.5));
    }
    scores.set(n, score);
  }
  return scores;
}

/**
 * Calcule les scores rythmiques et de morphologie basés sur la périodicité des écarts (Gap Cadence).
 */
export function calculateGapCadenceMorphology(results: DrawResult[]): Map<number, number> {
  const scores = new Map<number, number>();
  for (let n = 1; n <= 90; n++) {
    const indices = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].winning_numbers.includes(n)) indices.push(i);
    }
    
    let score = 0;
    if (indices.length >= 5) {
      const currentGap = indices[0];
      const gaps = [];
      for (let j = 0; j < indices.length - 1; j++) {
        gaps.push(indices[j+1] - indices[j] - 1);
      }
      
      // Evaluate cadence periodicities (periods 1, 2, 3)
      // We look for patterns where G[i] ~ G[i+k]
      let maxPeriodScore = 0;
      
      for (let k = 1; k <= 3; k++) {
        if (gaps.length >= k * 2) {
          let diffSum = 0;
          let count = 0;
          for (let j = 0; j < Math.min(k * 2, gaps.length - k); j++) {
            diffSum += Math.abs(gaps[j] - gaps[j+k]);
            count++;
          }
          const avgDiff = diffSum / count;
          
          // Cadence strength is higher when avgDiff is lower
          const cadenceStrength = Math.exp(-avgDiff / 2.0);
          
          // If this cadence continues, the expected gap is gaps[k-1]
          const expectedGap = gaps[k-1];
          const distanceToExpected = Math.abs(currentGap - expectedGap);
          
          const matchScore = cadenceStrength * Math.exp(-(distanceToExpected * distanceToExpected) / (2 * 1.0 * 1.0));
          
          if (matchScore > maxPeriodScore) {
            maxPeriodScore = matchScore;
          }
        }
      }
      score = maxPeriodScore;
    }
    scores.set(n, score);
  }
  return scores;
}

/**
 * Algorithme Double Gap Sequence - Standalone
 */
export function doubleGapSequenceAlgorithm(results: DrawResult[]): PredictionResult {
  if (results.length < 5) {
    const fallbackNumbers = generateDeterministicFallback(results);
    return {
      numbers: fallbackNumbers,
      confidence: 0.60,
      algorithm: "Double Gap Sequence",
      factors: ["Fallback dégradé - Données insuffisantes (min: 5)"],
      score: 0.5,
      category: "statistical",
    };
  }

  const scores = calculateDoubleGapSequence(results);
  const sortedNumbers = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  const prediction = selectBalancedNumbers(sortedNumbers.slice(0, 15), 5);

  // Calcule de la confiance moyenne sur les numéros sélectionnés
  const avgScore = prediction.reduce((sum, num) => sum + (scores.get(num) || 0), 0) / 5;
  const confidence = Math.max(0.70, Math.min(0.95, 0.70 + avgScore * 0.25));

  return {
    numbers: prediction,
    confidence,
    algorithm: "Double Gap Sequence",
    factors: [
      "Vitesse de variation d'écart",
      "Accélération du momentum d'écart",
      "Projection gaussienne de second ordre"
    ],
    score: confidence * 0.88,
    category: "statistical",
  };
}

/**
 * Algorithme Gap Cadence - Standalone
 */
export function gapCadenceAlgorithm(results: DrawResult[]): PredictionResult {
  if (results.length < 5) {
    const fallbackNumbers = generateDeterministicFallback(results);
    return {
      numbers: fallbackNumbers,
      confidence: 0.60,
      algorithm: "Gap Cadence",
      factors: ["Fallback dégradé - Données insuffisantes (min: 5)"],
      score: 0.5,
      category: "statistical",
    };
  }

  const scores = calculateGapCadenceMorphology(results);
  const sortedNumbers = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  const prediction = selectBalancedNumbers(sortedNumbers.slice(0, 15), 5);

  // Calcule de la confiance moyenne sur les numéros sélectionnés
  const avgScore = prediction.reduce((sum, num) => sum + (scores.get(num) || 0), 0) / 5;
  const confidence = Math.max(0.68, Math.min(0.92, 0.68 + avgScore * 0.24));

  return {
    numbers: prediction,
    confidence,
    algorithm: "Gap Cadence",
    factors: [
      "Périodicité rythmique des écarts",
      "Cohérence de la morphologie d'écart",
      "Projection de phase d'apparition"
    ],
    score: confidence * 0.85,
    category: "statistical",
  };
}

/**
 * Calcule les scores de Récurrence Saisonnière (Lags)
 */
export function calculateSeasonalRecurrence(results: DrawResult[]): Map<number, number> {
  const scores = new Map<number, number>();
  
  if (results.length < 30) {
    for (let i = 1; i <= 90; i++) scores.set(i, 0);
    return scores;
  }
  
  const byMonth = new Map<number, Set<number>>();
  for (const draw of results) {
    const numbers = draw.winning_numbers;
    if (!numbers || numbers.length === 0) continue;
    
    const dateStr = draw.draw_date || ('date' in draw ? String(draw.date) : null);
    if (!dateStr) continue;
    
    const match = /^(\d{4})-(\d{2})/.exec(dateStr);
    if (!match) continue;
    
    const idx = Number(match[1]) * 12 + (Number(match[2]) - 1);
    let entry = byMonth.get(idx);
    if (!entry) {
      entry = new Set<number>();
      byMonth.set(idx, entry);
    }
    for (const n of numbers) entry.add(n);
  }
  
  let maxMonthIdx = -1;
  for (const idx of byMonth.keys()) {
    if (idx > maxMonthIdx) maxMonthIdx = idx;
  }
  
  const lagsToTest = [1, 2, 3, 4, 5, 6, 11, 12, 13, 24]; // Expanded lags
  const lagScores = new Map<number, number>();
  
  for (const lag of lagsToTest) {
    let overlapSum = 0;
    let weightSum = 0;
    
    for (const [idx, targetSet] of byMonth.entries()) {
      const sourceSet = byMonth.get(idx - lag);
      if (sourceSet) {
        let hits = 0;
        for (const n of targetSet) {
          if (sourceSet.has(n)) hits++;
        }
        
        // Weight recent months more heavily
        const recencyWeight = Math.exp((idx - maxMonthIdx) / 12); 
        overlapSum += (hits / targetSet.size) * recencyWeight;
        weightSum += recencyWeight;
      }
    }
    
    if (weightSum > 0) {
      lagScores.set(lag, overlapSum / weightSum);
    }
  }
  
  const bestLags = Array.from(lagScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3); // Top 3 lags instead of 2
    
  for (let n = 1; n <= 90; n++) {
    let numScore = 0;
    for (const [lag, overlapWeight] of bestLags) {
      const sourceSet = byMonth.get(maxMonthIdx - lag);
      if (sourceSet && sourceSet.has(n)) {
        numScore += overlapWeight;
      }
    }
    scores.set(n, numScore);
  }
  
  return scores;
}

/**
 * Algorithme Seasonal Recurrence (Récurrence Saisonnière Mensuelle)
 */
export function seasonalRecurrenceAlgorithm(results: DrawResult[]): PredictionResult {
  if (results.length < 30) {
    const fallbackNumbers = generateDeterministicFallback(results);
    return {
      numbers: fallbackNumbers,
      confidence: 0.60,
      algorithm: "Seasonal Recurrence",
      factors: ["Fallback dégradé - Données insuffisantes (min: 30)"],
      score: 0.5,
      category: "statistical",
    };
  }

  const scores = calculateSeasonalRecurrence(results);

  const sortedNumbers = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  const prediction = selectBalancedNumbers(sortedNumbers.slice(0, 15), 5);
  
  const avgScore = prediction.reduce((sum, num) => sum + (scores.get(num) || 0), 0) / 5;
  const confidence = Math.max(0.65, Math.min(0.88, 0.65 + avgScore * 0.5));

  return {
    numbers: prediction,
    confidence,
    algorithm: "Seasonal Recurrence",
    factors: [
      "Tests de permutations mensuelles (Lags)",
      "Résonance inter-mois historique",
      "Évaluation du recouvrement du pool"
    ],
    score: confidence * 0.85,
    category: "statistical",
  };
}
