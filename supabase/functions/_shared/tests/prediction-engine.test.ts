import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generatePredictions, generateExplanations } from "../prediction-engine.ts";
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
        5 + (i % 20),
        25 + (i % 20),
        45 + (i % 20),
        65 + (i % 20),
        85,
      ].sort((a, b) => a - b),
    });
  }
  
  return results;
}

Deno.test("Prediction Engine - Single Algorithm Mode", async () => {
  const mockResults = generateMockDrawResults(100);
  const result = await generatePredictions(mockResults, {
    drawName: "Test Draw",
    multiAlgorithm: false,
  });
  
  assertExists(result);
  assertExists(result.selectedAlgorithm);
  assertExists(result.algorithmReason);
  assertEquals(result.predictions.length, 1);
  assertExists(result.optimizedPrediction);
  
  // Verify data metrics
  assertEquals(result.dataMetrics.historicalCount, 100);
  assertEquals(result.dataMetrics.quality >= 0 && result.dataMetrics.quality <= 1, true);
  assertEquals(result.dataMetrics.freshness >= 0 && result.dataMetrics.freshness <= 1, true);
});

Deno.test("Prediction Engine - Multi Algorithm Mode", async () => {
  const mockResults = generateMockDrawResults(200);
  const result = await generatePredictions(mockResults, {
    drawName: "Test Draw",
    multiAlgorithm: true,
  });
  
  assertExists(result);
  assertEquals(result.predictions.length >= 3, true, "Should execute multiple algorithms");
  
  // Predictions should be sorted by score
  for (let i = 1; i < result.predictions.length; i++) {
    assertEquals(
      result.predictions[i].score <= result.predictions[i - 1].score,
      true,
      "Predictions should be sorted by score descending"
    );
  }
});

Deno.test("Prediction Engine - Algorithm Selection Logic", async () => {
  // Test with different data volumes
  const smallDataset = generateMockDrawResults(30);
  const mediumDataset = generateMockDrawResults(100);
  const largeDataset = generateMockDrawResults(400);
  
  const smallResult = await generatePredictions(smallDataset, { multiAlgorithm: false });
  const mediumResult = await generatePredictions(mediumDataset, { multiAlgorithm: false });
  const largeResult = await generatePredictions(largeDataset, { multiAlgorithm: false });
  
  // Small dataset should use FrequencyPro
  assertEquals(
    smallResult.selectedAlgorithm === "FrequencyPro",
    true,
    "Small dataset should select FrequencyPro"
  );
  
  // Medium dataset should use more advanced algorithms
  assertEquals(
    ["LSTM", "RandomForest", "FrequencyPro"].includes(mediumResult.selectedAlgorithm),
    true
  );
  
  // Large dataset should use Transformer
  assertEquals(
    ["Transformer", "StackingEnsemble"].includes(largeResult.selectedAlgorithm),
    true
  );
});

Deno.test("Prediction Engine - Stacking Ensemble Selection", async () => {
  const mockResults = generateMockDrawResults(200);
  const result = await generatePredictions(mockResults, {
    drawName: "Etoile", // Tirage avec numéros machine
    useStackingEnsemble: true,
  });
  
  assertEquals(result.selectedAlgorithm, "StackingEnsemble");
});

Deno.test("Prediction Engine - Data Quality Impact", async () => {
  // Create high quality data (recent, complete)
  const highQualityData = generateMockDrawResults(100);
  
  // Create low quality data (old, sparse)
  const lowQualityData: DrawResult[] = [];
  const oldDate = new Date("2020-01-01");
  for (let i = 0; i < 50; i++) {
    const date = new Date(oldDate);
    date.setDate(date.getDate() + i * 10); // Sparse data
    lowQualityData.push({
      draw_name: "Test Draw",
      draw_date: date.toISOString().split('T')[0],
      winning_numbers: [1, 2, 3, 4, 5],
    });
  }
  
  const highQualityResult = await generatePredictions(highQualityData);
  const lowQualityResult = await generatePredictions(lowQualityData);
  
  // High quality should have better metrics
  assertEquals(
    highQualityResult.dataMetrics.quality > lowQualityResult.dataMetrics.quality,
    true
  );
  assertEquals(
    highQualityResult.dataMetrics.freshness > lowQualityResult.dataMetrics.freshness,
    true
  );
});

