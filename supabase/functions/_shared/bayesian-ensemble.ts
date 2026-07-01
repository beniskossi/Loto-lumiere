// Bayesian Model Averaging - Combinaison probabiliste des prédictions
import type { PredictionResult } from "./types.ts";
import { log } from "./utils.ts";

interface BayesianWeight {
  algorithm: string;
  posteriorProbability: number;
  likelihood: number;
  prior: number;
  evidenceContribution: number;
}

interface ConsensusMetrics {
  agreementScore: number;          // Score d'accord inter-algorithmes (0-1)
  divergenceIndex: number;         // Indice de divergence (0-1)
  confidenceInterval: [number, number]; // Intervalle de confiance 95%
  consensusNumbers: number[];      // Numéros avec consensus fort
  uncertainNumbers: number[];      // Numéros avec forte incertitude
}

/**
 * Calcule la moyenne bayésienne des prédictions
 * P(θ|D) ∝ P(D|θ) × P(θ) - Théorème de Bayes
 */
export function calculateBayesianModelAverage(
  predictions: Map<string, PredictionResult>,
  priorPerformance: Map<string, number>
): { numbers: number[]; confidence: number; weights: BayesianWeight[] } {
  const weights: BayesianWeight[] = [];
  const numberPosteriors: Map<number, number> = new Map();
  
  // Initialiser tous les numéros
  for (let n = 1; n <= 90; n++) {
    numberPosteriors.set(n, 0);
  }
  
  // Calculer l'évidence totale (normalisation)
  let totalEvidence = 0;
  
  predictions.forEach((prediction, algorithm) => {
    const prior = priorPerformance.get(algorithm) || 0.2;
    const likelihood = prediction.confidence * prediction.score;
    const unnormalizedPosterior = likelihood * prior;
    totalEvidence += unnormalizedPosterior;
  });
  
  if (totalEvidence === 0) totalEvidence = 1;
  
  // Calculer les poids bayésiens et accumuler les votes
  predictions.forEach((prediction, algorithm) => {
    const prior = priorPerformance.get(algorithm) || 0.2;
    const likelihood = prediction.confidence * prediction.score;
    const posterior = (likelihood * prior) / totalEvidence;
    
    weights.push({
      algorithm,
      posteriorProbability: posterior,
      likelihood,
      prior,
      evidenceContribution: likelihood * prior
    });
    
    // Accumuler les votes pondérés par la probabilité postérieure
    prediction.numbers.forEach((num, position) => {
      const positionWeight = (5 - position) / 5; // Premier numéro plus important
      const vote = posterior * positionWeight;
      numberPosteriors.set(num, (numberPosteriors.get(num) || 0) + vote);
    });
  });
  
  // Sélectionner les numéros avec la plus haute probabilité postérieure
  const sortedNumbers = Array.from(numberPosteriors.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([num]) => num);
  
  // Sélectionner 5 numéros avec équilibre somme-parité
  const selectedNumbers = selectBalancedBayesian(sortedNumbers.slice(0, 20));
  
  // Calculer la confiance bayésienne
  const confidence = calculateBayesianConfidence(weights, numberPosteriors, selectedNumbers);
  
  log("info", "Bayesian Model Average calculated", {
    topWeights: weights.slice(0, 3).map(w => ({ algo: w.algorithm, posterior: w.posteriorProbability.toFixed(3) })),
    confidence
  });
  
  return {
    numbers: selectedNumbers,
    confidence,
    weights: weights.sort((a, b) => b.posteriorProbability - a.posteriorProbability)
  };
}

/**
 * Sélectionne des numéros équilibrés basé sur les probabilités bayésiennes
 */
