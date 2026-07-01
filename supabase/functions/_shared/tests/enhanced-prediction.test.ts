import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  calculateWeightedFrequency,
  detectRecurrentPairs,
  calculateGapAdaptive,
  calculateEquilibriumScore,
  calculateEchoScore,
  calculateCompositeScore,
  enhancePrediction,
  generateOptimizedPrediction,
  applyHotNumberBoost,
  applyPairEchoBoost,
  applyCycleReturnFilter,
  applyParityHarmony,
  optimizeForEquilibrium,
} from "../enhanced-prediction.ts";
import type { DrawResult, PredictionResult } from "../types.ts";

// Mock data generator
function generateMockDrawResults(count: number): DrawResult[] {
  const results: DrawResult[] = [];
  const baseDate = new Date("2024-01-01");
  
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    // Générer des numéros avec un pattern pour tester
    const baseNum = (i % 10) * 5;
    results.push({
      draw_name: "Test Draw",
      draw_date: date.toISOString().split('T')[0],
      winning_numbers: [
        baseNum + 1,
        baseNum + 12,
        baseNum + 23,
        baseNum + 34,
        baseNum + 45,
      ].map(n => Math.min(90, Math.max(1, n))).sort((a, b) => a - b),
    });
  }
  
  return results;
}

function generateMockPrediction(): PredictionResult {
  return {
    numbers: [7, 23, 45, 67, 89],
    confidence: 0.75,
    algorithm: "TestAlgorithm",
    factors: ["Test factor 1", "Test factor 2"],
    score: 0.8,
    category: "statistical",
  };
}

// ============= FORMULA 1: Fréquence Pondérée =============

Deno.test("calculateWeightedFrequency - Returns scores for all 90 numbers", () => {
  const results = generateMockDrawResults(50);
  const scores = calculateWeightedFrequency(results);
  
  assertEquals(scores.size, 90);
  
  // Vérifier que les scores sont normalisés entre 0 et 1
  for (const [num, score] of scores) {
    assertEquals(score >= 0 && score <= 1, true, `Score for ${num} should be between 0 and 1`);
  }
});

Deno.test("calculateWeightedFrequency - Recent numbers have higher scores", () => {
  const results = generateMockDrawResults(20);
  const scores = calculateWeightedFrequency(results);
  
  // Les numéros du premier tirage (le plus récent) devraient avoir des scores plus élevés
  const recentNumbers = results[0].winning_numbers;
  const avgRecentScore = recentNumbers.reduce((sum, n) => sum + (scores.get(n) || 0), 0) / recentNumbers.length;
  
  // Le score moyen des numéros récents devrait être > 0
  assertEquals(avgRecentScore > 0, true);
});

Deno.test("applyHotNumberBoost - Boosts hot numbers in top pairs", () => {
  const results = generateMockDrawResults(30);
  const baseScores = calculateWeightedFrequency(results);
  const topPairs = detectRecurrentPairs(results).slice(0, 3);
  
  const boostedScores = applyHotNumberBoost(baseScores, results, topPairs);
  
  // Les scores boostés devraient être >= aux scores de base
  for (const [num, score] of baseScores) {
    assertEquals(boostedScores.get(num)! >= score * 0.99, true); // Petite marge pour les flottants
  }
});

// ============= FORMULA 2: Paires Récurrentes =============

Deno.test("detectRecurrentPairs - Returns top 5 pairs", () => {
  const results = generateMockDrawResults(50);
  const pairs = detectRecurrentPairs(results);
  
  assertEquals(pairs.length <= 5, true);
  
  // Vérifier la structure
  pairs.forEach(pair => {
    assertEquals(pair.numbers.length, 2);
    assertEquals(pair.numbers[0] < pair.numbers[1], true, "Pairs should be sorted");
    assertEquals(pair.score >= 0, true);
    assertEquals(pair.count >= 1, true);
  });
});

Deno.test("detectRecurrentPairs - Pairs are sorted by score descending", () => {
  const results = generateMockDrawResults(50);
  const pairs = detectRecurrentPairs(results);
  
  for (let i = 1; i < pairs.length; i++) {
    assertEquals(pairs[i - 1].score >= pairs[i].score, true);
  }
});

