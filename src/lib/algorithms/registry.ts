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
  | 'Arbres Heuristiques'
  | 'Séquences Récurrentes'
  | 'Attention Spatiale'
  | 'Double Gap Sequence'
  | 'Gap Cadence'
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
  'Arbres Heuristiques': {
    name: 'Arbres Heuristiques',
    displayName: 'Ensemble bootstrap de tendances fréquentielles',
    description: 'Modèle statistique de rééchantillonnage (bootstrap) qui agrège les tendances fréquentielles de différents sous-échantillons.',
    category: 'ensemble',
    defaultWeight: 0.8,
    color: 'hsl(200 70% 50%)',
    parametersSchema: {
      num_trees: { type: 'number', default: 10, min: 5, max: 50 },
      max_depth: { type: 'number', default: 5, min: 3, max: 15 }
    },
    strengths: ['Robuste au bruit', 'Analyse structurelle locale', 'Modélisation déterministe'],
    bestFor: 'Données avec interactions non-linéaires déterministes'
  },
  'Séquences Récurrentes': {
    name: 'Séquences Récurrentes',
    displayName: 'Transformation récurrente déterministe expérimentale',
    description: 'Réseau de neurones récurrent avec mémoire à long terme simulé localement en JavaScript. Adapté pour l\'analyse de courtes séquences temporelles.',
    category: 'deep-learning',
    defaultWeight: 0.9,
    color: 'hsl(280 70% 55%)',
    parametersSchema: {
      hidden_size: { type: 'number', default: 64, min: 32, max: 128 },
      num_layers: { type: 'number', default: 2, min: 1, max: 4 },
      sequence_length: { type: 'number', default: 20, min: 10, max: 50 }
    },
    strengths: ['Mémoire séquentielle', 'Traitement léger local', 'Excellent sur séquences courtes'],
    bestFor: 'Séries temporelles avec dépendances courtes'
  },
  'Attention Spatiale': {
    name: 'Attention Spatiale',
    displayName: 'Analyse d\'attention sinusoïdale expérimentale',
    description: 'Architecture d\'attention multi-têtes simulée localement pour capturer les relations complexes et proximales entre numéros.',
    category: 'deep-learning',
    defaultWeight: 1.1,
    color: 'hsl(330 70% 55%)',
    parametersSchema: {
      num_heads: { type: 'number', default: 4, min: 2, max: 8 },
      embed_dim: { type: 'number', default: 32, min: 16, max: 64 },
      num_layers: { type: 'number', default: 2, min: 1, max: 4 }
    },
    strengths: ['Attention sur relations', 'Calcul matriciel simulé', 'Excellente modélisation proximale'],
    bestFor: 'Relations complexes entre numéros'
  },
  'Double Gap Sequence': {
    name: 'Double Gap Sequence',
    displayName: 'Double Gap (Écarts des Écarts)',
    description: 'Analyse et projette la séquence des écarts des écarts (second ordre) pour prédire la tendance de tranche.',
    category: 'statistical',
    defaultWeight: 1.5,
    color: 'hsl(28 90% 50%)',
    parametersSchema: {
      window_size: { type: 'number', default: 10, min: 5, max: 30 }
    },
    strengths: ['Projection de tendance', 'Analyse du second ordre', 'Haute précision'],
    bestFor: 'Détection des retournements de tendance'
  },
  'Gap Cadence': {
    name: 'Gap Cadence',
    displayName: 'Cadence Morphologique',
    description: 'Recherche la cadence rythmique des écarts pour détecter les patterns et la morphologie du prochain tirage.',
    category: 'statistical',
    defaultWeight: 1.4,
    color: 'hsl(180 70% 45%)',
    parametersSchema: {
      cadence_depth: { type: 'number', default: 5, min: 2, max: 15 }
    },
    strengths: ['Détection de patterns rythmiques', 'Morphologie', 'Explicabilité'],
    bestFor: 'Anticipation des vagues d\'apparition'
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