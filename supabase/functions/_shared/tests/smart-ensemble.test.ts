import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { SmartEnsemble, smartEnsemble } from "../smart-ensemble.ts";
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
        5 + (i % 15),
        20 + (i % 15),
        35 + (i % 15),
        50 + (i % 15),
        65 + (i % 15),
      ].map(n => Math.min(90, Math.max(1, n))).sort((a, b) => a - b),
    });
  }
  
  return results;
}

// ============= BASIC FUNCTIONALITY =============

Deno.test("SmartEnsemble - Insufficient Data Returns Fallback", async () => {
  const ensemble = new SmartEnsemble();
  const mockResults = generateMockDrawResults(3);
  const prediction = await ensemble.generateEnsemblePrediction(mockResults);
  
  assertEquals(prediction.algorithm.includes("Données Insuffisantes"), true);
  assertEquals(prediction.confidence, 0.2);
  assertEquals(prediction.numbers.length, 5);
});

Deno.test("SmartEnsemble - Minimum Data (5 draws) Runs At Least 1 Algorithm", async () => {
  const ensemble = new SmartEnsemble();
  const mockResults = generateMockDrawResults(10);
  const prediction = await ensemble.generateEnsemblePrediction(mockResults);
  
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
  assertEquals(prediction.algorithm.includes("Modèles"), true);
  assertEquals(prediction.confidence > 0.2, true);
});

Deno.test("SmartEnsemble - Medium Data (100 draws) Runs Multiple Algorithms", async () => {
  const ensemble = new SmartEnsemble();
  const mockResults = generateMockDrawResults(100);
  const prediction = await ensemble.generateEnsemblePrediction(mockResults);
  
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
  // Should run FrequencyPro, Arbres Heuristiques, LSTM, Double Gap, Gap Cadence (5 algorithms)
  assertEquals(prediction.algorithm.includes("5/6 Modèles"), true);
  assertEquals(prediction.confidence >= 0.5, true);
});

Deno.test("SmartEnsemble - Large Data (400 draws) Runs All 5 Algorithms", async () => {
  const ensemble = new SmartEnsemble();
  const mockResults = generateMockDrawResults(400);
  const prediction = await ensemble.generateEnsemblePrediction(mockResults);
  
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
  // Should run all 6 algorithms
  assertEquals(prediction.algorithm.includes("6/6 Modèles"), true);
  assertEquals(prediction.confidence >= 0.7, true);
});

// ============= PREDICTION QUALITY =============

Deno.test("SmartEnsemble - Predictions Are Valid Numbers", async () => {
  const ensemble = new SmartEnsemble();
  const mockResults = generateMockDrawResults(150);
  const prediction = await ensemble.generateEnsemblePrediction(mockResults);
  
  prediction.numbers.forEach(n => {
    assertEquals(n >= 1 && n <= 90, true, `Number ${n} should be between 1 and 90`);
  });
  
  // Check uniqueness
  const uniqueNumbers = new Set(prediction.numbers);
  assertEquals(uniqueNumbers.size, 5, "All 5 numbers should be unique");
});

Deno.test("SmartEnsemble - Predictions Are Sorted", async () => {
  const ensemble = new SmartEnsemble();
  const mockResults = generateMockDrawResults(100);
  const prediction = await ensemble.generateEnsemblePrediction(mockResults);
  
  for (let i = 1; i < prediction.numbers.length; i++) {
    assertEquals(
      prediction.numbers[i] > prediction.numbers[i - 1],
      true,
      "Numbers should be sorted ascending"
    );
  }
});

Deno.test("SmartEnsemble - Confidence Is Within Valid Range", async () => {
  const ensemble = new SmartEnsemble();
  const mockResults = generateMockDrawResults(200);
  const prediction = await ensemble.generateEnsemblePrediction(mockResults);
  
  assertEquals(prediction.confidence >= 0, true);
  assertEquals(prediction.confidence <= 1, true);
});

// ============= WEIGHT MANAGEMENT =============

Deno.test("SmartEnsemble - Initial Weights Sum To 1", () => {
  const ensemble = new SmartEnsemble();
  const weights = ensemble.getModelWeights();
  
  let totalWeight = 0;
  weights.forEach(w => {
    totalWeight += w.weight;
  });
  
  // Allow small floating point error
  assertEquals(Math.abs(totalWeight - 1) < 0.001, true);
});