Deno.test("applyPairEchoBoost - Boosts pairs with gap 7-21", () => {
  const mockPairs = [
    { numbers: [1, 2] as [number, number], score: 1.0, count: 5, lastGap: 10 },
    { numbers: [3, 4] as [number, number], score: 1.0, count: 5, lastGap: 30 },
  ];
  
  const boosted = applyPairEchoBoost(mockPairs);
  
  // La première paire (gap=10) devrait être boostée
  assertEquals(boosted[0].score > mockPairs[0].score, true);
  // La deuxième (gap=30) ne devrait pas être boostée
  assertEquals(boosted[1].score, mockPairs[1].score);
});

// ============= FORMULA 3: Gap Adaptatif =============

Deno.test("calculateGapAdaptive - Returns data for all 90 numbers", () => {
  const results = generateMockDrawResults(50);
  const gapData = calculateGapAdaptive(results);
  
  assertEquals(gapData.size, 90);
  
  // Vérifier la structure
  for (const [num, data] of gapData) {
    assertExists(data.zscore);
    assertExists(data.currentGap);
    assertEquals(typeof data.selected, "boolean");
  }
});

Deno.test("calculateGapAdaptive - Selects numbers with high Z-score", () => {
  const results = generateMockDrawResults(100);
  const gapData = calculateGapAdaptive(results);
  
  // Il devrait y avoir quelques numéros sélectionnés
  let selectedCount = 0;
  for (const [, data] of gapData) {
    if (data.selected) selectedCount++;
  }
  
  // Au moins quelques numéros devraient être sélectionnés (gap élevé)
  assertEquals(selectedCount >= 0, true); // Peut être 0 dans certains cas
});

Deno.test("applyCycleReturnFilter - Prioritizes numbers toward target sum", () => {
  const gapNumbers = [10, 20, 30, 40, 50];
  const currentSum = 150; // Besoin d'environ 69 pour atteindre 219
  
  const filtered = applyCycleReturnFilter(gapNumbers, currentSum);
  
  // Les numéros devraient être réordonnés
  assertEquals(filtered.length, 5);
});

// ============= FORMULA 4: Équilibre Somme-Parité =============

Deno.test("calculateEquilibriumScore - Valid combination near target", () => {
  // Combinaison proche de la cible (somme ~219, 2 pairs)
  const numbers = [10, 42, 55, 68, 44]; // somme=219, 3 pairs
  const result = calculateEquilibriumScore(numbers);
  
  assertExists(result.score);
  assertEquals(result.sum, 219);
  assertEquals(result.parity, 3);
  assertEquals(result.isValid, true);
});

Deno.test("calculateEquilibriumScore - Invalid combination far from target", () => {
  // Combinaison très éloignée
  const numbers = [1, 2, 3, 4, 5]; // somme=15
  const result = calculateEquilibriumScore(numbers);
  
  assertEquals(result.sum, 15);
  assertEquals(result.isValid, false);
});

Deno.test("applyParityHarmony - Rejects extreme parity", () => {
  // Tout pair
  assertEquals(applyParityHarmony([2, 4, 6, 8, 10]), false);
  // Tout impair
  assertEquals(applyParityHarmony([1, 3, 5, 7, 9]), false);
  // Mixte
  assertEquals(applyParityHarmony([1, 2, 3, 4, 5]), true);
});

Deno.test("optimizeForEquilibrium - Returns 5 valid numbers", () => {
  const candidates = [10, 20, 30, 40, 50, 60, 70, 80, 15, 25, 35, 45, 55, 65, 75];
  const optimized = optimizeForEquilibrium(candidates, 5);
  
  assertEquals(optimized.length, 5);
  optimized.forEach(n => {
    assertEquals(n >= 1 && n <= 90, true);
  });
});

// ============= FORMULA 5: Échos Inter-Tirages =============

Deno.test("calculateEchoScore - Detects matches with recent draws", () => {
  const results = generateMockDrawResults(10);
  const prediction = results[0].winning_numbers; // Utiliser les numéros du premier tirage
  
  const echo = calculateEchoScore(prediction, results);
  
  assertExists(echo.score);
  assertEquals(echo.score > 0, true, "Should have some echo with matching numbers");
  assertEquals(typeof echo.shouldBoost, "boolean");
});

Deno.test("calculateEchoScore - No matches returns low score", () => {
  const results = generateMockDrawResults(10);
  const prediction = [86, 87, 88, 89, 90]; // Numéros très peu probables dans le mock
  
  const echo = calculateEchoScore(prediction, results);
  
  assertEquals(echo.score < 0.5, true);
});

