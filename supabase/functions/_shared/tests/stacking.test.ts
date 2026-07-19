import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { stackingEnsemble } from "../stacking.ts";
import type { DrawResult } from "../types.ts";

function generateMockDrawResults(count: number): DrawResult[] {
  const results: DrawResult[] = [];
  const baseDate = new Date("2024-01-01");
  
  // LCG for deterministic test data
  let seed = 123456789;
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

Deno.test("Ensemble Hybride Stacking - Sufficient Data", () => {
  const mockResults = generateMockDrawResults(100);
  const prediction = stackingEnsemble(mockResults);
  
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
  assertEquals(prediction.algorithm, "Ensemble Hybride Stacking");
  assertEquals(prediction.category, "ensemble");
  
  // Verify ensemble-specific factors
  assertEquals(prediction.factors.some(f => f.includes("modèles L1")), true);
  assertEquals(prediction.factors.some(f => f.includes("Meta-learner")), true);
});

Deno.test("Ensemble Hybride Stacking - Insufficient Data", () => {
  const mockResults = generateMockDrawResults(5);
  const prediction = stackingEnsemble(mockResults);
  
  assertEquals(prediction.algorithm.includes("Données Insuffisantes"), true);
  assertEquals(prediction.confidence, 0.2);
});

Deno.test("Ensemble Hybride Stacking - Higher Confidence than Base Models", () => {
  const mockResults = generateMockDrawResults(200);
  const prediction = stackingEnsemble(mockResults);
  
  // Stacking should have higher confidence due to ensemble
  assertEquals(prediction.confidence >= 0.85, true, "Ensemble should boost confidence");
  assertEquals(prediction.score >= 0.8, true);
});

Deno.test("Ensemble Hybride Stacking - Meta-Learner Optimization", () => {
  const mockResults = generateMockDrawResults(150);
  const prediction = stackingEnsemble(mockResults);
  
  // Meta-learner should optimize weights
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
  
  // Unique numbers
  const uniqueNumbers = new Set(prediction.numbers);
  assertEquals(uniqueNumbers.size, 5);
});

Deno.test("Ensemble Hybride Stacking - Execution Time", () => {
  const mockResults = generateMockDrawResults(100);
  
  const startTime = Date.now();
  stackingEnsemble(mockResults);
  const executionTime = Date.now() - startTime;
  
  // Should complete in reasonable time even with 5 models
  assertEquals(executionTime < 5000, true, "Should execute within 5 seconds");
});
