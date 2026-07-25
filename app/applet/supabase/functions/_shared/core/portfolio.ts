const overlap = (a: number[], b: number[]) => a.filter(n => b.includes(n)).length;

function sampleWithoutReplacement(pi: Float64Array, count: number, rng: () => number): number[] {
  const selected: number[] = [];
  const available = Array.from({ length: 90 }, (_, i) => i + 1);
  const probs = new Float64Array(91);
  for (let k = 1; k <= 90; k++) probs[k] = pi[k];

  while (selected.length < count && available.length > 0) {
    let sum = 0;
    available.forEach(n => { sum += probs[n]; });
    
    if (sum <= 0) {
      // Fallback uniforme si probabilités épuisées
      const idx = Math.floor(rng() * available.length);
      selected.push(available[idx]);
      available.splice(idx, 1);
      continue;
    }

    let r = rng() * sum;
    let chosenIdx = -1;
    for (let i = 0; i < available.length; i++) {
      const num = available[i];
      r -= probs[num];
      if (r <= 0) {
        chosenIdx = i;
        break;
      }
    }

    if (chosenIdx === -1) chosenIdx = available.length - 1;
    const num = available[chosenIdx];
    selected.push(num);
    available.splice(chosenIdx, 1);
  }

  return selected.sort((a, b) => a - b);
}

/**
 * Pénalise les grilles que beaucoup de joueurs human choisissent (dates, suites, chiffres porte-bonheur, zone de somme sur-jouée).
 */
export function popularityPenalty(g: number[]): number {
  let p = 0;
  
  // Dates de naissance (1 à 31)
  p += Math.pow(g.filter(n => n <= 31).length, 2);
  
  // Séquence arithmétique (ex: 5-10-15-20-25)
  if (isArithmetic(g)) p += 6;
  
  // Chiffres consécutifs
  p += consecutiveRuns(g) * 2;
  
  // Chiffres porte-bonheur populaires (multiple de 10, 7, 13)
  p += g.filter(n => n % 10 === 0 || n === 7 || n === 13).length;
  
  // Zone de somme sur-jouée
  const sum = g.reduce((a, b) => a + b, 0);
  if (sum > 180 && sum < 275) p += 2;
  
  return p;
}

function isArithmetic(arr: number[]): boolean {
  if (arr.length < 3) return false;
  const sorted = [...arr].sort((a, b) => a - b);
  const diff = sorted[1] - sorted[0];
  for (let i = 1; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] !== diff) return false;
  }
  return true;
}

function consecutiveRuns(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  let runs = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] === sorted[i] + 1) runs++;
  }
  return runs;
}

/**
 * Portefeuille à recouvrement minimal sous budget, recherche gloutonne + sélection anti-popularité.
 */
export function buildPortfolio(
  pi: Float64Array,
  gridCount: number,
  rng: () => number = Math.random,
  opts: { avoidPopular: boolean } = { avoidPopular: true }
): number[][] {
  const candidates: number[][] = [];
  for (let i = 0; i < 4000; i++) {
    candidates.push(sampleWithoutReplacement(pi, 5, rng));
  }

  const scored = candidates.map(g => ({ g, pop: popularityPenalty(g) }));
  const pool = opts.avoidPopular
    ? scored.sort((a, b) => a.pop - b.pop).slice(0, 800).map(s => s.g)
    : scored.map(s => s.g);

  if (pool.length === 0) return [];

  const chosen: number[][] = [pool[0]];
  while (chosen.length < gridCount && pool.length > chosen.length) {
    let best = pool[0];
    let bestMax = 6;

    for (const g of pool) {
      if (chosen.some(c => c.join(',') === g.join(','))) continue;
      const worst = Math.max(...chosen.map(c => overlap(c, g)));
      if (worst < bestMax) {
        bestMax = worst;
        best = g;
        if (worst === 0) break;
      }
    }
    chosen.push(best);
  }

  return chosen;
}

/**
 * Structure de table des gains pour calcul de l'Espérance Mathématique Réelle.
 * Loto 5/90 typique.
 */
export interface Paytable {
  costPerGrid: number;
  payouts: Record<number, number>; // { 5: jackpot, 4: prize4, 3: prize3, 2: prize2 }
}

export const DEFAULT_LOTO_PAYTABLE: Paytable = {
  costPerGrid: 1.0, // 1 € / Ticket
  payouts: {
    5: 100000,  // Jackpot estimé moyen
    4: 1000,
    3: 50,
    2: 5
  }
};

/**
 * Calculateur d'Espérance Mathématique Réelle E[Gain] = Sum_k P(X=k) * G_k - C
 */
export function calculateExpectedValue(
  grid: number[],
  pi: Float64Array,
  paytable: Paytable = DEFAULT_LOTO_PAYTABLE
): { ev: number; probByMatch: Record<number, number>; netProfitExpected: number } {
  // Calcul exact des probabilités Poisson-Binomiales pour k = 0..5 numéros trouvés
  const probs = grid.map(n => pi[n] || 5 / 90);
  
  // Distribution de la somme de 5 variables de Bernoulli non identiques
  const pmf = new Float64Array(6);
  pmf[0] = 1.0;

  for (const p of probs) {
    for (let k = 5; k >= 1; k--) {
      pmf[k] = pmf[k] * (1 - p) + pmf[k - 1] * p;
    }
    pmf[0] = pmf[0] * (1 - p);
  }

  let totalPayout = 0;
  const probByMatch: Record<number, number> = {};

  for (let k = 0; k <= 5; k++) {
    probByMatch[k] = pmf[k];
    const payout = paytable.payouts[k] || 0;
    totalPayout += pmf[k] * payout;
  }

  const netProfitExpected = totalPayout - paytable.costPerGrid;

  return {
    ev: totalPayout,
    probByMatch,
    netProfitExpected
  };
}
