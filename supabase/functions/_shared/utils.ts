// Utilitaires partagés pour les calculs de prédiction

import type { DrawResult } from "./types.ts";

/**
 * Génère une prédiction aléatoire de 5 numéros entre 1 et 90
 */
export function generateRandomPrediction(): number[] {
  const numbers = new Set<number>();
  while (numbers.size < 5) {
    numbers.add(Math.floor(Math.random() * 90) + 1);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

/**
 * Retourne le groupe de couleur d'un numéro (1-90)
 */
export function getNumberColorGroup(number: number): string {
  if (number >= 1 && number <= 9) return 'white';
  if (number >= 10 && number <= 19) return 'blue';
  if (number >= 20 && number <= 29) return 'green';
  if (number >= 30 && number <= 39) return 'indigo';
  if (number >= 40 && number <= 49) return 'yellow';
  if (number >= 50 && number <= 59) return 'pink';
  if (number >= 60 && number <= 69) return 'orange';
  if (number >= 70 && number <= 79) return 'gray';
  if (number >= 80 && number <= 90) return 'red';
  return 'unknown';
}

/**
 * Sélectionne des numéros équilibrés par groupe de couleurs
 */
export function selectBalancedNumbers(candidates: number[], count: number): number[] {
  if (candidates.length <= count) {
    return candidates.sort((a, b) => a - b);
  }

  const colorGroups: Record<string, number[]> = {};
  candidates.forEach(num => {
    const group = getNumberColorGroup(num);
    if (!colorGroups[group]) {
      colorGroups[group] = [];
    }
    colorGroups[group].push(num);
  });

  const selected: number[] = [];
  const groupKeys = Object.keys(colorGroups);
  
  // Prendre un numéro de chaque groupe
  for (let i = 0; i < groupKeys.length && selected.length < count; i++) {
    const group = groupKeys[i];
    if (colorGroups[group].length > 0) {
      const numberToAdd = colorGroups[group].shift();
      if (numberToAdd) {
        selected.push(numberToAdd);
      }
    }
  }

  // Compléter avec les candidats restants
  const remainingCandidates = candidates.filter(num => !selected.includes(num));
  while (selected.length < count && remainingCandidates.length > 0) {
    selected.push(remainingCandidates.shift()!);
  }

  return selected.slice(0, count).sort((a, b) => a - b);
}

/**
 * Calcule la qualité des données en fonction de plusieurs métriques
 */
export function calculateDataQuality(results: DrawResult[]): number {
  if (results.length === 0) return 0;

  // Facteurs de qualité
  const sizeScore = Math.min(1, results.length / 100); // Optimal à 100+ résultats
  
  // Fraîcheur des données (moins de 7 jours = parfait)
  const newest = results.length > 0 ? new Date(results[0].draw_date) : new Date();
  const daysSinceNewest = (Date.now() - newest.getTime()) / (1000 * 60 * 60 * 24);
  const freshnessScore = Math.max(0, 1 - daysSinceNewest / 7);
  
  // Complétude (moins de données manquantes)
  const completenessScore = results.filter(r => 
    r.winning_numbers && r.winning_numbers.length === 5
  ).length / results.length;
  
  // Score final pondéré
  return (
    sizeScore * 0.4 +
    freshnessScore * 0.3 +
    completenessScore * 0.3
  );
}

/**
 * Calcule la fraîcheur des données (0-1)
 */
export function calculateFreshness(results: DrawResult[]): number {
  if (results.length === 0) return 0;
  
  const newest = new Date(results[0].draw_date);
  const daysSinceNewest = (Date.now() - newest.getTime()) / (1000 * 60 * 60 * 24);
  
  return Math.max(0, 1 - daysSinceNewest / 7);
}

/**
 * Calcule des statistiques simples sur les résultats
 */
export function calculateSimpleFrequency(results: DrawResult[]): Record<number, number> {
  const freq: Record<number, number> = {};
  for (let i = 1; i <= 90; i++) freq[i] = 0;
  
  results.forEach(result => {
    result.winning_numbers.forEach(num => {
      freq[num]++;
    });
  });
  
  return freq;
}

/**
 * Normalise des scores entre 0 et 1
 */
export function normalizeScores(scores: Record<number, number>): Record<number, number> {
  const values = Object.values(scores);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  
  if (range === 0) return scores;
  
  const normalized: Record<number, number> = {};
  for (const [key, value] of Object.entries(scores)) {
    normalized[Number(key)] = (value - min) / range;
  }
  
  return normalized;
}

/**
 * Sélectionne les top N numéros avec randomisation pondérée
 */
export function selectWithRandomization(candidates: number[], count: number): number[] {
  const selected: number[] = [];
  const pool = [...candidates];

  while (selected.length < count && pool.length > 0) {
    // Sélection aléatoire pondérée (favorise les premiers)
    const weights = pool.map((_, i) => Math.pow(0.8, i));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    let selectedIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    selected.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }

  return selected.sort((a, b) => a - b);
}

/**
 * Calcule la corrélation entre deux numéros
 */
export function calculatePairCorrelation(
  results: DrawResult[],
  num1: number,
  num2: number
): number {
  let both = 0, only1 = 0, only2 = 0, none = 0;
  
  results.forEach(r => {
    const has1 = r.winning_numbers.includes(num1);
    const has2 = r.winning_numbers.includes(num2);
    
    if (has1 && has2) both++;
    else if (has1) only1++;
    else if (has2) only2++;
    else none++;
  });

  const n = results.length;
  const numerator = (both * none - only1 * only2);
  const denominator = Math.sqrt(
    (both + only1) * (only2 + none) * (both + only2) * (only1 + none)
  );

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calcule la variance d'une série de données
 */
export function calculateVariance(data: DrawResult[]): number {
  const frequencies: Map<number, number> = new Map();
  
  data.forEach(draw => {
    draw.winning_numbers.forEach(num => {
      frequencies.set(num, (frequencies.get(num) || 0) + 1);
    });
  });

  const values = Array.from(frequencies.values());
  if (values.length === 0) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce(
    (sum, val) => sum + Math.pow(val - mean, 2), 
    0
  ) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Logger amélioré pour les edge functions
 */
export function log(level: "info" | "warn" | "error", message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const safeData = data ? sanitizeLogData(data) : null;
  const logData = safeData ? ` | ${JSON.stringify(safeData)}` : "";
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${logData}`);
}

function sanitizeLogData(data: any): any {
  if (typeof data === 'string') {
    return data.replace(/[\r\n\t]/g, ' ').substring(0, 200);
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = value.replace(/[\r\n\t]/g, ' ').substring(0, 100);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return data;
}
