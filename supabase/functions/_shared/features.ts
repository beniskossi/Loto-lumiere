// Advanced Feature Engineering
import type { DrawResult } from "./types.ts";

export interface AdvancedFeatures {
  temporal: TemporalFeatures;
  statistical: StatisticalFeatures;
  correlation: CorrelationFeatures;
}

export interface TemporalFeatures {
  dayOfWeek: number[];
  weekOfMonth: number[];
  month: number[];
  season: number[];
  isWeekend: boolean[];
}

export interface StatisticalFeatures {
  rollingMean: Record<number, number>;
  rollingStd: Record<number, number>;
  skewness: number;
  kurtosis: number;
  entropy: number;
  evenOddRatio: number;
}

export interface CorrelationFeatures {
  numberCorrelation: Record<string, number>;
  temporalCorrelation: number[];
}

export function buildAdvancedFeatures(results: DrawResult[]): AdvancedFeatures {
  return {
    temporal: buildTemporalFeatures(results),
    statistical: buildStatisticalFeatures(results),
    correlation: buildCorrelationFeatures(results),
  };
}

function buildTemporalFeatures(results: DrawResult[]): TemporalFeatures {
  return {
    dayOfWeek: results.map(r => new Date(r.draw_date).getDay()),
    weekOfMonth: results.map(r => Math.ceil(new Date(r.draw_date).getDate() / 7)),
    month: results.map(r => new Date(r.draw_date).getMonth()),
    season: results.map(r => getSeason(new Date(r.draw_date))),
    isWeekend: results.map(r => {
      const day = new Date(r.draw_date).getDay();
      return day === 0 || day === 6;
    }),
  };
}

function buildStatisticalFeatures(results: DrawResult[]): StatisticalFeatures {
  const allNumbers = results.flatMap(r => r.winning_numbers);

  return {
    rollingMean: calculateRollingMean(results, 10),
    rollingStd: calculateRollingStd(results, 10),
    skewness: calculateSkewness(allNumbers),
    kurtosis: calculateKurtosis(allNumbers),
    entropy: calculateEntropy(results),
    evenOddRatio: calculateEvenOddRatio(results),
  };
}

function buildCorrelationFeatures(results: DrawResult[]): CorrelationFeatures {
  return {
    numberCorrelation: calculateNumberCorrelation(results),
    temporalCorrelation: calculateTemporalCorrelation(results),
  };
}

function getSeason(date: Date): number {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 0; // Spring
  if (month >= 5 && month <= 7) return 1; // Summer
  if (month >= 8 && month <= 10) return 2; // Fall
  return 3; // Winter
}

function calculateRollingMean(results: DrawResult[], window: number): Record<number, number> {
  const means: Record<number, number> = {};

  for (let num = 1; num <= 90; num++) {
    let sum = 0;
    for (let i = 0; i < Math.min(window, results.length); i++) {
      if (results[i].winning_numbers.includes(num)) sum++;
    }
    means[num] = sum / Math.min(window, results.length);
  }

  return means;
}

function calculateRollingStd(results: DrawResult[], window: number): Record<number, number> {
  const stds: Record<number, number> = {};
  const means = calculateRollingMean(results, window);

  for (let num = 1; num <= 90; num++) {
    let sumSq = 0;
    for (let i = 0; i < Math.min(window, results.length); i++) {
      const val = results[i].winning_numbers.includes(num) ? 1 : 0;
      sumSq += Math.pow(val - means[num], 2);
    }
    stds[num] = Math.sqrt(sumSq / Math.min(window, results.length));
  }

  return stds;
}

function calculateSkewness(numbers: number[]): number {
  const n = numbers.length;
  const mean = numbers.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(numbers.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n);

  const skew = numbers.reduce((sum, x) => sum + Math.pow((x - mean) / std, 3), 0) / n;
  return skew;
}

function calculateKurtosis(numbers: number[]): number {
  const n = numbers.length;
  const mean = numbers.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(numbers.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n);

  const kurt = numbers.reduce((sum, x) => sum + Math.pow((x - mean) / std, 4), 0) / n;
  return kurt - 3; // Excess kurtosis
}

function calculateEntropy(results: DrawResult[]): number {
  const freq: Record<number, number> = {};
  for (let i = 1; i <= 90; i++) freq[i] = 0;

  results.forEach(r => {
    r.winning_numbers.forEach(num => freq[num]++);
  });

  const total = Object.values(freq).reduce((a, b) => a + b, 0);
  let entropy = 0;

  for (let i = 1; i <= 90; i++) {
    if (freq[i] > 0) {
      const p = freq[i] / total;
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

function calculateEvenOddRatio(results: DrawResult[]): number {
  let evenCount = 0;
  let oddCount = 0;

  results.forEach(r => {
    r.winning_numbers.forEach(num => {
      if (num % 2 === 0) evenCount++;
      else oddCount++;
    });
  });

  return evenCount / (oddCount + evenCount);
}

function calculateNumberCorrelation(results: DrawResult[]): Record<string, number> {
  const correlations: Record<string, number> = {};

  for (let i = 1; i <= 90; i++) {
    for (let j = i + 1; j <= 90; j++) {
      let coOccurrence = 0;
      results.forEach(r => {
        if (r.winning_numbers.includes(i) && r.winning_numbers.includes(j)) {
          coOccurrence++;
        }
      });
      correlations[`${i}-${j}`] = coOccurrence / results.length;
    }
  }

  return correlations;
}

function calculateTemporalCorrelation(results: DrawResult[]): number[] {
  const correlations: number[] = [];

  for (let lag = 1; lag <= 5; lag++) {
    let correlation = 0;
    for (let i = 0; i < results.length - lag; i++) {
      const current = results[i].winning_numbers;
      const lagged = results[i + lag].winning_numbers;
      const overlap = current.filter(n => lagged.includes(n)).length;
      correlation += overlap / 5;
    }
    correlations.push(correlation / (results.length - lag));
  }

  return correlations;
}
