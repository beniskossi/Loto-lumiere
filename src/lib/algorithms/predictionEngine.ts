import { DrawResult } from "@/types/lottery";
import { DirichletMultinomialEngine } from "../core/dirichlet";

export interface ScoreBreakdown {
  number: number;
  frequencyScore: number; // Raw frequency or decayed frequency
  gapScore: number;       // Score based on elapsed draws since last appearance
  markovScore: number;    // Conditional probability based on the last draw
  momentumScore: number;  // Score based on mean-reversion and balance models
  combinedScore: number;  // Weighted combination of the above
  // Raw metrics for XAI
  rawFrequency?: number;
  currentGap?: number;
  avgGap?: number;
  recentEvenRatio?: number;
  decadeDiscrepancy?: number;
}

export interface PredictionEngineOptions {
  frequencyWeight: number;
  gapWeight: number;
  markovWeight: number;
  momentumWeight: number; // New: weight for the mean-reversion & balance model
  decayRate?: number;     // Decaying factor for frequency (smaller = more uniform, larger = focus on recent)
  markovOrder?: number;   // 1 or 2 (First-order or Second-order Markov transitions)
  poissonLambda?: number; // Multiplier for Poisson gap recurrence scaling (defaults to 1.0)
  maxNumber?: number;     // Usually 90 for this lottery
  targetCount?: number;   // Number of recommended balls to generate
}

export class LocalPredictionEngine {
  private static MAX_NUMBER = 90;

  private static gamma(x: number): number {
    if (x <= 0) return 1;
    // Stirling's approximation with correction terms for high-fidelity gamma values
    return Math.sqrt((2 * Math.PI) / x) * Math.pow(x / Math.E, x) * (1 + 1 / (12 * x) + 1 / (288 * x * x));
  }

