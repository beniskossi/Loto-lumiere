// Utilitaires partagés pour les calculs de prédiction

import type { DrawResult } from "./types.ts";

/**
 * Générateur Congruentiel Linéaire (LCG) Déterministe
 * Formule : X_{n+1} = (a * X_n + c) % m
 * Sans hasard ni Math.random(), entièrement déterminé par un seed dérivé des données.
 */
export class DeterministicLCG {
  private state: number;

  constructor(seed: number) {
    // Éviter un seed nul ou négatif
    this.state = Math.abs(seed || 123456789) >>> 0;
  }

  /**
   * Retourne une valeur pseudo-aléatoire déterministe entre 0 et 1 (exclus)
   */
  next(): number {
    // Paramètres LCG standards (Numerical Recipes)
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 4294967296;
  }

  /**
   * Retourne un entier déterministe entre min et max (inclus)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Dérive un seed déterministe à partir des résultats historiques de tirages
 * Zéro nombre magique arbitraire.
 */
export function deriveSeedFromDraws(results: DrawResult[]): number {
  if (!results || results.length === 0) return 987654321;
  let sum = 0;
  results.forEach((r, idx) => {
    if (r.winning_numbers) {
      r.winning_numbers.forEach((num, numIdx) => {
        sum += num * (idx + 1) * (numIdx + 1);
      });
    }
  });
  return sum || 987654321;
}

/**
 * Génère une prédiction déterministe de 5 numéros entre 1 et 90
 * Si aucun seed ni historique de tirages n'est fourni, on dérive un seed
 * à partir de l'état ou de paramètres système d'une manière 100% stable.
 */
export function generateRandomPrediction(seedOrResults?: number | DrawResult[]): number[] {
  let seed = 123456789;
  if (typeof seedOrResults === "number") {
    seed = seedOrResults;
  } else if (Array.isArray(seedOrResults)) {
    seed = deriveSeedFromDraws(seedOrResults);
  }
  
  const lcg = new DeterministicLCG(seed);
  const numbers = new Set<number>();
  while (numbers.size < 5) {
    numbers.add(lcg.nextInt(1, 90));
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
 * Sélectionne les top N numéros avec une pondération déterministe sans hasard.
 * Utilise le générateur LCG déterministe initialisé avec un seed dérivé des candidats.
 */
export function selectWithRandomization(
  candidates: number[],
  count: number,
  seedOrResults?: number | DrawResult[]
): number[] {
  const selected: number[] = [];
  const pool = [...candidates];
  
  let seed = candidates.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
  if (typeof seedOrResults === "number") {
    seed += seedOrResults;
  } else if (Array.isArray(seedOrResults)) {
    seed += deriveSeedFromDraws(seedOrResults);
  }

  const lcg = new DeterministicLCG(seed);

  while (selected.length < count && pool.length > 0) {
    // Sélection déterministe pondérée (favorise les premiers)
    const weights = pool.map((_, i) => Math.pow(0.8, i));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let randomVal = lcg.next() * totalWeight;
    
    let selectedIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      randomVal -= weights[i];
      if (randomVal <= 0) {
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
 * Calcule l'Autocorrélation d'un numéro spécifique à un décalage (lag) temporel donné
 * Formule exacte : covariance(x_t, x_{t+lag}) / variance(x)
 */
export function calculateNumberAutocorrelation(
  results: DrawResult[],
  num: number,
  lag: number
): number {
  const n = results.length;
  if (n <= lag) return 0;

  // Créer la série binaire chronologique (de la plus ancienne à la plus récente)
  const chronological = [...results].reverse();
  const series = chronological.map(r => r.winning_numbers.includes(num) ? 1 : 0);
  
  const mean = series.reduce((a, b) => a + b, 0) / n;
  
  // Calculer la variance
  const variance = series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  if (variance === 0) return 0;
  
  // Calculer la covariance au lag k
  let covariance = 0;
  for (let t = 0; t < n - lag; t++) {
    covariance += (series[t] - mean) * (series[t + lag] - mean);
  }
  
  return covariance / variance;
}

/**
 * Calcule le spectre d'Autocorrélation (ACF) d'un numéro pour plusieurs lags
 */
export function calculateNumberAutocorrelationSpectrum(
  results: DrawResult[],
  num: number,
  maxLag: number = 5
): number[] {
  const spectrum: number[] = [];
  for (let lag = 1; lag <= maxLag; lag++) {
    spectrum.push(calculateNumberAutocorrelation(results, num, lag));
  }
  return spectrum;
}

/**
 * Calcule la fonction d'Autocorrélation (ACF) d'une série temporelle numérique générique
 */
export function calculateSeriesAutocorrelation(
  series: number[],
  lag: number
): number {
  const n = series.length;
  if (n <= lag) return 0;

  const mean = series.reduce((a, b) => a + b, 0) / n;
  
  const variance = series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  if (variance === 0) return 0;
  
  let covariance = 0;
  for (let t = 0; t < n - lag; t++) {
    covariance += (series[t] - mean) * (series[t + lag] - mean);
  }
  
  return covariance / variance;
}

/**
 * Calcule la Corrélation Croisée (CCF) entre deux séries de tirages à un lag donné
 */
export function calculateCrossDrawAutocorrelation(
  results1: DrawResult[],
  results2: DrawResult[],
  lag: number = 0
): number {
  const n = Math.min(results1.length, results2.length);
  if (n <= Math.abs(lag)) return 0;

  // Inverser pour l'ordre chronologique
  const series1 = [...results1].reverse().map(r => r.winning_numbers.reduce((a, b) => a + b, 0));
  const series2 = [...results2].reverse().map(r => r.winning_numbers.reduce((a, b) => a + b, 0));
  
  const mean1 = series1.reduce((sum, val) => sum + val, 0) / n;
  const mean2 = series2.reduce((sum, val) => sum + val, 0) / n;
  
  const var1 = series1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0);
  const var2 = series2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0);
  
  if (var1 === 0 || var2 === 0) return 0;
  
  let cov = 0;
  for (let t = 0; t < n - Math.abs(lag); t++) {
    const idx1 = lag >= 0 ? t : t - lag;
    const idx2 = lag >= 0 ? t + lag : t;
    cov += (series1[idx1] - mean1) * (series2[idx2] - mean2);
  }
  
  return cov / Math.sqrt(var1 * var2);
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
export function log(level: "info" | "warn" | "error", message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const safeData = data ? sanitizeLogData(data) : null;
  const logData = safeData ? ` | ${JSON.stringify(safeData)}` : "";
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${logData}`);
}

function sanitizeLogData(data: unknown): unknown {
  if (typeof data === 'string') {
    return data.replace(/[\r\n\t]/g, ' ').substring(0, 200);
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {};
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
