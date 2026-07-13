// Decision Tree Selector - Sélection intelligente de l'algorithme optimal
import type { DrawResult } from "./types.ts";

export interface AlgorithmSelection {
  selectedAlgorithm: "Transformer" | "LSTM" | "RandomForest" | "FrequencyPro" | "StackingEnsemble" | "SmartEnsemble";
  reason: string;
}

export interface DecisionContext {
  historicalCount: number;
  hasMachineNumbers: boolean;
  isUltraPrecise: boolean;
  useAdaptiveEnsemble: boolean;
  drawName: string;
}

/**
 * Arbre de décision intelligent pour sélectionner le meilleur algorithme
 * selon le contexte du tirage
 */
export function selectBestAlgorithm(
  results: DrawResult[],
  context: Partial<DecisionContext> = {}
): AlgorithmSelection {
  const historicalCount = results.length;
  const hasMachineNumbers = results.some(r => 
    (r as { machine_numbers?: number[] }).machine_numbers && ((r as { machine_numbers?: number[] }).machine_numbers?.length ?? 0) > 0
  );
  const isUltraPrecise = context.isUltraPrecise || false;
  const useAdaptiveEnsemble = context.useAdaptiveEnsemble || false;
  const drawName = context.drawName || "";
  
  // Règle prioritaire 0: Mode Ensemble Adaptatif (Smart Ensemble)
  if (useAdaptiveEnsemble) {
    return {
      selectedAlgorithm: "SmartEnsemble",
      reason: "Mode Ensemble Adaptatif activé - Utilisation du Smart Ensemble avec poids dynamiques"
    };
  }
  
  // Règle prioritaire 1: Option Ultra Précise activée
  if (isUltraPrecise) {
    return {
      selectedAlgorithm: "StackingEnsemble",
      reason: "Mode Ultra Précis activé - Utilisation du meilleur modèle d'ensemble"
    };
  }
  
  // Règle prioritaire 2: Tirages avec numéros machine (complexes)
  if (hasMachineNumbers) {
    return {
      selectedAlgorithm: "StackingEnsemble",
      reason: "Tirage complexe avec numéros machine détectés - Stacking Ensemble recommandé"
    };
  }
  
  // Règle prioritaire 3: Tirages avec peu d'historique (moins de 100 tirages)
  if (historicalCount < 100) {
    return {
      selectedAlgorithm: "FrequencyPro",
      reason: `Historique limité pour ${drawName} (${historicalCount} tirages) - Analyse fréquentielle optimale`
    };
  }
  
  // Arbre de décision principal OPTIMISÉ - seuils ajustés
  
  // Niveau 1: +250 tirages → Transformer (seuil ↓ de 300)
  if (historicalCount >= 250) {
    return {
      selectedAlgorithm: "Transformer",
      reason: `Volume de données exceptionnel (${historicalCount} tirages) - Transformer avec mécanisme d'attention multi-têtes`
    };
  }
  
  // Niveau 2: 60-249 tirages → LSTM (seuil ↓ de 80, couvre l'ancien XGBoost)
  if (historicalCount >= 60) {
    return {
      selectedAlgorithm: "LSTM",
      reason: `Bon volume de données (${historicalCount} tirages) - LSTM pour analyse des patterns séquentiels`
    };
  }
  
  // Niveau 3: 30-59 tirages → Random Forest (seuil ↓ de 40)
  if (historicalCount >= 30) {
    return {
      selectedAlgorithm: "RandomForest",
      reason: `Volume modéré (${historicalCount} tirages) - Random Forest pour robustesse et généralisation`
    };
  }
  
  // Niveau 4: <30 tirages → FrequencyPro (statistiques de base)
  return {
    selectedAlgorithm: "FrequencyPro",
    reason: `Historique limité (${historicalCount} tirages) - Analyse fréquentielle pondérée recommandée`
  };
}

/**
 * Obtient des informations détaillées sur l'algorithme sélectionné
 */
export function getAlgorithmInfo(algorithm: AlgorithmSelection["selectedAlgorithm"]): {
  name: string;
  description: string;
  strengths: string[];
  optimalRange: string;
} {
  const info = {
    "Transformer": {
      name: "Transformer (Attention)",
      description: "Architecture d'attention multi-têtes pour capturer les relations complexes",
      strengths: [
        "Excellente gestion de grands volumes de données",
        "Détection de patterns non-linéaires",
        "Mécanisme d'attention pour relations long-terme"
      ],
      optimalRange: "250+ tirages"
    },
    "LSTM": {
      name: "LSTM Network",
      description: "Réseau de neurones récurrent avec mémoire à long/court terme",
      strengths: [
        "Capture des dépendances temporelles",
        "Mémoire sélective des patterns importants",
        "Adapté aux séquences de longueur variable"
      ],
      optimalRange: "80-149 tirages"
    },
    "RandomForest": {
      name: "Random Forest",
      description: "Ensemble d'arbres de décision avec bootstrap et vote majoritaire",
      strengths: [
        "Robustesse face au bruit",
        "Bonne généralisation",
        "Résistance à l'overfitting"
      ],
      optimalRange: "40-79 tirages"
    },
    "FrequencyPro": {
      name: "Analyse Fréquentielle Pondérée",
      description: "Analyse statistique avec pondération exponentielle temporelle",
      strengths: [
        "Fiable avec peu de données",
        "Rapide et efficace",
        "Base solide pour prédictions"
      ],
      optimalRange: "< 40 tirages"
    },
    "StackingEnsemble": {
      name: "Stacking Ensemble",
      description: "Meta-learner combinant 5 algorithmes avec poids optimisés",
      strengths: [
        "Meilleure précision globale",
        "Combine forces de tous les modèles",
        "Adaptatif aux différents contextes"
      ],
      optimalRange: "Situations complexes ou mode ultra-précis"
    },
    "SmartEnsemble": {
      name: "Smart Ensemble (Adaptatif)",
      description: "Ensemble intelligent avec sélection adaptative des algorithmes selon les données",
      strengths: [
        "Sélection dynamique des modèles",
        "Poids adaptatifs basés sur performance",
        "Optimise ressources selon volume de données",
        "Tracking de performance continu"
      ],
      optimalRange: "Toutes situations - adapte automatiquement"
    }
  };
  
  return info[algorithm];
}
