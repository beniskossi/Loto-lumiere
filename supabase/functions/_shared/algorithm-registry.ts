// =====================================================
// Registre centralisé des algorithmes de prédiction
// Gestion unifiée de la sélection et exécution
// =====================================================

import type { 
  DrawResult, 
  PredictionResult, 
  AlgorithmConfig, 
  AlgorithmFunction,
  AlgorithmRegistry,
  AlgorithmCategory 
} from "./types.ts";
import { 
  frequencyProAlgorithm, 
  randomForestAlgorithm, 
  lstmAlgorithm,
  doubleGapSequenceAlgorithm,
  gapCadenceAlgorithm,
  seasonalRecurrenceAlgorithm,
  generateFallbackPrediction 
} from "./algorithms.ts";
import { transformerAlgorithm } from "./transformer.ts";
import { stackingEnsemble } from "./stacking.ts";
import { log } from "./utils.ts";

// ====================== CONFIGURATION DES ALGORITHMES ======================

const ALGORITHM_CONFIGS: Map<string, AlgorithmConfig> = new Map([
  ["FrequencyPro", {
    name: "FrequencyPro",
    category: "statistical" as AlgorithmCategory,
    minDataRequired: 5,
    maxDataUsed: 200,
    resourceIntensity: "low",
    weight: 0.7,
    enabled: true,
  }],
  ["Arbres Heuristiques", {
    name: "Arbres Heuristiques",
    category: "forest" as AlgorithmCategory,
    minDataRequired: 30,
    maxDataUsed: 300,
    resourceIntensity: "low",
    weight: 0.8,
    enabled: true,
  }],
  ["Séquences Récurrentes", {
    name: "Séquences Récurrentes",
    category: "recurrent" as AlgorithmCategory,
    minDataRequired: 60,
    maxDataUsed: 200,
    resourceIntensity: "medium",
    weight: 0.9,
    enabled: true,
  }],
  ["Attention Spatiale", {
    name: "Attention Spatiale",
    category: "transformer" as AlgorithmCategory,
    minDataRequired: 250,
    maxDataUsed: 500,
    resourceIntensity: "high",
    weight: 1.1,
    enabled: true,
  }],
  ["Double Gap Sequence", {
    name: "Double Gap Sequence",
    category: "statistical" as AlgorithmCategory,
    minDataRequired: 10,
    maxDataUsed: 200,
    resourceIntensity: "low",
    weight: 1.5,
    enabled: true,
  }],
  ["Gap Cadence", {
    name: "Gap Cadence",
    category: "statistical" as AlgorithmCategory,
    minDataRequired: 15,
    maxDataUsed: 200,
    resourceIntensity: "low",
    weight: 1.4,
    enabled: true,
  }],
  ["Seasonal Recurrence", {
    name: "Seasonal Recurrence",
    category: "statistical" as AlgorithmCategory,
    minDataRequired: 30,
    maxDataUsed: 500,
    resourceIntensity: "medium",
    weight: 1.1,
    enabled: true,
  }],
  ["Ensemble Hybride Stacking", {
    name: "Ensemble Hybride Stacking",
    category: "ensemble" as AlgorithmCategory,
    minDataRequired: 100,
    maxDataUsed: 500,
    resourceIntensity: "high",
    weight: 1.2,
    enabled: true,
  }],
]);

// ====================== FONCTIONS D'EXÉCUTION ======================

const ALGORITHM_FUNCTIONS: Map<string, AlgorithmFunction> = new Map([
  ["FrequencyPro", frequencyProAlgorithm],
  ["Arbres Heuristiques", randomForestAlgorithm],
  ["Séquences Récurrentes", lstmAlgorithm],
  ["Attention Spatiale", transformerAlgorithm],
  ["Double Gap Sequence", doubleGapSequenceAlgorithm],
  ["Gap Cadence", gapCadenceAlgorithm],
  ["Seasonal Recurrence", seasonalRecurrenceAlgorithm],
  ["Ensemble Hybride Stacking", stackingEnsemble],
]);

// ====================== CLASSE PRINCIPALE ======================

export class AlgorithmRegistryManager {
  private registry: Map<string, AlgorithmRegistry> = new Map();

  constructor() {
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    ALGORITHM_CONFIGS.forEach((config, name) => {
      const execute = ALGORITHM_FUNCTIONS.get(name);
      if (execute) {
        this.registry.set(name, { config, execute });
      }
    });
  }

  /**
   * Récupère tous les algorithmes enregistrés
   */
  getAll(): AlgorithmRegistry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Récupère un algorithme par nom
   */
  get(name: string): AlgorithmRegistry | undefined {
    return this.registry.get(name);
  }

  /**
   * Récupère la configuration d'un algorithme
   */
  getConfig(name: string): AlgorithmConfig | undefined {
    return this.registry.get(name)?.config;
  }

  /**
   * Filtre les algorithmes éligibles selon les données disponibles
   */
  getEligibleAlgorithms(dataCount: number): AlgorithmRegistry[] {
    return this.getAll()
      .filter(algo => 
        algo.config.enabled && 
        dataCount >= algo.config.minDataRequired
      )
      .sort((a, b) => b.config.weight - a.config.weight);
  }

