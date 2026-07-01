// Advanced Formulas - 3 nouvelles formules mathématiques pour prédictions améliorées
// Formule 6: Résonance Temporelle (patterns jour-de-semaine)
// Formule 7: Momentum Numérique (accélération de tendance)
// Formule 8: Clustering Spatial (distribution par zones)

import type { DrawResult } from "./types.ts";
import { log } from "./utils.ts";

// ============= CONSTANTS =============

const MOMENTUM_LOOKBACK = 10;      // Tirages pour calculer le momentum
const MOMENTUM_THRESHOLD = 0.15;   // Seuil pour momentum significatif
const ZONE_COUNT = 9;              // Nombre de zones (1-10, 11-20, ..., 81-90)
const OPTIMAL_ZONE_SPREAD = 4;     // Distribution optimale sur 4-5 zones

// ============= FORMULA 6: Résonance Temporelle =============

interface TemporalPattern {
  dayOfWeek: number;
  numberFrequency: Map<number, number>;
  totalDraws: number;
}

/**
 * Analyse les patterns par jour de la semaine
 * Certains numéros peuvent apparaître plus souvent certains jours
 */
export function analyzeTemporalPatterns(results: DrawResult[]): Map<number, TemporalPattern> {
  const patterns = new Map<number, TemporalPattern>();
  
  // Initialiser pour chaque jour (0=Dimanche, 6=Samedi)
  for (let day = 0; day <= 6; day++) {
    patterns.set(day, {
      dayOfWeek: day,
      numberFrequency: new Map(),
      totalDraws: 0,
    });
  }
  
  results.forEach(result => {
    const date = new Date(result.draw_date);
    const dayOfWeek = date.getDay();
    const pattern = patterns.get(dayOfWeek)!;
    
    pattern.totalDraws++;
    result.winning_numbers.forEach(num => {
      pattern.numberFrequency.set(num, (pattern.numberFrequency.get(num) || 0) + 1);
    });
  });
  
  return patterns;
}

/**
 * Calcule le score de résonance temporelle pour le jour actuel
 * Retourne les numéros avec affinité au jour de la semaine courant
 */
