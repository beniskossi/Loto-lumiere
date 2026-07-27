// Smart Ensemble - Ensemble intelligent avec les meilleurs algorithmes de base
import type { DrawResult, PredictionResult } from "./types.ts";
import { 
  frequencyProAlgorithm,
  randomForestAlgorithm,
  lstmAlgorithm,
  doubleGapSequenceAlgorithm,
  gapCadenceAlgorithm,
} from "./algorithms.ts";
import { transformerAlgorithm } from "./transformer.ts";
import { selectBalancedNumbers, log } from "./utils.ts";
import { callAIForOrchestration } from "./ai-orchestration.ts";

interface ModelWeight {
  algorithm: string;
  weight: number;
  recentPerformance: number;
  stability: number;
}

interface ModelConfig {
  name: string;
  fn: (results: DrawResult[]) => PredictionResult;
  minDataRequired: number;
  resourceIntensity: "low" | "medium" | "high";
}

// Configuration des algorithmes avec leurs exigences de données (XGBoost retiré, nouveaux algorithmes ajoutés)
const MODEL_CONFIGS: ModelConfig[] = [
  { name: "FrequencyPro", fn: frequencyProAlgorithm, minDataRequired: 5, resourceIntensity: "low" },
  { name: "Arbres Heuristiques", fn: randomForestAlgorithm, minDataRequired: 40, resourceIntensity: "low" },
  { name: "LSTM", fn: lstmAlgorithm, minDataRequired: 80, resourceIntensity: "medium" },
  { name: "Transformer", fn: transformerAlgorithm, minDataRequired: 300, resourceIntensity: "high" },
  { name: "Double Gap Sequence", fn: doubleGapSequenceAlgorithm, minDataRequired: 10, resourceIntensity: "low" },
  { name: "Gap Cadence", fn: gapCadenceAlgorithm, minDataRequired: 15, resourceIntensity: "low" },
];

export class SmartEnsemble {
  private modelWeights: Map<string, ModelWeight> = new Map();
  private performanceHistory: Map<string, number[]> = new Map();
  private adaptationRate = 0.1;
  private minWeight = 0.05;
  private maxWeight = 0.4;

  constructor() {
    this.initializeWeights();
  }

  private initializeWeights(): void {
    const initialModels = [
      { name: "Transformer", weight: 0.20 },
      { name: "LSTM", weight: 0.18 },
      { name: "Arbres Heuristiques", weight: 0.15 },
      { name: "FrequencyPro", weight: 0.15 },
      { name: "Double Gap Sequence", weight: 0.17 },
      { name: "Gap Cadence", weight: 0.15 },
    ];

    initialModels.forEach(model => {
      this.modelWeights.set(model.name, {
        algorithm: model.name,
        weight: model.weight,
        recentPerformance: 0.5,
        stability: 1.0
      });
      this.performanceHistory.set(model.name, []);
    });
  }

