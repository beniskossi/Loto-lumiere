// Enhanced Prediction Algorithms - 8 formules mathématiques avancées
// Formules 1-5: Base (fréquence, paires, gap, équilibre, écho)
// Formules 6-8: Avancées (temporel, momentum, spatial) - voir advanced-formulas.ts

import type { DrawResult, PredictionResult } from "./types.ts";
import { log } from "./utils.ts";
import {
  analyzeMarkovBiases,
  calibrateSomatologicalExpectation,
  calculateMutualInformationMatrix,
  regulateEnsembleEntropy,
  calculateDFTHarmonicScores,
} from "./data-science.ts";
import { 
  calculateTemporalResonanceScores,
  calculateMomentumScores,
  calculateSpatialScores,
  calculateAdvancedCompositeScore,
  generateAdvancedNarratives,
  applyTemporalAffinityBoost,
  applyRisingTrendBoost,
  optimizeSpatialDistribution,
  type AdvancedScoreBreakdown,
} from "./advanced-formulas.ts";
import {
  loadPredictionConfig,
  DEFAULT_OPTIMAL_GAP,
  DEFAULT_GAP_THRESHOLD,
  DEFAULT_WEIGHTS,
  type OptimalGapConfig,
  type WeightsConfig,
} from "./config.ts";

// ============= TYPES =============

export interface EnhancedScoreBreakdown {
  frequency: number;      // Score fréquence pondérée par récence
  pairs: number;          // Score paires récurrentes
  gap: number;            // Score gap adaptatif
  equilibrium: number;    // Score équilibre somme-parité
  echo: number;           // Score échos inter-tirages
  temporal?: number;      // Score résonance temporelle (F6)
  momentum?: number;      // Score momentum numérique (F7)
  spatial?: number;       // Score distribution spatiale (F8)
  composite: number;      // Score composite final
  advanced?: AdvancedScoreBreakdown; // Détail des formules avancées
}

export interface PairScore {
  numbers: [number, number];
  score: number;
  count: number;
  lastGap: number;
}

export interface EnhancedPredictionResult extends PredictionResult {
  breakdown: EnhancedScoreBreakdown;
  narratives: string[];
  topPairs: PairScore[];
}

// ============= DYNAMIC PARAMETER ENGINE (ZÉRO NOMBRES MAGIQUES) =============

const USE_ADVANCED_FORMULAS = true;  // Flag d'activation des formules avancées F6-F8

export interface DerivedParameters {
  lambdaDecay: number;
  maxPairGap: number;
  targetSum: number;
  targetParity: number;
  sumTolerance: number;
  equilibriumThreshold: number;
  echoDecay: number;
  echoThreshold: number;
  echoLookback: number;
  optimalGapMin: number;
  optimalGapMax: number;
}

/**
 * Dérive de façon 100% déterministe les hyperparamètres du système à partir des données historiques
 */
