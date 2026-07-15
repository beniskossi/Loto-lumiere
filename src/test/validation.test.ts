import { describe, it, expect } from 'vitest';
import { LocalPredictionEngine } from '@/lib/algorithms/predictionEngine';
import { DrawResult } from '@/types/lottery';

// Helper to generate a mock draw result history
function generateMockHistory(count: number, customNumbersGenerator?: (index: number) => number[]): DrawResult[] {
  const history: DrawResult[] = [];
  const baseDate = new Date("2026-01-01");

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i); // Go backwards in time
    
    const winningNumbers = customNumbersGenerator
      ? customNumbersGenerator(i)
      : [
          1 + (i % 15),
          16 + (i % 15),
          31 + (i % 15),
          46 + (i % 15),
          61 + (i % 15),
        ].sort((a, b) => a - b);

    history.push({
      id: `mock-id-${i}`,
      drawName: "Etoile",
      drawTime: "13:00",
      drawDay: "Lundi",
      date: date.toISOString().split('T')[0],
      winningNumbers,
    });
  }

  return history;
}

describe('LOTO LUMIERE - Predictive Validation Suite', () => {
  const defaultOptions = {
    frequencyWeight: 35,
    gapWeight: 25,
    markovWeight: 20,
    momentumWeight: 20,
    decayRate: 0.02,
    markovOrder: 1,
    poissonLambda: 1.0,
    targetCount: 5,
  };

  // 1. DUPLICATES PREVENTION VALIDATION
  describe('Anti-Duplicates Validation', () => {
    it('should always return exactly 5 unique numbers in recommendations', () => {
      const history = generateMockHistory(100);
      const result = LocalPredictionEngine.calculatePredictions(history, defaultOptions);

      expect(result.recommendations).toHaveLength(5);
      
      const uniqueNumbers = new Set(result.recommendations);
      expect(uniqueNumbers.size).toBe(5);
    });

    it('should handle highly repetitive history containing duplicates and still output unique numbers', () => {
      // Create a degenerate history where all draws only have number 10 repeated (simulating bad input)
      const history = generateMockHistory(50, () => [10, 10, 10, 10, 10]);
      const result = LocalPredictionEngine.calculatePredictions(history, defaultOptions);

      expect(result.recommendations).toHaveLength(5);
      const uniqueNumbers = new Set(result.recommendations);
      expect(uniqueNumbers.size).toBe(5);
      
      // All values must be valid and non-overlapping
      result.recommendations.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(90);
      });
    });

    it('should maintain uniqueness even when there are fewer than 5 unique numbers across the entire history', () => {
      // Entire history only has number 12 and 24
      const history = generateMockHistory(20, () => [12, 12, 24, 24, 12]);
      const result = LocalPredictionEngine.calculatePredictions(history, defaultOptions);

      expect(result.recommendations).toHaveLength(5);
      const uniqueNumbers = new Set(result.recommendations);
      expect(uniqueNumbers.size).toBe(5);
    });
  });

  // 2. BOUNDARY & ANTI-HALLUCINATION VALIDATION
  describe('Boundary & Anti-Hallucination Validation', () => {
    it('should only recommend numbers strictly between 1 and 90', () => {
      const history = generateMockHistory(100);
      const result = LocalPredictionEngine.calculatePredictions(history, defaultOptions);

      result.recommendations.forEach((num) => {
        expect(Number.isInteger(num)).toBe(true);
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(90);
      });
    });

    it('should ignore out-of-bounds numbers in the historical inputs and maintain system stability', () => {
      // Historical data contains invalid numbers (0, 91, -5, NaN)
      const history = generateMockHistory(50, (i) => {
        if (i % 2 === 0) {
          return [0, 95, -10, 50, 60]; // invalid values
        }
        return [15, 25, 35, 45, 85];
      });

      const result = LocalPredictionEngine.calculatePredictions(history, defaultOptions);

      // Recommendations must still be 100% valid
      expect(result.recommendations).toHaveLength(5);
      result.recommendations.forEach((num) => {
        expect(Number.isInteger(num)).toBe(true);
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(90);
      });
    });

    it('should sort recommendations in ascending order for clean output presentation', () => {
      const history = generateMockHistory(100);
      const result = LocalPredictionEngine.calculatePredictions(history, defaultOptions);

      const sortedRecommendations = [...result.recommendations].sort((a, b) => a - b);
      expect(result.recommendations).toEqual(sortedRecommendations);
    });
  });

  // 3. ZERO / LOW DATA ROBUSTNESS
  describe('Zero & Low-Data Robustness', () => {
    it('should fallback gracefully to a standard valid set of unique numbers when history is empty', () => {
      const emptyHistory: DrawResult[] = [];
      const result = LocalPredictionEngine.calculatePredictions(emptyHistory, defaultOptions);

      expect(result.recommendations).toHaveLength(5);
      
      const uniqueNumbers = new Set(result.recommendations);
      expect(uniqueNumbers.size).toBe(5);

      result.recommendations.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(90);
      });

      expect(result.insights[0]).toContain("Aucune donnée historique");
    });

    it('should execute successfully and maintain mathematical consistency with only 1 historic draw', () => {
      const history = generateMockHistory(1);
      const result = LocalPredictionEngine.calculatePredictions(history, defaultOptions);

      expect(result.recommendations).toHaveLength(5);
      const uniqueNumbers = new Set(result.recommendations);
      expect(uniqueNumbers.size).toBe(5);
    });
  });

  // 4. DETERMINISM & ANTI-RANDOMNESS (Anti-Hasard / Pure Science)
  describe('Determinism & Anti-Randomness (Anti-Hasard)', () => {
    it('should be 100% deterministic and yield identical predictions across multiple runs with identical data', () => {
      const history = generateMockHistory(150);

      // Run 1
      const result1 = LocalPredictionEngine.calculatePredictions(history, defaultOptions);

      // Run 2
      const result2 = LocalPredictionEngine.calculatePredictions(history, defaultOptions);

      // Run 3
      const result3 = LocalPredictionEngine.calculatePredictions(history, defaultOptions);

      // Assert identical output
      expect(result1.recommendations).toEqual(result2.recommendations);
      expect(result2.recommendations).toEqual(result3.recommendations);

      // Assert identical scores for all 90 numbers
      expect(result1.scores).toEqual(result2.scores);
      expect(result2.scores).toEqual(result3.scores);

      // Assert identical insights
      expect(result1.insights).toEqual(result2.insights);
    });
  });

  // 5. EXPLICABILITY & EXPLAINABILITY (Anti-Hallucination of Weights/Scores)
  describe('Explainability & Score Consistency', () => {
    it('should assign a higher frequencyScore to numbers that appear more often in history', () => {
      // Generate a history where number 5 appears in every single draw, and number 88 never appears
      const history = generateMockHistory(50, (i) => {
        return [5, 10 + (i % 10), 30 + (i % 10), 50 + (i % 10), 70 + (i % 10)];
      });

      const result = LocalPredictionEngine.calculatePredictions(history, defaultOptions);

      const scoreNum5 = result.scores.find(s => s.number === 5);
      const scoreNum88 = result.scores.find(s => s.number === 88);

      expect(scoreNum5).toBeDefined();
      expect(scoreNum88).toBeDefined();

      // Number 5 must have a higher frequencyScore and combinedScore than Number 88
      expect(scoreNum5!.frequencyScore).toBeGreaterThan(scoreNum88!.frequencyScore);
      expect(scoreNum5!.combinedScore).toBeGreaterThan(scoreNum88!.combinedScore);
    });

    it('should accurately calculate current gaps and average gaps', () => {
      // Number 7 appears exactly in the most recent draw (index 0) and 4 draws ago (index 4)
      const history = generateMockHistory(10, (i) => {
        if (i === 0 || i === 4) {
          return [7, 20, 30, 40, 50];
        }
        return [11, 21, 31, 41, 51];
      });

      const result = LocalPredictionEngine.calculatePredictions(history, defaultOptions);
      const scoreNum7 = result.scores.find(s => s.number === 7);

      expect(scoreNum7).toBeDefined();
      // Current gap should be 0 because it appeared in the most recent draw
      expect(scoreNum7!.currentGap).toBe(0);
      
      // Average gap should reflect the distance between appearances
      expect(scoreNum7!.avgGap).toBeGreaterThan(0);
    });
  });
});