  /**
   * Génère une prédiction ensemble en exécutant les 5 algorithmes
   * de manière adaptative selon les données disponibles
   */
  async generateEnsemblePrediction(results: DrawResult[], useAIOrchestration: boolean = false): Promise<PredictionResult> {
    if (results.length < 5) {
      return this.getFallbackPrediction();
    }

    try {
      const dataCount = results.length;
      
      // Sélectionner les algorithmes à exécuter selon les données disponibles
      const eligibleModels = MODEL_CONFIGS.filter(
        config => dataCount >= config.minDataRequired
      );

      log("info", `Smart Ensemble: ${eligibleModels.length} algorithmes éligibles sur 5`, {
        dataCount,
        useAIOrchestration,
        models: eligibleModels.map(m => m.name)
      });

      // Générer prédictions des modèles éligibles
      const modelPredictions = await this.generatePredictions(results, eligibleModels);
      
      if (modelPredictions.size === 0) {
        return this.getFallbackPrediction();
      }
      
      let ensemblePrediction: number[];
      let confidence: number;
      
      if (useAIOrchestration) {
         log("info", "Orchestration gérée par l'IA");
         const aiResult = await callAIForOrchestration(modelPredictions, results);
         
         if (aiResult && aiResult.weights) {
           log("info", "Poids définis par l'IA", { reasoning: aiResult.reasoning, weights: aiResult.weights });
           
           // Apply AI weights
           let totalAIWeight = 0;
           Object.values(aiResult.weights).forEach(w => totalAIWeight += Number(w));
           
           if (totalAIWeight > 0) {
             modelPredictions.forEach((_, modelName) => {
               const w = aiResult.weights[modelName] || 0;
               const currentWeight = this.modelWeights.get(modelName);
               if (currentWeight) {
                 this.modelWeights.set(modelName, {
                   ...currentWeight,
                   weight: w / totalAIWeight
                 });
               }
             });
           }
         } else {
           // Fallback if AI fails
           this.adaptWeights(modelPredictions);
         }
         
         ensemblePrediction = this.combineWithAdaptiveWeights(modelPredictions);
         confidence = this.calculateEnsembleConfidence(modelPredictions);
      } else {
        // Adapter les poids basés sur la performance récente
        this.adaptWeights(modelPredictions);
        
        // Combiner les prédictions avec les poids adaptatifs
        ensemblePrediction = this.combineWithAdaptiveWeights(modelPredictions);
        
        // Calculer la confiance ensemble
        confidence = this.calculateEnsembleConfidence(modelPredictions);
      }
      
      const modelsUsed = Array.from(modelPredictions.keys());
      
      return {
        numbers: ensemblePrediction,
        confidence,
        algorithm: useAIOrchestration ? `AI Orchestrated Hybrid (${modelsUsed.length} Modèles)` : `Smart Ensemble (${modelsUsed.length}/${MODEL_CONFIGS.length} Modèles)`,
        factors: [
          `${modelsUsed.length} algorithmes exécutés`,
          useAIOrchestration ? "Sélection & Pondération via IA" : "Poids adaptatifs",
          "Performance tracking",
          `Modèles: ${modelsUsed.join(", ")}`
        ],
        score: confidence * 0.95,
        category: "ensemble"
      };
    } catch (error) {
      log("error", "Smart ensemble failed", { error: error instanceof Error ? error.message : error });
      return this.getFallbackPrediction();
    }
  }

  private async generatePredictions(
    results: DrawResult[],
    models: ModelConfig[]
  ): Promise<Map<string, PredictionResult>> {
    const predictions = new Map<string, PredictionResult>();
    
    // Exécuter en séquentiel pour éviter pic mémoire
    for (const model of models) {
      try {
        const startTime = Date.now();
        const prediction = model.fn(results);
        const executionTime = Date.now() - startTime;
        
        log("info", `${model.name} executed in ${executionTime}ms`, {
          confidence: prediction.confidence,
          score: prediction.score
        });
        
        predictions.set(model.name, prediction);
      } catch (error) {
        log("warn", `Model ${model.name} failed`, { 
          error: error instanceof Error ? error.message : error 
        });
        // Ne pas ajouter de fallback, continuer avec les autres modèles
      }
    }

    return predictions;
  }

  private adaptWeights(predictions: Map<string, PredictionResult>): void {
    predictions.forEach((prediction, modelName) => {
      const currentWeight = this.modelWeights.get(modelName);
      if (!currentWeight) return;

      // Mettre à jour la performance récente
      const performance = prediction.confidence * prediction.score;
      const history = this.performanceHistory.get(modelName) || [];
      history.push(performance);
      
      // Garder seulement les 20 dernières performances
      if (history.length > 20) {
        history.shift();
      }
      this.performanceHistory.set(modelName, history);

      // Calculer la performance moyenne récente
      const avgPerformance = history.reduce((a, b) => a + b, 0) / history.length;
      
      // Calculer la stabilité (inverse de la variance)
      const variance = history.reduce((sum, p) => sum + Math.pow(p - avgPerformance, 2), 0) / history.length;
      const stability = 1 / (1 + variance);

      // Adapter le poids
      const performanceRatio = avgPerformance / 0.5; // Normaliser autour de 0.5
      const newWeight = currentWeight.weight * (1 + this.adaptationRate * (performanceRatio - 1));
      
      // Contraindre le poids
      const constrainedWeight = Math.max(this.minWeight, Math.min(this.maxWeight, newWeight));

      // Mettre à jour
      this.modelWeights.set(modelName, {
        algorithm: modelName,
        weight: constrainedWeight,
        recentPerformance: avgPerformance,
        stability
      });
    });

    // Normaliser les poids pour qu'ils somment à 1
    this.normalizeWeights();
  }

