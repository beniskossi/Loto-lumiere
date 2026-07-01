import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { transformerAlgorithm } from "../transformer.ts";
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
        5 + i % 10,
        15 + i % 10,
        25 + i % 10,
        35 + i % 10,
        45 + i % 10,
      ].sort((a, b) => a - b),
    });
  }
  
  return results;
}

Deno.test("Transformer Algorithm - Sufficient Data", () => {
  const mockResults = generateMockDrawResults(100);
  const prediction = transformerAlgorithm(mockResults);
  
  assertExists(prediction);
  assertEquals(prediction.numbers.length, 5);
  assertEquals(prediction.algorithm, "Transformer (Attention)");
  assertEquals(prediction.category, "transformer");
  
  // Verify attention mechanism factors
  assertEquals(prediction.factors.some(f => f.includes("attention heads")), true);
  assertEquals(prediction.factors.some(f => f.includes("Positional encoding")), true);
});

Deno.test("Transformer Algorithm - Insufficient Data", () => {
  const mockResults = generateMockDrawResults(5);
  const prediction = transformerAlgorithm(mockResults);
  
  assertEquals(prediction.algorithm.includes("Données Insuffisantes"), true);
  assertEquals(prediction.confidence, 0.2);
});

Deno.test("Transformer Algorithm - High Confidence with Quality Data", () => {
  const mockResults = generateMockDrawResults(300);
  const prediction = transformerAlgorithm(mockResults);
  
  assertEquals(prediction.confidence >= 0.8, true, "Should have high confidence with 300+ draws");
  assertEquals(prediction.score >= 0.7, true);
});

Deno.test("Transformer Algorithm - Embedding Consistency", () => {
  const mockResults = generateMockDrawResults(50);
  
  const pred1 = transformerAlgorithm(mockResults);
  const pred2 = transformerAlgorithm(mockResults);
  
  // Same input should produce same output (deterministic)
  assertEquals(pred1.numbers, pred2.numbers);
  assertEquals(pred1.confidence, pred2.confidence);
});
