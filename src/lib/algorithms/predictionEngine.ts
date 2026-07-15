import { DrawResult } from "@/types/lottery";

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

    // Calculate F1 (Decayed Frequency) and collect gap history
    for (let i = 0; i < sortedDraws.length; i++) {
      const draw = sortedDraws[i];
      const numbers = draw.winningNumbers || [];
      const recencyWeight = Math.exp(-decay * i);

      numbers.forEach((num) => {
        if (num >= 1 && num <= maxNum) {
          frequencies[num] += recencyWeight;
          allAppearancesIndices[num].push(i);
          if (lastAppearances[num] === -1) {
            lastAppearances[num] = i;
            gaps[num] = i;
          }
        }
      });
    }

    // Calculate F2 (Poisson-Gap Recurrence Score)
    const gapScores = new Array(maxNum + 1).fill(0);
    const avgGaps = new Array(maxNum + 1).fill(0);
    for (let num = 1; num <= maxNum; num++) {
      const appearances = allAppearancesIndices[num];
      let avgGap = sortedDraws.length / Math.max(1, appearances.length);

      if (appearances.length >= 2) {
        let sumGaps = 0;
        for (let idx = 0; idx < appearances.length - 1; idx++) {
          sumGaps += appearances[idx + 1] - appearances[idx];
        }
        avgGap = sumGaps / (appearances.length - 1);
      }
      avgGaps[num] = avgGap;

      const currentGap = gaps[num];
      // Probability of occurrence: P(X >= 1) = 1 - e^(-lambda * currentGap / avgGap)
      const ratio = currentGap / Math.max(1, avgGap);
      gapScores[num] = 1 - Math.exp(-pLambda * ratio);
    }

    // Calculate F3 (Markov transition chain)
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
        // Second-order transitions: we look for sequences where (i-2) matched second-latest and (i-1) matched latest
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

      if (matchCount > 0) {
        for (let num = 1; num <= maxNum; num++) {
          markovScores[num] = transitionCounts[num] / matchCount;
        }
      }
    }

    // Calculate F4 (Ornstein-Uhlenbeck Mean Reversion Momentum)
    // We compute the discrepancy of the last 10 draws against the historical mean sum.
    // If recent sums are low, we boost larger numbers. If recent sums are high, we boost smaller numbers.
    const recentWindowSize = Math.min(10, sortedDraws.length);
    const recentSums = sortedDraws.slice(0, recentWindowSize).map(
      d => (d.winningNumbers || []).reduce((sum, n) => sum + n, 0)
    ).filter(s => s > 0);
    const recentAvgSum = recentSums.length > 0 ? recentSums.reduce((a, b) => a + b, 0) / recentSums.length : meanSum;

    const discrepancy = recentAvgSum - meanSum; // positive means recent sums are higher than average
    const momentumScores = new Array(maxNum + 1).fill(0);

    for (let num = 1; num <= maxNum; num++) {
      // The individual number's deviation from the median number 45.5
      const numberDeviation = num - 45.5;
      // If discrepancy > 0, we favor numberDeviation < 0 (mean-reverting shift).
      // If discrepancy < 0, we favor numberDeviation > 0.
      // Score is higher if the number drives the sum in the opposite direction of the discrepancy.
      const reversionPull = -discrepancy * numberDeviation;
      // Map to positive scale using standard Gaussian scaling
      momentumScores[num] = Math.exp(reversionPull / (stdDevSum * 5));
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