export function calculateTemporalResonanceScores(
  results: DrawResult[],
  targetDay?: number
): Map<number, number> {
  const patterns = analyzeTemporalPatterns(results);
  const today = targetDay ?? new Date().getDay();
  const todayPattern = patterns.get(today);
  
  const scores = new Map<number, number>();
  
  if (!todayPattern || todayPattern.totalDraws < 5) {
    // Pas assez de données pour ce jour
    for (let n = 1; n <= 90; n++) {
      scores.set(n, 0.5); // Score neutre
    }
    return scores;
  }
  
  // Calculer le score relatif pour chaque numéro
  const avgFrequency = 5 / 90; // Fréquence attendue
  let maxScore = 0;
  
  for (let n = 1; n <= 90; n++) {
    const freq = todayPattern.numberFrequency.get(n) || 0;
    const expectedFreq = todayPattern.totalDraws * avgFrequency;
    
    // Score = ratio de surreprésentation
    const score = expectedFreq > 0 ? freq / expectedFreq : 0;
    scores.set(n, score);
    maxScore = Math.max(maxScore, score);
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
 * Applique l'orchestration "Affinité Jour"
 * Boost les numéros avec forte affinité au jour de tirage
 */
export function applyTemporalAffinityBoost(
  baseScores: Map<number, number>,
  temporalScores: Map<number, number>,
  boostFactor: number = 0.15
): Map<number, number> {
  const boostedScores = new Map<number, number>();
  
  for (let n = 1; n <= 90; n++) {
    const baseScore = baseScores.get(n) || 0;
    const temporalScore = temporalScores.get(n) || 0.5;
    
    // Boost si score temporel > 0.7 (forte affinité)
    if (temporalScore > 0.7) {
      boostedScores.set(n, Math.min(1, baseScore * (1 + boostFactor)));
    } else if (temporalScore < 0.3) {
      // Légère pénalité si faible affinité
      boostedScores.set(n, baseScore * (1 - boostFactor * 0.5));
    } else {
      boostedScores.set(n, baseScore);
    }
  }
  
  return boostedScores;
}

// ============= FORMULA 7: Momentum Numérique =============

interface MomentumData {
  number: number;
  recentFrequency: number;
  olderFrequency: number;
  momentum: number;
  acceleration: number;
}

/**
 * Calcule le momentum de chaque numéro
 * Momentum = variation de fréquence entre périodes récente et ancienne
 */
export function calculateNumberMomentum(results: DrawResult[]): Map<number, MomentumData> {
  if (results.length < MOMENTUM_LOOKBACK * 2) {
    // Pas assez de données
    const emptyMap = new Map<number, MomentumData>();
    for (let n = 1; n <= 90; n++) {
      emptyMap.set(n, { 
        number: n, 
        recentFrequency: 0, 
        olderFrequency: 0, 
        momentum: 0, 
        acceleration: 0 
      });
    }
    return emptyMap;
  }
  
  const recentResults = results.slice(0, MOMENTUM_LOOKBACK);
  const olderResults = results.slice(MOMENTUM_LOOKBACK, MOMENTUM_LOOKBACK * 2);
  const oldestResults = results.slice(MOMENTUM_LOOKBACK * 2, MOMENTUM_LOOKBACK * 3);
  
  const momentumMap = new Map<number, MomentumData>();
  
  for (let n = 1; n <= 90; n++) {
    const recentCount = recentResults.filter(r => r.winning_numbers.includes(n)).length;
    const olderCount = olderResults.filter(r => r.winning_numbers.includes(n)).length;
    const oldestCount = oldestResults.filter(r => r.winning_numbers.includes(n)).length;
    
    const recentFreq = recentCount / recentResults.length;
    const olderFreq = olderCount / olderResults.length;
    const oldestFreq = oldestResults.length > 0 ? oldestCount / oldestResults.length : olderFreq;
    
    // Momentum = différence de fréquence
    const momentum = recentFreq - olderFreq;
    
    // Accélération = changement du momentum
    const previousMomentum = olderFreq - oldestFreq;
    const acceleration = momentum - previousMomentum;
    
    momentumMap.set(n, {
      number: n,
      recentFrequency: recentFreq,
      olderFrequency: olderFreq,
      momentum,
      acceleration,
    });
  }
  
  return momentumMap;
}

/**
 * Calcule le score de momentum normalisé pour chaque numéro
 */
export function calculateMomentumScores(results: DrawResult[]): Map<number, number> {
  const momentumData = calculateNumberMomentum(results);
  const scores = new Map<number, number>();
  
  // Trouver le momentum max pour normalisation
  let maxMomentum = 0;
  momentumData.forEach(data => {
    maxMomentum = Math.max(maxMomentum, Math.abs(data.momentum));
  });
  
  if (maxMomentum === 0) {
    for (let n = 1; n <= 90; n++) {
      scores.set(n, 0.5);
    }
    return scores;
  }
  
  // Normaliser entre 0 et 1 (0.5 = neutre)
  momentumData.forEach((data, num) => {
    // Score > 0.5 = momentum positif (numéro en hausse)
    // Score < 0.5 = momentum négatif (numéro en baisse)
    const normalizedMomentum = data.momentum / maxMomentum;
    scores.set(num, 0.5 + normalizedMomentum * 0.5);
  });
  
  return scores;
}

/**
 * Applique l'orchestration "Tendance Montante"
 * Priorise les numéros avec momentum et accélération positifs
 */
export function applyRisingTrendBoost(
  baseScores: Map<number, number>,
  results: DrawResult[],
  boostFactor: number = 0.2
): Map<number, number> {
  const momentumData = calculateNumberMomentum(results);
  const boostedScores = new Map<number, number>();
  
  for (let n = 1; n <= 90; n++) {
    const baseScore = baseScores.get(n) || 0;
    const data = momentumData.get(n);
    
    if (!data) {
      boostedScores.set(n, baseScore);
      continue;
    }
    
    // Boost si momentum positif ET accélération positive
    if (data.momentum > MOMENTUM_THRESHOLD && data.acceleration > 0) {
      boostedScores.set(n, Math.min(1, baseScore * (1 + boostFactor)));
    }
    // Pénalité si momentum négatif ET accélération négative
    else if (data.momentum < -MOMENTUM_THRESHOLD && data.acceleration < 0) {
      boostedScores.set(n, baseScore * (1 - boostFactor * 0.5));
    }
    else {
      boostedScores.set(n, baseScore);
    }
  }
  
  return boostedScores;
}

// ============= FORMULA 8: Clustering Spatial =============

interface ZoneDistribution {
  zone: number;
  rangeStart: number;
  rangeEnd: number;
  frequency: number;
  expectedFrequency: number;
  deviation: number;
}

/**
 * Analyse la distribution des numéros par zones
 */
export function analyzeZoneDistribution(results: DrawResult[]): ZoneDistribution[] {
  const zones: ZoneDistribution[] = [];
  const zoneFrequencies = new Array(ZONE_COUNT).fill(0);
  
  // Compter les apparitions par zone
  results.forEach(result => {
    result.winning_numbers.forEach(num => {
      const zoneIndex = Math.floor((num - 1) / 10);
      if (zoneIndex >= 0 && zoneIndex < ZONE_COUNT) {
        zoneFrequencies[zoneIndex]++;
      }
    });
  });
  
  // Calculer les statistiques par zone
  const totalNumbers = results.length * 5;
  const expectedPerZone = totalNumbers / ZONE_COUNT;
  
  for (let i = 0; i < ZONE_COUNT; i++) {
    zones.push({
      zone: i + 1,
      rangeStart: i * 10 + 1,
      rangeEnd: Math.min((i + 1) * 10, 90),
      frequency: zoneFrequencies[i],
      expectedFrequency: expectedPerZone,
      deviation: (zoneFrequencies[i] - expectedPerZone) / expectedPerZone,
    });
  }
  
  return zones;
}

/**
 * Calcule le score spatial pour chaque numéro
 * Favorise les numéros des zones sous-représentées récemment
 */
export function calculateSpatialScores(results: DrawResult[]): Map<number, number> {
  const recentResults = results.slice(0, 20);
  const zones = analyzeZoneDistribution(recentResults);
  const scores = new Map<number, number>();
  
  // Calculer le score basé sur la déviation de zone
  for (let n = 1; n <= 90; n++) {
    const zoneIndex = Math.floor((n - 1) / 10);
    const zone = zones[zoneIndex];
    
    if (zone) {
      // Score inversement proportionnel à la fréquence de la zone
      // Zones sous-représentées ont un score plus élevé
      const score = Math.max(0, 1 - zone.deviation);
      scores.set(n, Math.min(1, score));
    } else {
      scores.set(n, 0.5);
    }
  }
  
  return scores;
}

/**
 * Valide qu'une combinaison a une bonne distribution spatiale
 */
export function validateSpatialDistribution(numbers: number[]): {
  isValid: boolean;
  zonesCovered: number;
  score: number;
} {
  const coveredZones = new Set<number>();
  
  numbers.forEach(num => {
    const zone = Math.floor((num - 1) / 10);
    coveredZones.add(zone);
  });
  
  const zonesCovered = coveredZones.size;
  const isValid = zonesCovered >= OPTIMAL_ZONE_SPREAD - 1; // Au moins 3 zones
  const score = zonesCovered / ZONE_COUNT;
  
  return { isValid, zonesCovered, score };
}

/**
 * Optimise une combinaison pour une meilleure distribution spatiale
 */
export function optimizeSpatialDistribution(
  candidates: number[],
  count: number = 5
): number[] {
  if (candidates.length <= count) {
    return candidates.sort((a, b) => a - b);
  }
  
  // Grouper par zone
  const byZone = new Map<number, number[]>();
  candidates.forEach(num => {
    const zone = Math.floor((num - 1) / 10);
    if (!byZone.has(zone)) {
      byZone.set(zone, []);
    }
    byZone.get(zone)!.push(num);
  });
  
  const selected: number[] = [];
  const zonesUsed = new Set<number>();
  
  // Sélectionner un numéro par zone en priorité
  const sortedZones = Array.from(byZone.entries())
    .sort((a, b) => b[1].length - a[1].length); // Zones avec plus de candidats en premier
  
  for (const [zone, nums] of sortedZones) {
    if (selected.length >= count) break;
    if (!zonesUsed.has(zone) && nums.length > 0) {
      // Prendre le premier numéro de cette zone
      selected.push(nums[0]);
      zonesUsed.add(zone);
    }
  }
  
  // Compléter si nécessaire
  for (const num of candidates) {
    if (selected.length >= count) break;
    if (!selected.includes(num)) {
      selected.push(num);
    }
  }
  
  return selected.slice(0, count).sort((a, b) => a - b);
}

// ============= SCORE COMPOSITE AVANCÉ =============

export interface AdvancedScoreBreakdown {
  temporal: number;
  momentum: number;
  spatial: number;
  combined: number;
}

/**
 * Calcule le score composite avancé en combinant les 3 nouvelles formules
 */
export function calculateAdvancedCompositeScore(
  numbers: number[],
  results: DrawResult[]
): AdvancedScoreBreakdown {
  // Score temporel
  const temporalScores = calculateTemporalResonanceScores(results);
  const temporalScore = numbers.reduce((sum, n) => sum + (temporalScores.get(n) || 0.5), 0) / numbers.length;
  
  // Score momentum
  const momentumScores = calculateMomentumScores(results);
  const momentumScore = numbers.reduce((sum, n) => sum + (momentumScores.get(n) || 0.5), 0) / numbers.length;
  
  // Score spatial
  const spatialValidation = validateSpatialDistribution(numbers);
  const spatialScore = spatialValidation.score;
  
  // Score combiné (pondéré)
  const combined = temporalScore * 0.3 + momentumScore * 0.4 + spatialScore * 0.3;
  
  return {
    temporal: temporalScore,
    momentum: momentumScore,
    spatial: spatialScore,
    combined,
  };
}

/**
 * Génère des narratives pour les formules avancées
 */
export function generateAdvancedNarratives(
  numbers: number[],
  results: DrawResult[]
): string[] {
  const narratives: string[] = [];
  
  // Narrative temporelle
  const temporalScores = calculateTemporalResonanceScores(results);
  const highTemporalNumbers = numbers.filter(n => (temporalScores.get(n) || 0) > 0.7);
  if (highTemporalNumbers.length > 0) {
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const today = dayNames[new Date().getDay()];
    narratives.push(`Affinité ${today}: ${highTemporalNumbers.join(', ')} (forte résonance temporelle)`);
  }
  
  // Narrative momentum
  const momentumData = calculateNumberMomentum(results);
  const risingNumbers = numbers.filter(n => {
    const data = momentumData.get(n);
    return data && data.momentum > MOMENTUM_THRESHOLD && data.acceleration > 0;
  });
  if (risingNumbers.length > 0) {
    narratives.push(`Tendance montante: ${risingNumbers.join(', ')} (momentum positif)`);
  }
  
  // Narrative spatiale
  const spatialValidation = validateSpatialDistribution(numbers);
  if (spatialValidation.zonesCovered >= 4) {
    narratives.push(`Distribution équilibrée: ${spatialValidation.zonesCovered} zones couvertes`);
  }
  
  return narratives;
}