Deno.test("Prediction Engine - Generate Explanations", async () => {
  const mockResults = generateMockDrawResults(150);
  const result = await generatePredictions(mockResults);
  
  const explanations = generateExplanations(result, mockResults);
  
  assertExists(explanations.summary);
  assertExists(explanations.strengths);
  assertExists(explanations.weaknesses);
  assertExists(explanations.recommendation);
  assertExists(explanations.algorithmInfo);
  
  assertEquals(explanations.strengths.length > 0, true);
  assertEquals(typeof explanations.summary, "string");
});

Deno.test("Prediction Engine - Execution Time Tracking", async () => {
  const mockResults = generateMockDrawResults(100);
  const result = await generatePredictions(mockResults);
  
  assertExists(result.executionTime);
  assertEquals(result.executionTime > 0, true);
  assertEquals(result.executionTime < 10000, true, "Should execute within 10 seconds");
});

// ============= SMART ENSEMBLE INTEGRATION TESTS =============

Deno.test("Prediction Engine - Smart Ensemble Mode", async () => {
  const mockResults = generateMockDrawResults(150);
  const result = await generatePredictions(mockResults, {
    drawName: "Test Draw",
    useSmartEnsemble: true,
  });
  
  assertExists(result);
  assertExists(result.optimizedPrediction);
  assertEquals(result.optimizedPrediction.numbers.length, 5);
  assertEquals(result.optimizedPrediction.category, "ensemble");
  assertEquals(result.optimizedPrediction.algorithm.includes("Smart Ensemble"), true);
});

Deno.test("Prediction Engine - Smart Ensemble With Multi-Algorithm", async () => {
  const mockResults = generateMockDrawResults(100);
  const result = await generatePredictions(mockResults, {
    drawName: "Test Draw",
    useSmartEnsemble: true,
    multiAlgorithm: true,
  });
  
  assertExists(result);
  // Should have multiple predictions including Smart Ensemble
  assertEquals(result.predictions.length >= 2, true);
  
  // Smart Ensemble should be in the predictions
  const hasSmartEnsemble = result.predictions.some(p => 
    p.algorithm.includes("Smart Ensemble")
  );
  assertEquals(hasSmartEnsemble, true);
});

Deno.test("Prediction Engine - Smart Ensemble vs Stacking Comparison", async () => {
  const mockResults = generateMockDrawResults(200);
  
  const stackingResult = await generatePredictions(mockResults, {
    useStackingEnsemble: true,
  });
  
  const smartResult = await generatePredictions(mockResults, {
    useSmartEnsemble: true,
  });
  
  // Both should produce valid predictions
  assertEquals(stackingResult.optimizedPrediction.numbers.length, 5);
  assertEquals(smartResult.optimizedPrediction.numbers.length, 5);
  
  // Both should have ensemble category
  assertEquals(stackingResult.optimizedPrediction.category, "ensemble");
  assertEquals(smartResult.optimizedPrediction.category, "ensemble");
  
  // Algorithms should be different
  assertEquals(
    stackingResult.optimizedPrediction.algorithm !== smartResult.optimizedPrediction.algorithm,
    true
  );
});

Deno.test("Prediction Engine - Smart Ensemble Handles Small Data", async () => {
  const smallDataset = generateMockDrawResults(20);
  const result = await generatePredictions(smallDataset, {
    useSmartEnsemble: true,
  });
  
  assertExists(result);
  assertEquals(result.optimizedPrediction.numbers.length, 5);
  // Should still work with small data (runs fewer algorithms)
  assertEquals(result.optimizedPrediction.confidence > 0, true);
});

Deno.test("Prediction Engine - Smart Ensemble Handles Large Data", async () => {
  const largeDataset = generateMockDrawResults(400);
  const result = await generatePredictions(largeDataset, {
    useSmartEnsemble: true,
  });
  
  assertExists(result);
  assertEquals(result.optimizedPrediction.numbers.length, 5);
  // Should run all 6 algorithms with large data
  assertEquals(result.optimizedPrediction.algorithm.includes("6/6"), true);
  assertEquals(result.optimizedPrediction.confidence >= 0.7, true);
});
