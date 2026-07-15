import { DrawResult } from '@/hooks/useDrawResults';

export type PoolKind = 'gagnants' | 'machine';

export interface LagResult {
  lag: number;
  pairsCount: number;
  observedOverlap: number; // recouvrement moyen observé (0..1)
  baselineMean: number; // moyenne sous H0 (permutations)
  baselineP95: number; // 95e percentile sous H0
  pValue: number;
  significant: boolean; // p < alpha ajusté (Bonferroni)
}

export interface RecurrenceReport {
  pool: PoolKind;
  monthsAnalyzed: number;
  iterations: number;
  alpha: number;
  adjustedAlpha: number;
  results: LagResult[];
  verdict: string;
}

export interface RecurrenceOptions {
  lags?: number[]; // défaut : 1..12
  iterations?: number; // défaut : 2000
  minDrawsPerMonth?: number; // défaut : 4 (écarte les mois partiels)
  alpha?: number; // défaut : 0.05
  seed?: number; // défaut : 42 (résultats reproductibles)
}

interface MonthPool {
  index: number; // année*12 + (mois-1) → gère les changements d'année
  numbers: Set<number>;
  draws: number;
}

const MIN_PAIRS = 6;

/** PRNG déterministe (mulberry32) pour des permutations reproductibles. */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const round4 = (x: number): number => Math.round(x * 10000) / 10000;

const buildMonthPools = (
  draws: DrawResult[],
  pool: PoolKind,
  minDrawsPerMonth: number
): Map<number, MonthPool> => {
  const byMonth = new Map<number, MonthPool>();
  for (const draw of draws) {
    const numbers = pool === 'gagnants' ? draw.winning_numbers : draw.machine_numbers;
    if (!numbers || numbers.length === 0) continue;
    
    // We expect draw_date to be like YYYY-MM-DD or similar
    const match = /^(\d{4})-(\d{2})/.exec(draw.draw_date);
    if (!match) continue;
    const idx = Number(match[1]) * 12 + (Number(match[2]) - 1);
    let entry = byMonth.get(idx);
    if (!entry) {
      entry = { index: idx, numbers: new Set<number>(), draws: 0 };
      byMonth.set(idx, entry);
    }
    entry.draws += 1;
    for (const n of numbers) entry.numbers.add(n);
  }
  for (const [idx, entry] of byMonth) {
    if (entry.draws < minDrawsPerMonth) byMonth.delete(idx);
  }
  return byMonth;
};

/** Part du pool cible déjà présente dans le pool source (0..1). */
const overlapRatio = (target: Set<number>, source: Set<number>): number => {
  if (target.size === 0) return 0;
  let hits = 0;
  for (const n of target) if (source.has(n)) hits += 1;
  return hits / target.size;
};

const buildVerdict = (pool: PoolKind, results: LagResult[], adjustedAlpha: number): string => {
  const tested = results.filter((r) => Number.isFinite(r.pValue));
  if (tested.length === 0) {
    return `Pool « ${pool} » : historique insuffisant (pas assez de mois complets) pour tester la récurrence.`;
  }
  const hits = tested.filter((r) => r.significant);
  if (hits.length === 0) {
    return (
      `Pool « ${pool} » : aucun décalage testé ne dépasse le hasard (seuil ajusté ${adjustedAlpha.toFixed(4)}). ` +
      `La récurrence perçue est compatible avec un tirage indépendant — ne pas l'encoder en pondération.`
    );
  }
  return (
    `Pool « ${pool} » : décalage(s) ${hits.map((h) => h.lag).join(', ')} significatif(s) après correction. ` +
    `À CONFIRMER sur une période hors échantillon avant toute pondération (risque de sur-ajustement).`
  );
};

/**
 * Test de permutation pur (aucun accès réseau) : fournir l'historique déjà chargé.
 */
export function analyzeSeasonalRecurrence(
  draws: DrawResult[],
  pool: PoolKind,
  options: RecurrenceOptions = {}
): RecurrenceReport {
  const lags = options.lags ?? Array.from({ length: 12 }, (_, i) => i + 1);
  const iterations = options.iterations ?? 2000;
  const minDrawsPerMonth = options.minDrawsPerMonth ?? 4;
  const alpha = options.alpha ?? 0.05;
  const rng = mulberry32(options.seed ?? 42);

  const pools = buildMonthPools(draws, pool, minDrawsPerMonth);
  const monthList = [...pools.values()];
  const adjustedAlpha = alpha / Math.max(1, lags.length);

  const results: LagResult[] = lags.map((lag) => {
    const pairs = monthList
      .filter((m) => pools.has(m.index - lag))
      .map((m) => ({ target: m, source: pools.get(m.index - lag) as MonthPool }));

    if (pairs.length < MIN_PAIRS || monthList.length < 3) {
      return {
        lag,
        pairsCount: pairs.length,
        observedOverlap: NaN,
        baselineMean: NaN,
        baselineP95: NaN,
        pValue: NaN,
        significant: false,
      };
    }

    const observed = mean(pairs.map((p) => overlapRatio(p.target.numbers, p.source.numbers)));

    const baseline: number[] = [];
    let atLeastAsExtreme = 0;
    for (let i = 0; i < iterations; i++) {
      let sum = 0;
      for (const p of pairs) {
        let source: MonthPool = p.target;
        while (source.index === p.target.index) {
          source = monthList[Math.floor(rng() * monthList.length)];
        }
        sum += overlapRatio(p.target.numbers, source.numbers);
      }
      const m = sum / pairs.length;
      baseline.push(m);
      if (m >= observed) atLeastAsExtreme += 1;
    }
    baseline.sort((a, b) => a - b);

    const pValue = (atLeastAsExtreme + 1) / (iterations + 1);
    return {
      lag,
      pairsCount: pairs.length,
      observedOverlap: round4(observed),
      baselineMean: round4(mean(baseline)),
      baselineP95: round4(baseline[Math.min(baseline.length - 1, Math.floor(baseline.length * 0.95))]),
      pValue: round4(pValue),
      significant: pValue < adjustedAlpha,
    };
  });

  return {
    pool,
    monthsAnalyzed: monthList.length,
    iterations,
    alpha,
    adjustedAlpha,
    results,
    verdict: buildVerdict(pool, results, adjustedAlpha),
  };
}
