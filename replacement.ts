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
