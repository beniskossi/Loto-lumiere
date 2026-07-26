/**
 * Statistical Engine: Dirichlet-Multinomial Model with Exponential Decay
 * 
 * LOTO LUMIERE - Full-Stack Analytical Engine
 * 
 * Model specification:
 * - Prior: q ~ Dirichlet(alpha_0 / K, ..., alpha_0 / K) where K = 90
 * - Likelihood: Multinomial distribution with exponential time-decay weighting w = lambda^age
 * - Posterior: q | X ~ Dirichlet(alpha_1, ..., alpha_K)
 *   where alpha_k = (alpha_0 / K) + sum_{t} (lambda^t * I(n_t == k))
 * - Marginal probability pi_k = PICKS * (alpha_k / sum(alpha)) where PICKS = 5
 * - Credible Intervals: 95% Bayesian credible interval derived from Marginal Beta(alpha_k, sum(alpha) - alpha_k)
 */

export interface DrawInput {
  draw_date: string | Date;
  winning_numbers: number[];
}

export interface PosteriorNumbers {
  /** Marginal probability of appearing in a draw for numbers 1..90 (index 1-based, 1..90) */
  pi: Float64Array;
  /** Lower bound of 95% credible interval */
  lower: Float64Array;
  /** Upper bound of 95% credible interval */
  upper: Float64Array;
  /** Effective sample size after exponential decay */
  effectiveN: number;
  /** Decay rate lambda used (0 < lambda <= 1) */
  lambda: number;
  /** Concentration parameter alpha0 used */
  alpha0: number;
}

export interface DirichletPrediction {
  number: number;
  probability: number;
  lowerCI: number;
  upperCI: number;
}

const TOTAL_NUMBERS = 90;
const DRAW_SIZE = 5;

/**
 * Calculates the Dirichlet posterior distribution over numbers 1..90
 * given historical draws and exponential decay parameters.
 *
 * @param draws Array of historical draw objects with draw_date and winning_numbers
 * @param lambda Exponential decay factor (default: 0.985, where 1.0 = no decay)
 * @param alpha0 Prior concentration parameter (default: 1.0, uninformative prior)
 * @returns PosteriorNumbers object with marginal probabilities and credible intervals
 */
export function posteriorDirichlet(
  draws: DrawInput[],
  lambda: number = 0.985,
  alpha0: number = 1.0
): PosteriorNumbers {
  const safeLambda = Math.max(0.0001, Math.min(1.0, lambda));
  const safeAlpha0 = Math.max(0.0001, alpha0);

  // Sort draws descending by date (most recent first = age 0)
  const sortedDraws = [...draws].sort((a, b) => {
    const dateA = new Date(a.draw_date).getTime();
    const dateB = new Date(b.draw_date).getTime();
    return dateB - dateA;
  });

  const counts = new Float64Array(TOTAL_NUMBERS + 1);
  let totalWeightedPicks = 0;

  sortedDraws.forEach((d, age) => {
    const weight = Math.pow(safeLambda, age);
    if (!Array.isArray(d.winning_numbers)) return;

    for (const num of d.winning_numbers) {
      if (typeof num === "number" && num >= 1 && num <= TOTAL_NUMBERS) {
        counts[num] += weight;
        totalWeightedPicks += weight;
      }
    }
  });

  const alpha0PerNumber = safeAlpha0 / TOTAL_NUMBERS;
  const sumAlpha = safeAlpha0 + totalWeightedPicks;

  const pi = new Float64Array(TOTAL_NUMBERS + 1);
  const lower = new Float64Array(TOTAL_NUMBERS + 1);
  const upper = new Float64Array(TOTAL_NUMBERS + 1);

  for (let k = 1; k <= TOTAL_NUMBERS; k++) {
    const alphaK = alpha0PerNumber + counts[k];
    const betaK = sumAlpha - alphaK;

    // Expected marginal probability for drawing number k in a single pick
    const meanPickProba = alphaK / sumAlpha;
    // Marginal probability for appearing in a 5-ball draw (without replacement approximation)
    pi[k] = DRAW_SIZE * meanPickProba;

    // Variance for Beta(alphaK, betaK) distribution
    const variance = (alphaK * betaK) / (sumAlpha * sumAlpha * (sumAlpha + 1));
    const stdDev = Math.sqrt(Math.max(0, variance));

    // 95% Normal approximation for Beta credible interval
    lower[k] = Math.max(0, DRAW_SIZE * (meanPickProba - 1.96 * stdDev));
    upper[k] = Math.min(1, DRAW_SIZE * (meanPickProba + 1.96 * stdDev));
  }

  const effectiveN = totalWeightedPicks / DRAW_SIZE;

  return {
    pi,
    lower,
    upper,
    effectiveN,
    lambda: safeLambda,
    alpha0: safeAlpha0,
  };
}

/**
 * Extract top N predicted numbers based on posterior marginal probability.
 *
 * @param posterior The calculated Dirichlet posterior
 * @param topN Number of predictions to retrieve (default: 5)
 */
export function getTopDirichletPredictions(
  posterior: PosteriorNumbers,
  topN: number = 5
): DirichletPrediction[] {
  const list: DirichletPrediction[] = [];

  for (let k = 1; k <= TOTAL_NUMBERS; k++) {
    list.push({
      number: k,
      probability: posterior.pi[k],
      lowerCI: posterior.lower[k],
      upperCI: posterior.upper[k],
    });
  }

  list.sort((a, b) => b.probability - a.probability);
  return list.slice(0, Math.min(TOTAL_NUMBERS, topN));
}

/**
 * Calculates a joint probability score for a given set of 5 numbers under the posterior distribution.
 */
export function scoreCombinationDirichlet(
  numbers: number[],
  posterior: PosteriorNumbers
): number {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;

  let sumProba = 0;
  let count = 0;

  for (const num of numbers) {
    if (num >= 1 && num <= TOTAL_NUMBERS) {
      sumProba += posterior.pi[num];
      count++;
    }
  }

  if (count === 0) return 0;
  return sumProba / count;
}
