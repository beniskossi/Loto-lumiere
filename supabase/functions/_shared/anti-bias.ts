import type { PredictionResult, DrawResult } from "./types.ts";
import { log } from "./utils.ts";

export interface AntiBiasResult {
  originalNumbers: number[];
  adjustedNumbers: number[];
  biasDetected: string[];
  biasScore: number; // 0 = unbiased, 1 = highly biased
}

/**
 * Couche Anti-Biais Finale : 
 * Détecte et corrige les prédictions surgénérant des séquences impossibles 
 * ou sur-ajustées (overfitted) à l'historique récent.
 */
export function applyAntiBiasLayer(
  prediction: PredictionResult, 
  historicalResults: DrawResult[]
): AntiBiasResult {
  const originalNumbers = [...prediction.numbers];
  let adjustedNumbers = [...prediction.numbers];
  const biasDetected: string[] = [];
  let biasScore = 0;

  // Trier les numéros
  adjustedNumbers.sort((a, b) => a - b);

  // 1. Biais de séquentialité (Trop de numéros consécutifs)
  let maxConsecutive = 1;
  let currentConsecutive = 1;
  for (let i = 1; i < adjustedNumbers.length; i++) {
    if (adjustedNumbers[i] === adjustedNumbers[i-1] + 1) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 1;
    }
  }

  if (maxConsecutive >= 4) {
    biasDetected.push(`Séquentialité extrême (${maxConsecutive} consécutifs)`);
    biasScore += 0.4;
    // Correction: remplacer un des numéros consécutifs par un numéro aléatoire hors séquence
    adjustedNumbers = breakConsecutiveSequence(adjustedNumbers);
  }

  // 2. Biais de concentration (Tous les numéros dans une plage étroite)
  const range = adjustedNumbers[adjustedNumbers.length - 1] - adjustedNumbers[0];
  if (range < 15 && adjustedNumbers.length === 5) {
    biasDetected.push(`Concentration extrême (plage de ${range})`);
    biasScore += 0.3;
    adjustedNumbers = disperseNumbers(adjustedNumbers);
  }

  // 3. Biais de récence extrême (Copie du dernier tirage)
  if (historicalResults.length > 0) {
    const lastDraw = historicalResults[0].winning_numbers;
    let commonCount = 0;
    for (const num of adjustedNumbers) {
      if (lastDraw.includes(num)) commonCount++;
    }
    
    if (commonCount >= 4) {
      biasDetected.push(`Biais de récence (copie ${commonCount}/5 du dernier tirage)`);
      biasScore += 0.5;
      adjustedNumbers = reduceRecencyBias(adjustedNumbers, lastDraw);
    }
  }

  // Si des biais ont été corrigés, mettre à jour le tableau
  if (biasDetected.length > 0) {
    log("info", "Couche Anti-Biais activée", { biasDetected, biasScore });
  }

  return {
    originalNumbers,
    adjustedNumbers: adjustedNumbers.sort((a, b) => a - b),
    biasDetected,
    biasScore: Math.min(1.0, biasScore)
  };
}

// Helpers pour la correction
function breakConsecutiveSequence(numbers: number[]): number[] {
  const result = [...numbers];
  for (let i = 1; i < result.length - 1; i++) {
    if (result[i] === result[i-1] + 1 && result[i+1] === result[i] + 1) {
      // Remplacer le numéro central de la suite par un autre
      let newNum;
      do {
        newNum = Math.floor(Math.random() * 90) + 1;
      } while (result.includes(newNum));
      result[i] = newNum;
      break; // Casser une seule fois suffit généralement
    }
  }
  return result;
}

function disperseNumbers(numbers: number[]): number[] {
  const result = [...numbers];
  // Remplacer le dernier numéro pour élargir la plage
  let newNum;
  do {
    newNum = Math.floor(Math.random() * 90) + 1;
  } while (result.includes(newNum) || Math.abs(newNum - result[0]) < 20);
  result[result.length - 1] = newNum;
  return result;
}

function reduceRecencyBias(numbers: number[], lastDraw: number[]): number[] {
  const result = [...numbers];
  let replaced = 0;
  for (let i = 0; i < result.length; i++) {
    if (lastDraw.includes(result[i]) && replaced < 2) { // Enlever au moins 2 numéros copiés
      let newNum;
      do {
        newNum = Math.floor(Math.random() * 90) + 1;
      } while (result.includes(newNum) || lastDraw.includes(newNum));
      result[i] = newNum;
      replaced++;
    }
  }
  return result;
}