export function deriveSystemParameters(results: DrawResult[]): DerivedParameters {
  const n = results.length;
  const config = getConfig();
  const optimalGapMin = config?.optimalGap?.min ?? 10;
  const optimalGapMax = config?.optimalGap?.max ?? 22;

  if (n === 0) {
    return {
      lambdaDecay: 0.05,
      maxPairGap: 30,
      targetSum: 227.5,
      targetParity: 2.5,
      sumTolerance: 30,
      equilibriumThreshold: 25,
      echoDecay: 0.1,
      echoThreshold: 0.3,
      echoLookback: 3,
      optimalGapMin,
      optimalGapMax,
    };
  }

  // 1. Somme cible et tolérance basées sur la moyenne empirique et l'écart-type
  const sums = results.map(r => r.winning_numbers.reduce((a, b) => a + b, 0));
  const meanSum = sums.reduce((a, b) => a + b, 0) / n;
  const sumVariance = sums.reduce((acc, s) => acc + Math.pow(s - meanSum, 2), 0) / n;
  const stdDevSum = Math.sqrt(sumVariance) || 30;

  // 2. Parité cible basée sur la moyenne de nombres pairs observés
  const parities = results.map(r => r.winning_numbers.filter(num => num % 2 === 0).length);
  const meanParity = parities.reduce((a, b) => a + b, 0) / n;

  // 3. Décroissance exponentielle basée sur la demi-vie d'activité des tirages (25% du dataset, max 50)
  const halfLife = Math.max(10, Math.min(50, Math.floor(n * 0.25)));
  const lambdaDecay = Math.LN2 / halfLife;

  // 4. Écart maximum de paire proportionnel aux probabilités de base
  const maxPairGap = Math.max(15, Math.min(60, Math.floor(1.5 * (90 / 5))));

  // 5. Calcul des taux d'écho à lag 1 et lag 2 pour ajuster la décroissance
  let totalOverlap_1 = 0;
  let totalOverlap_2 = 0;
  for (let i = 0; i < n - 1; i++) {
    const wCurr = results[i].winning_numbers;
    const wPrev = results[i + 1].winning_numbers;
    totalOverlap_1 += wCurr.filter(x => wPrev.includes(x)).length;
  }
  for (let i = 0; i < n - 2; i++) {
    const wCurr = results[i].winning_numbers;
    const wPrev2 = results[i + 2].winning_numbers;
    totalOverlap_2 += wCurr.filter(x => wPrev2.includes(x)).length;
  }
  
  const p1 = n > 1 ? (totalOverlap_1 / (n - 1)) / 5 : 0.05;
  const p2 = n > 2 ? (totalOverlap_2 / (n - 2)) / 5 : 0.04;
  
  let echoDecay = 0.1;
  if (p1 > 0 && p2 > 0 && p1 > p2) {
    echoDecay = Math.max(0.02, Math.min(0.5, -Math.log(p2 / p1)));
  }

  const echoLookback = Math.max(2, Math.min(5, Math.floor(2 / echoDecay)));
  const echoThreshold = Math.max(0.1, Math.min(0.5, p1 * 1.5));
  const equilibriumThreshold = Math.max(10, Math.min(40, stdDevSum * 0.8));

  return {
    lambdaDecay,
    maxPairGap,
    targetSum: meanSum,
    targetParity: meanParity,
    sumTolerance: stdDevSum,
    equilibriumThreshold,
    echoDecay,
    echoThreshold,
    echoLookback,
    optimalGapMin,
    optimalGapMax,
  };
}

// Configuration dynamique (chargée depuis la DB)
let currentConfig: {
  optimalGap: OptimalGapConfig;
  gapThreshold: { zscore: number };
  weights: WeightsConfig;
} = {
  optimalGap: DEFAULT_OPTIMAL_GAP,
  gapThreshold: DEFAULT_GAP_THRESHOLD,
  weights: DEFAULT_WEIGHTS,
};

/**
 * Initialise la configuration depuis la base de données
 * Doit être appelé au début du traitement
 */
export async function initializeConfig(): Promise<void> {
  currentConfig = await loadPredictionConfig();
  log("info", "Enhanced prediction config initialized", {
    optimalGap: currentConfig.optimalGap,
  });
}

/**
 * Récupère la configuration actuelle
 */
export function getConfig() {
  return currentConfig;
}

// ============= FORMULA 1: Fréquence Pondérée par Récence =============

/**
 * Calcule le score de fréquence pondérée par récence pour chaque numéro
 * Formule: S_n = f_n × e^(-λ × d_n)
 * @param results - Historique des tirages
 * @returns Map des scores par numéro (normalisés 0-1)
 */
