/**
 * Registre centralisé des algorithmes de prédiction LOTO LUMIERE
 * 
 * Source unique de vérité pour :
 * - Les 6 algorithmes optimaux
 * - Leurs métadonnées, poids par défaut, catégories
 * - Schémas de paramètres (pour UI et validation)
 * 
 * Cela évite la duplication dans les composants, hooks, et edge functions.
 * Synchronisé avec algorithm_config dans Supabase.
 */

export type AlgorithmName = 
  | 'FrequencyPro'
  | 'Random Forest'
  | 'LSTM Network'
  | 'Transformer (Attention)'
  | 'XGBoost'
  | 'Ensemble Hybride Stacking'
  | 'Baseline Aléatoire';

export interface ParameterSchema {
  type: 'number' | 'string' | 'boolean';
  default: number | string | boolean;
  min?: number;
  max?: number;
  options?: (string | number)[];
}

export interface AlgorithmDefinition {
  name: AlgorithmName;
  displayName: string;
  description: string;
  category: 'statistical' | 'ensemble' | 'deep-learning' | 'hybrid';
  defaultWeight: number;
  color: string; // HSL pour les charts
  parametersSchema: Record<string, ParameterSchema>; // Pour future UI de configuration
  strengths: string[];
  bestFor: string;
}

export const ALGORITHMS: Record<AlgorithmName, AlgorithmDefinition> = {
  'FrequencyPro': {
    name: 'FrequencyPro',
    displayName: 'Fréquence récente pondérée',
    description: 'Analyse fréquentielle pondérée avec décroissance exponentielle. Excellent pour capturer les tendances récentes.',
    category: 'statistical',
    defaultWeight: 0.7,
    color: 'hsl(35 90% 50%)',
    parametersSchema: {
      decay_rate: { type: 'number', default: 0.05, min: 0.01, max: 0.2 },
      top_candidates: { type: 'number', default: 15, min: 5, max: 30 }
    },
    strengths: ['Interprétable', 'Rapide', 'Bon sur tendances récentes'],
    bestFor: 'Données avec patterns fréquenciels clairs'
  },
  'Random Forest': {
    name: 'Random Forest',
    displayName: 'Random Forest',
    description: 'Entraîne des centaines d\'arbres de décision sur des caractéristiques croisées.',
    category: 'ensemble',
    defaultWeight: 0.8,
    color: 'hsl(200 70% 50%)',
    parametersSchema: {
      nEstimators: { type: 'number', default: 100, min: 10, max: 1000 },
      maxDepth: { type: 'number', default: 10, min: 3, max: 30 }
    },
    strengths: ['Non-linéarité', 'Robustesse au bruit', 'Cross-features'],
    bestFor: 'Modélisation des interactions complexes entre les caractéristiques (parité, sum).'
  },
  'LSTM Network': {
    name: 'LSTM Network',
    displayName: 'LSTM Network',
    description: 'Réseau neuronal récurrent capturant les dynamiques séquentielles et les mémoires longues.',
    category: 'deep-learning',
    defaultWeight: 0.9,
    color: 'hsl(280 70% 55%)',
    parametersSchema: {
      lookbackWindow: { type: 'number', default: 10, min: 3, max: 50 },
      hiddenUnits: { type: 'number', default: 64, min: 16, max: 256 }
    },
    strengths: ['Mémoire temporelle', 'Séquences de tirages'],
    bestFor: 'Détecter les patterns qui se construisent sur plusieurs tirages consécutifs.'
  },
  'Transformer (Attention)': {
    name: 'Transformer (Attention)',
    displayName: 'Transformer (Attention)',
    description: 'Mécanisme de self-attention pour identifier les relations distantes entre numéros et tirages.',
    category: 'deep-learning',
    defaultWeight: 1.1,
    color: 'hsl(330 70% 55%)',
    parametersSchema: {
      attentionHeads: { type: 'number', default: 4, min: 1, max: 16 },
      layers: { type: 'number', default: 2, min: 1, max: 6 }
    },
    strengths: ['Relations globales', 'Contextualisation'],
    bestFor: 'Comprendre quelles combinaisons spécifiques ont tendance à apparaître ensemble (anisotropie).'
  },
  'XGBoost': {
    name: 'XGBoost',
    displayName: 'XGBoost',
    description: 'Gradient boosting optimisé détectant les ruptures d\'écarts et la volatilité.',
    category: 'statistical',
    defaultWeight: 1.5,
    color: 'hsl(28 90% 50%)',
    parametersSchema: {
      learningRate: { type: 'number', default: 0.1, min: 0.01, max: 0.5 },
      maxDepth: { type: 'number', default: 6, min: 3, max: 15 }
    },
    strengths: ['Haute précision', 'Volatilité', 'Non-linéarité'],
    bestFor: 'Prédictions sur des métriques fortement variables comme les Gaps.'
  },
  'Ensemble Hybride Stacking': {
    name: 'Ensemble Hybride Stacking',
    displayName: 'Ensemble Hybride Stacking',
    description: 'Meta-learner qui combine intelligemment les 5 autres algorithmes. Meilleure performance globale.',
    category: 'hybrid',
    defaultWeight: 1.2,
    color: 'hsl(220 80% 55%)',
    parametersSchema: {
      meta_learner: { type: 'string', default: 'weighted_average' },
      level1_models: { type: 'number', default: 5 }
    },
    strengths: ['Meilleure précision', 'Robustesse', 'Auto-adaptation'],
    bestFor: 'Prédictions de haute confiance'
  },
  'Baseline Aléatoire': {
    name: 'Baseline Aléatoire',
    displayName: 'Baseline Aléatoire',
    description: 'Sélection de numéros purement aléatoire servant de référence d\'évaluation neutre pour prouver la valeur ajoutée des modèles IA.',
    category: 'statistical',
    defaultWeight: 0.1,
    color: 'hsl(0 0% 50%)',
    parametersSchema: {},
    strengths: ['Impartial', 'Indépendant des données', 'Référence de contrôle rationnelle'],
    bestFor: 'Contrôle de performance neutre'
  }
};

