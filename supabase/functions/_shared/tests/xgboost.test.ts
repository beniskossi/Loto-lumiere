import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { xgboostAlgorithm } from "../xgboost.ts";
import type { DrawResult } from "../types.ts";

function generateMockDrawResults(count: number): DrawResult[] {
  const results: DrawResult[] = [];
  const baseDate = new Date("2024-01-01");
  
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    results.push({
      draw_name: "Test Draw",
      draw_date: date.toISOString().split('T')[0],
      winning_numbers: [
        10 + (i % 5),
        20 + (i % 5),
        30 + (i % 5),
        40 + (i % 5),
        50 + (i % 5),
      ].sort((a, b) => a - b),
    });
  }
  
  return results;
}

Deno.test("XGBoost Algorithm - Sufficient Data", () => {
  const mockResults = generateMockDrawResults(200);
  const prediction = xgboostAlgorithm(mockResults);
  
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
  assertEquals(prediction.algorithm, "XGBoost");
  assertEquals(prediction.category, "xgboost");
  
  // Verify XGBoost-specific factors
  assertEquals(prediction.factors.some(f => f.includes("trees")), true);
  assertEquals(prediction.factors.some(f => f.includes("L2")), true);
  assertEquals(prediction.factors.some(f => f.includes("Regularized")), true);
});

Deno.test("XGBoost Algorithm - Insufficient Data", () => {
  const mockResults = generateMockDrawResults(5);
  const prediction = xgboostAlgorithm(mockResults);
  
  assertEquals(prediction.algorithm.includes("Données Insuffisantes"), true);
  assertEquals(prediction.confidence, 0.2);
});

Deno.test("XGBoost Algorithm - Gradient Boosting Convergence", () => {
  const mockResults = generateMockDrawResults(150);
  const prediction = xgboostAlgorithm(mockResults);
  
  // Should have high confidence with sufficient data
  assertEquals(prediction.confidence >= 0.8, true);
  assertEquals(prediction.score >= 0.7, true);
});

Deno.test("XGBoost Algorithm - Feature Engineering", () => {
  // Create a dataset with clear patterns
  const mockResults: DrawResult[] = [];
  const baseDate = new Date("2024-01-01");
  
  for (let i = 0; i < 100; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    // Pattern: numbers increment every 10 draws
    const base = Math.floor(i / 10) * 5;
    mockResults.push({
      draw_name: "Test Draw",
      draw_date: date.toISOString().split('T')[0],
      winning_numbers: [
        base + 1,
        base + 2,
        base + 3,
        base + 4,
        base + 5,
      ].map(n => Math.min(90, n)).sort((a, b) => a - b),
    });
  }
  
  const prediction = xgboostAlgorithm(mockResults);
  
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
  // Should detect the pattern and adjust predictions
  assertEquals(prediction.confidence > 0.5, true);
});