Deno.test("SmartEnsemble - Has All Model Weights", () => {
  const ensemble = new SmartEnsemble();
  const weights = ensemble.getModelWeights();
  
  assertEquals(weights.size, 6);
  assertEquals(weights.has("FrequencyPro"), true);
  assertEquals(weights.has("Arbres Heuristiques"), true);
  assertEquals(weights.has("LSTM"), true);
  assertEquals(weights.has("Transformer"), true);
  assertEquals(weights.has("Double Gap Sequence"), true);
  assertEquals(weights.has("Gap Cadence"), true);
});

Deno.test("SmartEnsemble - Reset Weights Works", async () => {
  const ensemble = new SmartEnsemble();
  const mockResults = generateMockDrawResults(100);
  
  // Generate predictions to modify weights
  await ensemble.generateEnsemblePrediction(mockResults);
  
  // Reset
  ensemble.resetWeights();
  
  const weights = ensemble.getModelWeights();
  
  // Check that weights are reset to initial values
  const freqWeight = weights.get("FrequencyPro");
  assertExists(freqWeight);
  assertEquals(freqWeight.recentPerformance, 0.5);
  assertEquals(freqWeight.stability, 1.0);
});

// ============= PERFORMANCE TRACKING =============

Deno.test("SmartEnsemble - Performance History Is Tracked", async () => {
  const ensemble = new SmartEnsemble();
  const mockResults = generateMockDrawResults(100);
  
  await ensemble.generateEnsemblePrediction(mockResults);
  
  const history = ensemble.getPerformanceHistory();
  
  // At least one model should have performance history
  let hasHistory = false;
  history.forEach(h => {
    if (h.length > 0) hasHistory = true;
  });
  assertEquals(hasHistory, true);
});

Deno.test("SmartEnsemble - Update Performance Works", () => {
  const ensemble = new SmartEnsemble();
  
  ensemble.updatePerformance("FrequencyPro", 3);
  
  const history = ensemble.getPerformanceHistory();
  const freqHistory = history.get("FrequencyPro");
  
  assertExists(freqHistory);
  assertEquals(freqHistory.length, 1);
  assertEquals(freqHistory[0], 0.6); // 3/5 = 0.6
});

// ============= ENSEMBLE STATS =============

Deno.test("SmartEnsemble - Get Ensemble Stats", () => {
  const ensemble = new SmartEnsemble();
  const stats = ensemble.getEnsembleStats();
  
  assertEquals(stats.totalModels, 6);
  assertEquals(stats.activeModels.length, 6);
  assertEquals(stats.averageWeight > 0, true);
  assertEquals(stats.averageStability > 0, true);
});

// ============= GLOBAL INSTANCE =============

Deno.test("SmartEnsemble - Global Instance Works", async () => {
  const mockResults = generateMockDrawResults(50);
  const prediction = await smartEnsemble.generateEnsemblePrediction(mockResults);
  
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
});

// ============= EXECUTION TIME =============

Deno.test("SmartEnsemble - Execution Time Is Reasonable", async () => {
  const ensemble = new SmartEnsemble();
  const mockResults = generateMockDrawResults(200);
  
  const startTime = Date.now();
  await ensemble.generateEnsemblePrediction(mockResults);
  const executionTime = Date.now() - startTime;
  
  // Should complete within 10 seconds
  assertEquals(executionTime < 10000, true, `Execution took ${executionTime}ms, should be under 10s`);
});

// ============= CONSISTENCY =============

Deno.test("SmartEnsemble - Same Input Produces Consistent Output Structure", async () => {
  const ensemble = new SmartEnsemble();
  const mockResults = generateMockDrawResults(100);
  
  const pred1 = await ensemble.generateEnsemblePrediction(mockResults);
  const pred2 = await ensemble.generateEnsemblePrediction(mockResults);
  
  // Structure should be consistent
  assertEquals(pred1.numbers.length, pred2.numbers.length);
  assertEquals(pred1.category, pred2.category);
  assertEquals(typeof pred1.confidence, typeof pred2.confidence);
  assertEquals(typeof pred1.score, typeof pred2.score);
});
