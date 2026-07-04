import sys

file_path = "supabase/functions/_shared/prediction-optimizer.ts"
with open(file_path, "r") as f:
    content = f.read()

target = """      if (currentGap === 0) {
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
      }"""

replacement = """      // Utilisation d'une fonction continue (combinaison de sigmoïdes et Gaussiennes) pour le scoring
      const peakAttraction = expectedGap * 1.5;
      
      // 1. Momentum immédiat (très fort pour gap 0, décroît rapidement)
      const momentumScore = 0.7 * Math.exp(-0.5 * currentGap);
      
      // 2. Attraction de Poisson (Gaussienne centrée sur peakAttraction)
      const poissonAttraction = 1.4 * Math.exp(-Math.pow(currentGap - peakAttraction, 2) / (2 * Math.pow(expectedGap * 0.8, 2)));
      
      // 3. Pénalité de retard extrême (sigmoïde inversée qui s'active après 2.5x expectedGap)
      const extremeDelayThreshold = expectedGap * 2.5;
      const shrinkageFactor = 1 - (1 / (1 + Math.exp(-0.2 * (currentGap - extremeDelayThreshold))));
      
      // Score final combiné fluide et proportionnel
      scores[num] = (0.3 + momentumScore + poissonAttraction) * shrinkageFactor;"""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w") as f:
        f.write(content)
    print("Patched Poisson scores.")
else:
    print("Target not found for Poisson.")