  /**
   * Sélectionne le meilleur algorithme selon les données
   */
  selectBestAlgorithm(dataCount: number): { algorithm: string; reason: string } {
    const eligible = this.getEligibleAlgorithms(dataCount);
    
    if (eligible.length === 0) {
      return {
        algorithm: "FrequencyPro",
        reason: "Données insuffisantes - Utilisation de l'algorithme de base"
      };
    }

    // Sélectionner l'algorithme avec le meilleur poids parmi les éligibles
    const best = eligible[0];
    
    // Logique de sélection avancée
    if (dataCount >= 300 && eligible.some(a => a.config.name === "Ensemble Hybride Stacking")) {
      return {
        algorithm: "Ensemble Hybride Stacking",
        reason: `Volume excellent (${dataCount} tirages) - Ensemble Hybride Stacking optimal`
      };
    }

    if (dataCount >= 250 && eligible.some(a => a.config.name === "Attention Spatiale")) {
      return {
        algorithm: "Attention Spatiale",
        reason: `Volume important (${dataCount} tirages) - Transformer attention recommandé`
      };
    }

    return {
      algorithm: best.config.name,
      reason: `${dataCount} tirages disponibles - ${best.config.name} sélectionné (poids: ${best.config.weight})`
    };
  }

  /**
   * Exécute un algorithme spécifique
   */
  execute(name: string, results: DrawResult[]): PredictionResult {
    const algo = this.registry.get(name);
    
    if (!algo) {
      log("warn", `Algorithme inconnu: ${name}, utilisation de FrequencyPro`);
      return frequencyProAlgorithm(results);
    }

    if (results.length < algo.config.minDataRequired) {
      log("warn", `Données insuffisantes pour ${name}: ${results.length}/${algo.config.minDataRequired}`);
      return generateFallbackPrediction(name, algo.config.category);
    }

    try {
      const startTime = Date.now();
      const prediction = algo.execute(results);
      const executionTime = Date.now() - startTime;

      log("info", `${name} exécuté en ${executionTime}ms`, {
        confidence: prediction.confidence,
        score: prediction.score
      });

      return {
        ...prediction,
        metadata: {
          ...prediction.metadata,
          executionTime,
          dataPointsUsed: Math.min(results.length, algo.config.maxDataUsed)
        }
      };
    } catch (error) {
      log("error", `Erreur lors de l'exécution de ${name}`, { error });
      return generateFallbackPrediction(name, algo.config.category);
    }
  }

  /**
   * Exécute plusieurs algorithmes en parallèle (optimisé)
   */
  async executeMultiple(
    results: DrawResult[],
    algorithmNames?: string[]
  ): Promise<Map<string, PredictionResult>> {
    const predictions = new Map<string, PredictionResult>();
    const dataCount = results.length;

    // Si pas de noms spécifiés, utiliser les éligibles
    const algorithms = algorithmNames 
      ? algorithmNames.map(name => this.registry.get(name)).filter(Boolean) as AlgorithmRegistry[]
      : this.getEligibleAlgorithms(dataCount);

    // Exécution séquentielle pour éviter les pics mémoire
    for (const algo of algorithms) {
      try {
        const prediction = this.execute(algo.config.name, results);
        predictions.set(algo.config.name, prediction);
      } catch (error) {
        log("warn", `${algo.config.name} a échoué`, { error });
      }
    }

    return predictions;
  }

  /**
   * Calcule les poids normalisés des algorithmes
   */
  getNormalizedWeights(algorithms: string[]): Map<string, number> {
    const weights = new Map<string, number>();
    let totalWeight = 0;

    algorithms.forEach(name => {
      const config = this.getConfig(name);
      if (config) {
        weights.set(name, config.weight);
        totalWeight += config.weight;
      }
    });

    // Normaliser
    if (totalWeight > 0) {
      weights.forEach((weight, name) => {
        weights.set(name, weight / totalWeight);
      });
    }

    return weights;
  }

  /**
   * Obtient les statistiques du registre
   */
  getStats(): {
    totalAlgorithms: number;
    enabledAlgorithms: number;
    categories: AlgorithmCategory[];
    avgWeight: number;
  } {
    const all = this.getAll();
    const enabled = all.filter(a => a.config.enabled);
    const categories = [...new Set(all.map(a => a.config.category))];
    const avgWeight = all.reduce((sum, a) => sum + a.config.weight, 0) / all.length;

    return {
      totalAlgorithms: all.length,
      enabledAlgorithms: enabled.length,
      categories,
      avgWeight
    };
  }
}

// Instance singleton
export const algorithmRegistry = new AlgorithmRegistryManager();

// Export des fonctions utilitaires
export function getAlgorithmConfig(name: string): AlgorithmConfig | undefined {
  return algorithmRegistry.getConfig(name);
}

export function selectOptimalAlgorithm(dataCount: number): { algorithm: string; reason: string } {
  return algorithmRegistry.selectBestAlgorithm(dataCount);
}

export function executeAlgorithm(name: string, results: DrawResult[]): PredictionResult {
  return algorithmRegistry.execute(name, results);
}
