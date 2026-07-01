import type { DrawResult, PredictionResult } from "./types.ts";

interface UserPreferences {
  favoriteNumbers: number[];
  trackedPatterns: number[][];
  successfulPredictions: number[];
}

export function generatePersonalizedPrediction(
  basePrediction: PredictionResult,
  userPrefs: UserPreferences,
  blendRatio: number = 0.7
): PredictionResult {
  const scores: Record<number, number> = {};
  for (let i = 1; i <= 90; i++) scores[i] = 0;
  
  basePrediction.numbers.forEach((num, idx) => {
    scores[num] += (5 - idx) * blendRatio;
  });
  
  userPrefs.favoriteNumbers.forEach(num => {
    scores[num] += (1 - blendRatio) * 2;
  });
  
  userPrefs.successfulPredictions.forEach(num => {
    scores[num] += (1 - blendRatio) * 1.5;
  });
  
  const personalizedNumbers = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([num]) => parseInt(num));
  
  return {
    ...basePrediction,
    numbers: personalizedNumbers,
    algorithm: `${basePrediction.algorithm} (Personnalisé)`,
    factors: [...basePrediction.factors, "Préférences utilisateur"],
    confidence: basePrediction.confidence * 0.95,
  };
}

export function analyzeUserPatterns(
  favorites: any[],
  tracked: any[]
): UserPreferences {
  const favoriteNumbers = favorites.flatMap(f => f.favorite_numbers || []);
  const trackedPatterns = tracked.map(t => t.predictions?.predicted_numbers || []);
  
  const successCounts: Record<number, number> = {};
  trackedPatterns.forEach(pattern => {
    pattern.forEach((num: number) => {
      successCounts[num] = (successCounts[num] || 0) + 1;
    });
  });
  
  const successfulPredictions = Object.entries(successCounts)
    .filter(([, count]) => count >= 2)
    .map(([num]) => parseInt(num));
  
  return {
    favoriteNumbers: Array.from(new Set(favoriteNumbers)),
    trackedPatterns,
    successfulPredictions,
  };
}
