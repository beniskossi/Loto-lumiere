import type { PredictionResult } from "./types.ts";

/**
 * Couche de Calibration (Platt Scaling simplifié)
 * Calibre la probabilité théorique (confiance) en fonction de la performance
 * historique (ledger) de l'algorithme.
 */
export function calibrateProbability(
  predictions: PredictionResult[],
  historicalPerformance: Map<string, number> // algo name -> real historical accuracy [0, 1]
): PredictionResult[] {
  return predictions.map(pred => {
    // 1. Probabilité marginale issue du modèle mathématique pur (ex: Dirichlet)
    const rawProb = pred.confidence;
    
    // 2. Performance historique du modèle (Ledger)
    const historicalAcc = historicalPerformance.get(pred.algorithm) ?? (5 / 90);
    
    // 3. Calibration de la confiance (Platt scaling simplifié)
    // Au lieu de multiplier aveuglément, on lisse la probabilité 
    // estimée vers la vraie performance observée.
    const alpha = 0.5; 
    let calibratedConf = (rawProb * (1 - alpha)) + (historicalAcc * alpha);

    // Borner à l'intervalle raisonnable
    calibratedConf = Math.min(0.99, Math.max(0.01, calibratedConf));

    return {
      ...pred,
      confidence: calibratedConf,
      score: calibratedConf, // Le score de classement EST la probabilité calibrée
      factors: [
        ...pred.factors,
        `Calibré (Ledger: ${(historicalAcc * 100).toFixed(2)}%)`
      ]
    };
  });
}
