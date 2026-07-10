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
  | 'Stacking Ensemble';

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
    displayName: 'FrequencyPro',
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
    displayName: 'Decision Forest',
    description: 'Ensemble d\'arbres de décision déterministes. Robuste, analyse d\'importance de caractéristiques non-linéaire.',
    category: 'ensemble',
    defaultWeight: 0.8,
    color: 'hsl(200 70% 50%)',
    parametersSchema: {
      num_trees: { type: 'number', default: 10, min: 5, max: 50 },
      max_depth: { type: 'number', default: 5, min: 3, max: 15 }
    },
    strengths: ['Robuste au bruit', 'Analyse structurelle', 'Généralisation mathématique'],
    bestFor: 'Données avec interactions non-linéaires déterministes'
  },
  'LSTM Network': {
    name: 'LSTM Network',
    displayName: 'LSTM Network',
    description: 'Réseau de neurones récurrent avec mémoire à long terme. Idéal pour séquences temporelles.',
    category: 'deep-learning',
    defaultWeight: 0.9,
    color: 'hsl(280 70% 55%)',
    parametersSchema: {
      hidden_size: { type: 'number', default: 64, min: 32, max: 128 },
      num_layers: { type: 'number', default: 2, min: 1, max: 4 },
      sequence_length: { type: 'number', default: 20, min: 10, max: 50 }
    },
    strengths: ['Mémoire séquentielle', 'Bonne sur patterns longs'],
    bestFor: 'Séries temporelles avec dépendances longues'
  },
  'Transformer (Attention)': {
    name: 'Transformer (Attention)',
    displayName: 'Transformer (Attention)',
    description: 'Architecture d\'attention multi-têtes. État de l\'art pour capturer les relations complexes entre numéros.',
    category: 'deep-learning',
    defaultWeight: 1.1,
    color: 'hsl(330 70% 55%)',
    parametersSchema: {
      num_heads: { type: 'number', default: 4, min: 2, max: 8 },
      embed_dim: { type: 'number', default: 32, min: 16, max: 64 },
      num_layers: { type: 'number', default: 2, min: 1, max: 4 }
    },
    strengths: ['Attention sur relations', 'Parallélisable', 'Haut potentiel'],
    bestFor: 'Relations complexes entre numéros'
  },
  'XGBoost': {
    name: 'XGBoost',
    displayName: 'XGBoost',
    description: 'Extreme Gradient Boosting avec régularisation. Excellent équilibre performance / interprétabilité.',
    category: 'ensemble',
    defaultWeight: 1.0,
    color: 'hsl(140 60% 45%)',
    parametersSchema: {
      max_iterations: { type: 'number', default: 50, min: 20, max: 200 },
      learning_rate: { type: 'number', default: 0.1, min: 0.01, max: 0.3 },
      lambda: { type: 'number', default: 1.0 },
      gamma: { type: 'number', default: 0.1 }
    },
    strengths: ['Très performant', 'Régularisation intégrée', 'Rapide'],
    bestFor: 'Compétition de précision'
  },
  'Stacking Ensemble': {
    name: 'Stacking Ensemble',
    displayName: 'Stacking Ensemble',
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
  }
};

export const ALGORITHM_NAMES = Object.keys(ALGORITHMS) as AlgorithmName[];

export const CORE_ALGORITHMS = ALGORITHM_NAMES;

/**
 * Récupère la définition d'un algorithme par son nom
 */
export function getAlgorithm(name: string): AlgorithmDefinition | undefined {
  return ALGORITHMS[name as AlgorithmName];
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
 * Vérifie si un nom d'algorithme est valide
 */
export function isValidAlgorithm(name: string): name is AlgorithmName {
  return ALGORITHM_NAMES.includes(name as AlgorithmName);
}