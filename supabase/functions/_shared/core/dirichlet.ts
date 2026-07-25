export interface PosteriorNumbers {
  pi: Float64Array;        // proba marginale d'apparition, index 1..90
  lower: Float64Array;     // borne 2.5% crédible
  upper: Float64Array;     // borne 97.5%
  effectiveN: number;      // taille d'échantillon effective après oubli
  lambda: number;
}

const K = 90, PICKS = 5;

/**
 * Modèle: q ~ Dirichlet(alpha0/K + npondéré), pik = PICKS * qk
 * lambda = 1 -> aucune décroissance ; lambda < 1 -> oubli exponentiel
 */
export function posteriorDirichlet(
  draws: { draw_date: string; winning_numbers: number[] }[],
  lambda: number,
  alpha0: number,
): PosteriorNumbers {
  const sorted = [...draws].sort(
    (a, b) => +new Date(b.draw_date) - +new Date(a.draw_date),
  );
  const counts = new Float64Array(K + 1);
  let total = 0;

  sorted.forEach((d, age) => {
    const w = Math.pow(lambda, age);
    for (const n of d.winning_numbers) {
      if (n >= 1 && n <= K) { counts[n] += w; total += w; }
    }
  });

  const a0k = alpha0 / K;
  const sumAlpha = alpha0 + total;
  const pi = new Float64Array(K + 1);
  const lower = new Float64Array(K + 1);
  const upper = new Float64Array(K + 1);

  for (let k = 1; k <= K; k++) {
    const a = a0k + counts[k];
    const b = sumAlpha - a;
    pi[k] = PICKS * (a / sumAlpha);
    // marginale Beta(a, b) -> approximation normale suffisante pour a,b > 30
    const m = a / sumAlpha;
    const sd = Math.sqrt((a * b) / (sumAlpha * sumAlpha * (sumAlpha + 1)));
    lower[k] = Math.max(0, PICKS * (m - 1.96 * sd));
    upper[k] = Math.min(1, PICKS * (m + 1.96 * sd));
  }

  return { pi, lower, upper, effectiveN: total / PICKS, lambda };
}

/**
 * Extract the top N predicted numbers based on marginal probability.
 */
export function getTopDirichletPredictions(
  posterior: PosteriorNumbers,
  n: number = 5
): { number: number; probability: number }[] {
  const probList = [];
  for (let k = 1; k <= K; k++) {
    probList.push({ number: k, probability: posterior.pi[k] });
  }
  probList.sort((a, b) => b.probability - a.probability);
  return probList.slice(0, n);
}