function selectBalancedBayesian(candidates: number[]): number[] {
  const targetSum = 219;
  const sumTolerance = 30;
  
  // Essayer différentes combinaisons
  let bestCombo = candidates.slice(0, 5);
  let bestScore = evaluateCombination(bestCombo, targetSum);
  
  // Algorithme glouton avec backtracking limité
  for (let i = 0; i < Math.min(candidates.length - 4, 50); i++) {
    for (let offset = 0; offset < 3; offset++) {
      const combo = [
        candidates[i],
        candidates[i + 1 + offset] || candidates[i + 1],
        candidates[i + 2 + offset] || candidates[i + 2],
        candidates[i + 3 + offset] || candidates[i + 3],
        candidates[i + 4 + offset] || candidates[i + 4]
      ].filter((v, idx, arr) => arr.indexOf(v) === idx);
      
      if (combo.length === 5) {
        const score = evaluateCombination(combo, targetSum);
        if (score > bestScore) {
          bestScore = score;
          bestCombo = combo;
        }
      }
    }
  }
  
  return bestCombo.sort((a, b) => a - b);
}

function evaluateCombination(numbers: number[], targetSum: number): number {
  const sum = numbers.reduce((a, b) => a + b, 0);
  const sumScore = 1 - Math.min(1, Math.abs(sum - targetSum) / 100);
  
  const evenCount = numbers.filter(n => n % 2 === 0).length;
  const parityScore = 1 - Math.abs(evenCount - 2.5) / 2.5;
  
  // Score de diversité (éviter les numéros trop proches)
  const sorted = [...numbers].sort((a, b) => a - b);
  let minGap = 90;
  for (let i = 1; i < sorted.length; i++) {
    minGap = Math.min(minGap, sorted[i] - sorted[i-1]);
  }
  const diversityScore = Math.min(1, minGap / 10);
  
  return sumScore * 0.4 + parityScore * 0.3 + diversityScore * 0.3;
}

function calculateBayesianConfidence(
  weights: BayesianWeight[],
  posteriors: Map<number, number>,
  selected: number[]
): number {
  // 1. Concentration du poids sur les modèles dominants
  const topWeightSum = weights.slice(0, 2).reduce((sum, w) => sum + w.posteriorProbability, 0);
  const concentrationScore = Math.min(1, topWeightSum / 0.6);
  
  // 2. Force des probabilités postérieures des numéros sélectionnés
  const selectedPosteriors = selected.map(n => posteriors.get(n) || 0);
  const avgPosterior = selectedPosteriors.reduce((a, b) => a + b, 0) / selected.length;
  const posteriorScore = Math.min(1, avgPosterior * 5);
  
  // 3. Accord entre modèles (faible variance des votes)
  const posteriorValues = Array.from(posteriors.values()).filter(v => v > 0);
  const meanPosterior = posteriorValues.reduce((a, b) => a + b, 0) / posteriorValues.length;
  const variance = posteriorValues.reduce((sum, v) => sum + Math.pow(v - meanPosterior, 2), 0) / posteriorValues.length;
  const agreementScore = 1 / (1 + variance * 10);
  
  return Math.min(0.95, concentrationScore * 0.3 + posteriorScore * 0.4 + agreementScore * 0.3);
}

/**
 * Calcule les métriques de consensus inter-algorithmes
 */
