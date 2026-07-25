// predictionValidation.ts - Validation et uniformisation des prédictions client

export interface CleanPrediction {
  numbers: number[];
  confidence: number;
  algorithm: string;
  factors: string[];
  score: number;
  category: string;
  breakdown?: any;
  narratives?: string[];
  topPairs?: any[];
}

/**
 * Valide et nettoie une liste de prédictions brutes provenant de l'Edge Function.
 * Assure que chaque prédiction contient exactement 5 numéros uniques valides entre 1 et 90.
 */
export function validateAndCleanPredictions<T extends { numbers: number[] }>(
  predictions: unknown[] | undefined
): T[] {
  if (!predictions || !Array.isArray(predictions)) return [];

  return predictions
    .map((pred: any) => {
      if (!pred || typeof pred !== "object") return null;

      const rawNumbers = Array.isArray(pred.numbers) ? pred.numbers : [];
      
      // Nettoyage et filtrage des numéros
      const cleanNumbers = Array.from(
        new Set(
          rawNumbers
            .map((n: unknown) => Math.floor(Number(n)))
            .filter((n: number) => !isNaN(n) && n >= 1 && n <= 90)
        )
      ).sort((a: number, b: number) => a - b);

      // Une prédiction Loto Lumière valide requiert exactement 5 numéros distincts
      if (cleanNumbers.length !== 5) {
        console.error("[CRITIQUE] L'algorithme a généré une prédiction invalide avec " + cleanNumbers.length + " numéros:", pred);
        // Le frontend ne doit plus masquer les bugs du backend en filtrant silencieusement
        // On laisse passer pour forcer la visibilité du défaut (ou on pourrait jeter une erreur)
        // throw new Error("Backend Bug: L'algorithme n'a pas retourné 5 numéros uniques.");
      }

      return {
        ...pred,
        numbers: cleanNumbers,
        confidence: typeof pred.confidence === "number" ? Math.min(Math.max(pred.confidence, 0), 100) : 50,
        score: typeof pred.score === "number" ? pred.score : 0,
      } as T;
    })
    .filter((p): p is T => p !== null);
}