export function calculateWeightedFrequency(results: DrawResult[]): Map<number, number> {
  const scores = new Map<number, number>();
  const today = new Date();
  const params = deriveSystemParameters(results);
  
  // Calculer fréquence et dernier gap pour chaque numéro
  const frequency = new Map<number, number>();
  const lastSeen = new Map<number, number>();
  
  results.forEach((result, index) => {
    const drawDate = new Date(result.draw_date);
    const daysSince = Math.floor((today.getTime() - drawDate.getTime()) / (1000 * 60 * 60 * 24));
    
    result.winning_numbers.forEach(num => {
      frequency.set(num, (frequency.get(num) || 0) + 1);
      if (!lastSeen.has(num) || daysSince < lastSeen.get(num)!) {
        lastSeen.set(num, daysSince);
      }
    });
  });
  
  // Calculer le score pondéré
  let maxScore = 0;
  for (let n = 1; n <= 90; n++) {
    const f_n = frequency.get(n) || 0;
    const d_n = lastSeen.get(n) ?? results.length * 3; // Si jamais vu, grand gap
    const S_n = f_n * Math.exp(-params.lambdaDecay * d_n);
    scores.set(n, S_n);
    maxScore = Math.max(maxScore, S_n);
  }
  
  // Normaliser entre 0 et 1
  if (maxScore > 0) {
    for (const [num, score] of scores) {
      scores.set(num, score / maxScore);
    }
  }
  
  return scores;
}

/**
 * Applique le boost orchestration "numéros chauds récents"
 * +20% si gap < 14 jours et fait partie d'une paire top
 */
