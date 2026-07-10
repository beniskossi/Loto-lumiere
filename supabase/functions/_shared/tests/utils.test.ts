import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  generateDeterministicFallback,
  selectBalancedNumbers,
  calculateDataQuality,
  calculateFreshness,
} from "../utils.ts";
import type { DrawResult } from "../types.ts";

Deno.test("generateDeterministicFallback - Generates Valid Numbers", () => {
  const prediction = generateDeterministicFallback();
  
  assertEquals(prediction.length, 5);
  
  // All numbers should be between 1 and 90
  prediction.forEach(num => {
    assertEquals(num >= 1 && num <= 90, true);
  });
  
  // Numbers should be unique
  const uniqueNumbers = new Set(prediction);
  assertEquals(uniqueNumbers.size, 5);
  
  // Numbers should be sorted
  for (let i = 1; i < prediction.length; i++) {
    assertEquals(prediction[i] > prediction[i - 1], true);
  }
});

Deno.test("selectBalancedNumbers - Balanced Selection", () => {
  const candidates = [1, 11, 21, 31, 41, 51, 61, 71, 81];
  const selected = selectBalancedNumbers(candidates, 5);
  
  assertEquals(selected.length, 5);
  
  // Should select numbers from different ranges
  const ranges = selected.map(n => Math.floor((n - 1) / 10));
  const uniqueRanges = new Set(ranges);
  assertEquals(uniqueRanges.size >= 3, true, "Should cover multiple ranges");
});

Deno.test("calculateDataQuality - High Quality Data", () => {
  const results: DrawResult[] = [];
  const today = new Date();
  
  // Recent, complete data
  for (let i = 0; i < 100; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    results.push({
      draw_name: "Test Draw",
      draw_date: date.toISOString().split('T')[0],
      winning_numbers: [1, 2, 3, 4, 5],
    });
  }
  
  const quality = calculateDataQuality(results);
  
  assertEquals(quality > 0.7, true, "Recent complete data should have high quality");
  assertEquals(quality <= 1, true);
});

Deno.test("calculateDataQuality - Low Quality Data", () => {
  const results: DrawResult[] = [];
  const oldDate = new Date("2020-01-01");
  
  // Old, sparse data
  for (let i = 0; i < 20; i++) {
    const date = new Date(oldDate);
    date.setDate(date.getDate() + i * 30);
    results.push({
      draw_name: "Test Draw",
      draw_date: date.toISOString().split('T')[0],
      winning_numbers: [1, 2, 3, 4, 5],
    });
  }
  
  const quality = calculateDataQuality(results);
  
  assertEquals(quality < 0.5, true, "Old sparse data should have low quality");
  assertEquals(quality >= 0, true);
});

Deno.test("calculateFreshness - Recent Data", () => {
  const results: DrawResult[] = [];
  const today = new Date();
  
  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    results.push({
      draw_name: "Test Draw",
      draw_date: date.toISOString().split('T')[0],
      winning_numbers: [1, 2, 3, 4, 5],
    });
  }
  
  const freshness = calculateFreshness(results);
  
  assertEquals(freshness > 0.8, true, "Recent data should have high freshness");
  assertEquals(freshness <= 1, true);
});

Deno.test("calculateFreshness - Old Data", () => {
  const results: DrawResult[] = [];
  const oldDate = new Date("2020-01-01");
  
  for (let i = 0; i < 10; i++) {
    const date = new Date(oldDate);
    date.setDate(date.getDate() + i);
    results.push({
      draw_name: "Test Draw",
      draw_date: date.toISOString().split('T')[0],
      winning_numbers: [1, 2, 3, 4, 5],
    });
  }
  
  const freshness = calculateFreshness(results);
  
  assertEquals(freshness < 0.3, true, "Old data should have low freshness");
  assertEquals(freshness >= 0, true);
});

Deno.test("selectBalancedNumbers - Handles Insufficient Candidates", () => {
  const candidates = [1, 2, 3];
  const selected = selectBalancedNumbers(candidates, 5);
  
  assertEquals(selected.length, 5);
  // Should fill with random numbers
  selected.forEach(num => {
    assertEquals(num >= 1 && num <= 90, true);
  });
});
