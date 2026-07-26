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