export const ALGORITHM_NAMES = Object.keys(ALGORITHMS) as AlgorithmName[];
export const CORE_ALGORITHMS = ALGORITHM_NAMES;

/**
 * Récupère la définition d'un algorithme par son nom (supporte les noms canoniques et les anciens alias).
 */
export function getAlgorithm(name: string): AlgorithmDefinition | undefined {
  if (!name) return undefined;
  if (name in ALGORITHMS) {
    return ALGORITHMS[name as AlgorithmName];
  }
  const normalized = normalizeAlgorithmName(name);
  return ALGORITHMS[normalized];
}

/**
 * Récupère tous les algorithmes activés par défaut (pour l'orchestration)
 */
export function getEnabledAlgorithms(): AlgorithmDefinition[] {
  return Object.values(ALGORITHMS);
}

/**
 * Calcule les poids normalisés (somme = 1) à partir des poids par défaut
 */
export function getNormalizedWeights(): Record<AlgorithmName, number> {
  const total = Object.values(ALGORITHMS).reduce((sum, algo) => sum + algo.defaultWeight, 0);
  const weights = {} as Record<AlgorithmName, number>;
  
  for (const name of ALGORITHM_NAMES) {
    weights[name] = ALGORITHMS[name].defaultWeight / total;
  }
  
  return weights;
}

/**
 * Vérifie si un nom d'algorithme est valide (canonique ou alias reconnu)
 */
export function isValidAlgorithm(name: string): name is AlgorithmName {
  if (ALGORITHM_NAMES.includes(name as AlgorithmName)) return true;
  const normalized = normalizeAlgorithmName(name);
  return ALGORITHM_NAMES.includes(normalized);
}

export { normalizeAlgorithmName, syncAlgorithmRegistryInDB, ALGORITHM_NAME_MAPPINGS } from './unifyRegistry';