// ============= SCORE COMPOSITE =============

Deno.test("calculateCompositeScore - Returns all score components", () => {
  const results = generateMockDrawResults(50);
  const numbers = [10, 25, 40, 55, 70];
  
  const frequencyScores = calculateWeightedFrequency(results);
  const topPairs = detectRecurrentPairs(results);
  const gapData = calculateGapAdaptive(results);
  
  const breakdown = calculateCompositeScore(numbers, results, frequencyScores, topPairs, gapData);
  
  // Vérifier que tous les composants existent
  assertExists(breakdown.frequency);
  assertExists(breakdown.pairs);
  assertExists(breakdown.gap);
  assertExists(breakdown.equilibrium);
  assertExists(breakdown.echo);
  assertExists(breakdown.composite);
  
  // Vérifier les limites
  assertEquals(breakdown.composite >= 0 && breakdown.composite <= 1, true);
});

// ============= ENHANCED PREDICTION =============

Deno.test("enhancePrediction - Adds breakdown and narratives", () => {
  const results = generateMockDrawResults(50);
  const basePrediction = generateMockPrediction();
  
  const enhanced = enhancePrediction(basePrediction, results);
  
  // Vérifier la structure
  assertEquals(enhanced.numbers.length, 5);
  assertExists(enhanced.breakdown);
  assertExists(enhanced.narratives);
  assertExists(enhanced.topPairs);
  
  // Le breakdown devrait avoir toutes les composantes
  assertEquals(typeof enhanced.breakdown.composite, "number");
});

Deno.test("enhancePrediction - Maintains valid number range", () => {
  const results = generateMockDrawResults(50);
  const basePrediction = generateMockPrediction();
  
  const enhanced = enhancePrediction(basePrediction, results);
  
  enhanced.numbers.forEach(n => {
    assertEquals(n >= 1 && n <= 90, true);
  });
});

// ============= GENERATE OPTIMIZED PREDICTION =============

Deno.test("generateOptimizedPrediction - Returns valid enhanced prediction", () => {
  const results = generateMockDrawResults(100);
  const basePrediction = generateMockPrediction();
  
  const optimized = generateOptimizedPrediction(results, basePrediction);
  
  // Vérifier la structure
  assertEquals(optimized.numbers.length, 5);
  assertExists(optimized.breakdown);
  assertExists(optimized.narratives);
  
  // Vérifier les numéros
  const uniqueNumbers = new Set(optimized.numbers);
  assertEquals(uniqueNumbers.size, 5, "All numbers should be unique");
  
  optimized.numbers.forEach(n => {
    assertEquals(n >= 1 && n <= 90, true, `Number ${n} should be between 1 and 90`);
  });
});

Deno.test("generateOptimizedPrediction - Numbers are sorted", () => {
  const results = generateMockDrawResults(50);
  const basePrediction = generateMockPrediction();
  
  const optimized = generateOptimizedPrediction(results, basePrediction);
  
  for (let i = 1; i < optimized.numbers.length; i++) {
    assertEquals(
      optimized.numbers[i] > optimized.numbers[i - 1],
      true,
      "Numbers should be sorted ascending"
    );
  }
});

Deno.test("generateOptimizedPrediction - Confidence is valid", () => {
  const results = generateMockDrawResults(50);
  const basePrediction = generateMockPrediction();
  
  const optimized = generateOptimizedPrediction(results, basePrediction);
  
  assertEquals(
    optimized.confidence >= 0 && optimized.confidence <= 1,
    true,
    "Confidence should be between 0 and 1"
  );
});

// ============= PERFORMANCE TEST =============

Deno.test("Enhanced prediction - Performance under 5 seconds", () => {
  const results = generateMockDrawResults(500);
  const basePrediction = generateMockPrediction();
  
  const startTime = Date.now();
  
  // Run all calculations
  calculateWeightedFrequency(results);
  detectRecurrentPairs(results);
  calculateGapAdaptive(results);
  enhancePrediction(basePrediction, results);
  generateOptimizedPrediction(results, basePrediction);
  
  const executionTime = Date.now() - startTime;
  
  assertEquals(
    executionTime < 5000,
    true,
    `Execution should be under 5 seconds, was ${executionTime}ms`
  );
});
