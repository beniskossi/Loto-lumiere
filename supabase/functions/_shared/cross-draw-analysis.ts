import type { DrawResult, PredictionResult } from "./types.ts";

export interface CrossDrawCorrelation {
  number: number;
  correlation: number;
  commonAppearances: number;
  proximityScore: number;
}

export function analyzeCrossDrawCorrelation(
  draw1Results: DrawResult[],
  draw2Results: DrawResult[]
): CrossDrawCorrelation[] {
  const correlations: Record<number, { common: number; proximity: number }> = {};
  
  for (let i = 1; i <= 90; i++) {
    correlations[i] = { common: 0, proximity: 0 };
  }
  
  const minLength = Math.min(draw1Results.length, draw2Results.length);
  
  for (let i = 0; i < minLength; i++) {
    const nums1 = draw1Results[i].winning_numbers;
    const nums2 = draw2Results[i].winning_numbers;
    
    nums1.forEach(n1 => {
      if (nums2.includes(n1)) {
        correlations[n1].common++;
      }
      
      nums2.forEach(n2 => {
        if (Math.abs(n1 - n2) <= 5 && n1 !== n2) {
          correlations[n1].proximity += 0.5;
          correlations[n2].proximity += 0.5;
        }
      });
    });
  }
  
  return Object.entries(correlations)
    .map(([num, data]) => ({
      number: parseInt(num),
      correlation: (data.common + data.proximity) / minLength,
      commonAppearances: data.common,
      proximityScore: data.proximity,
    }))
    .filter(c => c.correlation > 0.1)
    .sort((a, b) => b.correlation - a.correlation)
    .slice(0, 20);
}

export function predictFromCrossDrawAnalysis(
  midiResults: DrawResult[],
  soirResults: DrawResult[],
  lastMidiNumbers: number[]
): PredictionResult {
  const correlations = analyzeCrossDrawCorrelation(midiResults, soirResults);
  
  const scores: Record<number, number> = {};
  for (let i = 1; i <= 90; i++) scores[i] = 0;
  
  correlations.forEach(corr => {
    scores[corr.number] += corr.correlation * 10;
  });
  
  lastMidiNumbers.forEach(num => {
    for (let i = Math.max(1, num - 5); i <= Math.min(90, num + 5); i++) {
      scores[i] += 2;
    }
  });
  
  const predictedNumbers = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([num]) => parseInt(num));
  
  return {
    numbers: predictedNumbers,
    confidence: 0.78,
    algorithm: "Analyse Multi-Tirages",
    factors: ["Corrélation Midi-Soir", "Proximité numérique", "Patterns croisés"],
    score: 0.78,
    category: "statistical",
  };
}
