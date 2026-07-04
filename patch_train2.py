import sys

file_path = "supabase/functions/train-algorithms/index.ts"
with open(file_path, "r") as f:
    content = f.read()

target = """  // Ajustement continu de la régularisation en fonction de l'instabilité (variance)
  const regAdjustment = (2 / (1 + Math.exp(-50 * (accuracyVariance - 0.02)))) - 1; // -1 to 1 based on variance
  if (regAdjustment > 0) {
    // Si la variance est haute, on augmente proportionnellement la régularisation
    if (newParams.regularization === undefined) {
      newParams.regularization = 0.01 * (1 + regAdjustment);
    } else {
      const regMultiplier = Math.exp(regAdjustment * Math.log(1.2)); // up to 20% increase
      newParams.regularization = Math.min(0.2, newParams.regularization * regMultiplier);
    }
  } else if (regAdjustment < -0.5 && newParams.regularization) {
     // Si la variance est très basse, on peut relâcher légèrement la régularisation
     const regMultiplier = Math.exp(regAdjustment * Math.log(1.1));
     newParams.regularization = Math.max(0.001, newParams.regularization * regMultiplier);
  }"""

replacement = """  // Ajustement continu de la régularisation en fonction de l'instabilité (variance)
  // Mapping sigmoid de la variance sur un ajustement [-1, 1] de régularisation
  const regAdjustment = (2 / (1 + Math.exp(-50 * (accuracyVariance - 0.02)))) - 1; 
  
  if (newParams.regularization === undefined) {
      // Régularisation de base si absente, proportionnelle au besoin
      newParams.regularization = 0.01 * (1 + Math.max(0, regAdjustment));
  } else {
      // Ajustement continu et proportionnel multiplicatif (1.2 ^ regAdjustment)
      // Si regAdjustment > 0 (instable), multiplier jusqu'à x1.2
      // Si regAdjustment < 0 (stable), diviser (jusqu'à x0.83)
      const regMultiplier = Math.exp(regAdjustment * Math.log(1.2));
      newParams.regularization = Math.max(0.001, Math.min(0.2, newParams.regularization * regMultiplier));
  }"""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w") as f:
        f.write(content)
    print("Patched train-algorithms/index.ts")
else:
    print("Target not found.")
