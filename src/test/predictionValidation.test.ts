import { describe, it, expect } from 'vitest';
import { validateAndCleanPredictions, CleanPrediction } from '../utils/predictionValidation';

describe('Unified Prediction Validation & Sanitization', () => {
  it('should pass-through fully valid predictions intact and sorted', () => {
    const raw: any[] = [
      {
        numbers: [42, 12, 85, 3, 56],
        confidence: 85,
        algorithm: 'FrequencyPro',
        factors: ['High recency'],
        score: 0.95,
        category: 'statistical'
      }
    ];

    const result = validateAndCleanPredictions<CleanPrediction>(raw);
    expect(result).toHaveLength(1);
    expect(result[0].numbers).toEqual([3, 12, 42, 56, 85]); // Correctly sorted
    expect(result[0].confidence).toBe(85);
    expect(result[0].score).toBe(0.95);
  });

  it('should ignore predictions with less than 5 numbers', () => {
    const raw: any[] = [
      {
        numbers: [3, 12, 42],
        confidence: 80,
        algorithm: 'XGBoost',
        factors: [],
        score: 0.8,
        category: 'ensemble'
      }
    ];

    const result = validateAndCleanPredictions<CleanPrediction>(raw);
    expect(result).toHaveLength(0); // Ignored
  });

  it('should ignore predictions with more than 5 numbers', () => {
    const raw: any[] = [
      {
        numbers: [1, 2, 3, 4, 5, 6],
        confidence: 80,
        algorithm: 'XGBoost',
        factors: [],
        score: 0.8,
        category: 'ensemble'
      }
    ];

    const result = validateAndCleanPredictions<CleanPrediction>(raw);
    expect(result).toHaveLength(0); // Ignored
  });

  it('should filter out duplicate numbers and reject if count becomes invalid', () => {
    const raw: any[] = [
      {
        numbers: [10, 10, 20, 30, 40], // only 4 unique numbers
        confidence: 70,
        algorithm: 'LSTM',
        factors: [],
        score: 0.5,
        category: 'deep-learning'
      },
      {
        numbers: [10, 10, 20, 30, 40, 50], // 5 unique numbers (10, 20, 30, 40, 50) after duplicates removed
        confidence: 70,
        algorithm: 'LSTM',
        factors: [],
        score: 0.5,
        category: 'deep-learning'
      }
    ];

    const result = validateAndCleanPredictions<CleanPrediction>(raw);
    expect(result).toHaveLength(1); // Second one is valid after de-duplication
    expect(result[0].numbers).toEqual([10, 20, 30, 40, 50]);
  });

  it('should clamp out-of-bounds confidence values', () => {
    const raw: any[] = [
      {
        numbers: [1, 2, 3, 4, 5],
        confidence: 150, // Out of bounds
        algorithm: 'Transformer',
        factors: [],
        score: 0.9,
        category: 'deep-learning'
      },
      {
        numbers: [11, 12, 13, 14, 15],
        confidence: -20, // Out of bounds
        algorithm: 'Transformer',
        factors: [],
        score: 0.9,
        category: 'deep-learning'
      }
    ];

    const result = validateAndCleanPredictions<CleanPrediction>(raw);
    expect(result).toHaveLength(2);
    expect(result[0].confidence).toBe(100); // Clamped to 100
    expect(result[1].confidence).toBe(0);   // Clamped to 0
  });

  it('should filter out numbers outside 1-90', () => {
    const raw: any[] = [
      {
        numbers: [0, 2, 3, 4, 91], // 0 and 91 are invalid
        confidence: 80,
        algorithm: 'Arbres Heuristiques',
        factors: [],
        score: 0.7,
        category: 'ensemble'
      }
    ];

    const result = validateAndCleanPredictions<CleanPrediction>(raw);
    expect(result).toHaveLength(0); // Should be ignored because after filtering, valid numbers length is 3 (not 5)
  });

  it('should handle non-integer numbers by flooring them', () => {
    const raw: any[] = [
      {
        numbers: [1.2, 5.8, 12.0, 45.4, 89.9],
        confidence: 80,
        algorithm: 'Stochastics',
        factors: [],
        score: 0.7,
        category: 'statistical'
      }
    ];

    const result = validateAndCleanPredictions<CleanPrediction>(raw);
    expect(result).toHaveLength(1);
    expect(result[0].numbers).toEqual([1, 5, 12, 45, 89]);
  });
});