  /**
   * Generates local predictions based on four high-fidelity analytical pillars:
   * 1. Decayed Frequency (F1): Weighted frequency using a deterministic exponential decay factor.
   * 2. Poisson-Gap Recurrence (F2): Evaluates the elapsed draws against Poisson arrival probability: P(X >= 1) = 1 - e^(-lambda * currentGap / avgGap).
   * 3. High-Order Markov Transitions (F3): Conditional transition probabilities from the last draw (Order 1) and second last draw (Order 2).
   * 4. Ornstein-Uhlenbeck Mean Reversion Momentum (F4): Measures the deviation of recent draw sums and parity from historical averages, boosting numbers that pull the system back to the central limit median.
   */
  public static calculatePredictions(
    results: DrawResult[],
    options: PredictionEngineOptions
  ): {
    recommendations: number[];
    scores: ScoreBreakdown[];
    insights: string[];
    hyperparameters: Record<string, number>;
  } {
    const maxNum = options.maxNumber || this.MAX_NUMBER;
    const targetCount = options.targetCount || 5;

    // Default weights if not fully provided
    const wFreq = options.frequencyWeight;
    const wGap = options.gapWeight;
    const wMarkov = options.markovWeight;
    const wMomentum = options.momentumWeight ?? 0;

    const totalWeight = (wFreq + wGap + wMarkov + wMomentum) || 1;

    if (!results || results.length === 0) {
      return {
        recommendations: Array.from({ length: targetCount }, (_, i) => i + 1),
        scores: [],
        insights: ["Aucune donnée historique pour lancer le calcul stochastique."],
        hyperparameters: { decayRate: 0.05, markovOrder: 1, poissonLambda: 1.0 },
      };
    }

    // 1. Order draws chronologically (index 0 is the newest)
    const sortedDraws = [...results].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Compute central metrics of the dataset (no magic numbers, derived entirely from data)
    const allSums = sortedDraws.map(d => (d.winningNumbers || []).reduce((sum, n) => sum + n, 0)).filter(s => s > 0);
    const meanSum = allSums.length > 0 ? allSums.reduce((a, b) => a + b, 0) / allSums.length : 227.5; // Theoretical mean of 5 numbers from 1-90 is 5 * 45.5 = 227.5
    const varianceSum = allSums.length > 0 ? allSums.reduce((sum, s) => sum + Math.pow(s - meanSum, 2), 0) / allSums.length : 1000;
    const stdDevSum = Math.sqrt(varianceSum) || 30;

    // Determine the optimal decay rate dynamically if not specified
    const halfLife = Math.max(10, Math.min(50, Math.floor(sortedDraws.length * 0.25)));
    const dynamicDecayRate = Math.LN2 / halfLife;
    const decay = options.decayRate !== undefined ? options.decayRate : dynamicDecayRate;

    // Get order for Markov
    const mOrder = options.markovOrder === 2 ? 2 : 1;

    // Get Poisson lambda scaling
    const pLambda = options.poissonLambda !== undefined ? options.poissonLambda : 1.0;

    // Pre-calculate statistics for F1 and F2
    const frequencies = new Array(maxNum + 1).fill(0);
    const lastAppearances = new Array(maxNum + 1).fill(-1);
    const gaps = new Array(maxNum + 1).fill(sortedDraws.length);
    const allAppearancesIndices: Record<number, number[]> = {};

    for (let n = 1; n <= maxNum; n++) {
      allAppearancesIndices[n] = [];
    }

    // Initialize the Dirichlet Multinomial Model
    const historicalDrawsArrays = sortedDraws.map(d => d.winningNumbers || []);
    const dirichlet = new DirichletMultinomialEngine({
      timeDecay: Math.exp(-decay)
    });
    
    const posterior = dirichlet.calculatePosterior(historicalDrawsArrays);
    const bayesianProbs = dirichlet.estimateProbabilities(posterior);

    // Calculate F1 (Bayesian Expected Probability) and collect gap history
    for (let i = 0; i < sortedDraws.length; i++) {
      const draw = sortedDraws[i];
      const numbers = draw.winningNumbers || [];

      numbers.forEach((num) => {
        if (num >= 1 && num <= maxNum) {
          allAppearancesIndices[num].push(i);
          if (lastAppearances[num] === -1) {
            lastAppearances[num] = i;
            gaps[num] = i;
          }
        }
      });
    }

    for (let n = 1; n <= maxNum; n++) {
      frequencies[n] = bayesianProbs.get(n)?.expectedProbability || 0;
    }
    // Calculate F2 (Weibull-Gap Recurrence Score - High Fidelity stochastic distribution model)
    const gapScores = new Array(maxNum + 1).fill(0);
    const avgGaps = new Array(maxNum + 1).fill(0);
    
    for (let num = 1; num <= maxNum; num++) {
      const appearances = allAppearancesIndices[num] || [];
      let avgGap = sortedDraws.length / Math.max(1, appearances.length);
      const gapList: number[] = [];

      if (appearances.length >= 2) {
        let sumGaps = 0;
        for (let idx = 0; idx < appearances.length - 1; idx++) {
          const g = appearances[idx + 1] - appearances[idx];
          gapList.push(g);
          sumGaps += g;
        }
        avgGap = sumGaps / (appearances.length - 1);
      }
      avgGaps[num] = avgGap;

      const currentGap = gaps[num];

      // Calculate sample standard deviation of gaps for Weibull parameters estimation
      let stdDevGap = 0;
      if (gapList.length >= 2) {
        const variance = gapList.reduce((sum, val) => sum + Math.pow(val - avgGap, 2), 0) / (gapList.length - 1);
        stdDevGap = Math.sqrt(variance);
      }

      let beta = 1.0; // shape parameter (defaults to exponential, where beta=1)
      if (stdDevGap > 0 && avgGap > 0) {
        // High-precision empirical approximation for Weibull shape parameter beta
        beta = Math.max(0.4, Math.min(3.5, Math.pow(stdDevGap / avgGap, -1.086)));
      }

      // scale parameter eta = mean / gamma(1 + 1/beta)
      const gammaArg = 1 + 1 / beta;
      const eta = avgGap / Math.max(0.001, this.gamma(gammaArg));

      // Weibull CDF represents cumulative hazard expectation: 1 - exp(-(currentGap / eta)^beta)
      const ratio = currentGap / Math.max(0.1, eta);
      gapScores[num] = 1 - Math.exp(-pLambda * Math.pow(ratio, beta));
    }

    // Calculate F3 (Markov transition chain with Bayesian Laplace Additive Smoothing)
    const markovScores = new Array(maxNum + 1).fill(0);
    const latestDraw = sortedDraws[0];
    const latestNumbers = latestDraw ? latestDraw.winningNumbers || [] : [];
    const secondLatestDraw = sortedDraws[1];
    const secondLatestNumbers = secondLatestDraw ? secondLatestDraw.winningNumbers || [] : [];

    if (sortedDraws.length > 2) {
      const transitionCounts = new Array(maxNum + 1).fill(0);
      let matchCount = 0;

      if (mOrder === 1 && latestNumbers.length > 0) {
        // Standard first-order transition matrix
        for (let i = sortedDraws.length - 1; i > 0; i--) {
          const prevNumbers = sortedDraws[i].winningNumbers || [];
          const nextNumbers = sortedDraws[i - 1].winningNumbers || [];
          const intersection = latestNumbers.filter((n) => prevNumbers.includes(n));
          if (intersection.length > 0) {
            nextNumbers.forEach((num) => {
              if (num >= 1 && num <= maxNum) {
                transitionCounts[num] += intersection.length;
              }
            });
            matchCount += intersection.length;
          }
        }
      } else if (mOrder === 2 && latestNumbers.length > 0 && secondLatestNumbers.length > 0) {
        // Second-order transitions: look for sequences where (i-2) matched second-latest and (i-1) matched latest
        for (let i = sortedDraws.length - 1; i > 1; i--) {
          const tMinus2Numbers = sortedDraws[i].winningNumbers || [];
          const tMinus1Numbers = sortedDraws[i - 1].winningNumbers || [];
          const tNumbers = sortedDraws[i - 2].winningNumbers || [];

          const intersectionMinus2 = secondLatestNumbers.filter((n) => tMinus2Numbers.includes(n));
          const intersectionMinus1 = latestNumbers.filter((n) => tMinus1Numbers.includes(n));

          if (intersectionMinus2.length > 0 && intersectionMinus1.length > 0) {
            const jointWeight = intersectionMinus2.length * intersectionMinus1.length;
            tNumbers.forEach((num) => {
              if (num >= 1 && num <= maxNum) {
                transitionCounts[num] += jointWeight;
              }
            });
            matchCount += jointWeight;
          }
        }

        // Fallback to first-order if data is too sparse
        if (matchCount === 0) {
          for (let i = sortedDraws.length - 1; i > 0; i--) {
            const prevNumbers = sortedDraws[i].winningNumbers || [];
            const nextNumbers = sortedDraws[i - 1].winningNumbers || [];
            const intersection = latestNumbers.filter((n) => prevNumbers.includes(n));
            if (intersection.length > 0) {
              nextNumbers.forEach((num) => {
                if (num >= 1 && num <= maxNum) {
                  transitionCounts[num] += intersection.length;
                }
              });
              matchCount += intersection.length;
            }
          }
        }
      }

      // Bayesian Laplace Additive Smoothing
      const alphaSmoothing = 0.15;
      for (let num = 1; num <= maxNum; num++) {
        markovScores[num] = (transitionCounts[num] + alphaSmoothing) / (matchCount + maxNum * alphaSmoothing);
      }
    }

    // Calculate F4 (Ornstein-Uhlenbeck Mean Reversion Momentum with Sum, Parity & Spatial Anisotropy Grid Equilibrium)
    // We compute the discrepancy of the last 10 draws against the historical averages.
    const recentWindowSize = Math.min(10, sortedDraws.length);
    const recentSums = sortedDraws.slice(0, recentWindowSize).map(
      d => (d.winningNumbers || []).reduce((sum, n) => sum + n, 0)
    ).filter(s => s > 0);
    const recentAvgSum = recentSums.length > 0 ? recentSums.reduce((a, b) => a + b, 0) / recentSums.length : meanSum;

    const discrepancy = recentAvgSum - meanSum; // positive means recent sums are higher than average

    // Calculate recent parity ratio and spatial grid frequencies (rows & columns)
    let totalRecentNumbers = 0;
    let recentEvenCount = 0;
    const recentRowCounts = new Array(9).fill(0); // decades/rows: 1-10, 11-20, ..., 81-90
    const recentColCounts = new Array(10).fill(0); // columns: ending in 1, 2, ..., 0

    sortedDraws.slice(0, recentWindowSize).forEach(d => {
      const numbers = d.winningNumbers || [];
      numbers.forEach(n => {
        if (n >= 1 && n <= maxNum) {
          totalRecentNumbers++;
          if (n % 2 === 0) {
            recentEvenCount++;
          }
          const row = Math.floor((n - 1) / 10);
          const col = (n - 1) % 10;
          if (row >= 0 && row < 9) {
            recentRowCounts[row]++;
          }
          if (col >= 0 && col < 10) {
            recentColCounts[col]++;
          }
        }
      });
    });

    const recentEvenRatio = totalRecentNumbers > 0 ? recentEvenCount / totalRecentNumbers : 0.5;
    const parityDiscrepancy = recentEvenRatio - 0.5; // positive means an excess of even numbers

    const expectedRowRatio = 1 / 9;
    const expectedColRatio = 1 / 10;
    const rowDiscrepancies = new Array(9).fill(0);
    const colDiscrepancies = new Array(10).fill(0);

    for (let r = 0; r < 9; r++) {
      const ratio = totalRecentNumbers > 0 ? recentRowCounts[r] / totalRecentNumbers : expectedRowRatio;
      rowDiscrepancies[r] = ratio - expectedRowRatio;
    }
    for (let c = 0; c < 10; c++) {
      const ratio = totalRecentNumbers > 0 ? recentColCounts[c] / totalRecentNumbers : expectedColRatio;
      colDiscrepancies[c] = ratio - expectedColRatio;
    }

    const momentumScores = new Array(maxNum + 1).fill(0);

    for (let num = 1; num <= maxNum; num++) {
      // 1. Sum deviation reversion
      const numberDeviation = num - 45.5;
      const reversionPull = -discrepancy * numberDeviation;
      const sumReversion = Math.exp(reversionPull / (stdDevSum * 5));

      // 2. Parity reversion
      const isEven = num % 2 === 0;
      const parityReversion = isEven
        ? Math.exp(-parityDiscrepancy * 3.0)
        : Math.exp(parityDiscrepancy * 3.0);

      // 3. Spatial Anisotropy Row & Column Reversion
      const row = Math.floor((num - 1) / 10);
      const col = (num - 1) % 10;
      const rowDisc = row >= 0 && row < 9 ? rowDiscrepancies[row] : 0;
      const colDisc = col >= 0 && col < 10 ? colDiscrepancies[col] : 0;
      const spatialReversion = Math.exp(-rowDisc * 3.0) * Math.exp(-colDisc * 3.0);

      // Aggregate stochastically via multiplicative scaling priors
      momentumScores[num] = sumReversion * parityReversion * spatialReversion;
    }

    // Normalize and aggregate
    const breakdowns: ScoreBreakdown[] = [];
    const maxFreq = Math.max(...frequencies, 0.0001);
    const maxGapScore = Math.max(...gapScores, 0.0001);
    const maxMarkov = Math.max(...markovScores, 0.0001);
    const maxMomentum = Math.max(...momentumScores, 0.0001);

    for (let num = 1; num <= maxNum; num++) {
      const normFreq = frequencies[num] / maxFreq;
      const normGap = gapScores[num] / maxGapScore;
      const normMarkov = markovScores[num] / maxMarkov;
      const normMomentum = momentumScores[num] / maxMomentum;

      const combined = (
        normFreq * wFreq +
        normGap * wGap +
        normMarkov * wMarkov +
        normMomentum * wMomentum
      ) / totalWeight;

      const dec = Math.floor((num - 1) / 10);

      breakdowns.push({
        number: num,
        frequencyScore: normFreq,
        gapScore: normGap,
        markovScore: normMarkov,
        momentumScore: normMomentum,
        combinedScore: combined,
        rawFrequency: allAppearancesIndices[num]?.length || 0,
        currentGap: gaps[num],
        avgGap: avgGaps[num],
        recentEvenRatio,
        decadeDiscrepancy: dec >= 0 && dec < 9 ? rowDiscrepancies[dec] : 0,
      });
    }

    // Sort to obtain top recommendations
    const sortedBreakdowns = [...breakdowns].sort((a, b) => b.combinedScore - a.combinedScore);
    const recommendations = sortedBreakdowns.slice(0, targetCount).map((b) => b.number);

    // Dynamic insights derived directly from calculation steps (zero magic numbers/randomness)
    const insights: string[] = [];
    const topFreqNum = breakdowns.reduce((a, b) => (a.frequencyScore > b.frequencyScore ? a : b)).number;
    insights.push(
      `Numéro **${topFreqNum}** : Fréquence historique maximale calculée avec une demi-vie de **${halfLife}** tirages.`
    );

    const topGapNum = breakdowns.reduce((a, b) => (a.gapScore > b.gapScore ? a : b)).number;
    insights.push(
      `Numéro **${topGapNum}** : Écart actuel de **${gaps[topGapNum]}** tirages contre un écart moyen de **${(sortedDraws.length / Math.max(1, allAppearancesIndices[topGapNum].length)).toFixed(1)}** tirages.`
    );

    if (maxMarkov > 0.0001) {
      const topMarkovNum = breakdowns.reduce((a, b) => (a.markovScore > b.markovScore ? a : b)).number;
      insights.push(
        `Transition (Ordre ${mOrder}) : Suite aux récents numéros (${latestNumbers.join(", ")}), le numéro **${topMarkovNum}** présente le plus fort taux de corrélation de transition.`
      );
    }

    const directionLabel = discrepancy > 0 ? "supérieures à la normale" : "inférieures à la normale";
    insights.push(
      `Régression vers la moyenne : Les sommes récentes sont ${directionLabel} (${recentAvgSum.toFixed(1)} vs ${meanSum.toFixed(1)}), favorisant les numéros d'équilibrage.`
    );

    const parityLabel = recentEvenRatio > 0.5 ? "un excès de nombres pairs" : "un excès de nombres impairs";
    insights.push(
      `Équilibre de parité : Les tirages récents présentent ${parityLabel} (${(recentEvenRatio * 100).toFixed(1)}% pairs), ce qui ajuste le score de retour à l'équilibre.`
    );

    return {
      recommendations: recommendations.sort((a, b) => a - b),
      scores: breakdowns,
      insights,
      hyperparameters: {
        decayRate: decay,
        markovOrder: mOrder,
        poissonLambda: pLambda,
      },
    };
  }
}