  private normalizeWeights(): void {
    const totalWeight = Array.from(this.modelWeights.values())
      .reduce((sum, model) => sum + model.weight, 0);
    
    if (totalWeight > 0) {
      this.modelWeights.forEach((model, name) => {
        model.weight = model.weight / totalWeight;
        this.modelWeights.set(name, model);
      });
    }
  }

  private combineWithAdaptiveWeights(predictions: Map<string, PredictionResult>): number[] {
    const numberScores: Record<number, number> = {};
    for (let i = 1; i <= 90; i++) {
      numberScores[i] = 0;
    }

    predictions.forEach((prediction, modelName) => {
      const modelWeight = this.modelWeights.get(modelName);
      if (!modelWeight) return;

      const effectiveWeight = modelWeight.weight * modelWeight.stability;
      
      prediction.numbers.forEach((num, position) => {
        // Pondération par position (premiers numéros plus importants)
        const positionWeight = (5 - position) / 15;
        const confidenceWeight = prediction.confidence;
        
        numberScores[num] += effectiveWeight * (positionWeight + confidenceWeight);
      });
    });

    // Sélectionner les 5 meilleurs numéros
    const sortedNumbers = Object.entries(numberScores)
      .sort(([, a], [, b]) => b - a)
      .map(([num]) => parseInt(num));

    return selectBalancedNumbers(sortedNumbers.slice(0, 15), 5);
  }

  private calculateEnsembleConfidence(predictions: Map<string, PredictionResult>): number {
    let weightedConfidence = 0;
    let totalWeight = 0;

    predictions.forEach((prediction, modelName) => {
      const modelWeight = this.modelWeights.get(modelName);
      if (!modelWeight) return;

      const effectiveWeight = modelWeight.weight * modelWeight.stability;
      weightedConfidence += prediction.confidence * effectiveWeight;
      totalWeight += effectiveWeight;
    });

    const baseConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0.5;
    
    // Bonus pour la diversité des modèles (plus de modèles = plus fiable)
    const diversityBonus = Math.min(0.15, predictions.size / 50);
    
    // Bonus pour la stabilité moyenne
    const avgStability = Array.from(this.modelWeights.values())
      .filter(m => predictions.has(m.algorithm))
      .reduce((sum, model) => sum + model.stability, 0) / predictions.size || 0.5;
    const stabilityBonus = (avgStability - 0.5) * 0.1;

    return Math.min(0.95, baseConfidence + diversityBonus + stabilityBonus);
  }

  private getFallbackPrediction(): PredictionResult {
    return {
      numbers: [1, 15, 30, 45, 60],
      confidence: 0.2,
      algorithm: "Smart Ensemble (Données Insuffisantes)",
      factors: ["Données insuffisantes pour l'ensemble"],
      score: 0.2,
      category: "ensemble"
    };
  }

  // Méthodes utilitaires pour le monitoring
  getModelWeights(): Map<string, ModelWeight> {
    return new Map(this.modelWeights);
  }

  getPerformanceHistory(): Map<string, number[]> {
    return new Map(this.performanceHistory);
  }

  resetWeights(): void {
    this.initializeWeights();
  }

  updatePerformance(modelName: string, actualMatches: number): void {
    const performance = actualMatches / 5; // Normaliser entre 0 et 1
    const history = this.performanceHistory.get(modelName) || [];
    history.push(performance);
    
    if (history.length > 20) {
      history.shift();
    }
    
    this.performanceHistory.set(modelName, history);
  }
  
  // Obtenir les statistiques de l'ensemble
  getEnsembleStats(): {
    totalModels: number;
    activeModels: string[];
    averageWeight: number;
    averageStability: number;
  } {
    const weights = Array.from(this.modelWeights.values());
    return {
      totalModels: MODEL_CONFIGS.length,
      activeModels: weights.map(w => w.algorithm),
      averageWeight: weights.reduce((sum, w) => sum + w.weight, 0) / weights.length,
      averageStability: weights.reduce((sum, w) => sum + w.stability, 0) / weights.length,
    };
  }
}

// Instance globale
export const smartEnsemble = new SmartEnsemble();
