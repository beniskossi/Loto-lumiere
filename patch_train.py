import sys

file_path = "supabase/functions/train-algorithms/index.ts"
with open(file_path, "r") as f:
    content = f.read()

target = """  // Auto-ajustement intelligent des hyperparamètres
  if (compositeScore > HIGH_PERF_THRESHOLD && accuracyVariance < 0.01) {
    // Performance élevée et stable: augmenter la capacité
    if (newParams.learningRate) {
      newParams.learningRate = Math.min(0.1, newParams.learningRate * LR_INCREASE_FACTOR);
    }
    if (newParams.numEstimators) {
      newParams.numEstimators = Math.min(100, Math.round(newParams.numEstimators * 1.1));
    }
    if (newParams.maxDepth) {
      newParams.maxDepth = Math.min(15, newParams.maxDepth + 1);
    }
  } else if (compositeScore < LOW_PERF_THRESHOLD || accuracyVariance > 0.05) {
    // Performance faible ou instable: simplifier le modèle
    if (newParams.learningRate) {
      newParams.learningRate = Math.max(0.001, newParams.learningRate * LR_DECREASE_FACTOR);
    }
    if (newParams.numEstimators) {
      newParams.numEstimators = Math.max(10, Math.round(newParams.numEstimators * 0.9));
    }
    if (newParams.maxDepth) {
      newParams.maxDepth = Math.max(3, newParams.maxDepth - 1);
    }
  }

  // Ajouter des métriques de régularisation si instable
  if (accuracyVariance > 0.03) {
    if (newParams.regularization === undefined) {
      newParams.regularization = 0.01;
    } else {
      newParams.regularization = Math.min(0.1, newParams.regularization * 1.2);
    }
  }"""

replacement = """  // Auto-ajustement intelligent des hyperparamètres avec des fonctions sigmoïdes continues
  // sigmoid mapping: transforms compositeScore to [-1, 1] smooth curve
  const capacityAdjustment = (2 / (1 + Math.exp(-15 * (compositeScore - 0.5)))) - 1; 
  // variance penalty: high variance approaches 1
  const variancePenalty = 1 - (1 / (1 + Math.exp(-40 * (0.02 - accuracyVariance)))); 
  
  // netAdjustment > 0 means increase capacity, < 0 means decrease capacity
  const netAdjustment = capacityAdjustment - variancePenalty;

  if (newParams.learningRate) {
    const lrMultiplier = Math.exp(netAdjustment * Math.log(LR_INCREASE_FACTOR));
    newParams.learningRate = Math.max(0.001, Math.min(0.1, newParams.learningRate * lrMultiplier));
  }
  
  if (newParams.numEstimators) {
    const estimatorsMultiplier = Math.exp(netAdjustment * Math.log(1.1)); // ~10% variation
    newParams.numEstimators = Math.max(10, Math.min(150, Math.round(newParams.numEstimators * estimatorsMultiplier)));
  }
  
  if (newParams.maxDepth) {
    const depthChange = netAdjustment * 2; // up to +/- 2 depth per training
    newParams.maxDepth = Math.max(3, Math.min(20, Math.round(newParams.maxDepth + depthChange)));
  }

  // Ajustement continu de la régularisation en fonction de l'instabilité (variance)
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

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w") as f:
        f.write(content)
    print("Patched.")
else:
    print("Target not found.")
