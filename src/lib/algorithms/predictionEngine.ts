import { DrawResult } from "@/types/lottery";

export interface ScoreBreakdown {
  number: number;
  frequencyScore: number; // Raw frequency or decayed frequency
  gapScore: number;       // Score based on elapsed draws since last appearance
  markovScore: number;    // Conditional probability based on the last draw
  combinedScore: number;  // Weighted combination of the above
}

export interface PredictionEngineOptions {
  frequencyWeight: number;
  gapWeight: number;
  markovWeight: number;
  decayRate?: number;     // Decaying factor for frequency (smaller = more uniform, larger = focus on recent)
  maxNumber?: number;     // Usually 90 for this lottery
  targetCount?: number;   // Number of recommended balls to generate
}

export class LocalPredictionEngine {
  private static MAX_NUMBER = 90;

  /**
   * Generates local predictions based on three analytical pillars:
   * 1. Decayed frequency of numbers (Hot/Cold analysis)
   * 2. Current gaps vs average expected gaps (Poisson-like overdue analysis)
   * 3. Markov chain transitions (given the previous draw's numbers, what transitions occur most often?)
   */
  public static calculatePredictions(
    results: DrawResult[],
    options: PredictionEngineOptions
  ): {
    recommendations: number[];
    scores: ScoreBreakdown[];
    insights: string[];
  } {
    const maxNum = options.maxNumber || this.MAX_NUMBER;
    const targetCount = options.targetCount || 5;

    if (!results || results.length === 0) {
      return {
        recommendations: Array.from({ length: targetCount }, (_, i) => i + 1),
        scores: [],
        insights: ["Aucune donnée historique pour l'analyse."],
      };
    }

    // Sort results by date descending to ensure index 0 is the most recent draw
    const sortedDraws = [...results].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const latestDraw = sortedDraws[0];
    const latestNumbers = latestDraw ? latestDraw.winningNumbers || [] : [];

    // Initialize metrics containers
    const frequencies = new Array(maxNum + 1).fill(0);
    const lastAppearances = new Array(maxNum + 1).fill(-1); // Index in sortedDraws
    const gaps = new Array(maxNum + 1).fill(sortedDraws.length); // Fallback to full history
    const allAppearancesIndices: Record<number, number[]> = {};

    for (let n = 1; n <= maxNum; n++) {
      allAppearancesIndices[n] = [];
    }

    // 1. Calculate decayed frequencies and collect appearance history
    const decay = options.decayRate ?? 0.02;
    for (let i = 0; i < sortedDraws.length; i++) {
      const draw = sortedDraws[i];
      const numbers = draw.winningNumbers || [];
      const weight = Math.exp(-decay * i); // Exponential decay factor for recency

      numbers.forEach((num) => {
        if (num >= 1 && num <= maxNum) {
          frequencies[num] += weight;
          allAppearancesIndices[num].push(i);
          if (lastAppearances[num] === -1) {
            lastAppearances[num] = i;
            gaps[num] = i; // gap is the number of draws since its last appearance
          }
        }
      });
    }

    // 2. Compute Gap Score (Poisson/Exponential recurrence approximation)
    // Overdue analysis: If a number's current gap is significantly larger than its historical average gap,
    // its probability increases (gambler's fallacy / regression to mean model)
    const gapScores = new Array(maxNum + 1).fill(0);
    for (let num = 1; num <= maxNum; num++) {
      const appearances = allAppearancesIndices[num];
      let avgGap = sortedDraws.length / Math.max(1, appearances.length);

      // If we have detailed historical gaps for this number, calculate a real mean
      if (appearances.length >= 2) {
        let sumGaps = 0;
        for (let idx = 0; idx < appearances.length - 1; idx++) {
          sumGaps += appearances[idx + 1] - appearances[idx];
        }
        avgGap = sumGaps / (appearances.length - 1);
      }

      const currentGap = gaps[num];
      // Normalize gap score: ratio of current gap to average gap
      // Cap at 3x average gap to avoid extreme outliers overpowering other factors
      const gapRatio = Math.min(3.0, currentGap / Math.max(1, avgGap));
      gapScores[num] = gapRatio;
    }

    // 3. Markov chain state transitions
    // We analyze: for every draw immediately following a draw containing a number from the latest draw,
    // how often does any other number appear?
    const markovScores = new Array(maxNum + 1).fill(0);
    if (latestNumbers.length > 0 && sortedDraws.length > 1) {
      let matchCount = 0;
      const transitionCounts = new Array(maxNum + 1).fill(0);

      // Loop over history (from oldest to second most recent, since we need i-1 to be the previous draw)
      for (let i = sortedDraws.length - 1; i > 0; i--) {
        const prevDrawNumbers = sortedDraws[i].winningNumbers || [];
        const nextDrawNumbers = sortedDraws[i - 1].winningNumbers || [];

        // Check how many of latestNumbers were in prevDraw
        const intersected = latestNumbers.filter((n) => prevDrawNumbers.includes(n));
        if (intersected.length > 0) {
          // If there's an intersection, add weights to the numbers that occurred next
          nextDrawNumbers.forEach((num) => {
            if (num >= 1 && num <= maxNum) {
              // Weight the transition by the number of overlapping elements
              transitionCounts[num] += intersected.length;
            }
          });
          matchCount += intersected.length;
        }
      }

      // Normalize transition probabilities
      if (matchCount > 0) {
        for (let num = 1; num <= maxNum; num++) {
          markovScores[num] = transitionCounts[num] / matchCount;
        }
      }
    }

    // 4. Normalize and combine the scores
    const breakdowns: ScoreBreakdown[] = [];
    const maxFreq = Math.max(...frequencies, 0.0001);
    const maxGapScore = Math.max(...gapScores, 0.0001);
    const maxMarkov = Math.max(...markovScores, 0.0001);

    const wFreq = options.frequencyWeight;
    const wGap = options.gapWeight;
    const wMarkov = options.markovWeight;
    const totalWeight = (wFreq + wGap + wMarkov) || 1;

    for (let num = 1; num <= maxNum; num++) {
      // Min-Max scaling of raw parameters to [0, 1] range for fair aggregation
      const normFreq = frequencies[num] / maxFreq;
      const normGap = gapScores[num] / maxGapScore;
      const normMarkov = markovScores[num] / maxMarkov;

      const combined = (normFreq * wFreq + normGap * wGap + normMarkov * wMarkov) / totalWeight;

      breakdowns.push({
        number: num,
        frequencyScore: normFreq,
        gapScore: normGap,
        markovScore: normMarkov,
        combinedScore: combined,
      });
    }

    // Sort to get recommendations
    const sortedBreakdowns = [...breakdowns].sort((a, b) => b.combinedScore - a.combinedScore);
    const recommendations = sortedBreakdowns.slice(0, targetCount).map((b) => b.number);

    // 5. Generate high-quality natural language insights in French
    const insights: string[] = [];
    
    // Insight on frequency
    const topFreqNum = breakdowns.reduce((a, b) => (a.frequencyScore > b.frequencyScore ? a : b)).number;
    insights.push(
      `Le numéro **${topFreqNum}** est actuellement le plus chaud historiquement (fréquence pondérée la plus élevée).`
    );

    // Insight on gaps
    const topGapNum = breakdowns.reduce((a, b) => (a.gapScore > b.gapScore ? a : b)).number;
    const topGapValue = gaps[topGapNum];
    insights.push(
      `Le numéro **${topGapNum}** présente la plus forte anomalie d'écart avec **${topGapValue}** tirages d'absence.`
    );

    // Insight on Markov transitions
    if (maxMarkov > 0.0001) {
      const topMarkovNum = breakdowns.reduce((a, b) => (a.markovScore > b.markovScore ? a : b)).number;
      insights.push(
        `Suite aux numéros du dernier tirage (${latestNumbers.join(", ")}), le numéro **${topMarkovNum}** présente la plus forte probabilité de transition markovienne.`
      );
    }

    insights.push(
      `Recommandation finale optimisée à partir de **${sortedDraws.length}** tirages analysés localement.`
    );

    return {
      recommendations: recommendations.sort((a, b) => a - b),
      scores: breakdowns,
      insights,
    };
  }
}