export function calculateConsensusMetrics(
  predictions: Map<string, PredictionResult>
): ConsensusMetrics {
  const numberVotes: Map<number, number> = new Map();
  const algorithmCount = predictions.size;
  
  // Compter les votes pour chaque numéro
  predictions.forEach(prediction => {
    prediction.numbers.forEach(num => {
      numberVotes.set(num, (numberVotes.get(num) || 0) + 1);
    });
  });
  
  // Calculer le score d'accord (Jaccard moyen)
  let totalJaccard = 0;
  let pairCount = 0;
  
  const predictionArrays = Array.from(predictions.values()).map(p => new Set(p.numbers));
  
  for (let i = 0; i < predictionArrays.length; i++) {
    for (let j = i + 1; j < predictionArrays.length; j++) {
      const setA = predictionArrays[i];
      const setB = predictionArrays[j];
      const intersection = new Set([...setA].filter(x => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      const jaccard = intersection.size / union.size;
      totalJaccard += jaccard;
      pairCount++;
    }
  }
  
  const agreementScore = pairCount > 0 ? totalJaccard / pairCount : 0;
  
  // Identifier les numéros avec consensus fort (>= 60% des algos)
  const consensusThreshold = Math.ceil(algorithmCount * 0.6);
  const consensusNumbers = Array.from(numberVotes.entries())
    .filter(([, votes]) => votes >= consensusThreshold)
    .map(([num]) => num)
    .sort((a, b) => a - b);
  
  // Identifier les numéros avec incertitude (votes dispersés)
  const uncertainNumbers = Array.from(numberVotes.entries())
    .filter(([, votes]) => votes > 0 && votes < Math.ceil(algorithmCount * 0.3))
    .map(([num]) => num)
    .sort((a, b) => a - b);
  
  // Calculer l'indice de divergence (entropie normalisée)
  const voteValues = Array.from(numberVotes.values());
  const totalVotes = voteValues.reduce((a, b) => a + b, 0);
  let entropy = 0;
  
  if (totalVotes > 0) {
    voteValues.forEach(votes => {
      if (votes > 0) {
        const p = votes / totalVotes;
        entropy -= p * Math.log2(p);
      }
    });
  }
  
  const maxEntropy = Math.log2(90); // Entropie maximale si tous les numéros ont même probabilité
  const divergenceIndex = entropy / maxEntropy;
  
  // Calculer l'intervalle de confiance (bootstrap simplifié)
  const confidenceInterval = calculateBootstrapCI(predictions);
  
  return {
    agreementScore,
    divergenceIndex,
    confidenceInterval,
    consensusNumbers,
    uncertainNumbers
  };
}

function calculateBootstrapCI(
  predictions: Map<string, PredictionResult>
): [number, number] {
  const confidences = Array.from(predictions.values()).map(p => p.confidence);
  
  if (confidences.length === 0) return [0, 0];
  
  const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const variance = confidences.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / confidences.length;
  const stdDev = Math.sqrt(variance);
  
  // Intervalle de confiance 95% (approximation normale)
  const z = 1.96;
  const margin = z * (stdDev / Math.sqrt(confidences.length));
  
  return [
    Math.max(0, mean - margin),
    Math.min(1, mean + margin)
  ];
}

/**
 * Calcule le score de confiance amélioré avec métriques avancées
 */
export function calculateEnhancedConfidence(
  predictions: Map<string, PredictionResult>,
  historicalAccuracy: Map<string, number>,
  dataQuality: number,
  freshness: number
): number {
  const consensus = calculateConsensusMetrics(predictions);
  
  // Composantes du score de confiance
  const components = {
    // 30% - Accord inter-algorithmes
    agreement: consensus.agreementScore * 0.30,
    
    // 25% - Confiance moyenne pondérée par performance historique
    weightedConfidence: calculateWeightedConfidence(predictions, historicalAccuracy) * 0.25,
    
    // 20% - Qualité et fraîcheur des données
    dataScore: (dataQuality * 0.6 + freshness * 0.4) * 0.20,
    
    // 15% - Présence de consensus forts
    consensusStrength: Math.min(1, consensus.consensusNumbers.length / 3) * 0.15,
    
    // 10% - Faible divergence (modèles cohérents)
    coherence: (1 - consensus.divergenceIndex) * 0.10
  };
  
  const totalConfidence = Object.values(components).reduce((a, b) => a + b, 0);
  
  log("info", "Enhanced confidence calculated", {
    components: Object.fromEntries(
      Object.entries(components).map(([k, v]) => [k, v.toFixed(3)])
    ),
    total: totalConfidence.toFixed(3)
  });
  
  return Math.min(0.95, totalConfidence);
}

function calculateWeightedConfidence(
  predictions: Map<string, PredictionResult>,
  historicalAccuracy: Map<string, number>
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  
  predictions.forEach((prediction, algorithm) => {
    const accuracy = historicalAccuracy.get(algorithm) || 0.3;
    const weight = accuracy * accuracy; // Carré pour favoriser les meilleurs
    
    weightedSum += prediction.confidence * weight;
    totalWeight += weight;
  });
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
}
