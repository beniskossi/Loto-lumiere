import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { frequencyProAlgorithm, randomForestAlgorithm, lstmAlgorithm } from "../algorithms.ts";
import type { DrawResult } from "../types.ts";

// Mock data generator
function generateMockDrawResults(count: number): DrawResult[] {
  const results: DrawResult[] = [];
  const baseDate = new Date("2024-01-01");
  
  // LCG for deterministic test data
  let seed = 987654321;
  const lcg = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    results.push({
      draw_name: "Test Draw",
      draw_date: date.toISOString().split('T')[0],
      winning_numbers: [
        Math.floor(lcg() * 90) + 1,
        Math.floor(lcg() * 90) + 1,
        Math.floor(lcg() * 90) + 1,
        Math.floor(lcg() * 90) + 1,
        Math.floor(lcg() * 90) + 1,
      ].sort((a, b) => a - b),
    });
  }
  
  return results;
}

Deno.test("FrequencyPro Algorithm - Sufficient Data", () => {
  const mockResults = generateMockDrawResults(50);
  const prediction = frequencyProAlgorithm(mockResults);
  
  // Verify prediction structure
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
  assertEquals(prediction.algorithm, "FrequencyPro");
  assertEquals(prediction.category, "statistical");
  
  // Verify numbers are valid (1-90, unique, sorted)
  prediction.numbers.forEach((num, idx) => {
    assertEquals(num >= 1 && num <= 90, true, `Number ${num} should be between 1 and 90`);
    if (idx > 0) {
      assertEquals(num > prediction.numbers[idx - 1], true, "Numbers should be sorted");
    }
  });
  
  // Verify confidence is reasonable
  assertEquals(prediction.confidence > 0 && prediction.confidence <= 1, true);
  assertEquals(prediction.score > 0 && prediction.score <= 1, true);
});

Deno.test("FrequencyPro Algorithm - Insufficient Data", () => {
  const mockResults = generateMockDrawResults(3);
  const prediction = frequencyProAlgorithm(mockResults);
  
  assertEquals(prediction.algorithm.includes("Données Insuffisantes"), true);
  assertEquals(prediction.confidence, 0.2);
});

Deno.test("Arbres Heuristiques Algorithm - Sufficient Data", () => {
  const mockResults = generateMockDrawResults(50);
  const prediction = randomForestAlgorithm(mockResults);
  
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
  assertEquals(prediction.algorithm, "Arbres Heuristiques");
  assertEquals(prediction.category, "forest");
  
  // Verify factors include expected elements
  assertEquals(prediction.factors.some(f => f.includes("arbres")), true);
  assertEquals(prediction.factors.some(f => f.includes("Bootstrap")), true);
});

Deno.test("LSTM Algorithm - Sufficient Data", () => {
  const mockResults = generateMockDrawResults(50);
  const prediction = lstmAlgorithm(mockResults);
  
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
  assertEquals(prediction.algorithm, "Séquences Récurrentes");
  assertEquals(prediction.category, "transformer");
  
  // Verify factors include LSTM-specific elements
  assertEquals(prediction.factors.some(f => f.includes("Récurrent")), true);
  assertEquals(prediction.factors.some(f => f.includes("states")), true);
});

Deno.test("Algorithms - Numbers Uniqueness", () => {
  const mockResults = generateMockDrawResults(50);
  const algorithms = [
    frequencyProAlgorithm,
    randomForestAlgorithm,
    lstmAlgorithm,
  ];
  
  algorithms.forEach(algo => {
    const prediction = algo(mockResults);
    const uniqueNumbers = new Set(prediction.numbers);
    assertEquals(
      uniqueNumbers.size,
      5,
      `${prediction.algorithm} should generate 5 unique numbers`
    );
  });
});

Deno.test("Algorithms - Performance Under Load", () => {
  const mockResults = generateMockDrawResults(500);
  
  const startTime = Date.now();
  frequencyProAlgorithm(mockResults);
  const freqTime = Date.now() - startTime;
  
  // FrequencyPro should be fast even with large datasets
  assertEquals(freqTime < 1000, true, "FrequencyPro should execute in under 1 second");
});
