import type { DrawResult, PredictionResult } from "./types.ts";
import {
  frequencyProAlgorithm,
  randomForestAlgorithm,
  lstmAlgorithm,
} from "./algorithms.ts";
import { transformerAlgorithm } from "./transformer.ts";
import { xgboostAlgorithm } from "./xgboost.ts";
import { stackingEnsemble } from "./stacking.ts";
import { selectBestAlgorithm } from "./decision-tree-selector.ts";

export function ensemblePrediction(results: DrawResult[], drawName?: string): PredictionResult {
  if (results.length < 5) {
    return {
      numbers: [1, 2, 3, 4, 5],
      confidence: 0.2,
      algorithm: "Ensemble (Données Insuffisantes)",
      factors: ["Données insuffisantes"],
      score: 0.2,
      category: "ensemble",
    };
  }

  // Utiliser l'arbre de décision intelligent pour choisir le meilleur algorithme
  const selection = selectBestAlgorithm(results, { 
    drawName: drawName || "",
    isUltraPrecise: false 
  });

  // Si Stacking Ensemble est sélectionné, l'utiliser
  if (selection.selectedAlgorithm === "StackingEnsemble") {
    return stackingEnsemble(results);
  }

  // Sinon, exécuter l'algorithme sélectionné
  let prediction: PredictionResult;
  
  switch (selection.selectedAlgorithm) {
    case "Transformer":
      prediction = transformerAlgorithm(results);
      break;
    case "XGBoost":
      prediction = xgboostAlgorithm(results);
      break;
    case "LSTM":
      prediction = lstmAlgorithm(results);
      break;
    case "RandomForest":
      prediction = randomForestAlgorithm(results);
      break;
    case "FrequencyPro":
    default:
      prediction = frequencyProAlgorithm(results);
      break;
  }

  // Ajouter la raison de sélection dans les facteurs
  return {
    ...prediction,
    factors: [
      ...prediction.factors,
      `Sélection: ${selection.reason}`
    ]
  };
}
