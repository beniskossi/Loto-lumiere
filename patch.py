import sys

file_path = "supabase/functions/_shared/prediction-optimizer.ts"

with open(file_path, "r") as f:
    content = f.read()

target = """  private calculatePoissonScores(candidates: number[], results: DrawResult[]): Record<number, number> {
    const scores: Record<number, number> = {};
    const totalDraws = results.length;
    if (totalDraws === 0) return scores;

    // Calcul de la moyenne globale de sortie par numéro (Lambda, λ)
    const lambda = (totalDraws * 5) / 90; 
    
    candidates.forEach(num => {
      const lastSeenIdx = this.getLastSeenIndex(num, results);
      // Écart actuel (nombre de tirages depuis la dernière sortie)
      const currentGap = lastSeenIdx === -1 ? totalDraws : lastSeenIdx;
      
      // Loi de Poisson pour calculer la probabilité de l'écart
      // P(X = k) = (e^-λ * λ^k) / k!
      // En loto, si l'écart dépasse largement la moyenne espérée (90/5 = 18 tirages), 
      // le score contrarien augmente (bien que la mémoire soit sans effet statistiquement,
      // dans la vraie modélisation de loi forte des grands nombres, on cible les anomalies)
      const expectedGap = 18; // En loto 5/90, un numéro sort en moyenne tous les 18 tirages
      
      if (currentGap < expectedGap / 2) {
         scores[num] = 0.8; // Chaud récent (momentum)
      } else if (currentGap >= expectedGap && currentGap < expectedGap * 2) {
         scores[num] = 1.0; // "Due" - en phase d'attraction
      } else if (currentGap >= expectedGap * 2) {
         // Froid extrême (anomalie, potentiel réveil de cycle)
         scores[num] = 1.2;
      } else {
         scores[num] = 0.5;
      }
    });

    return scores;
  }"""

replacement = """  private calculatePoissonScores(candidates: number[], results: DrawResult[]): Record<number, number> {
    const scores: Record<number, number> = {};
    const totalDraws = results.length;
    if (totalDraws === 0) return scores;

    // Constantes empiriques pour le loto 5/90
    const expectedGap = 18; // En loto 5/90, un numéro sort en moyenne tous les 18 tirages
    
    candidates.forEach(num => {
      const lastSeenIdx = this.getLastSeenIndex(num, results);
      const currentGap = lastSeenIdx === -1 ? totalDraws : lastSeenIdx;
      
      // Stratégie 1: Mean-Reversion avec Shrinkage
      // Un numéro en retard est attractif jusqu'à un certain point (2.5x expectedGap).
      // Au-delà, c'est un "numéro mort" (dead number), on réduit son score drastiquement (loi de l'oubli).
      
      if (currentGap === 0) {
        scores[num] = 0.3; // Vient de sortir
      } else if (currentGap < expectedGap / 2) {
        scores[num] = 0.7 + (currentGap / expectedGap) * 0.3; // Momentum
      } else if (currentGap < expectedGap * 2.5) {
        // Phase d'attraction maximale (cloche de probabilité de Poisson inversée)
        const peakAttraction = expectedGap * 1.5;
        const distanceToPeak = Math.abs(currentGap - peakAttraction);
        scores[num] = 1.0 + Math.max(0, 0.4 - (distanceToPeak / expectedGap) * 0.2);
      } else {
        // Shrinkage stochastique : pénalité exponentielle pour les retards extrêmes
        const excessGap = currentGap - (expectedGap * 2.5);
        scores[num] = 0.8 * Math.exp(-0.05 * excessGap);
      }
    });

    return scores;
  }"""

new_content = content.replace(target, replacement)
if new_content == content:
    print("Warning: Target 1 not found")