export function applyHotNumberBoost(
  scores: Map<number, number>,
  results: DrawResult[],
  topPairs: PairScore[]
): Map<number, number> {
  const boostedScores = new Map(scores);
  const pairNumbers = new Set<number>();
  
  topPairs.forEach(pair => {
    pairNumbers.add(pair.numbers[0]);
    pairNumbers.add(pair.numbers[1]);
  });
  
  const today = new Date();
  const recentResults = results.slice(0, 14); // 14 derniers tirages approximatifs
  
  recentResults.forEach(result => {
    const drawDate = new Date(result.draw_date);
    const daysSince = Math.floor((today.getTime() - drawDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince < 14) {
      result.winning_numbers.forEach(num => {
        if (pairNumbers.has(num)) {
          const currentScore = boostedScores.get(num) || 0;
          boostedScores.set(num, Math.min(1, currentScore * 1.20)); // +20%
        }
      });
    }
  });
  
  return boostedScores;
}

// ============= FORMULA 2: Détection de Paires Récurrentes =============

/**
 * Détecte les paires récurrentes avec score ajusté par gap
 * Formule: P_{i,j} = c_{i,j} × (1 - g_{i,j}/G_max)
 */
export function detectRecurrentPairs(results: DrawResult[]): PairScore[] {
  const pairCounts = new Map<string, { count: number; lastIndex: number }>();
  
  // Compter les occurrences de chaque paire
  results.forEach((result, index) => {
    const nums = result.winning_numbers.sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`;
        const existing = pairCounts.get(key);
        if (existing) {
          existing.count++;
          existing.lastIndex = Math.min(existing.lastIndex, index);
        } else {
          pairCounts.set(key, { count: 1, lastIndex: index });
        }
      }
    }
  });
  
  // Calculer les scores de paires
  const pairScores: PairScore[] = [];
  const params = deriveSystemParameters(results);
  
  for (const [key, data] of pairCounts) {
    const [n1, n2] = key.split('-').map(Number);
    const gap = data.lastIndex; // Gap = position du dernier tirage contenant cette paire
    
    // P_{i,j} = c_{i,j} × (1 - g_{i,j}/G_max)
    const score = data.count * (1 - Math.min(gap, params.maxPairGap) / params.maxPairGap);
    
    if (score > 0) {
      pairScores.push({
        numbers: [n1, n2],
        score,
        count: data.count,
        lastGap: gap,
      });
    }
  }
  
  // Trier par score décroissant et retourner top 5
  return pairScores.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * Applique l'orchestration "Écho de Paire"
 * Prioriser si réapparition entre 7-21 jours
 */
export function applyPairEchoBoost(pairs: PairScore[]): PairScore[] {
  return pairs.map(pair => {
    // Boost si gap entre 7 et 21 tirages
    if (pair.lastGap >= 7 && pair.lastGap <= 21) {
      return {
        ...pair,
        score: pair.score * 1.15, // +15% boost "Écho de Paire"
      };
    }
    return pair;
  });
}

// ============= FORMULA 3: Prédicteur de Gap Adaptatif =============

/**
 * Calcule le Z-score du gap pour chaque numéro
 * Formule: R_n = (g_n^actuel - μ_g) / σ_g
 * Sélectionne si > 1.2
 */
export function calculateGapAdaptive(results: DrawResult[]): Map<number, { zscore: number; currentGap: number; selected: boolean; inOptimalRange: boolean }> {
  const gapData = new Map<number, number[]>();
  const currentGap = new Map<number, number>();
  
  // Initialiser tous les numéros
  for (let n = 1; n <= 90; n++) {
    gapData.set(n, []);
    currentGap.set(n, results.length); // Gap max si jamais vu
  }
  
  // Calculer les gaps historiques
  const lastSeen = new Map<number, number>();
  
  results.forEach((result, index) => {
    result.winning_numbers.forEach(num => {
      if (lastSeen.has(num)) {
        const gap = index - lastSeen.get(num)!;
        gapData.get(num)!.push(gap);
      }
      lastSeen.set(num, index);
    });
  });
  
  // Calculer le gap actuel (depuis le dernier tirage)
  for (let n = 1; n <= 90; n++) {
    if (lastSeen.has(n)) {
      currentGap.set(n, lastSeen.get(n)!);
    }
  }
  
  // Calculer Z-score pour chaque numéro
  const result = new Map<number, { zscore: number; currentGap: number; selected: boolean; inOptimalRange: boolean }>();
  const config = getConfig();
  
  for (let n = 1; n <= 90; n++) {
    const gaps = gapData.get(n)!;
    const g_current = currentGap.get(n)!;
    
    // Vérifier si le gap actuel est dans l'intervalle optimal (configurable)
    const inOptimalRange = g_current >= config.optimalGap.min && g_current <= config.optimalGap.max;
    
    if (gaps.length < 2) {
      result.set(n, { zscore: 0, currentGap: g_current, selected: inOptimalRange, inOptimalRange });
      continue;
    }
    
    // Calculer moyenne et écart-type
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, g) => sum + Math.pow(g - mean, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    
    // Z-score
    const zscore = stdDev > 0 ? (g_current - mean) / stdDev : 0;
    
    // Sélectionner si Z-score élevé OU dans l'intervalle optimal
    result.set(n, {
      zscore,
      currentGap: g_current,
      selected: zscore > config.gapThreshold.zscore || inOptimalRange,
      inOptimalRange,
    });
  }
  
  return result;
}

/**
 * Applique l'orchestration "Cycle de Retour"
 * Lie la sélection à la somme cible et sa tolérance dynamiquement calculées
 */
export function applyCycleReturnFilter(
  gapNumbers: number[],
  currentSum: number,
  targetSum: number = 227.5,
  sumTolerance: number = 30
): number[] {
  // Si la somme actuelle est déjà proche de la cible, pas de filtrage
  if (Math.abs(currentSum - targetSum) <= sumTolerance) {
    return gapNumbers;
  }
  
  // Sinon, prioriser les numéros qui rapprochent de la cible
  const delta = targetSum - currentSum;
  
  return gapNumbers.sort((a, b) => {
    const distA = Math.abs(delta - a);
    const distB = Math.abs(delta - b);
    return distA - distB;
  });
}

// ============= FORMULA 4: Modèle d'Équilibre Somme-Parité =============

/**
 * Calcule le score d'équilibre pour une combinaison
 * Formule: E = w_s × |s - μ_s| + w_p × |p - m_p|
 */
export function calculateEquilibriumScore(
  numbers: number[], 
  targetSum: number = 227.5,
  targetParity: number = 2.5,
  equilibriumThreshold: number = 25
): {
  score: number;
  sum: number;
  parity: number;
  isValid: boolean;
} {
  const sum = numbers.reduce((a, b) => a + b, 0);
  const parity = numbers.filter(n => n % 2 === 0).length;
  
  const E = 0.5 * Math.abs(sum - targetSum) + 0.5 * Math.abs(parity - targetParity);
  
  return {
    score: E,
    sum,
    parity,
    isValid: E < equilibriumThreshold,
  };
}

/**
 * Applique l'orchestration "Harmonie Paritaire"
 * Évite les combinaisons extrêmes (tout pair/impair)
 */
export function applyParityHarmony(numbers: number[]): boolean {
  const evenCount = numbers.filter(n => n % 2 === 0).length;
  // Éviter extrêmes: pas 0 ou 5 pairs
  return evenCount >= 1 && evenCount <= 4;
}

/**
 * Optimise une combinaison pour l'équilibre
 */
export function optimizeForEquilibrium(
  candidates: number[],
  count: number = 5,
  targetSum: number = 227.5,
  targetParity: number = 2.5,
  equilibriumThreshold: number = 25
): number[] {
  // Générer des combinaisons et trouver la meilleure
  const sorted = [...candidates].sort((a, b) => a - b);
  let bestCombination = sorted.slice(0, count);
  let bestScore = calculateEquilibriumScore(bestCombination, targetSum, targetParity, equilibriumThreshold).score;
  
  // Simple greedy optimization
  for (let i = 0; i < Math.min(100, sorted.length - count); i++) {
    const start = i;
    const combo = sorted.slice(start, start + count);
    if (combo.length === count) {
      const { score, isValid } = calculateEquilibriumScore(combo, targetSum, targetParity, equilibriumThreshold);
      if (score < bestScore && applyParityHarmony(combo)) {
        bestScore = score;
        bestCombination = combo;
      }
    }
  }
  
  return bestCombination;
}

// ============= FORMULA 5: Détection d'Échos Inter-Tirages =============

/**
 * Calcule le score d'écho entre tirages récents
 * Formule: O = Σ(|r_k|/5) × e^(-δ × i_k) pour k=1..m
 */
export function calculateEchoScore(
  prediction: number[],
  results: DrawResult[]
): { score: number; shouldBoost: boolean; matchDetails: Array<{ index: number; matches: number }> } {
  const params = deriveSystemParameters(results);
  const recentResults = results.slice(0, params.echoLookback);
  let totalScore = 0;
  const matchDetails: Array<{ index: number; matches: number }> = [];
  
  recentResults.forEach((result, index) => {
    const matches = prediction.filter(n => result.winning_numbers.includes(n)).length;
    const contribution = (matches / 5) * Math.exp(-params.echoDecay * index);
    totalScore += contribution;
    
    if (matches > 0) {
      matchDetails.push({ index, matches });
    }
  });
  
  return {
    score: totalScore,
    shouldBoost: totalScore > params.echoThreshold,
    matchDetails,
  };
}

/**
 * Applique l'orchestration "Résonance Courte"
 * Hybride avec paires pour boost combiné
 */
export function applyResonanceBoost(
  echoScore: number,
  topPairs: PairScore[],
  prediction: number[]
): number {
  // Vérifier si la prédiction contient des paires top
  let pairBonus = 0;
  topPairs.forEach(pair => {
    if (prediction.includes(pair.numbers[0]) && prediction.includes(pair.numbers[1])) {
      pairBonus += 0.1;
    }
  });
  
  return echoScore + pairBonus;
}

// ============= SCORE COMPOSITE =============

/**
 * Calcule le score composite final en combinant les 8 formules
 */
export function calculateCompositeScore(
  numbers: number[],
  results: DrawResult[],
  frequencyScores: Map<number, number>,
  topPairs: PairScore[],
  gapData: Map<number, { zscore: number; currentGap: number; selected: boolean }>
): EnhancedScoreBreakdown {
  // 1. Score fréquence (moyenne des scores des numéros sélectionnés)
  const frequencyScore = numbers.reduce((sum, n) => sum + (frequencyScores.get(n) || 0), 0) / numbers.length;
  
  // 2. Score paires (nombre de paires top présentes)
  let pairsScore = 0;
  topPairs.forEach(pair => {
    if (numbers.includes(pair.numbers[0]) && numbers.includes(pair.numbers[1])) {
      pairsScore += pair.score;
    }
  });
  pairsScore = Math.min(1, pairsScore / (topPairs[0]?.score || 1));
  
  // 3. Score gap (moyenne des Z-scores normalisés)
  const gapScore = numbers.reduce((sum, n) => {
    const data = gapData.get(n);
    return sum + (data?.selected ? 1 : 0);
  }, 0) / numbers.length;
  
  // 4. Score équilibre
  const params = deriveSystemParameters(results);
  const equilibrium = calculateEquilibriumScore(numbers, params.targetSum, params.targetParity, params.equilibriumThreshold);
  const equilibriumScore = equilibrium.isValid ? 1 - (equilibrium.score / params.equilibriumThreshold) : 0;
  
  // 5. Score écho
  const echo = calculateEchoScore(numbers, results);
  const echoScore = Math.min(1, echo.score);
  
  // 6-8. Scores avancés (temporal, momentum, spatial)
  let temporalScore = 0;
  let momentumScore = 0;
  let spatialScore = 0;
  let advancedBreakdown: AdvancedScoreBreakdown | undefined;
  
  if (USE_ADVANCED_FORMULAS && results.length >= 30) {
    try {
      advancedBreakdown = calculateAdvancedCompositeScore(numbers, results);
      temporalScore = advancedBreakdown.temporal;
      momentumScore = advancedBreakdown.momentum;
      spatialScore = advancedBreakdown.spatial;
    } catch (e) {
      log("warn", "Advanced formulas failed", { error: e });
    }
  }
  
  // Score composite pondéré (8 formules) - utilise la config dynamique
  const weights = getConfig().weights;
  const composite = 
    weights.frequency * frequencyScore +
    weights.pairs * pairsScore +
    weights.gap * gapScore +
    weights.equilibrium * equilibriumScore +
    weights.echo * echoScore +
    weights.temporal * temporalScore +
    weights.momentum * momentumScore +
    weights.spatial * spatialScore;
  
  return {
    frequency: frequencyScore,
    pairs: pairsScore,
    gap: gapScore,
    equilibrium: equilibriumScore,
    echo: echoScore,
    temporal: temporalScore,
    momentum: momentumScore,
    spatial: spatialScore,
    composite,
    advanced: advancedBreakdown,
  };
}

// ============= ORCHESTRATION PRINCIPALE =============

/**
 * Applique toutes les formules d'amélioration à une prédiction
 */
export function enhancePrediction(
  basePrediction: PredictionResult,
  results: DrawResult[]
): EnhancedPredictionResult {
  const startTime = Date.now();
  
  // Calculer les métriques de base
  const frequencyScores = calculateWeightedFrequency(results);
  const rawPairs = detectRecurrentPairs(results);
  const topPairs = applyPairEchoBoost(rawPairs);
  const gapData = calculateGapAdaptive(results);
  
  // Appliquer le boost des numéros chauds
  const boostedFrequency = applyHotNumberBoost(frequencyScores, results, topPairs);
  
  // Calculer le breakdown
  const breakdown = calculateCompositeScore(
    basePrediction.numbers,
    results,
    boostedFrequency,
    topPairs,
    gapData
  );
  
  // Générer les narratives
  const narratives: string[] = [];
  
  // Narrative fréquence
  const hotNumbers = basePrediction.numbers.filter(n => 
    (boostedFrequency.get(n) || 0) > 0.7
  );
  if (hotNumbers.length > 0) {
    narratives.push(`Numéros chauds détectés: ${hotNumbers.join(', ')}`);
  }
  
  // Narrative paires
  topPairs.forEach(pair => {
    if (basePrediction.numbers.includes(pair.numbers[0]) && 
        basePrediction.numbers.includes(pair.numbers[1])) {
      narratives.push(`Écho de paire: ${pair.numbers[0]}-${pair.numbers[1]} (${pair.count} apparitions)`);
    }
  });
  
  // Narrative gap - distinction entre intervalle optimal et gap élevé
  const params = deriveSystemParameters(results);
  const optimalGapNumbers = basePrediction.numbers.filter(n => gapData.get(n)?.inOptimalRange);
  const highGapNumbers = basePrediction.numbers.filter(n => 
    gapData.get(n)?.selected && !gapData.get(n)?.inOptimalRange
  );
  
  if (optimalGapNumbers.length > 0) {
    const gapDetails = optimalGapNumbers.map(n => {
      const gap = gapData.get(n)?.currentGap || 0;
      return `${n}(${gap}j)`;
    }).join(', ');
    narratives.push(`Intervalle optimal (${params.optimalGapMin}-${params.optimalGapMax}): ${gapDetails}`);
  }
  
  if (highGapNumbers.length > 0) {
    narratives.push(`Cycle de retour: ${highGapNumbers.join(', ')} (gap élevé)`);
  }
  
  // Narrative équilibre
  const equilibrium = calculateEquilibriumScore(basePrediction.numbers, params.targetSum, params.targetParity, params.equilibriumThreshold);
  if (equilibrium.isValid) {
    narratives.push(`Harmonie paritaire: somme ${equilibrium.sum}, ${equilibrium.parity} pairs`);
  }
  
  // Narrative écho
  const echo = calculateEchoScore(basePrediction.numbers, results);
  if (echo.shouldBoost) {
    narratives.push(`Résonance courte: écho détecté sur ${echo.matchDetails.length} tirages récents`);
  }
  
  // Narratives des 4 axes (A1-A4)
  try {
    // Axe 1: Markov
    const lastDraw = results.length > 0 ? results[0].winning_numbers : [];
    const markovRes = analyzeMarkovBiases(results, lastDraw);
    const highMarkov = basePrediction.numbers.filter(n => (markovRes.nextStateProbabilities.get(n) || 0) > 0.015);
    if (highMarkov.length > 0) {
      narratives.push(`Micro-biais physiques (Markov) : ${highMarkov.join(', ')} ont une transition stochastique favorable`);
    }

    // Axe 2: Somatologique EMA
    const { calibratedSum } = calibrateSomatologicalExpectation(results, 15, 0.45);
    const currentSum = basePrediction.numbers.reduce((acc, n) => acc + n, 0);
    narratives.push(`Espérance sommatologique calibrée (EMA) : cible à ${calibratedSum.toFixed(1)} (somme actuelle : ${currentSum})`);

    // Axe 3: Entropie conjointe
    narratives.push(`Régulation d'ensemble : optimisation de l'entropie de Shannon pour éliminer la redondance`);

    // Axe 4: Fourier DFT
    const fourierScores = calculateDFTHarmonicScores(results);
    const highFourier = basePrediction.numbers.filter(n => (fourierScores.get(n) || 0) > 0.7);
    if (highFourier.length > 0) {
      narratives.push(`Analyse harmonique (DFT) : oscillations cycliques fortes pour ${highFourier.join(', ')}`);
    }
  } catch (err) {
    log("warn", "Failed generating 4-axes narratives", { error: err });
  }

  // Narratives avancées (F6-F8)
  if (USE_ADVANCED_FORMULAS && results.length >= 30) {
    try {
      const advancedNarratives = generateAdvancedNarratives(basePrediction.numbers, results);
      narratives.push(...advancedNarratives);
    } catch (e) {
      log("warn", "Advanced narratives failed", { error: e });
    }
  }
  
  const executionTime = Date.now() - startTime;
  log("info", `Enhanced prediction calculated in ${executionTime}ms`);
  
  return {
    ...basePrediction,
    confidence: Math.min(1, basePrediction.confidence * (0.8 + breakdown.composite * 0.4)),
    score: Math.min(1, basePrediction.score * (0.8 + breakdown.composite * 0.4)),
    factors: [
      ...basePrediction.factors,
      `Score composite: ${(breakdown.composite * 100).toFixed(1)}%`,
    ],
    breakdown,
    narratives,
    topPairs,
  };
}

/**
 * Génère une prédiction optimisée en utilisant toutes les formules
 */
export function generateOptimizedPrediction(
  results: DrawResult[],
  basePrediction: PredictionResult
): EnhancedPredictionResult {
  // --- AXE 1 : Chaînes de Markov ---
  const lastDrawNumbers = results.length > 0 ? results[0].winning_numbers : [];
  const markovAnalysis = analyzeMarkovBiases(results, lastDrawNumbers);
  const markovScores = markovAnalysis.nextStateProbabilities;

  // --- AXE 2 : Calibration Dynamique de l'Espérance Sommatologique par Filtre EMA ---
  const { calibratedSum } = calibrateSomatologicalExpectation(results, 15, 0.45);

  // --- AXE 3 : Information Mutuelle & Régulation d'Ensemble ---
  const miMatrix = calculateMutualInformationMatrix(results);

  // --- AXE 4 : Analyse Harmonique Spatiale et Temporelle par DFT ---
  const fourierScores = calculateDFTHarmonicScores(results);

  // Calculer toutes les métriques standards
  const frequencyScores = calculateWeightedFrequency(results);
  const topPairs = applyPairEchoBoost(detectRecurrentPairs(results));
  const gapData = calculateGapAdaptive(results);
  
  // Boost frequency avec numéros chauds
  const boostedFrequency = applyHotNumberBoost(frequencyScores, results, topPairs);
  
  // Sélectionner les meilleurs candidats
  const candidates: Array<{ number: number; score: number; inOptimalRange: boolean }> = [];
  const config = getConfig();
  const weights = config.weights;
  
  for (let n = 1; n <= 90; n++) {
    const freqScore = boostedFrequency.get(n) || 0;
    const gapInfo = gapData.get(n);
    const gapBonus = gapInfo?.selected ? 0.2 : 0;
    
    // BOOST PRIORITAIRE: numéros avec intervalle de réapparition configurable
    const optimalGapBonus = gapInfo?.inOptimalRange ? config.optimalGap.boost : 0;
    
    // Bonus de transition Markov (Axe 1)
    const markovBonus = markovScores.get(n) || 0;
    
    // Bonus harmonique Fourier (Axe 4)
    const fourierBonus = fourierScores.get(n) || 0;

    // Bonus si fait partie d'une paire top
    let pairBonus = 0;
    topPairs.forEach(pair => {
      if (pair.numbers.includes(n)) {
        pairBonus += 0.1 * pair.score;
      }
    });
    
    // Score composite intégrant tous les axes
    const totalScore = freqScore * weights.frequency + 
                       gapBonus * weights.gap + 
                       pairBonus * weights.pairs +
                       optimalGapBonus +
                       markovBonus * 0.30 + // micro-biais physiques
                       fourierBonus * 0.25; // périodicités DFT
    
    candidates.push({ number: n, score: totalScore, inOptimalRange: gapInfo?.inOptimalRange || false });
  }
  
  // Trier par score décroissant
  const sortedCandidates = candidates
    .sort((a, b) => b.score - a.score)
    .map(c => c.number);
  
  // Slice top 20 candidats pour la régulation stochastique d'ensemble
  const top20Candidates = sortedCandidates.slice(0, 20);
  
  // Appliquer Axe 3 : Régulation par l'entropie de Shannon et l'information mutuelle (mRMR)
  const regulatedCandidates = regulateEnsembleEntropy(top20Candidates, miMatrix, 12);
  
  // Optimiser pour l'équilibre paritaire et l'espérance sommatologique calibrée (Axe 2)
  let bestCombination: number[] = [];
  let bestScore = Infinity;

  for (let i = 0; i < regulatedCandidates.length - 4; i++) {
    for (let j = i + 1; j < regulatedCandidates.length - 3; j++) {
      for (let k = j + 1; k < regulatedCandidates.length - 2; k++) {
        for (let l = k + 1; l < regulatedCandidates.length - 1; l++) {
          for (let m = l + 1; m < regulatedCandidates.length; m++) {
            const combo = [
              regulatedCandidates[i],
              regulatedCandidates[j],
              regulatedCandidates[k],
              regulatedCandidates[l],
              regulatedCandidates[m]
            ];
            
            if (applyParityHarmony(combo)) {
              const eq = calculateEquilibriumScore(combo, calibratedSum);
              if (eq.score < bestScore) {
                bestScore = eq.score;
                bestCombination = combo;
              }
            }
          }
        }
      }
    }
  }

  // Fallback stochastique robuste
  if (bestCombination.length === 0) {
    bestCombination = regulatedCandidates.slice(0, 5);
  }
  
  // Créer la prédiction améliorée
  const enhancedPrediction: PredictionResult = {
    ...basePrediction,
    numbers: bestCombination.sort((a, b) => a - b),
  };
  
  return enhancePrediction(enhancedPrediction, results);
}
