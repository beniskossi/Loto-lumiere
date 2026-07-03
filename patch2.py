import sys

file_path = "supabase/functions/_shared/prediction-optimizer.ts"

with open(file_path, "r") as f:
    content = f.read()

start_marker = "const markovScores = this.calculateMarkovTransitions(candidates, results);"
end_marker = "return this.applyCombinatorialFilters(sortedCandidates.slice(0, 20), scores, results);"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    before = content[:start_idx]
    after = content[end_idx:]
    
    replacement2 = """const markovScores = this.calculateMarkovTransitions(candidates, results);
    
    // Stratégie 3: Auto-ajustement par Volatilité (GARCH-like heuristique)
    let recentRepetitions = 0;
    if (results.length >= 10) {
      for (let i = 0; i < 9; i++) {
         const current = results[i].winning_numbers;
         const previous = results[i+1].winning_numbers;
         current.forEach(n => { if(previous.includes(n)) recentRepetitions++; });
      }
    }
    const repetitionRate = results.length >= 10 ? recentRepetitions / (9 * 5) : 0.1;
    
    // Poids dynamiques: si volatilité faible (haute répétition), tendance (fréquence).
    // Si volatilité forte (chaotique), retour à la moyenne (gap + poisson).
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
      .map(([num]) => parseInt(num));
      
    // Au lieu de prendre aveuglément les 5 premiers, nous utilisons un filtre combinatoire 
    // pour garantir la viabilité mathématique du ticket (Somme, parité, consécutifs).
    """
    
    with open(file_path, "w") as f:
        f.write(before + replacement2 + after)
    print("Success")
else:
    print("Markers not found")