target2 = """    const markovScores = this.calculateMarkovTransitions(candidates, results);
    
    const scores: Record<number, number> = {};
    
    candidates.forEach(num => {
      const freqScore = (frequencies[num] || 0) / results.length;
      const stabilityScore = stability[num] || 0;
      const momentumScore = momentum[num] || 0;
      const pScore = poissonScores[num] || 0;
      const mScore = markovScores[num] || 0;
      
      let analyticsBonus = 0;
      
      // Bonus des analytics
      if (analytics?.cyclicalPatterns) {
        analytics.cyclicalPatterns.forEach((pattern: CyclicalPattern) => {
          if (pattern.numbers.includes(num)) {
            analyticsBonus += pattern.strength * 0.2;
          }
        });
      }
      
      scores[num] = 
        freqScore * 0.2 + 
        stabilityScore * config.stabilityWeight * 0.8 + 
        momentumScore * 0.15 + 
        pScore * 0.15 + // Poisson (probabilité de sortie selon écart temporel)
        mScore * 0.15 + // Markov (probabilité de transition du tirage N-1 à N)
        analyticsBonus;
    });

    // Monte Carlo Convergence Step (simulated convergence weights)
    // We boost numbers that appear together historically in winning subsets
    candidates.forEach(num => { 
       let mcs = 0;
       // Quick 100-step lookback permutation score
       for (let i = 0; i < Math.min(results.length, 100); i++) {
          if (results[i].winning_numbers.includes(num)) {
             mcs += 0.05 * (100 - i) / 100; // Time-decayed correlation
          }
       }
       scores[num] += mcs;
    });
    
    const sortedCandidates = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([num]) => parseInt(num));"""

replacement2 = """    const markovScores = this.calculateMarkovTransitions(candidates, results);
    
    // Stratégie 3: Auto-ajustement par Volatilité (GARCH-like heuristique)
    // Analyser le taux de répétition et la consistance des 10 derniers tirages
    let recentRepetitions = 0;
    if (results.length >= 10) {
      for (let i = 0; i < 9; i++) {
         const current = results[i].winning_numbers;
         const previous = results[i+1].winning_numbers;
         current.forEach(n => { if(previous.includes(n)) recentRepetitions++; });
      }
    }
    const repetitionRate = results.length >= 10 ? recentRepetitions / (9 * 5) : 0.1;
    
    // Poids dynamiques: si volatilité faible (haute répétition), on suit la tendance (fréquence +).
    // Si volatilité forte (chaotique), on se fie au retour à la moyenne (gap + poisson).
    const dynamicFreqWeight = 0.1 + (repetitionRate * 0.8);
    const dynamicGapWeight = 0.3 - (repetitionRate * 0.5);
    
    const scores: Record<number, number> = {};
    
    candidates.forEach(num => {
      const freqScore = (frequencies[num] || 0) / results.length;
      const stabilityScore = stability[num] || 0;
      const momentumScore = momentum[num] || 0;
      const pScore = poissonScores[num] || 0;
      const mScore = markovScores[num] || 0;
      
      let analyticsBonus = 0;
      
      if (analytics?.cyclicalPatterns) {
        analytics.cyclicalPatterns.forEach((pattern: CyclicalPattern) => {
          if (pattern.numbers.includes(num)) {
            analyticsBonus += pattern.strength * 0.2;
          }
        });
      }
      
      scores[num] = 
        freqScore * dynamicFreqWeight + 
        stabilityScore * config.stabilityWeight * 0.8 + 
        momentumScore * 0.15 + 
        pScore * dynamicGapWeight + 
        mScore * 0.15 + 
        analyticsBonus;
    });

    // Monte Carlo Convergence Step
    candidates.forEach(num => { 
       let mcs = 0;
       for (let i = 0; i < Math.min(results.length, 100); i++) {
          if (results[i].winning_numbers.includes(num)) {
             mcs += 0.05 * (100 - i) / 100;
          }
       }
       scores[num] += mcs;
    });
    
    // Stratégie 2: Fusion par Attracteurs Spatiaux (Clustering de densité)
    // Lissage par noyau (Kernel smoothing) sur la grille: les numéros adjacents se boostent
    const smoothedScores: Record<number, number> = {};
    candidates.forEach(num => {
      let neighborBonus = 0;
      if (scores[num - 1]) neighborBonus += scores[num - 1] * 0.08;
      if (scores[num + 1]) neighborBonus += scores[num + 1] * 0.08;
      if (scores[num - 2]) neighborBonus += scores[num - 2] * 0.03;
      if (scores[num + 2]) neighborBonus += scores[num + 2] * 0.03;
      smoothedScores[num] = scores[num] + neighborBonus;
    });
    
    const sortedCandidates = Object.entries(smoothedScores)
      .sort(([, a], [, b]) => b - a)
      .map(([num]) => parseInt(num));"""

new_content = new_content.replace(target2, replacement2)
if new_content == content.replace(target, replacement):
    print("Warning: Target 2 not found")
else:
    print("Success replacing both blocks.")

with open(file_path, "w") as f:
    f.write(new_content)
