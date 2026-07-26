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
